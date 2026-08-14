import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { trpc } from "@/lib/trpc";

const PREFERENCES_KEY = "luma-workroom-notification-preferences-v1";

export type NotificationKind = "approval" | "completion";
export type NotificationPreferences = { approval: boolean; completion: boolean };
export type NotificationStatus = "Not enabled" | "Enabled" | "Permission denied" | "Native build required" | "Unavailable on web";

type NotificationContextValue = {
  ready: boolean;
  status: NotificationStatus;
  expoPushToken: string | null;
  installationId: string | null;
  preferences: NotificationPreferences;
  enableAlerts: () => Promise<void>;
  setPreference: (kind: NotificationKind, enabled: boolean) => void;
  sendTaskAlert: (event: { kind: NotificationKind; title: string; body: string; url: string }) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function createAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("workroom-alerts", {
    name: "Workroom alerts",
    description: "Task completions and approval requests from Luma Workroom.",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 160, 110, 160],
    lightColor: "#77F3C4",
  });
}

async function requestToken(): Promise<{ status: NotificationStatus; token: string | null }> {
  if (Platform.OS === "web") return { status: "Unavailable on web", token: null };
  await createAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  const request = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
  if (request.status !== "granted") return { status: "Permission denied", token: null };

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return { status: "Native build required", token: null };
  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: "Enabled", token: token.data };
  } catch {
    return { status: "Native build required", token: null };
  }
}

async function presentLocalAlert(event: { kind: NotificationKind; title: string; body: string; url: string }) {
  if (Platform.OS === "web") return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: event.title,
      body: event.body,
      data: { kind: event.kind, url: event.url },
      sound: "default",
    },
    trigger: null,
  });
}

export function LumaNotificationProvider({ children }: { children: ReactNode }) {
  const registerMutation = trpc.notifications.register.useMutation();
  const deliveryMutation = trpc.notifications.deliver.useMutation();
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<NotificationStatus>(Platform.OS === "web" ? "Unavailable on web" : "Not enabled");
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [installationId, setInstallationId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({ approval: true, completion: true });

  useEffect(() => {
    void (async () => {
      const [raw, storedInstallationId] = await Promise.all([AsyncStorage.getItem(PREFERENCES_KEY), AsyncStorage.getItem("luma-workroom-installation-id-v1")]);
      const nextInstallationId = storedInstallationId ?? `luma-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
      if (!storedInstallationId) await AsyncStorage.setItem("luma-workroom-installation-id-v1", nextInstallationId);
      setInstallationId(nextInstallationId);
      if (raw) {
        try {
          setPreferences({ approval: true, completion: true, ...JSON.parse(raw) });
        } catch {
          // Retain the safe defaults when previously stored preferences are invalid.
        }
      }
      if (Platform.OS !== "web") {
        await createAndroidChannel();
        const permission = await Notifications.getPermissionsAsync();
        if (permission.status === "granted") setStatus("Native build required");
      }
      setReady(true);
    })();
  }, []);

  const persistPreferences = useCallback((next: NotificationPreferences) => {
    setPreferences(next);
    void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  }, []);

  const enableAlerts = useCallback(async () => {
    const result = await requestToken();
    setStatus(result.status);
    setExpoPushToken(result.token);
    if (result.token && installationId) {
      const registration = await registerMutation.mutateAsync({ installationId, expoPushToken: result.token, approvalEnabled: preferences.approval, completionEnabled: preferences.completion });
      if (registration.registered) setStatus("Enabled");
    }
  }, [installationId, preferences, registerMutation]);

  const setPreference = useCallback((kind: NotificationKind, enabled: boolean) => {
    const next = { ...preferences, [kind]: enabled };
    persistPreferences(next);
    if (installationId && expoPushToken) {
      void registerMutation.mutateAsync({ installationId, expoPushToken, approvalEnabled: next.approval, completionEnabled: next.completion });
    }
  }, [expoPushToken, installationId, persistPreferences, preferences, registerMutation]);

  const sendTaskAlert = useCallback(async (event: { kind: NotificationKind; title: string; body: string; url: string }) => {
    if (!preferences[event.kind]) return;
    if (installationId) {
      try {
        const remote = await deliveryMutation.mutateAsync({ installationId, ...event });
        if (remote.accepted) return;
      } catch {
        // Local notification below provides best-effort native feedback if remote delivery is temporarily unavailable.
      }
    }
    await presentLocalAlert(event);
  }, [deliveryMutation, installationId, preferences]);

  const value = useMemo<NotificationContextValue>(() => ({ ready, status, expoPushToken, installationId, preferences, enableAlerts, setPreference, sendTaskAlert }), [ready, status, expoPushToken, installationId, preferences, enableAlerts, setPreference, sendTaskAlert]);
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useLumaNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useLumaNotifications must be used inside LumaNotificationProvider");
  return context;
}
