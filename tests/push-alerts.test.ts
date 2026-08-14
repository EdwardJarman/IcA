import { describe, expect, it } from "vitest";

import { buildExpoPushPayload, isExpoPushToken } from "../server/push-alerts";

describe("Expo task-alert payloads", () => {
  it("accepts both supported Expo push-token formats", () => {
    expect(isExpoPushToken("ExponentPushToken[abcdefghijklmnop]")).toBe(true);
    expect(isExpoPushToken("ExpoPushToken[abcdefghijklmnop]")).toBe(true);
    expect(isExpoPushToken("not-a-push-token")).toBe(false);
  });

  it("builds an approval alert with safe activity routing data", () => {
    expect(buildExpoPushPayload({
      expoPushToken: "ExpoPushToken[abcdefghijklmnop]",
      kind: "approval",
      title: "Approval needed",
      body: "Review the proposed action.",
      url: "/activity",
    })).toMatchObject({
      priority: "high",
      channelId: "workroom-alerts",
      data: { kind: "approval", url: "/activity" },
    });
  });
});
