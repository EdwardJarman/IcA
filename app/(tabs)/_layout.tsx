import { Tabs } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DESKTOP_NAV_BREAKPOINT,
  DESKTOP_STAGE_INSET,
  RookDesktopSidebar,
} from "@/components/rook-desktop-sidebar";
import { RookFloatingDock } from "@/components/rook-floating-dock";
import { DockVisibilityProvider, useDockVisibility } from "@/lib/dock-visibility";

export default function TabLayout() {
  return <DockVisibilityProvider><RookTabs /></DockVisibilityProvider>;
}

function RookTabs() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { dockVisible } = useDockVisibility();

  /* Wide web canvases navigate from a left sidebar; every mobile surface keeps the floating dock. */
  const isDesktopLayout = Platform.OS === "web" && width >= DESKTOP_NAV_BREAKPOINT;
  const dockBottom = Platform.OS === "web" ? 18 : Math.max(insets.bottom, 10);
  const sceneBottomInset = !isDesktopLayout && dockVisible ? 72 + dockBottom : 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: isDesktopLayout ? DESKTOP_STAGE_INSET : { paddingBottom: sceneBottomInset },
      }}
      tabBar={(props) =>
        isDesktopLayout ? <RookDesktopSidebar {...props} /> : <RookFloatingDock {...props} />
      }
    >
      <Tabs.Screen name="index" options={{ title: "Work", tabBarAccessibilityLabel: "Work" }} />
      <Tabs.Screen name="bots" options={{ title: "Bots", tabBarAccessibilityLabel: "Bots" }} />
      <Tabs.Screen name="library" options={{ title: "Library", tabBarAccessibilityLabel: "Library" }} />
      <Tabs.Screen name="activity" options={{ title: "Updates", tabBarAccessibilityLabel: "Updates" }} />
      <Tabs.Screen name="account" options={{ title: "Account", tabBarAccessibilityLabel: "Account" }} />
    </Tabs>
  );
}
