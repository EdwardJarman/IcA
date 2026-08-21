import { id, init } from "@instantdb/admin";
import { randomBytes } from "node:crypto";

import {
  APPROVAL_GRANT_TTL_MS,
  COMMAND_TTL_MS,
  PAIRING_TOKEN_TTL_MS,
  generateApprovalId,
  generatePairingToken,
  hashToken,
} from "../shared/node-relay";
import schema from "../instant.schema";
import type {
  ExcelPendingAction,
  InsertExcelPendingAction,
  InsertMicrosoftConnection,
  InsertPushDevice,
  InsertUser,
  MicrosoftConnection,
  NodeCommandRecord,
  PushDevice,
  RookNodeRecord,
  User,
} from "../shared/database";
import type { WorkroomCloudSnapshot } from "../shared/workroom-snapshot";
import { ENV } from "./_core/env";

const ROOK_INSTANT_APP_ID = "ed69763d-c8a4-4a28-8bed-c13806f2493d";

function createInstantDb() {
  return init({
    appId: ENV.instantAppId || ROOK_INSTANT_APP_ID,
    adminToken: ENV.instantAppAdminToken,
    schema,
    useDateObjects: true,
  });
}

type InstantDb = ReturnType<typeof createInstantDb>;
type ArrayElement<T> = T extends ReadonlyArray<infer Item> ? Item : T;
type InstantTx = ArrayElement<Parameters<InstantDb["transact"]>[0]>;
const INSTANT_TX_BATCH_SIZE = 75;

let _db: InstantDb | null = null;
let warnedMissingCredentials = false;

/**
 * Lazily initialize the server-only InstantDB Admin client. The admin token is
 * never available to the Expo bundle and must be supplied by the deployment.
 */
export async function getDb(): Promise<InstantDb | null> {
  if (_db) return _db;
  if (!ENV.instantAppAdminToken) {
    if (!warnedMissingCredentials) {
      console.warn(
        "[InstantDB] INSTANT_APP_ADMIN_TOKEN is not configured; persistence is unavailable",
      );
      warnedMissingCredentials = true;
    }
    return null;
  }

  _db = createInstantDb();
  return _db;
}

async function requireDb(): Promise<InstantDb> {
  const database = await getDb();
  if (!database) throw new Error("Database is unavailable");
  return database;
}

async function transactInBatches(database: InstantDb, chunks: InstantTx[]) {
  for (let index = 0; index < chunks.length; index += INSTANT_TX_BATCH_SIZE) {
    await database.transact(chunks.slice(index, index + INSTANT_TX_BATCH_SIZE));
  }
}

const nullable = <T>(value: T | null | undefined): T | null => value ?? null;
const asDate = (value: Date | string | number): Date =>
  value instanceof Date ? value : new Date(value);
/** asDate for loosely-typed InstantDB rows. */
const asDateValue = (value: unknown): Date =>
  value instanceof Date ? value : typeof value === "string" || typeof value === "number" ? new Date(value) : new Date(0);
const withTimestamps = <T extends { createdAt: Date; updatedAt: Date }>(
  entity: T,
): T => ({
  ...entity,
  createdAt: asDate(entity.createdAt),
  updatedAt: asDate(entity.updatedAt),
});

function asUser(entity: {
  id: string;
  openId: string;
  name?: string;
  email?: string;
  loginMethod?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}): User {
  return {
    id: entity.id,
    openId: entity.openId,
    name: nullable(entity.name),
    email: nullable(entity.email),
    loginMethod: nullable(entity.loginMethod),
    role: entity.role === "admin" ? "admin" : "user",
    createdAt: asDate(entity.createdAt),
    updatedAt: asDate(entity.updatedAt),
    lastSignedIn: asDate(entity.lastSignedIn),
  };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const database = await getDb();
  if (!database) {
    console.warn("[InstantDB] Cannot upsert user: database not available");
    return;
  }

  try {
    const existing = await getUserByOpenId(user.openId);
    const now = new Date();
    const role =
      user.role ??
      existing?.role ??
      (user.openId === ENV.ownerOpenId ? "admin" : "user");

    await database.transact(
      database.tx.users.lookup("openId", user.openId).update({
        role,
        createdAt: user.createdAt ?? existing?.createdAt ?? now,
        updatedAt: user.updatedAt ?? now,
        lastSignedIn: user.lastSignedIn ?? existing?.lastSignedIn ?? now,
        ...(user.name !== undefined ? { name: user.name ?? undefined } : {}),
        ...(user.email !== undefined ? { email: user.email ?? undefined } : {}),
        ...(user.loginMethod !== undefined
          ? { loginMethod: user.loginMethod ?? undefined }
          : {}),
      }),
    );
  } catch (error) {
    console.error("[InstantDB] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const { users } = await database.query({
    users: { $: { where: { openId }, limit: 1 } },
  });
  return users[0] ? asUser(users[0]) : undefined;
}

