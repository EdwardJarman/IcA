import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";

import {
  DESKTOP_NAV_BREAKPOINT,
  DESKTOP_STAGE_INSET,
  RookDesktopSidebar,
} from "@/components/rook-desktop-sidebar";
import { DockVisibilityProvider } from "@/lib/dock-visibility";

export default function TabLayout() {
  return (
    <DockVisibilityProvider>
      <RookTabs />
    </DockVisibilityProvider>
  );
}

/**
 * Rook is one room. There is no section navigation: the chat is the whole app,
 * and on wide web canvases a glass rail on the left holds the Bot roster you
 * drag into it. Phones get the chat full-bleed with its own header actions.
 *
 * Account, updates and the remaining detail screens stay registered so links and
 * push notifications keep resolving — they are just no longer nav destinations.
 */
function RookTabs() {
  const { width } = useWindowDimensions();
  const isDesktopLayout = Platform.OS === "web" && width >= DESKTOP_NAV_BREAKPOINT;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: isDesktopLayout ? DESKTOP_STAGE_INSET : undefined,
      }}
      tabBar={(props) => (isDesktopLayout ? <RookDesktopSidebar {...props} /> : null)}
    >
      <Tabs.Screen name="index" options={{ title: "Chat", tabBarAccessibilityLabel: "Chat" }} />
      <Tabs.Screen name="bots" options={{ title: "Bots", tabBarAccessibilityLabel: "Bots" }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarAccessibilityLabel: "Library" }} />
      <Tabs.Screen name="activity" options={{ title: "Updates", tabBarAccessibilityLabel: "Updates" }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarAccessibilityLabel: "Account" }} />
    </Tabs>
  );
}
