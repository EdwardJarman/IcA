import type { WorkroomCloudSnapshot } from "./workroom-snapshot";

export type UserRole = "user" | "admin";

export type User = {
  id: string;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type InsertUser = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: UserRole;
  createdAt?: Date;
  updatedAt?: Date;
  lastSignedIn?: Date;
};

export type PushDevice = {
  id: string;
  userId: string;
  installationId: string;
  expoPushToken: string;
  approvalEnabled: boolean;
  completionEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertPushDevice = {
  installationId: string;
  expoPushToken: string;
  approvalEnabled: boolean;
  completionEnabled: boolean;
};

export type MicrosoftConnection = {
  id: string;
  userId: string;
  microsoftUserId: string;
  displayName: string | null;
  email: string | null;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  expiresAt: Date;
  scopes: string;
  status: "connected" | "reauthorize";
  createdAt: Date;
  updatedAt: Date;
};

export type InsertMicrosoftConnection = Omit<
  MicrosoftConnection,
  "id" | "createdAt" | "updatedAt"
> & {
  displayName?: string | null;
  email?: string | null;
  status?: "connected" | "reauthorize";
};

export type ExcelActionState =
  | "pending"
  | "executing"
  | "executed"
  | "failed"
  | "declined"
  | "expired";

export type ExcelPendingAction = {
  id: string;
  userId: string;
  botClientId: string;
  taskClientId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  summary: string;
  state: ExcelActionState;
  result?: unknown;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertExcelPendingAction = Omit<
  ExcelPendingAction,
  "createdAt" | "updatedAt" | "state" | "result"
> & {
  state?: ExcelActionState;
  result?: unknown;
};

export type WorkroomSnapshotRecord = {
  id: string;
  userId: string;
  syncVersion: string;
  snapshot: WorkroomCloudSnapshot;
  createdAt: Date;
  updatedAt: Date;
};
