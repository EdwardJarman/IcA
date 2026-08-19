import { drizzle } from "drizzle-orm/mysql2";
import { and, eq, sql } from "drizzle-orm";
import {
  InsertPushDevice,
  InsertUser,
  excelPendingActions,
  microsoftConnections,
  microsoftOAuthStates,
  pushDevices,
  userNotificationPreferences,
  users,
  workroomBots,
  workroomFiles,
  workroomSnapshots,
  workroomTasks,
} from "../drizzle/schema";
import type { WorkroomCloudSnapshot } from "../shared/workroom-snapshot";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let integrationTablesPromise: Promise<void> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function getIntegrationDb() {
  const database = await getDb();
  if (!database) return null;
  if (!integrationTablesPromise) {
    integrationTablesPromise = (async () => {
      await database.execute(sql.raw(`CREATE TABLE IF NOT EXISTS microsoftConnections (
        id int AUTO_INCREMENT PRIMARY KEY,
        userId int NOT NULL UNIQUE,
        microsoftUserId varchar(255) NOT NULL,
        displayName varchar(255),
        email varchar(320),
        encryptedAccessToken text NOT NULL,
        encryptedRefreshToken text NOT NULL,
        expiresAt timestamp NOT NULL,
        scopes text NOT NULL,
        status enum('connected','reauthorize') NOT NULL DEFAULT 'connected',
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`));
      await database.execute(sql.raw(`CREATE TABLE IF NOT EXISTS microsoftOAuthStates (
        state varchar(96) PRIMARY KEY,
        userId int NOT NULL,
        codeVerifier varchar(160) NOT NULL,
        returnTo varchar(500) NOT NULL,
        expiresAt timestamp NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX microsoftOAuthStates_user_idx (userId)
      )`));
      await database.execute(sql.raw(`CREATE TABLE IF NOT EXISTS excelPendingActions (
        id varchar(96) PRIMARY KEY,
        userId int NOT NULL,
        botClientId varchar(128) NOT NULL,
        taskClientId varchar(128) NOT NULL,
        toolName varchar(64) NOT NULL,
        arguments json NOT NULL,
        summary text NOT NULL,
        state enum('pending','executed','declined','expired') NOT NULL DEFAULT 'pending',
        result json,
        expiresAt timestamp NOT NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX excelPendingActions_user_idx (userId),
        INDEX excelPendingActions_task_idx (taskClientId)
      )`));
    })().catch((error) => {
      integrationTablesPromise = null;
      throw error;
    });
  }
  await integrationTablesPromise;
  return database;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertPushDevice(
  userId: number,
  device: Pick<
    InsertPushDevice,
    "installationId" | "expoPushToken" | "approvalEnabled" | "completionEnabled"
  >,
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .insert(pushDevices)
    .values({ ...device, userId })
    .onDuplicateKeyUpdate({
      set: {
        userId,
        expoPushToken: device.expoPushToken,
        approvalEnabled: device.approvalEnabled,
        completionEnabled: device.completionEnabled,
        updatedAt: new Date(),
      },
    });
  return true;
}

export async function getPushDevice(installationId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(pushDevices)
    .where(eq(pushDevices.installationId, installationId))
    .limit(1);
  return result[0];
}

export async function getPushDevicesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushDevices).where(eq(pushDevices.userId, userId));
}

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertNotificationPreferences(
  userId: number,
  preferences: { approvalEnabled: boolean; completionEnabled: boolean },
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .insert(userNotificationPreferences)
    .values({ userId, ...preferences })
    .onDuplicateKeyUpdate({ set: { ...preferences, updatedAt: new Date() } });
  return true;
}

