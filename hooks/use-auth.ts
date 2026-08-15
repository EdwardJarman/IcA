import { useAuth as useClerkAuth, useUser } from "@clerk/expo";
import { useCallback, useMemo } from "react";

export type UmUAuthUser = {
  id: string;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: "clerk" | "google" | "github";
  lastSignedIn: Date;
};

/**
 * Keeps the app's existing auth-facing interface while sourcing all session
 * state and sign-out behavior from Clerk.
 */
export function useAuth() {
  const { isLoaded, isSignedIn, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();

  const user = useMemo<UmUAuthUser | null>(() => {
    if (!isSignedIn || !clerkUser) return null;
    return {
      id: `clerk:${clerkUser.id}`,
      openId: `clerk:${clerkUser.id}`,
      name: clerkUser.fullName || clerkUser.username || null,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      loginMethod: "clerk",
      lastSignedIn: new Date(clerkUser.lastSignInAt ?? Date.now()),
    };
  }, [clerkUser, isSignedIn]);

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return {
    user,
    loading: !isLoaded,
    error: null,
    isAuthenticated: Boolean(isSignedIn && user),
    refresh: async () => undefined,
    logout,
  };
}