export async function upsertPushDevice(
  userId: string,
  device: InsertPushDevice,
) {
  const database = await getDb();
  if (!database) return false;
  const existing = await getPushDevice(device.installationId);
  const now = new Date();
  await database.transact(
    database.tx.pushDevices
      .lookup("installationId", device.installationId)
      .update({
        userId,
        expoPushToken: device.expoPushToken,
        approvalEnabled: device.approvalEnabled,
        completionEnabled: device.completionEnabled,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }),
  );
  return true;
}

export async function getPushDevice(installationId: string) {
  const database = await getDb();
  if (!database) return undefined;
  const { pushDevices } = await database.query({
    pushDevices: { $: { where: { installationId }, limit: 1 } },
  });
  return pushDevices[0] ? withTimestamps(pushDevices[0]) : undefined;
}

export async function getPushDevicesForUser(userId: string): Promise<PushDevice[]> {
  const database = await getDb();
  if (!database) return [];
  const { pushDevices } = await database.query({
    pushDevices: { $: { where: { userId } } },
  });
  return pushDevices.map(withTimestamps);
}

export async function getNotificationPreferences(userId: string) {
  const database = await getDb();
  if (!database) return undefined;
  const { userNotificationPreferences } = await database.query({
    userNotificationPreferences: {
      $: { where: { userId }, limit: 1 },
    },
  });
  return userNotificationPreferences[0]
    ? withTimestamps(userNotificationPreferences[0])
    : undefined;
}

export async function upsertNotificationPreferences(
  userId: string,
  preferences: { approvalEnabled: boolean; completionEnabled: boolean },
) {
  const database = await getDb();
  if (!database) return false;
  const existing = await getNotificationPreferences(userId);
  const now = new Date();
  await database.transact(
    database.tx.userNotificationPreferences.lookup("userId", userId).update({
      ...preferences,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }),
  );
  return true;
}

export async function getWorkroomSnapshot(userId: string) {
  const database = await getDb();
  if (!database) return undefined;
  const { workroomSnapshots } = await database.query({
    workroomSnapshots: { $: { where: { userId }, limit: 1 } },
  });
  return workroomSnapshots[0]
    ? withTimestamps(workroomSnapshots[0])
    : undefined;
}

