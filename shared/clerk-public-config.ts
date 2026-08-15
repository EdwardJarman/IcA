export type ClerkBuildEnvironment = {
  [key: string]: string | undefined;
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
};

/**
 * Expo embeds EXPO_PUBLIC_* values at bundle time. Vercel projects commonly
 * store Clerk's public key as CLERK_PUBLISHABLE_KEY, so accept either name.
 */
export function resolveClerkPublishableKey(environment: ClerkBuildEnvironment): string {
  return environment.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? environment.CLERK_PUBLISHABLE_KEY ?? "";
}
