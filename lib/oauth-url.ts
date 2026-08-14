export type OAuthProvider = "google" | "github";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") return globalThis.btoa(value);
  const BufferImpl = (globalThis as Record<string, unknown>).Buffer as { from?: (value: string, encoding: string) => { toString: (encoding: string) => string } } | undefined;
  return BufferImpl?.from ? BufferImpl.from(value, "utf-8").toString("base64") : value;
};

export const buildLoginUrl = ({ portalUrl, appId, redirectUri, provider }: { portalUrl: string; appId: string; redirectUri: string; provider?: OAuthProvider }) => {
  const url = new URL(`${portalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", encodeState(redirectUri));
  url.searchParams.set("type", "signIn");
  if (provider) url.searchParams.set("provider", provider);
  return url.toString();
};