export async function upsertWorkroomSnapshot(
  userId: string,
  snapshot: WorkroomCloudSnapshot,
) {
  const database = await getDb();
  if (!database) return false;
  const existing = await getWorkroomSnapshot(userId);
  const now = new Date();
  await database.transact(
    database.tx.workroomSnapshots.lookup("userId", userId).update({
      syncVersion: existing?.syncVersion ?? id(),
      snapshot,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }),
  );
  return true;
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const textValue = (
  source: Record<string, unknown>,
  key: string,
  fallback = "",
) => (typeof source[key] === "string" ? source[key] : fallback);
const recordKey = (userId: string, syncVersion: string, clientId: string) =>
  `${userId}:${syncVersion}:${clientId}`;

export async function saveWorkroomState(
  userId: string,
  snapshot: WorkroomCloudSnapshot,
) {
  const database = await requireDb();
  const existingSnapshot = await getWorkroomSnapshot(userId);
  const bots = snapshot.bots
    .map(record)
    .filter((item) => textValue(item, "id") && textValue(item, "name"));
  const tasks = snapshot.tasks
    .map(record)
    .filter((item) => textValue(item, "id") && textValue(item, "title"));
  const files = snapshot.files
    .map(record)
    .filter((item) => textValue(item, "id") && textValue(item, "name"));
  const now = new Date();
  const syncVersion = id();
  const recordTransactions: InstantTx[] = [
    ...bots.map((bot) => {
      const clientId = textValue(bot, "id");
      return database.tx.workroomBots[id()].create({
        recordKey: recordKey(userId, syncVersion, clientId),
        userId,
        syncVersion,
        clientId,
        name: textValue(bot, "name"),
        role: textValue(bot, "role"),
        status: textValue(bot, "status", "Ready"),
        color: textValue(bot, "color", "#7563F5"),
        icon: textValue(bot, "icon", "auto-awesome"),
        payload: bot,
        createdAt: now,
        updatedAt: now,
      });
    }),
    ...tasks.map((task) => {
      const clientId = textValue(task, "id");
      return database.tx.workroomTasks[id()].create({
        recordKey: recordKey(userId, syncVersion, clientId),
        userId,
        syncVersion,
        clientId,
        botClientId: textValue(task, "botId"),
        title: textValue(task, "title"),
        status: textValue(task, "status", "Draft"),
        risk: textValue(task, "risk", "Low"),
        payload: task,
        createdAt: now,
        updatedAt: now,
      });
    }),
    ...files.map((file) => {
      const clientId = textValue(file, "id");
      return database.tx.workroomFiles[id()].create({
        recordKey: recordKey(userId, syncVersion, clientId),
        userId,
        syncVersion,
        clientId,
        name: textValue(file, "name"),
        owner: textValue(file, "owner"),
        scope: textValue(file, "scope", "Bot-private"),
        payload: file,
        createdAt: now,
        updatedAt: now,
      });
    }),
  ];
  await transactInBatches(database, recordTransactions);
  await database.transact(
    database.tx.workroomSnapshots.lookup("userId", userId).update({
      syncVersion,
      snapshot,
      createdAt: existingSnapshot?.createdAt ?? now,
      updatedAt: now,
    }),
  );

  const previousVersion = existingSnapshot?.syncVersion;
  if (previousVersion && previousVersion !== syncVersion) {
    const stale = await database.query({
      workroomBots: { $: { where: { userId, syncVersion: previousVersion } } },
      workroomTasks: { $: { where: { userId, syncVersion: previousVersion } } },
      workroomFiles: { $: { where: { userId, syncVersion: previousVersion } } },
    });
    const staleTransactions: InstantTx[] = [
      ...stale.workroomBots.map((item) =>
        database.tx.workroomBots[item.id].delete(),
      ),
      ...stale.workroomTasks.map((item) =>
        database.tx.workroomTasks[item.id].delete(),
      ),
      ...stale.workroomFiles.map((item) =>
        database.tx.workroomFiles[item.id].delete(),
      ),
    ];
    await transactInBatches(database, staleTransactions);
  }
  return true;
}

export async function syncNormalizedWorkroomRecords(
  userId: string,
  snapshot: WorkroomCloudSnapshot,
) {
  return saveWorkroomState(userId, snapshot);
}

export async function listNormalizedWorkroomRecords(userId: string) {
  const database = await getDb();
  if (!database) return { bots: [], tasks: [], files: [] };
  const snapshot = await getWorkroomSnapshot(userId);
  if (!snapshot?.syncVersion) return { bots: [], tasks: [], files: [] };
  const syncVersion = snapshot.syncVersion;
  const { workroomBots, workroomTasks, workroomFiles } = await database.query({
    workroomBots: { $: { where: { userId, syncVersion } } },
    workroomTasks: { $: { where: { userId, syncVersion } } },
    workroomFiles: { $: { where: { userId, syncVersion } } },
  });
  return {
    bots: workroomBots.map(withTimestamps),
    tasks: workroomTasks.map(withTimestamps),
    files: workroomFiles.map(withTimestamps),
  };
}

export async function createMicrosoftOAuthState(input: {
  state: string;
  userId: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: Date;
}) {
  const database = await requireDb();
  await database.transact(
    database.tx.microsoftOAuthStates.lookup("state", input.state).update({
      userId: input.userId,
      codeVerifier: input.codeVerifier,
      returnTo: input.returnTo,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    }),
  );
}

export async function consumeMicrosoftOAuthState(state: string) {
  const database = await requireDb();
  const { microsoftOAuthStates } = await database.query({
    microsoftOAuthStates: { $: { where: { state }, limit: 1 } },
  });
  const oauthState = microsoftOAuthStates[0];
  if (!oauthState) return undefined;
  await database.transact(
    database.tx.microsoftOAuthStates[oauthState.id].delete(),
  );
  const normalized = {
    ...oauthState,
    expiresAt: asDate(oauthState.expiresAt),
    createdAt: asDate(oauthState.createdAt),
  };
  if (normalized.expiresAt.getTime() <= Date.now()) return undefined;
  return normalized;
}

function asMicrosoftConnection(entity: {
  id: string;
  userId: string;
  microsoftUserId: string;
  displayName?: string;
  email?: string;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: Date;
  scopes: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): MicrosoftConnection {
  return {
    ...entity,
    displayName: nullable(entity.displayName),
    email: nullable(entity.email),
    status: entity.status === "reauthorize" ? "reauthorize" : "connected",
    expiresAt: asDate(entity.expiresAt),
    createdAt: asDate(entity.createdAt),
    updatedAt: asDate(entity.updatedAt),
  };
}

export async function getMicrosoftConnection(
  userId: string,
): Promise<MicrosoftConnection | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const { microsoftConnections } = await database.query({
    microsoftConnections: { $: { where: { userId }, limit: 1 } },
  });
  return microsoftConnections[0]
    ? asMicrosoftConnection(microsoftConnections[0])
    : undefined;
}

export async function upsertMicrosoftConnection(
  input: InsertMicrosoftConnection,
) {
  const database = await requireDb();
  const existing = await getMicrosoftConnection(input.userId);
  const now = new Date();
  await database.transact(
    database.tx.microsoftConnections.lookup("userId", input.userId).update({
      microsoftUserId: input.microsoftUserId,
      encryptedAccessToken: input.encryptedAccessToken,
      encryptedRefreshToken: input.encryptedRefreshToken,
      expiresAt: input.expiresAt,
      scopes: input.scopes,
      status: input.status ?? "connected",
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...(input.displayName !== undefined
        ? { displayName: input.displayName ?? undefined }
        : {}),
      ...(input.email !== undefined ? { email: input.email ?? undefined } : {}),
    }),
  );
}

export async function updateMicrosoftTokens(
  userId: string,
  input: {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    expiresAt: Date;
    scopes: string;
  },
) {
  const database = await requireDb();
  const connection = await getMicrosoftConnection(userId);
  if (!connection) throw new Error("Microsoft Excel is not connected");
  await database.transact(
    database.tx.microsoftConnections[connection.id].update(
      {
        ...input,
        status: "connected",
        updatedAt: new Date(),
      },
      { upsert: false },
    ),
  );
}

export async function markMicrosoftReauthorizationRequired(userId: string) {
  const database = await getDb();
  if (!database) return;
  const connection = await getMicrosoftConnection(userId);
  if (!connection) return;
  await database.transact(
    database.tx.microsoftConnections[connection.id].update(
      { status: "reauthorize", updatedAt: new Date() },
      { upsert: false },
    ),
  );
}

function deletionTransactions(
  database: InstantDb,
  input: {
    microsoftConnections?: Array<{ id: string }>;
    microsoftOAuthStates?: Array<{ id: string }>;
    excelPendingActions?: Array<{ id: string }>;
    excelActionClaims?: Array<{ id: string }>;
    workroomSnapshots?: Array<{ id: string }>;
    workroomBots?: Array<{ id: string }>;
    workroomTasks?: Array<{ id: string }>;
    workroomFiles?: Array<{ id: string }>;
    userNotificationPreferences?: Array<{ id: string }>;
    pushDevices?: Array<{ id: string }>;
  },
): InstantTx[] {
  return [
    ...(input.microsoftConnections ?? []).map((item) =>
      database.tx.microsoftConnections[item.id].delete(),
    ),
    ...(input.microsoftOAuthStates ?? []).map((item) =>
      database.tx.microsoftOAuthStates[item.id].delete(),
    ),
    ...(input.excelPendingActions ?? []).map((item) =>
      database.tx.excelPendingActions[item.id].delete(),
    ),
    ...(input.excelActionClaims ?? []).map((item) =>
      database.tx.excelActionClaims[item.id].delete(),
    ),
    ...(input.workroomSnapshots ?? []).map((item) =>
      database.tx.workroomSnapshots[item.id].delete(),
    ),
    ...(input.workroomBots ?? []).map((item) =>
      database.tx.workroomBots[item.id].delete(),
    ),
    ...(input.workroomTasks ?? []).map((item) =>
      database.tx.workroomTasks[item.id].delete(),
    ),
    ...(input.workroomFiles ?? []).map((item) =>
      database.tx.workroomFiles[item.id].delete(),
    ),
    ...(input.userNotificationPreferences ?? []).map((item) =>
      database.tx.userNotificationPreferences[item.id].delete(),
    ),
    ...(input.pushDevices ?? []).map((item) =>
      database.tx.pushDevices[item.id].delete(),
    ),
  ];
}

export async function deleteMicrosoftConnection(userId: string) {
  const database = await getDb();
  if (!database) return false;
  const result = await database.query({
    microsoftConnections: { $: { where: { userId } } },
    microsoftOAuthStates: { $: { where: { userId } } },
    excelPendingActions: { $: { where: { userId } } },
    excelActionClaims: { $: { where: { userId } } },
  });
  const transactions = deletionTransactions(database, result);
  if (transactions.length) await database.transact(transactions);
  return true;
}

export async function createExcelPendingAction(
  input: InsertExcelPendingAction,
) {
  const database = await requireDb();
  const now = new Date();
  await database.transact(
    database.tx.excelPendingActions.lookup("actionId", input.id).update({
      userId: input.userId,
      botClientId: input.botClientId,
      taskClientId: input.taskClientId,
      toolName: input.toolName,
      arguments: input.arguments,
      summary: input.summary,
      state: input.state ?? "pending",
      expiresAt: input.expiresAt,
      createdAt: now,
      updatedAt: now,
      ...(input.result !== undefined ? { result: input.result } : {}),
    }),
  );
}

function asExcelPendingAction(entity: {
  id: string;
  actionId: string;
  userId: string;
  botClientId: string;
  taskClientId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  summary: string;
  state: string;
  result?: unknown;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): ExcelPendingAction {
  const state = ["executing", "executed", "failed", "declined", "expired"].includes(entity.state)
    ? (entity.state as ExcelPendingAction["state"])
    : "pending";
  return {
    id: entity.actionId,
    userId: entity.userId,
    botClientId: entity.botClientId,
    taskClientId: entity.taskClientId,
    toolName: entity.toolName,
    arguments: entity.arguments,
    summary: entity.summary,
    state,
    result: entity.result,
    expiresAt: asDate(entity.expiresAt),
    createdAt: asDate(entity.createdAt),
    updatedAt: asDate(entity.updatedAt),
  };
}

export async function getExcelPendingAction(userId: string, actionId: string) {
  const database = await getDb();
  if (!database) return undefined;
  const { excelPendingActions } = await database.query({
    excelPendingActions: {
      $: { where: { actionId }, limit: 1 },
    },
  });
  const action = excelPendingActions[0];
  if (!action || action.userId !== userId) return undefined;
  return asExcelPendingAction(action);
}

export async function listPendingExcelActions(userId: string) {
  const database = await getDb();
  if (!database) return [];
  const { excelPendingActions } = await database.query({
    excelPendingActions: { $: { where: { userId, state: "pending" } } },
  });
  return excelPendingActions.map(asExcelPendingAction);
}

export async function claimExcelPendingAction(
  userId: string,
  actionId: string,
) {
  const database = await requireDb();
  const action = await getExcelPendingAction(userId, actionId);
  if (!action || action.state !== "pending") return undefined;
  const { excelPendingActions } = await database.query({
    excelPendingActions: { $: { where: { actionId }, limit: 1 } },
  });
  const stored = excelPendingActions[0];
  if (!stored || stored.userId !== userId || stored.state !== "pending")
    return undefined;
  try {
    await database.transact([
      database.tx.excelActionClaims[id()].create({
        actionId,
        userId,
        createdAt: new Date(),
      }),
      database.tx.excelPendingActions[stored.id].update(
        { state: "executing", updatedAt: new Date() },
        { upsert: false },
      ),
    ]);
  } catch {
    return undefined;
  }
  return { ...action, state: "executing" as const };
}

export async function finishExcelPendingAction(
  userId: string,
  actionId: string,
  input: {
    state: "executed" | "failed" | "declined" | "expired";
    result?: unknown;
  },
) {
  const database = await requireDb();
  const { excelPendingActions } = await database.query({
    excelPendingActions: { $: { where: { actionId }, limit: 1 } },
  });
  const action = excelPendingActions[0];
  if (!action || action.userId !== userId || action.state !== "executing")
    return false;
  await database.transact(
    database.tx.excelPendingActions[action.id].update(
      {
        state: input.state,
        updatedAt: new Date(),
        ...(input.result !== undefined ? { result: input.result } : {}),
      },
      { upsert: false },
    ),
  );
  return true;
}

export async function resolveExcelPendingAction(
  userId: string,
  actionId: string,
  input: {
    state: "executed" | "declined" | "expired";
    result?: unknown;
  },
) {
  const claimed = await claimExcelPendingAction(userId, actionId);
  if (!claimed) return;
  await finishExcelPendingAction(userId, actionId, input);
}

export async function exportAccountWorkroomData(userId: string) {
  const [snapshot, records, preferences, microsoft] = await Promise.all([
    getWorkroomSnapshot(userId),
    listNormalizedWorkroomRecords(userId),
    getNotificationPreferences(userId),
    getMicrosoftConnection(userId),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    snapshot: snapshot?.snapshot ?? null,
    records,
    notificationPreferences: preferences
      ? {
          approval: preferences.approvalEnabled,
          completion: preferences.completionEnabled,
        }
      : { approval: true, completion: true },
    integrations: {
      microsoftExcel: microsoft
        ? {
            displayName: microsoft.displayName,
            email: microsoft.email,
            status: microsoft.status,
            scopes: microsoft.scopes,
            connectedAt: microsoft.createdAt,
          }
        : null,
    },
  };
}

export async function deleteAccountWorkroomData(userId: string) {
  const database = await getDb();
  if (!database) return false;
  const result = await database.query({
    workroomSnapshots: { $: { where: { userId } } },
    workroomBots: { $: { where: { userId } } },
    workroomTasks: { $: { where: { userId } } },
    workroomFiles: { $: { where: { userId } } },
    userNotificationPreferences: { $: { where: { userId } } },
    pushDevices: { $: { where: { userId } } },
    microsoftConnections: { $: { where: { userId } } },
    microsoftOAuthStates: { $: { where: { userId } } },
    excelPendingActions: { $: { where: { userId } } },
    excelActionClaims: { $: { where: { userId } } },
  });
  const transactions = deletionTransactions(database, result);
  await transactInBatches(database, transactions);
  return true;
}

/* ---- Rook Node relay ---- */

const asRookNode = (entity: Record<string, unknown> & { id: string }): RookNodeRecord => ({
  id: entity.id,
  nodeId: textValue(entity, "nodeId"),
  userId: textValue(entity, "userId"),
  name: textValue(entity, "name", "Computer"),
  status: (textValue(entity, "status", "offline") as RookNodeRecord["status"]),
  version: textValue(entity, "version"),
  lastSeenAt: asDateValue(entity.lastSeenAt),
  createdAt: asDateValue(entity.createdAt),
  updatedAt: asDateValue(entity.updatedAt),
});

export async function createPairingToken(userId: string): Promise<{ token: string; expiresAt: Date } | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const token = generatePairingToken();
  const expiresAt = new Date(Date.now() + PAIRING_TOKEN_TTL_MS);
  await database.transact(
    database.tx.pairingTokens[id()].update({
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      createdAt: new Date(),
    }),
  );
  return { token, expiresAt };
}

/** Marks a pairing token used and returns its owner's user id. Single use. */
export async function consumePairingToken(token: string): Promise<string | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const { pairingTokens } = await database.query({
    pairingTokens: { $: { where: { tokenHash: hashToken(token) }, limit: 1 } },
  });
  const record = pairingTokens[0];
  if (!record) return undefined;
  if (record.usedByNodeId) return undefined;
  if (asDate(record.expiresAt).getTime() <= Date.now()) return undefined;
  return record.userId;
}

export async function markPairingTokenUsed(token: string, nodeId: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  await database.transact(
    database.tx.pairingTokens.lookup("tokenHash", hashToken(token)).update({
      usedByNodeId: nodeId,
    }),
  );
}

export async function createRookNode(input: {
  nodeId: string;
  userId: string;
  name: string;
  secretHash: string;
  version: string;
}): Promise<RookNodeRecord | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const now = new Date();
  await database.transact(
    database.tx.rookNodes[id()].update({
      ...input,
      status: "online",
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    }),
  );
  const created = await getRookNode(input.nodeId);
  return created;
}

