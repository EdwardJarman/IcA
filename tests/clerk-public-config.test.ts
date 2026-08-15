import { describe, expect, it } from "vitest";

import { resolveClerkPublishableKey } from "../shared/clerk-public-config";

describe("Clerk public build configuration", () => {
  it("prefers Expo's public name and accepts Vercel's standard Clerk key name", () => {
    expect(resolveClerkPublishableKey({ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_expo", CLERK_PUBLISHABLE_KEY: "pk_clerk" })).toBe("pk_expo");
    expect(resolveClerkPublishableKey({ CLERK_PUBLISHABLE_KEY: "pk_clerk" })).toBe("pk_clerk");
    expect(resolveClerkPublishableKey({})).toBe("");
  });
});
