import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RookDesktopSidebar } from "@/components/rook-desktop-sidebar";
import { RookFloatingDock } from "@/components/rook-floating-dock";
import { DockVisibilityProvider, useDockVisibility } from "@/lib/dock-visibility";

const DESKTOP_SIDEBAR_BREAKPOINT = 960;

export default function TabLayout() {
  return <DockVisibilityProvider><RookTabs /></DockVisibilityProvider>;
}

function RookTabs() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { dockVisible } = useDockVisibility();
  const desktopSidebar = Platform.OS === "web" && width >= DESKTOP_SIDEBAR_BREAKPOINT;
  const dockBottom = Platform.OS === "web" ? 18 : Math.max(insets.bottom, 12);
  const sceneBottomInset = desktopSidebar ? 0 : dockVisible ? 94 + dockBottom : 0;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { paddingBottom: sceneBottomInset, paddingLeft: desktopSidebar ? 264 : 0 } }}
      tabBar={(props) => desktopSidebar ? <RookDesktopSidebar {...props} /> : <RookFloatingDock {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Work", tabBarAccessibilityLabel: "Work" }} />
      <Tabs.Screen name="bots" options={{ title: "Bots", tabBarAccessibilityLabel: "Bots" }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarAccessibilityLabel: "Library" }} />
      <Tabs.Screen name="activity" options={{ title: "Updates", tabBarAccessibilityLabel: "Updates" }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarAccessibilityLabel: "Account" }} />
    </Tabs>
  );
}