export async function getRookNode(nodeId: string): Promise<RookNodeRecord | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const { rookNodes } = await database.query({
    rookNodes: { $: { where: { nodeId }, limit: 1 } },
  });
  const raw = rookNodes[0] as unknown as (Record<string, unknown> & { id: string }) | undefined;
  return raw ? asRookNode(raw) : undefined;
}

/** Auth lookup for the sync route. The secret hash never leaves the server process. */
export async function getRookNodeAuth(nodeId: string): Promise<{ secretHash: string; status: string } | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const { rookNodes } = await database.query({
    rookNodes: { $: { where: { nodeId }, limit: 1 } },
  });
  const raw = rookNodes[0] as unknown as (Record<string, unknown> & { id: string }) | undefined;
  if (!raw) return undefined;
  return { secretHash: textValue(raw, "secretHash"), status: textValue(raw, "status", "offline") };
}

export async function listRookNodesForUser(userId: string): Promise<RookNodeRecord[]> {
  const database = await getDb();
  if (!database) return [];
  const { rookNodes } = await database.query({
    rookNodes: { $: { where: { userId } } },
  });
  return (rookNodes as unknown as Array<Record<string, unknown> & { id: string }>)
    .map(asRookNode)
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
}

export async function revokeRookNode(userId: string, nodeId: string): Promise<boolean> {
  const existing = await getRookNode(nodeId);
  if (!existing || existing.userId !== userId) return false;
  const database = await requireDb();
  await database.transact(
    database.tx.rookNodes.lookup("nodeId", nodeId).update({ status: "revoked", updatedAt: new Date() }),
  );
  return true;
}

