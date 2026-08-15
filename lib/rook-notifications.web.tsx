import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const PREFERENCES_KEY = "rook-notification-preferences-v1";
const INSTALLATION_KEY = "rook-installation-id-v1";
export type NotificationKind = "approval" | "completion";
export type NotificationPreferences = { approval: boolean; completion: boolean };
export type NotificationStatus = "Not enabled" | "Enabled" | "Permission denied" | "Native build required" | "Unavailable on web";
type NotificationContextValue = { ready: boolean; status: NotificationStatus; expoPushToken: string | null; installationId: string | null; preferences: NotificationPreferences; enableAlerts: () => Promise<void>; setPreference: (kind: NotificationKind, enabled: boolean) => void; sendTaskAlert: (event: { kind: NotificationKind; title: string; body: string; url: string }) => Promise<void> };
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/** Browser implementation intentionally avoids importing expo-notifications. */
export function RookNotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const deliveryMutation = trpc.notifications.deliver.useMutation();
  const preferencesQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated, retry: 1, refetchOnWindowFocus: false });
  const savePreferences = trpc.preferences.save.useMutation();
  const [ready, setReady] = useState(false);
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({ approval: true, completion: true });

  useEffect(() => {
    void (async () => {
      const [raw, storedId] = await Promise.all([AsyncStorage.getItem(PREFERENCES_KEY), AsyncStorage.getItem(INSTALLATION_KEY)]);
      const nextId = storedId ?? `rook-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
      if (!storedId) await AsyncStorage.setItem(INSTALLATION_KEY, nextId);
      setInstallationId(nextId);
      if (raw) {
        try {
          setPreferences({ approval: true, completion: true, ...JSON.parse(raw) });
        } catch {
          // Retain safe local defaults when cached preferences cannot be parsed.
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!preferencesQuery.data) return;
    const next = { approval: preferencesQuery.data.approval, completion: preferencesQuery.data.completion };
    setPreferences(next);
    void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  }, [preferencesQuery.data]);

  const enableAlerts = useCallback(async () => undefined, []);
  const setPreference = useCallback((kind: NotificationKind, enabled: boolean) => {
    const next = { ...preferences, [kind]: enabled };
    setPreferences(next);
    void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
    if (isAuthenticated) void savePreferences.mutateAsync(next).catch(() => undefined);
  }, [isAuthenticated, preferences, savePreferences]);
  const sendTaskAlert = useCallback(async (event: { kind: NotificationKind; title: string; body: string; url: string }) => {
    if (!preferences[event.kind] || !isAuthenticated) return;
    await deliveryMutation.mutateAsync(event).catch(() => undefined);
  }, [deliveryMutation, isAuthenticated, preferences]);

  const value = useMemo<NotificationContextValue>(() => ({ ready, status: "Unavailable on web", expoPushToken: null, installationId, preferences, enableAlerts, setPreference, sendTaskAlert }), [enableAlerts, installationId, preferences, ready, sendTaskAlert, setPreference]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useRookNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useRookNotifications must be used inside RookNotificationProvider");
  return context;
}
