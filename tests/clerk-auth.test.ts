import { describe, expect, it } from "vitest";

import { clerkOpenId, extractClerkBearerToken } from "../server/clerk-auth";

describe("Clerk request helpers", () => {
  it("accepts only bearer session tokens and namespaces Clerk user identities", () => {
    expect(extractClerkBearerToken("Bearer session-token")).toBe("session-token");
    expect(extractClerkBearerToken("Basic session-token")).toBeNull();
    expect(extractClerkBearerToken(undefined)).toBeNull();
    expect(clerkOpenId("user_abc123")).toBe("clerk:user_abc123");
  });
});
