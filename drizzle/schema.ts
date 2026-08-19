/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
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
  userId: int("userId"),
  installationId: varchar("installationId", { length: 96 }).notNull().unique(),
  expoPushToken: varchar("expoPushToken", { length: 255 }).notNull(),
  approvalEnabled: boolean("approvalEnabled").default(true).notNull(),
  completionEnabled: boolean("completionEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushDevice = typeof pushDevices.$inferSelect;
export type InsertPushDevice = typeof pushDevices.$inferInsert;

export const userNotificationPreferences = mysqlTable("userNotificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  approvalEnabled: boolean("approvalEnabled").default(true).notNull(),
  completionEnabled: boolean("completionEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const microsoftConnections = mysqlTable("microsoftConnections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  microsoftUserId: varchar("microsoftUserId", { length: 255 }).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  email: varchar("email", { length: 320 }),
  encryptedAccessToken: text("encryptedAccessToken").notNull(),
  encryptedRefreshToken: text("encryptedRefreshToken").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  scopes: text("scopes").notNull(),
  status: mysqlEnum("status", ["connected", "reauthorize"]).default("connected").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const microsoftOAuthStates = mysqlTable("microsoftOAuthStates", {
  state: varchar("state", { length: 96 }).primaryKey(),
  userId: int("userId").notNull(),
  codeVerifier: varchar("codeVerifier", { length: 160 }).notNull(),
  returnTo: varchar("returnTo", { length: 500 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("microsoftOAuthStates_user_idx").on(table.userId)]);

export const excelPendingActions = mysqlTable("excelPendingActions", {
  id: varchar("id", { length: 96 }).primaryKey(),
  userId: int("userId").notNull(),
  botClientId: varchar("botClientId", { length: 128 }).notNull(),
  taskClientId: varchar("taskClientId", { length: 128 }).notNull(),
  toolName: varchar("toolName", { length: 64 }).notNull(),
  arguments: json("arguments").notNull(),
  summary: text("summary").notNull(),
  state: mysqlEnum("state", ["pending", "executed", "declined", "expired"]).default("pending").notNull(),
  result: json("result"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("excelPendingActions_user_idx").on(table.userId), index("excelPendingActions_task_idx").on(table.taskClientId)]);

export const workroomSnapshots = mysqlTable("workroomSnapshots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  snapshot: json("snapshot").$type<WorkroomCloudSnapshot>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkroomSnapshot = typeof workroomSnapshots.$inferSelect;
export type InsertWorkroomSnapshot = typeof workroomSnapshots.$inferInsert;

export const workroomBots = mysqlTable("workroomBots", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: varchar("clientId", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  color: varchar("color", { length: 32 }).notNull(),
  icon: varchar("icon", { length: 96 }).notNull(),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("workroomBots_user_idx").on(table.userId), uniqueIndex("workroomBots_user_client_unique").on(table.userId, table.clientId)]);

export const workroomTasks = mysqlTable("workroomTasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: varchar("clientId", { length: 128 }).notNull(),
  botClientId: varchar("botClientId", { length: 128 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 64 }).notNull(),
  risk: varchar("risk", { length: 32 }).notNull(),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("workroomTasks_user_idx").on(table.userId), uniqueIndex("workroomTasks_user_client_unique").on(table.userId, table.clientId)]);

export const workroomFiles = mysqlTable("workroomFiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: varchar("clientId", { length: 128 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  owner: varchar("owner", { length: 255 }).notNull(),
  scope: varchar("scope", { length: 96 }).notNull(),
  payload: json("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("workroomFiles_user_idx").on(table.userId), uniqueIndex("workroomFiles_user_client_unique").on(table.userId, table.clientId)]);
