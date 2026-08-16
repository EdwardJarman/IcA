import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDockVisibility } from "@/lib/dock-visibility";

const ROUTE_ICONS = {
  index: "message.fill",
  bots: "person.2.fill",
  library: "books.vertical.fill",
  activity: "bell.fill",
  account: "person.crop.circle",
} as const;

export function RookFloatingDock({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { dockVisible, translateY, showDock } = useDockVisibility();
  const dockBottom = Platform.OS === "web" ? 18 : Math.max(insets.bottom, 12);

  return (
    <Animated.View
      pointerEvents={dockVisible ? "auto" : "none"}
      style={[styles.dock, { bottom: dockBottom, transform: [{ translateY }] }]}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const isFocused = state.index === index;
        const icon = ROUTE_ICONS[route.name as keyof typeof ROUTE_ICONS];
        const label = descriptor.options.tabBarAccessibilityLabel ?? descriptor.options.title ?? route.name;

        if (!icon) return null;

        const onPress = () => {
          showDock();
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            onPress={onPress}
            style={({ pressed }) => [styles.item, isFocused && styles.itemActive, pressed && styles.itemPressed]}
          >
            <IconSymbol size={24} name={icon} color={isFocused ? "#77F3C4" : "#B9BEC8"} />
            <View style={[styles.activeDot, isFocused && styles.activeDotVisible]} />
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 7,
    backgroundColor: "#17191D",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 25,
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  item: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 18,
  },
  itemActive: { backgroundColor: "#343942" },
  itemPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  activeDot: { width: 4, height: 4, borderRadius: 2, opacity: 0, backgroundColor: "#77F3C4" },
  activeDotVisible: { opacity: 1 },
});
