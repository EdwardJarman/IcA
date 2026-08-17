import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { useDockVisibility } from "@/lib/dock-visibility";
import { useThemeContext } from "@/lib/theme-provider";

const ROUTE_ICONS = {
  index: "message.fill",
  bots: "person.2.fill",
  library: "books.vertical.fill",
  activity: "bell.fill",
  account: "person.crop.circle",
} as const;

const MAX_DOCK_WIDTH = 440;
const DOCK_HEIGHT = 60;
const TRACK_INSET = 5;

export function RookFloatingDock({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colorScheme } = useThemeContext();
  const { dockVisible, translateY, showDock } = useDockVisibility();
  const [trackWidth, setTrackWidth] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorReady = useRef(false);
  const itemScales = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const dark = colorScheme === "dark";
  const dockWidth = Math.max(0, Math.min(width - 24, MAX_DOCK_WIDTH));
  const itemWidth = trackWidth > 0 ? trackWidth / state.routes.length : 0;
  const dockBottom = Platform.OS === "web" ? 18 : Math.max(insets.bottom, 10);
  const compactLabels = width < 350;

  const glass = useMemo(() => ({
    surface: dark ? "rgba(12, 16, 22, 0.72)" : "rgba(246, 249, 252, 0.70)",
    edge: dark ? "rgba(255, 255, 255, 0.17)" : "rgba(255, 255, 255, 0.94)",
    innerEdge: dark ? "rgba(255, 255, 255, 0.07)" : "rgba(30, 48, 58, 0.07)",
    active: dark ? "rgba(119, 243, 196, 0.14)" : "rgba(255, 255, 255, 0.72)",
    activeEdge: dark ? "rgba(160, 255, 219, 0.24)" : "rgba(255, 255, 255, 0.98)",
    activeText: dark ? "#EFFFF8" : "#123329",
    activeIcon: dark ? "#77F3C4" : "#137A59",
    idleText: dark ? "#A7B0BD" : "#64707D",
    idleIcon: dark ? "#AEB7C4" : "#5F6B78",
    hover: dark ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.58)",
    shadow: dark ? "#020608" : "#496B60",
  }), [dark]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!itemWidth) return;
    const target = state.index * itemWidth;
    if (!indicatorReady.current || reduceMotion) {
      indicatorX.setValue(target);
      indicatorReady.current = true;
      return;
    }

    Animated.spring(indicatorX, {
      toValue: target,
      mass: 0.7,
      damping: 19,
      stiffness: 210,
      useNativeDriver: true,
    }).start();
  }, [indicatorX, itemWidth, reduceMotion, state.index]);

  const animatePress = useCallback((index: number) => {
    if (reduceMotion) return;
    const scale = itemScales[index];
    scale.stopAnimation();
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 70,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        mass: 0.45,
        damping: 8,
        stiffness: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [itemScales, reduceMotion]);

  const handleTrackLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <Animated.View
      pointerEvents={dockVisible ? "box-none" : "none"}
      style={[
        styles.frame,
        {
          bottom: dockBottom,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        accessibilityRole="tablist"
        renderToHardwareTextureAndroid
        style={[
          styles.shadowShell,
          {
            width: dockWidth,
            shadowColor: glass.shadow,
          },
        ]}
      >
        <View pointerEvents="none" style={[styles.ambientGlow, dark && styles.ambientGlowDark]} />
        <BlurView
          intensity={dark ? 68 : 78}
          tint={dark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
          experimentalBlurMethod="dimezisBlurView"
          blurReductionFactor={3}
          style={[
            styles.glassShell,
            {
              backgroundColor: glass.surface,
              borderColor: glass.edge,
            },
          ]}
        >
          <View pointerEvents="none" style={[styles.mintBloom, dark && styles.mintBloomDark]} />
          <View pointerEvents="none" style={[styles.violetBloom, dark && styles.violetBloomDark]} />
          <View pointerEvents="none" style={styles.specularLine} />

          <View onLayout={handleTrackLayout} style={styles.track}>
            {itemWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.liquidPill,
                  {
                    width: Math.max(0, itemWidth - 6),
                    backgroundColor: glass.active,
                    borderColor: glass.activeEdge,
                    transform: [{ translateX: indicatorX }],
                  },
                ]}
              >
                <View style={[styles.pillInnerEdge, { borderColor: glass.innerEdge }]} />
                <View style={styles.pillHighlight} />
                <View style={styles.pillGlow} />
                <View style={[styles.droplet, dark && styles.dropletDark]} />
              </Animated.View>
            ) : null}

            {state.routes.map((route, index) => {
              const descriptor = descriptors[route.key];
              const isFocused = state.index === index;
              const icon = ROUTE_ICONS[route.name as keyof typeof ROUTE_ICONS];
              const label = descriptor.options.tabBarAccessibilityLabel ?? descriptor.options.title ?? route.name;
              if (!icon) return null;

              const onPress = () => {
                showDock();
                animatePress(index);
                const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isFocused }}
                  onHoverIn={() => setHoveredIndex(index)}
                  onHoverOut={() => setHoveredIndex((current) => current === index ? null : current)}
                  onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
                  onPress={onPress}
                  style={styles.item}
                >
                  {hoveredIndex === index && !isFocused ? (
                    <View pointerEvents="none" style={[styles.hoverWash, { backgroundColor: glass.hover }]} />
                  ) : null}
                  <Animated.View style={[styles.itemContent, { transform: [{ scale: itemScales[index] }] }]}>
                    <IconSymbol
                      size={21}
                      name={icon}
                      color={isFocused ? glass.activeIcon : glass.idleIcon}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.label,
                        compactLabels && styles.labelCompact,
                        { color: isFocused ? glass.activeText : glass.idleText },
                        isFocused && styles.labelActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Animated.View>
                </Pressable>
              );
            })}
          </View>
        </BlurView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    alignItems: "center",
  },
  shadowShell: {
    height: DOCK_HEIGHT,
    borderRadius: 25,
    shadowOpacity: 0.19,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 18,
  },
  ambientGlow: {
    position: "absolute",
    left: "18%",
    right: "18%",
    bottom: -6,
    height: 18,
    borderRadius: 20,
    backgroundColor: "rgba(42, 151, 113, 0.12)",
    shadowColor: "#54D9AA",
    shadowOpacity: 0.16,
    shadowRadius: 18,
  },
  ambientGlowDark: {
    backgroundColor: "rgba(71, 219, 167, 0.12)",
    shadowOpacity: 0.22,
  },
  glassShell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 25,
    overflow: "hidden",
  },
  mintBloom: {
    position: "absolute",
    width: 112,
    height: 72,
    borderRadius: 56,
    left: -26,
    bottom: -48,
    backgroundColor: "rgba(72, 218, 166, 0.10)",
  },
  mintBloomDark: {
    backgroundColor: "rgba(95, 243, 188, 0.12)",
  },
  violetBloom: {
    position: "absolute",
    width: 104,
    height: 68,
    borderRadius: 52,
    right: -22,
    top: -48,
    backgroundColor: "rgba(117, 99, 245, 0.09)",
  },
  violetBloomDark: {
    backgroundColor: "rgba(153, 137, 255, 0.12)",
  },
  specularLine: {
    position: "absolute",
    top: 1,
    left: 24,
    right: 24,
    height: StyleSheet.hairlineWidth,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  track: {
    flex: 1,
    flexDirection: "row",
    margin: TRACK_INSET,
  },
  liquidPill: {
    position: "absolute",
    left: 3,
    top: 0,
    bottom: 0,
    borderRadius: 19,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#77F3C4",
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  pillInnerEdge: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  pillHighlight: {
    position: "absolute",
    top: 1,
    left: 12,
    right: 12,
    height: 1,
    borderRadius: 1,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
  },
  pillGlow: {
    position: "absolute",
    width: 44,
    height: 22,
    borderRadius: 22,
    left: "50%",
    bottom: -15,
    marginLeft: -22,
    backgroundColor: "rgba(119, 243, 196, 0.25)",
  },
  droplet: {
    position: "absolute",
    top: 3,
    left: "50%",
    width: 4,
    height: 4,
    marginLeft: -2,
    borderRadius: 3,
    backgroundColor: "rgba(22, 122, 89, 0.54)",
    shadowColor: "#77F3C4",
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  dropletDark: {
    backgroundColor: "rgba(119, 243, 196, 0.82)",
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
  },
  itemContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  hoverWash: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    right: 3,
    borderRadius: 17,
  },
  label: {
    maxWidth: "100%",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0.05,
    paddingHorizontal: 2,
  },
  labelCompact: {
    fontSize: 9,
    letterSpacing: -0.1,
  },
  labelActive: {
    fontWeight: "800",
  },
});
