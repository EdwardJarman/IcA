import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { InsertPushDevice, InsertUser, pushDevices, userNotificationPreferences, users, workroomBots, workroomFiles, workroomSnapshots, workroomTasks } from "../drizzle/schema";
import type { WorkroomCloudSnapshot } from "../shared/workroom-snapshot";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertPushDevice(userId: number, device: Pick<InsertPushDevice, "installationId" | "expoPushToken" | "approvalEnabled" | "completionEnabled">) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(pushDevices).values({ ...device, userId }).onDuplicateKeyUpdate({
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
  const result = await db.select().from(pushDevices).where(eq(pushDevices.installationId, installationId)).limit(1);
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
  const result = await db.select().from(userNotificationPreferences).where(eq(userNotificationPreferences.userId, userId)).limit(1);
  return result[0];
}

export async function upsertNotificationPreferences(userId: number, preferences: { approvalEnabled: boolean; completionEnabled: boolean }) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(userNotificationPreferences).values({ userId, ...preferences }).onDuplicateKeyUpdate({ set: { ...preferences, updatedAt: new Date() } });
  return true;
}

export async function getWorkroomSnapshot(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workroomSnapshots).where(eq(workroomSnapshots.userId, userId)).limit(1);
  return result[0];
}

export async function upsertWorkroomSnapshot(userId: number, snapshot: WorkroomCloudSnapshot) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(workroomSnapshots).values({ userId, snapshot }).onDuplicateKeyUpdate({ set: { snapshot, updatedAt: new Date() } });
  return true;
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const textValue = (source: Record<string, unknown>, key: string, fallback = "") => typeof source[key] === "string" ? source[key] : fallback;

export async function syncNormalizedWorkroomRecords(userId: number, snapshot: WorkroomCloudSnapshot) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(workroomBots).where(eq(workroomBots.userId, userId));
  await db.delete(workroomTasks).where(eq(workroomTasks.userId, userId));
  await db.delete(workroomFiles).where(eq(workroomFiles.userId, userId));
  const bots = snapshot.bots.map(record).filter((item) => textValue(item, "id") && textValue(item, "name"));
  const tasks = snapshot.tasks.map(record).filter((item) => textValue(item, "id") && textValue(item, "title"));
  const files = snapshot.files.map(record).filter((item) => textValue(item, "id") && textValue(item, "name"));
  if (bots.length) await db.insert(workroomBots).values(bots.map((bot) => ({ userId, clientId: textValue(bot, "id"), name: textValue(bot, "name"), role: textValue(bot, "role"), status: textValue(bot, "status", "Ready"), color: textValue(bot, "color", "#7563F5"), icon: textValue(bot, "icon", "auto-awesome"), payload: bot })));
  if (tasks.length) await db.insert(workroomTasks).values(tasks.map((task) => ({ userId, clientId: textValue(task, "id"), botClientId: textValue(task, "botId"), title: textValue(task, "title"), status: textValue(task, "status", "Draft"), risk: textValue(task, "risk", "Low"), payload: task })));
  if (files.length) await db.insert(workroomFiles).values(files.map((file) => ({ userId, clientId: textValue(file, "id"), name: textValue(file, "name"), owner: textValue(file, "owner"), scope: textValue(file, "scope", "Bot-private"), payload: file })));
  return true;
}

export async function listNormalizedWorkroomRecords(userId: number) {
  const db = await getDb();
  if (!db) return { bots: [], tasks: [], files: [] };
  const [bots, tasks, files] = await Promise.all([db.select().from(workroomBots).where(eq(workroomBots.userId, userId)), db.select().from(workroomTasks).where(eq(workroomTasks.userId, userId)), db.select().from(workroomFiles).where(eq(workroomFiles.userId, userId))]);
  return { bots, tasks, files };
}

export async function exportAccountWorkroomData(userId: number) {
  const [snapshot, records, preferences] = await Promise.all([getWorkroomSnapshot(userId), listNormalizedWorkroomRecords(userId), getNotificationPreferences(userId)]);
  return { exportedAt: new Date().toISOString(), snapshot: snapshot?.snapshot ?? null, records, notificationPreferences: preferences ? { approval: preferences.approvalEnabled, completion: preferences.completionEnabled } : { approval: true, completion: true } };
}

export async function deleteAccountWorkroomData(userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(workroomSnapshots).where(eq(workroomSnapshots.userId, userId));
  await db.delete(workroomBots).where(eq(workroomBots.userId, userId));
  await db.delete(workroomTasks).where(eq(workroomTasks.userId, userId));
  await db.delete(workroomFiles).where(eq(workroomFiles.userId, userId));
  await db.delete(userNotificationPreferences).where(eq(userNotificationPreferences.userId, userId));
  await db.delete(pushDevices).where(eq(pushDevices.userId, userId));
  return true;
}