export async function renameRookNode(userId: string, nodeId: string, name: string): Promise<boolean> {
  const existing = await getRookNode(nodeId);
  if (!existing || existing.userId !== userId) return false;
  const database = await requireDb();
  await database.transact(
    database.tx.rookNodes.lookup("nodeId", nodeId).update({ name, updatedAt: new Date() }),
  );
  return true;
}

export async function touchRookNode(nodeId: string, version: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  await database.transact(
    database.tx.rookNodes.lookup("nodeId", nodeId).update({
      status: "online",
      version,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

export async function markRookNodeOffline(nodeId: string): Promise<void> {
  const database = await getDb();
  if (!database) return;
  await database.transact(
    database.tx.rookNodes.lookup("nodeId", nodeId).update({ status: "offline", updatedAt: new Date() }),
  );
}

export async function enqueueNodeCommand(input: {
  commandId: string;
  userId: string;
  nodeId: string;
  summary: string;
  capability: string;
  envelope: Record<string, unknown>;
  requiresApproval: boolean;
}): Promise<NodeCommandRecord | undefined> {
  const node = await getRookNode(input.nodeId);
  if (!node || node.userId !== input.userId || node.status === "revoked") return undefined;
  const database = await requireDb();
  const now = new Date();
  await database.transact(
    database.tx.nodeCommands[id()].update({
      commandId: input.commandId,
      userId: input.userId,
      nodeId: input.nodeId,
      state: input.requiresApproval ? "awaiting_approval" : "pending",
      summary: input.summary.slice(0, 300),
      capability: input.capability.slice(0, 40),
      envelope: input.envelope,
      expiresAt: new Date(now.getTime() + COMMAND_TTL_MS),
      createdAt: now,
      updatedAt: now,
    }),
  );
  return {
    id: input.commandId,
    commandId: input.commandId,
    userId: input.userId,
    nodeId: input.nodeId,
    state: input.requiresApproval ? "awaiting_approval" : "pending",
    summary: input.summary.slice(0, 300),
    capability: input.capability.slice(0, 40),
    envelope: input.envelope,
    expiresAt: new Date(now.getTime() + COMMAND_TTL_MS),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Applies the owner's decision to an awaiting command. Approval embeds a
 * short-lived grant bound to the page revision; decline marks it declined.
 */
export async function decideNodeCommand(
  userId: string,
  commandId: string,
  decision: "approved" | "declined",
): Promise<NodeCommandRecord | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const { nodeCommands } = await database.query({
    nodeCommands: { $: { where: { commandId }, limit: 1 } },
  });
  const raw = nodeCommands[0] as unknown as (Record<string, unknown> & { id: string }) | undefined;
  if (!raw || textValue(raw, "userId") !== userId) return undefined;
  if (textValue(raw, "state") !== "awaiting_approval") return existingNodeCommand(raw);

  if (decision === "declined") {
    await database.transact(
      database.tx.nodeCommands[raw.id].update({ state: "declined", updatedAt: new Date() }),
    );
    return existingNodeCommand({ ...raw, state: "declined" });
  }

  const grant = {
    approvalId: generateApprovalId(),
    nonce: randomBytes(24).toString("hex"),
    expiresAt: Date.now() + APPROVAL_GRANT_TTL_MS,
    pageRevision:
      typeof record(raw.envelope).pageRevision === "number"
        ? (record(raw.envelope).pageRevision as number)
        : 0,
  };
  await database.transact(
    database.tx.nodeCommands[raw.id].update({
      state: "pending",
      approval: grant,
      updatedAt: new Date(),
    }),
  );
  return existingNodeCommand({ ...raw, state: "pending", approval: grant });
}

function existingNodeCommand(raw: Record<string, unknown> & { id: string }): NodeCommandRecord {
  return {
    id: raw.id,
    commandId: textValue(raw, "commandId"),
    userId: textValue(raw, "userId"),
    nodeId: textValue(raw, "nodeId"),
    state: textValue(raw, "state") as NodeCommandRecord["state"],
    summary: textValue(raw, "summary"),
    capability: textValue(raw, "capability"),
    envelope: record(raw.envelope),
    approval: isRecordValue(raw.approval) ? raw.approval : undefined,
    result: raw.result,
    expiresAt: asDateValue(raw.expiresAt),
    createdAt: asDateValue(raw.createdAt),
    updatedAt: asDateValue(raw.updatedAt),
  };
}

const isRecordValue = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Atomically claims pending commands for delivery and returns them. */
export async function takePendingNodeCommands(nodeId: string): Promise<Array<Record<string, unknown>>> {
  const database = await getDb();
  if (!database) return [];
  const { nodeCommands } = await database.query({
    nodeCommands: { $: { where: { nodeId, state: "pending" } } },
  });
  const deliverable = (nodeCommands as unknown as Array<Record<string, unknown> & { id: string }>)
    .filter((row) => asDateValue(row.expiresAt).getTime() > Date.now())
    .slice(0, 16);
  for (const row of deliverable) {
    await database.transact(
      database.tx.nodeCommands[row.id].update({ state: "delivered", updatedAt: new Date() }),
    );
  }
  return deliverable.map((row) => ({
    commandId: textValue(row, "commandId"),
    envelope: record(row.envelope),
    approval: isRecordValue(row.approval) ? row.approval : undefined,
  }));
}

export async function completeNodeCommand(commandId: string, report: { ok: boolean; result?: unknown; code?: string; message?: string }): Promise<void> {
  const database = await getDb();
  if (!database) return;
  await database.transact(
    database.tx.nodeCommands.lookup("commandId", commandId).update({
      state: "completed",
      result: { ok: report.ok, result: report.result ?? null, code: report.code ?? null, message: report.message ?? null },
      updatedAt: new Date(),
    }),
  );
}

export async function listRecentNodeCommands(userId: string, limit = 30): Promise<NodeCommandRecord[]> {
  const database = await getDb();
  if (!database) return [];
  const { nodeCommands } = await database.query({
    nodeCommands: { $: { where: { userId } } },
  });
  return (nodeCommands as unknown as Array<Record<string, unknown> & { id: string }>)
    .map(existingNodeCommand)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, Math.max(1, Math.min(limit, 100)));
}
