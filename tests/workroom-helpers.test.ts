import { describe, expect, it } from "vitest";

import { approvalReason, fileSizeLabel, requiresApproval } from "../lib/workroom-helpers";

describe("workroom safety helpers", () => {
  it("requires approval for public, destructive, financial, and production actions", () => {
    expect(requiresApproval("Send the client the draft")).toBe(true);
    expect(requiresApproval("Publish the announcement")).toBe(true);
    expect(requiresApproval("Delete the old workspace")).toBe(true);
    expect(requiresApproval("Deploy the change to production")).toBe(true);
  });

  it("does not create approval friction for low-risk drafting work", () => {
    expect(requiresApproval("Summarize the attached notes into a clear brief")).toBe(false);
  });

  it("returns user-facing reasons and stable file labels", () => {
    expect(approvalReason("Send the client the draft")).toContain("communicate outside");
    expect(fileSizeLabel(512)).toBe("512 B");
    expect(fileSizeLabel(2048)).toBe("2 KB");
  });
});
