import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useMemo, useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { tint, useRookTheme } from "@/lib/ui";

/**
 * Desktop navigation chrome. On wide web canvases the floating dock yields to
 * a quiet left sidebar — a rounded white panel floating on the canvas — while
 * phones and tablets keep the mobile dock exactly as it is.
 */

/** Wide-canvas width where web switches from dock to sidebar. */
export const DESKTOP_NAV_BREAKPOINT = 960;
/** Floating sidebar panel width and canvas margins, on the 4pt grid. */
export const SIDEBAR_WIDTH = 240;
export const SIDEBAR_MARGIN = 12;
export const STAGE_GUTTER = 12;

/** Scene inset that keeps desktop content clear of the floating sidebar. */
export const DESKTOP_STAGE_INSET = {
  paddingLeft: SIDEBAR_MARGIN + SIDEBAR_WIDTH + STAGE_GUTTER,
  paddingTop: STAGE_GUTTER,
  paddingRight: STAGE_GUTTER,
  paddingBottom: STAGE_GUTTER,
};

type IconName = ComponentProps<typeof MaterialIcons>["name"];

/** Quiet line icons, one per tab destination. */
const ROUTE_ICONS: Record<string, IconName> = {
  index: "chat-bubble-outline",
  bots: "people-outline",
  library: "auto-stories",
  activity: "notifications-none",
  account: "person-outline",
};

export function RookDesktopSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors, dark } = useRookTheme();
  const { user } = useAuth();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  /* The panel floats: a whisper border plus a soft, wide shadow on the canvas. */
  const panelShadow = `0 10px 30px ${tint(colors.shadow, dark ? 0.5 : 0.07)}`;

  const items = useMemo(
    () =>
      state.routes
        .map((route) => {
          const options = descriptors[route.key]?.options;
          return {
            key: route.key,
            name: route.name,
            icon: ROUTE_ICONS[route.name],
            label: options?.tabBarAccessibilityLabel ?? options?.title ?? route.name,
          };
        })
        .filter((item) => Boolean(item.icon)),
    [state.routes, descriptors],
  );

  const displayName = user?.name ?? user?.email?.split("@")[0] ?? null;

  return (
    <View accessibilityRole="tablist" style={[styles.frame, { width: SIDEBAR_WIDTH, left: SIDEBAR_MARGIN }]}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: colors.surface,
            borderColor: colors.line,
            boxShadow: panelShadow,
          },
        ]}
      >
        {/* Workspace identity — a small mark and the product name, nothing louder. */}
        <View style={styles.brand}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 10.5,
              backgroundColor: colors.ink,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: colors.onInk, fontSize: 15, fontWeight: "800" }}>R</Text>
          </View>
          <Text style={{ color: colors.text, fontSize: 15.5, fontWeight: "700", letterSpacing: -0.3 }}>Rook</Text>
        </View>

        <View style={styles.nav}>
          {items.map((item, index) => {
            const isFocused = state.index === index;
            const isHovered = hoveredKey === item.key;
            const onPress = () => {
              const event = navigation.emit({ type: "tabPress", target: item.key, canPreventDefault: true });
              if (!isFocused && !event.defaultPrevented) navigation.navigate(item.name);
            };

            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isFocused }}
                onHoverIn={() => setHoveredKey(item.key)}
                onHoverOut={() => setHoveredKey((current) => (current === item.key ? null : current))}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: item.key })}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.item,
                  (isFocused || isHovered) && { backgroundColor: colors.surfaceAlt },
                  pressed && { opacity: 0.72 },
                ]}
              >
                <MaterialIcons name={item.icon} size={21} color={isFocused ? colors.accent : colors.textFaint} />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    { color: isFocused ? colors.text : colors.textSoft },
                    isFocused && styles.labelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* The open middle stays empty — whitespace is the divider. */}
        <View style={{ flex: 1 }} />

        {/* Compact account footer — who is signed in, one quiet hop from settings. */}
        {displayName ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open account"
            onPress={() => navigation.navigate("account")}
            onHoverIn={() => setHoveredKey("account-chip")}
            onHoverOut={() => setHoveredKey((current) => (current === "account-chip" ? null : current))}
            style={({ pressed }) => [
              styles.account,
              { backgroundColor: hoveredKey === "account-chip" ? colors.surfaceAlt : colors.surface },
              pressed && { opacity: 0.72 },
            ]}
          >
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 11,
              backgroundColor: tint(colors.accent, dark ? 0.24 : 0.13),
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: tint(colors.accent, dark ? 0.4 : 0.26),
            }}>
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "700", letterSpacing: -0.2 }}>
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "600", letterSpacing: -0.1 }}>
                {displayName}
              </Text>
              {user?.email ? (
                <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11, marginTop: 1 }}>
                  {user.email}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    top: SIDEBAR_MARGIN,
    bottom: SIDEBAR_MARGIN,
    zIndex: 50,
  },
  panel: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  brand: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10.5,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  nav: {
    gap: 3,
  },
  item: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 11,
    borderRadius: 12,
  },
  label: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  labelActive: {
    fontWeight: "700",
  },
  account: {
    marginTop: 10,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
});
