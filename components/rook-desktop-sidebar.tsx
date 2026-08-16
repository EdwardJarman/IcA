import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";

const NAVIGATION = {
  index: { icon: "chat-bubble", label: "Work" },
  bots: { icon: "group", label: "Bots" },
  library: { icon: "auto-stories", label: "Library" },
  activity: { icon: "notifications", label: "Updates" },
  account: { icon: "account-circle", label: "Account" },
} as const;

export function RookDesktopSidebar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.sidebar} accessibilityRole="tablist">
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><MaterialIcons name="menu" size={19} color="#FFFFFF" /></View>
        <Text style={styles.brand}>Rook</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Create a Bot" onPress={() => navigation.navigate("bots")} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
        <MaterialIcons name="add" size={19} color="#0F1013" />
        <Text style={styles.createText}>New Bot</Text>
      </Pressable>
      <Text style={styles.sectionLabel}>WORKSPACE</Text>
      <View style={styles.navList}>
        {state.routes.map((route, index) => {
          const item = NAVIGATION[route.name as keyof typeof NAVIGATION];
          if (!item) return null;
          const isFocused = state.index === index;
          const descriptor = descriptors[route.key];
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? item.label} accessibilityState={{ selected: isFocused }} onPress={onPress} onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })} style={({ pressed }) => [styles.navItem, isFocused && styles.navItemActive, pressed && styles.pressed]}>
              <MaterialIcons name={item.icon} size={20} color={isFocused ? "#70E5BE" : "#FFFFFF"} />
              <Text style={[styles.navLabel, isFocused && styles.navLabelActive]}>{item.label}</Text>
              {isFocused ? <View style={styles.activeRail} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.footer}>
        <ThemeToggle compact />
        <View style={styles.accountRow}><View style={styles.avatar}><MaterialIcons name="person" size={16} color="#0E1014" /></View><View><Text style={styles.accountName}>Your workspace</Text><Text style={styles.accountSub}>Private and synced</Text></View></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { position: "absolute", top: 0, bottom: 0, left: 0, width: 264, zIndex: 20, paddingHorizontal: 14, paddingTop: 28, paddingBottom: 22, backgroundColor: "#0B0D11", borderRightWidth: 1, borderRightColor: "#292B31" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, marginBottom: 28 },
  brandMark: { width: 33, height: 33, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#7563F5" },
  brand: { color: "#F7F8FB", fontSize: 20, fontWeight: "900", letterSpacing: -0.7 },
  createButton: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#70E5BE", borderRadius: 13, marginBottom: 25 },
  createText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900" },
  sectionLabel: { color: "#FFFFFF", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, paddingHorizontal: 10, marginBottom: 8 },
  navList: { gap: 6 },
  navItem: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, paddingHorizontal: 12 },
  navItemActive: { backgroundColor: "#1F2228" },
  navLabel: { flex: 1, color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  navLabelActive: { color: "#F6F7FA", fontWeight: "900" },
  activeRail: { width: 4, height: 18, borderRadius: 3, backgroundColor: "#70E5BE" },
  footer: { marginTop: "auto", gap: 14 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 7, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#292B31" },
  avatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: "#70E5BE", alignItems: "center", justifyContent: "center" },
  accountName: { color: "#F6F7FA", fontSize: 12, fontWeight: "800" },
  accountSub: { color: "#838A96", fontSize: 10, marginTop: 2 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
