/**
 * Local control gateway.
 *
 * A loopback-bound WebSocket server carrying encrypted JSON messages. Only
 * loopback/private connections are accepted; remote access is a later phase
 * and uses a separate authenticated WebRTC path, never this socket.
 *
 * Message framing:
 *   { "t": "auth",   "secret": "...", "deviceId": "..." }
 *   { "t": "command", "envelope": {...} }
 *   { "t": "takeover" } | { "t": "release" } | { "t": "pause" }
 *   { "t": "approval", "approvalId": "...", "decision": "approved"|"declined" }
 *   -> { "t": "result", "ok": true, "value": ..., "ref": "..." }
 */
import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

import type { RookConfig } from "../config.js";
import type { RookNode } from "../core/node.js";
import type { CommandRejectCode, CommandResult } from "../types.js";

export interface GatewayEvent {
  type: "command" | "takeover" | "release" | "pause" | "approval" | "auth" | "result" | "rejected";
  botId?: string;
  ref?: string;
}

export class Gateway {
  private readonly wss: WebSocketServer;
  private readonly http: http.Server;
  private readonly clients = new Map<WebSocket, { deviceId: string; authenticated: boolean }>();
  private closed = false;

  constructor(
    private readonly config: RookConfig,
    private readonly node: RookNode,
  ) {
    this.http = http.createServer();
    this.wss = new WebSocketServer({ noServer: true });

    this.http.on("upgrade", (request, socket, head) => {
      const remote: string | undefined = request.socket.remoteAddress ?? undefined;
      if (!isLoopbackAddress(remote)) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(request, socket, head, (ws) => this.onConnection(ws, remote ?? ""));
    });
  }

  private onConnection(ws: WebSocket, remoteAddress: string): void {
    this.clients.set(ws, { deviceId: "", authenticated: false });
    ws.on("message", (data) => {
      void this.onMessage(ws, data.toString());
    });
    ws.on("close", () => {
      const entry = this.clients.get(ws);
      if (entry?.deviceId) this.node.removeDeviceBinding(entry.deviceId);
      this.clients.delete(ws);
    });
    ws.on("error", () => {
      /* handled by close */
    });
  }

  private async onMessage(ws: WebSocket, raw: string): Promise<void> {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.send(ws, { type: "rejected", code: "INVALID", message: "Malformed JSON", ref: undefined });
      return;
    }
    const kind = typeof message.t === "string" ? message.t : "";
    const entry = this.clients.get(ws);
    if (!entry) return;