export async function getWorkroomSnapshot(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(workroomSnapshots)
    .where(eq(workroomSnapshots.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertWorkroomSnapshot(
  userId: number,
  snapshot: WorkroomCloudSnapshot,
) {
  const db = await getDb();
  if (!db) return false;
  await db
    .insert(workroomSnapshots)
    .values({ userId, snapshot })
    .onDuplicateKeyUpdate({ set: { snapshot, updatedAt: new Date() } });
  return true;
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const textValue = (
  source: Record<string, unknown>,
  key: string,
  fallback = "",
) => (typeof source[key] === "string" ? source[key] : fallback);

export async function syncNormalizedWorkroomRecords(
  userId: number,
  snapshot: WorkroomCloudSnapshot,
) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(workroomBots).where(eq(workroomBots.userId, userId));
  await db.delete(workroomTasks).where(eq(workroomTasks.userId, userId));
  await db.delete(workroomFiles).where(eq(workroomFiles.userId, userId));
  const bots = snapshot.bots
    .map(record)
    .filter((item) => textValue(item, "id") && textValue(item, "name"));
  const tasks = snapshot.tasks
    .map(record)
    .filter((item) => textValue(item, "id") && textValue(item, "title"));
  const files = snapshot.files
    .map(record)
    .filter((item) => textValue(item, "id") && textValue(item, "name"));
  if (bots.length)
    await db
      .insert(workroomBots)
      .values(
        bots.map((bot) => ({
          userId,
          clientId: textValue(bot, "id"),
          name: textValue(bot, "name"),
          role: textValue(bot, "role"),
          status: textValue(bot, "status", "Ready"),
          color: textValue(bot, "color", "#7563F5"),
          icon: textValue(bot, "icon", "auto-awesome"),
          payload: bot,
        })),
      );
  if (tasks.length)
    await db
      .insert(workroomTasks)
      .values(
        tasks.map((task) => ({
          userId,
          clientId: textValue(task, "id"),
          botClientId: textValue(task, "botId"),
          title: textValue(task, "title"),
          status: textValue(task, "status", "Draft"),
          risk: textValue(task, "risk", "Low"),
          payload: task,
        })),
      );
  if (files.length)
    await db
      .insert(workroomFiles)
      .values(
        files.map((file) => ({
          userId,
          clientId: textValue(file, "id"),
          name: textValue(file, "name"),
          owner: textValue(file, "owner"),
          scope: textValue(file, "scope", "Bot-private"),
          payload: file,
        })),
      );
  return true;
}

export async function listNormalizedWorkroomRecords(userId: number) {
  const db = await getDb();
  if (!db) return { bots: [], tasks: [], files: [] };
  const [bots, tasks, files] = await Promise.all([
    db.select().from(workroomBots).where(eq(workroomBots.userId, userId)),
    db.select().from(workroomTasks).where(eq(workroomTasks.userId, userId)),
    db.select().from(workroomFiles).where(eq(workroomFiles.userId, userId)),
  ]);
  return { bots, tasks, files };
}

export async function createMicrosoftOAuthState(input: {
  state: string;
  userId: number;
  codeVerifier: string;
  returnTo: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(microsoftOAuthStates).values(input);
}

export async function consumeMicrosoftOAuthState(state: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db
    .select()
    .from(microsoftOAuthStates)
    .where(eq(microsoftOAuthStates.state, state))
    .limit(1);
  await db
    .delete(microsoftOAuthStates)
    .where(eq(microsoftOAuthStates.state, state));
  const record = result[0];
  if (!record || record.expiresAt.getTime() <= Date.now()) return undefined;
  return record;
}

export async function getMicrosoftConnection(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(microsoftConnections)
    .where(eq(microsoftConnections.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertMicrosoftConnection(
  input: typeof microsoftConnections.$inferInsert,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db
    .insert(microsoftConnections)
    .values(input)
    .onDuplicateKeyUpdate({
      set: {
        microsoftUserId: input.microsoftUserId,
        displayName: input.displayName,
        email: input.email,
        encryptedAccessToken: input.encryptedAccessToken,
        encryptedRefreshToken: input.encryptedRefreshToken,
        expiresAt: input.expiresAt,
        scopes: input.scopes,
        status: input.status ?? "connected",
        updatedAt: new Date(),
      },
    });
}

export async function updateMicrosoftTokens(
  userId: number,
  input: {
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    expiresAt: Date;
    scopes: string;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db
    .update(microsoftConnections)
    .set({ ...input, status: "connected", updatedAt: new Date() })
    .where(eq(microsoftConnections.userId, userId));
}

export async function markMicrosoftReauthorizationRequired(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(microsoftConnections)
    .set({ status: "reauthorize", updatedAt: new Date() })
    .where(eq(microsoftConnections.userId, userId));
}

export async function deleteMicrosoftConnection(userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(microsoftConnections)
    .where(eq(microsoftConnections.userId, userId));
  await db
    .delete(microsoftOAuthStates)
    .where(eq(microsoftOAuthStates.userId, userId));
  await db
    .delete(excelPendingActions)
    .where(eq(excelPendingActions.userId, userId));
  return true;
}

export async function createExcelPendingAction(
  input: typeof excelPendingActions.$inferInsert,
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(excelPendingActions).values(input);
}

export async function getExcelPendingAction(userId: number, id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(excelPendingActions)
    .where(
      and(
        eq(excelPendingActions.userId, userId),
        eq(excelPendingActions.id, id),
      ),
    )
    .limit(1);
  return result[0];
}

export async function resolveExcelPendingAction(
  userId: number,
  id: string,
  input: {
    state: "executed" | "declined" | "expired";
    result?: unknown;
  },
) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db
    .update(excelPendingActions)
    .set({ ...input, updatedAt: new Date() })
    .where(
      and(
        eq(excelPendingActions.userId, userId),
        eq(excelPendingActions.id, id),
        eq(excelPendingActions.state, "pending"),
      ),
    );
}

export async function exportAccountWorkroomData(userId: number) {
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

export async function deleteAccountWorkroomData(userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .delete(workroomSnapshots)
    .where(eq(workroomSnapshots.userId, userId));
  await db.delete(workroomBots).where(eq(workroomBots.userId, userId));
  await db.delete(workroomTasks).where(eq(workroomTasks.userId, userId));
  await db.delete(workroomFiles).where(eq(workroomFiles.userId, userId));
  await db
    .delete(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId));
  await db.delete(pushDevices).where(eq(pushDevices.userId, userId));
  await db
    .delete(microsoftConnections)
    .where(eq(microsoftConnections.userId, userId));
  await db
    .delete(microsoftOAuthStates)
    .where(eq(microsoftOAuthStates.userId, userId));
  await db
    .delete(excelPendingActions)
    .where(eq(excelPendingActions.userId, userId));
  return true;
}
