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
            <IconSymbol size={isFocused ? 29 : 27} name={icon} color={isFocused ? "#70E5BE" : "#D1D3DC"} />
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
    left: 14,
    right: 14,
    height: 78,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    paddingVertical: 4,
    backgroundColor: "#1A1B1F",
    borderWidth: 1,
    borderColor: "#3A3C42",
    borderRadius: 29,
    elevation: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.42,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
  },
  item: {
    flex: 1,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
  },
  itemActive: {
    flex: 1.32,
    backgroundColor: "#343A45",
  },
  itemPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  activeDot: {
    position: "absolute",
    bottom: 9,
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0,
    backgroundColor: "#70E5BE",
  },
  activeDotVisible: { opacity: 1 },
});
