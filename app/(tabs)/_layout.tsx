import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RookFloatingDock } from "@/components/rook-floating-dock";
import { DockVisibilityProvider, useDockVisibility } from "@/lib/dock-visibility";

export default function TabLayout() {
  return (
    <DockVisibilityProvider>
      <RookTabs />
    </DockVisibilityProvider>
  );
}

function RookTabs() {
  const insets = useSafeAreaInsets();
  const { dockVisible } = useDockVisibility();
  const dockBottom = Platform.OS === "web" ? 18 : Math.max(insets.bottom, 12);
  const sceneBottomInset = dockVisible ? 82 + dockBottom : 0;

  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { paddingBottom: sceneBottomInset } }} tabBar={(props) => <RookFloatingDock {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Work", tabBarAccessibilityLabel: "Work" }} />
      <Tabs.Screen name="bots" options={{ title: "Bots", tabBarAccessibilityLabel: "Bots" }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarAccessibilityLabel: "Library" }} />
      <Tabs.Screen name="activity" options={{ title: "Updates", tabBarAccessibilityLabel: "Updates" }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarAccessibilityLabel: "Account" }} />
    </Tabs>
  );
}
