import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { InsertPushDevice, InsertUser, pushDevices, users, workroomSnapshots } from "../drizzle/schema";
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

export async function upsertPushDevice(device: Pick<InsertPushDevice, "installationId" | "expoPushToken" | "approvalEnabled" | "completionEnabled">) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(pushDevices).values(device).onDuplicateKeyUpdate({
    set: {
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
