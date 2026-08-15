import { describe, expect, it } from "vitest";

import { buildLoginUrl } from "../lib/oauth-url";

describe("provider-aware OAuth URLs", () => {
  const base = { portalUrl: "https://identity.example.test", appId: "rook-app", redirectUri: "rook://oauth/callback" };

  it("requests Google from the secure hosted sign-in flow", () => {
    const url = new URL(buildLoginUrl({ ...base, provider: "google" }));
    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("appId")).toBe("rook-app");
  });

  it("requests GitHub from the secure hosted sign-in flow", () => {
    const url = new URL(buildLoginUrl({ ...base, provider: "github" }));
    expect(url.searchParams.get("provider")).toBe("github");
    expect(url.searchParams.get("redirectUri")).toBe(base.redirectUri);
    expect(url.searchParams.get("type")).toBe("signIn");
  });
});
