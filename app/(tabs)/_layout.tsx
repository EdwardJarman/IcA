import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dockBottom = Platform.OS === "web" ? 18 : Math.max(insets.bottom, 12);
  const sceneBottomInset = 88 + dockBottom;

  const dockIcon = (name: Parameters<typeof IconSymbol>[0]["name"]) => ({ color, focused }: { color: string; focused: boolean }) => (
    <View style={styles.iconWrap}>
      <IconSymbol size={24} name={name} color={color} />
      <View style={[styles.activeDot, focused && styles.activeDotVisible]} />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: "#B9BEC8",
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        sceneStyle: { paddingBottom: sceneBottomInset },
        tabBarStyle: {
          ...styles.dock,
          bottom: dockBottom,
        },
        tabBarItemStyle: styles.dockItem,
        tabBarActiveBackgroundColor: "#343942",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Work",
          tabBarAccessibilityLabel: "Work",
          tabBarIcon: dockIcon("message.fill"),
        }}
      />
      <Tabs.Screen
        name="bots"
        options={{
          title: "Bots",
          tabBarAccessibilityLabel: "Bots",
          tabBarIcon: dockIcon("person.2.fill"),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarAccessibilityLabel: "Library",
          tabBarIcon: dockIcon("books.vertical.fill"),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Updates",
          tabBarAccessibilityLabel: "Updates",
          tabBarIcon: dockIcon("bell.fill"),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarAccessibilityLabel: "Account",
          tabBarIcon: dockIcon("person.crop.circle"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 66,
    paddingHorizontal: 6,
    paddingVertical: 7,
    backgroundColor: "#17191D",
    borderTopWidth: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 25,
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  dockItem: {
    borderRadius: 18,
    marginHorizontal: 2,
  },
  iconWrap: {
    height: 43,
    minWidth: 35,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0,
    backgroundColor: "#77F3C4",
  },
  activeDotVisible: {
    opacity: 1,
  },
});
