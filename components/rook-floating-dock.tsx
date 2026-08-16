import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useCallback, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent, useWindowDimensions } from "react-native";
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

const clamp = (value: number, minimum: number, maximum: number) => Math.min(Math.max(value, minimum), maximum);

export function RookFloatingDock({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { dockVisible, translateY, showDock } = useDockVisibility();
  const [dockWidth, setDockWidth] = useState(0);
  const scales = useRef(state.routes.map(() => new Animated.Value(1))).current;
  const bounces = useRef(state.routes.map(() => new Animated.Value(0))).current;

  const config = useMemo(() => {
    const smallerDimension = Math.min(width, height);
    if (smallerDimension < 480) return { baseIconSize: clamp(smallerDimension * 0.08, 40, 46), maxScale: 1.4, effectWidth: smallerDimension * 0.4 };
    if (smallerDimension < 768) return { baseIconSize: clamp(smallerDimension * 0.07, 48, 56), maxScale: 1.5, effectWidth: smallerDimension * 0.35 };
    if (smallerDimension < 1024) return { baseIconSize: clamp(smallerDimension * 0.06, 56, 64), maxScale: 1.6, effectWidth: smallerDimension * 0.3 };
    return { baseIconSize: clamp(smallerDimension * 0.05, 64, 80), maxScale: 1.8, effectWidth: 300 };
  }, [height, width]);

  const padding = Math.max(8, config.baseIconSize * 0.12);
  const dockBottom = Platform.OS === "web" ? 18 : Math.max(insets.bottom, 12);

  const animateScales = useCallback((mouseX: number | null) => {
    const availableWidth = Math.max(1, dockWidth - padding * 2);
    const slotWidth = availableWidth / state.routes.length;

    const targets = state.routes.map((_, index) => {
      if (mouseX === null) return 1;
      const normalIconCenter = padding + index * slotWidth + slotWidth / 2;
      const minX = mouseX - config.effectWidth / 2;
      const maxX = mouseX + config.effectWidth / 2;
      if (normalIconCenter < minX || normalIconCenter > maxX) return 1;
      const theta = ((normalIconCenter - minX) / config.effectWidth) * 2 * Math.PI;
      const scaleFactor = (1 - Math.cos(clamp(theta, 0, 2 * Math.PI))) / 2;
      return 1 + scaleFactor * (config.maxScale - 1);
    });

    targets.forEach((target, index) => {
      scales[index].stopAnimation();
      Animated.spring(scales[index], {
        toValue: target,
        speed: mouseX === null ? 16 : 22,
        bounciness: 0,
        useNativeDriver: true,
      }).start();
    });
  }, [config.effectWidth, config.maxScale, dockWidth, padding, scales, state.routes]);

  const handlePointerMove = useCallback((event: any) => {
    const pointerX = event.nativeEvent.offsetX ?? event.nativeEvent.locationX;
    if (typeof pointerX === "number") animateScales(pointerX);
  }, [animateScales]);

  const resetMagnification = useCallback(() => animateScales(null), [animateScales]);

  const bounce = useCallback((index: number) => {
    const bounceHeight = Math.max(-8, -config.baseIconSize * 0.15);
    bounces[index].stopAnimation();
    Animated.sequence([
      Animated.timing(bounces[index], { toValue: bounceHeight, duration: 160, useNativeDriver: true }),
      Animated.timing(bounces[index], { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [bounces, config.baseIconSize]);

  return (
    <Animated.View
      pointerEvents={dockVisible ? "auto" : "none"}
      onLayout={(event: LayoutChangeEvent) => setDockWidth(event.nativeEvent.layout.width)}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetMagnification}
      style={[
        styles.dock,
        {
          bottom: dockBottom,
          minHeight: config.baseIconSize + padding * 2,
          borderRadius: Math.max(12, config.baseIconSize * 0.4),
          padding,
          transform: [{ translateY }],
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const descriptor = descriptors[route.key];
        const isFocused = state.index === index;
        const icon = ROUTE_ICONS[route.name as keyof typeof ROUTE_ICONS];
        const label = descriptor.options.tabBarAccessibilityLabel ?? descriptor.options.title ?? route.name;
        if (!icon) return null;

        const onPress = () => {
          showDock();
          bounce(index);
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isFocused }}
            onHoverIn={() => animateScales(padding + (index + 0.5) * (Math.max(1, dockWidth - padding * 2) / state.routes.length))}
            onHoverOut={resetMagnification}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            onPress={onPress}
            style={styles.item}
          >
            <Animated.View style={[styles.iconMotion, { transform: [{ translateY: bounces[index] }, { scale: scales[index] }] }]}>
              <IconSymbol size={config.baseIconSize} name={icon} color={isFocused ? "#70E5BE" : "#D1D3DC"} />
              <View style={[styles.openDot, isFocused && styles.openDotVisible]} />
            </Animated.View>
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
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(45,45,45,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    elevation: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  item: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  iconMotion: {
    alignItems: "center",
    justifyContent: "flex-end",
    transformOrigin: "bottom center",
  },
  openDot: {
    width: 4,
    height: 4,
    borderRadius: 3,
    marginTop: 5,
    opacity: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  openDotVisible: { opacity: 1 },
});
