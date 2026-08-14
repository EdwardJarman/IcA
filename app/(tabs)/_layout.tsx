import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Work",
          tabBarIcon: ({ color }) => <IconSymbol size={25} name="message.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bots"
        options={{
          title: "Bots",
          tabBarIcon: ({ color }) => <IconSymbol size={25} name="person.2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Space",
          tabBarIcon: ({ color }) => <IconSymbol size={25} name="books.vertical.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Updates",
          tabBarIcon: ({ color }) => <IconSymbol size={25} name="bell.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
