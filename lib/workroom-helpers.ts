export function requiresApproval(input: string): boolean {
  return /\b(send|publish|post|delete|remove|purchase|buy|pay|transfer|permission|production|deploy)\b/i.test(input);
}

export function fileSizeLabel(bytes?: number): string {
  if (!bytes || bytes < 1) return "Local file";
  if (bytes < 1024) return `${bytes} B`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function approvalReason(input: string): string {
  if (/\b(send|publish|post)\b/i.test(input)) return "This action could communicate outside the workroom.";
  if (/\b(delete|remove)\b/i.test(input)) return "This action could remove information or artifacts.";
  if (/\b(purchase|buy|pay|transfer)\b/i.test(input)) return "This action could create a financial commitment.";
  if (/\b(permission|production|deploy)\b/i.test(input)) return "This action could change access or a live system.";
  return "This action needs a visible decision before Luma continues.";
}
