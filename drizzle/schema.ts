/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import type { WorkroomCloudSnapshot } from "../shared/workroom-snapshot";

export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const pushDevices = mysqlTable("pushDevices", {
  id: int("id").autoincrement().primaryKey(),
  installationId: varchar("installationId", { length: 96 }).notNull().unique(),
  expoPushToken: varchar("expoPushToken", { length: 255 }).notNull(),
  approvalEnabled: boolean("approvalEnabled").default(true).notNull(),
  completionEnabled: boolean("completionEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushDevice = typeof pushDevices.$inferSelect;
export type InsertPushDevice = typeof pushDevices.$inferInsert;

export const workroomSnapshots = mysqlTable("workroomSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  snapshot: json("snapshot").$type<WorkroomCloudSnapshot>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkroomSnapshot = typeof workroomSnapshots.$inferSelect;
export type InsertWorkroomSnapshot = typeof workroomSnapshots.$inferInsert;
