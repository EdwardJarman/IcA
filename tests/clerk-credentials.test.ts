import { createClerkClient } from "@clerk/backend";
import { describe, expect, it } from "vitest";

describe("Clerk server credentials", () => {
  it("authenticates a lightweight request to the linked Clerk instance", async () => {
    const secretKey = process.env.CLERK_SECRET_KEY;

    expect(secretKey).toBeTruthy();

    const client = createClerkClient({ secretKey });
    const instance = await client.instance.get();

    expect(instance.id).toBeTruthy();
  });
});