    switch (kind) {
      case "auth": {
        if (entry.authenticated) {
          this.send(ws, { type: "rejected", code: "INVALID", message: "Already authenticated", ref: undefined });
          return;
        }
        const secret = typeof message.secret === "string" ? message.secret : "";
        const deviceId = typeof message.deviceId === "string" ? message.deviceId : "";
        const userId = typeof message.userId === "string" ? message.userId : "";
        const botIds = Array.isArray(message.botIds) ? message.botIds.filter((b): b is string => typeof b === "string") : [];
        if (!secret || !deviceId) {
          this.send(ws, { type: "rejected", code: "INVALID", message: "Missing credentials", ref: undefined });
          return;
        }
        if (!this.config.requireAuth || secret === this.nodeSecret()) {
          entry.authenticated = true;
          entry.deviceId = deviceId;
          this.node.setDeviceBinding({ deviceId, userId, allowedBotIds: botIds });
          this.send(ws, { type: "auth", ok: true, nodeId: this.nodeIdentity(), ref: undefined });
          return;
        }
        this.send(ws, { type: "rejected", code: "UNAUTHORIZED", message: "Bad secret", ref: undefined });
        return;
      }
      case "command": {
        if (!entry.authenticated) {
          this.send(ws, { type: "rejected", code: "UNAUTHORIZED", message: "Not authenticated", ref: undefined });
          return;
        }
        const envelope = message.envelope;
        const result = await this.node.dispatch(envelope);
        this.send(ws, this.resultMessage(result, message.ref));
        return;
      }
      case "takeover": {
        if (!entry.authenticated) {
          this.send(ws, { type: "rejected", code: "UNAUTHORIZED", message: "Not authenticated", ref: undefined });
          return;
        }
        const botId = typeof message.botId === "string" ? message.botId : "";
        if (!botId) {
          this.send(ws, { type: "rejected", code: "INVALID", message: "Missing botId", ref: undefined });
          return;
        }
        const lease = this.node.leases.takeOver(botId, entry.deviceId);
        this.node.recordEvent(botId, "takeover", { deviceId: entry.deviceId, fencing: lease.fencing });
        this.send(ws, { type: "takeover", ok: true, botId, fencing: lease.fencing, ref: message.ref });
        return;
      }
      case "release": {
        if (!entry.authenticated) {
          this.send(ws, { type: "rejected", code: "UNAUTHORIZED", message: "Not authenticated", ref: undefined });
          return;
        }
        const botId = typeof message.botId === "string" ? message.botId : "";
        if (!botId) {
          this.send(ws, { type: "rejected", code: "INVALID", message: "Missing botId", ref: undefined });
          return;
        }
        const lease = this.node.leases.giveToBot(botId);
        this.node.recordEvent(botId, "release", { deviceId: entry.deviceId, fencing: lease.fencing });
        this.send(ws, { type: "release", ok: true, botId, fencing: lease.fencing, ref: message.ref });
        return;
      }
      case "pause": {
        if (!entry.authenticated) {
          this.send(ws, { type: "rejected", code: "UNAUTHORIZED", message: "Not authenticated", ref: undefined });
          return;
        }
        const botId = typeof message.botId === "string" ? message.botId : "";
        if (!botId) {
          this.send(ws, { type: "rejected", code: "INVALID", message: "Missing botId", ref: undefined });
          return;
        }
        this.node.leases.pause(botId);
        this.node.recordEvent(botId, "pause", { deviceId: entry.deviceId });
        this.send(ws, { type: "pause", ok: true, botId, ref: message.ref });
        return;
      }
      case "approval": {
        if (!entry.authenticated) {
          this.send(ws, { type: "rejected", code: "UNAUTHORIZED", message: "Not authenticated", ref: undefined });
          return;
        }
        const approvalId = typeof message.approvalId === "string" ? message.approvalId : "";
        const decision = message.decision === "approved" || message.decision === "declined" ? message.decision : undefined;
        if (!approvalId || !decision) {
          this.send(ws, { type: "rejected", code: "INVALID", message: "Invalid approval decision", ref: undefined });
          return;
        }
        const record = await this.node.resolveApproval(approvalId, decision);
        this.send(ws, { type: "approval", ok: Boolean(record), approvalId, decision, ref: message.ref });
        return;
      }
      default: {
        this.send(ws, { type: "rejected", code: "INVALID", message: `Unknown message type: ${kind}`, ref: undefined });
      }
    }
  }

  private resultMessage(result: CommandResult, ref: unknown): { type: string; ok: boolean; ref: unknown; value?: unknown; code?: CommandRejectCode; message?: string } {
    if (result.ok) {
      return { type: "result", ok: true, ref, value: result.value };
    }
    return { type: "result", ok: false, ref, code: result.code, message: result.message };
  }

  private nodeSecret(): string {
    return this.config.nodeSecret ?? process.env.ROOK_NODE_SECRET ?? "";
  }

  private nodeIdentity(): string {
    return this.node.db.getNodeIdentity()?.nodeId ?? "";
  }

  private send(ws: WebSocket, payload: unknown): void {
    if (this.closed) return;
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
  }

  async listen(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.http.once("error", reject);
      this.http.listen(this.config.gatewayPort, "127.0.0.1", () => resolve());
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    for (const ws of this.clients.keys()) {
      ws.close();
    }
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.http.close(() => resolve()));
  }
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}