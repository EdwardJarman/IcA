import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { colorScheme, setColorScheme } = useThemeContext();
  const dark = colorScheme === "dark";

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Dark mode"
      accessibilityState={{ checked: dark }}
      onPress={() => setColorScheme(dark ? "light" : "dark")}
      style={({ pressed }) => [styles.control, compact && styles.compact, dark && styles.controlDark, pressed && styles.pressed]}
    >
      <View style={[styles.icon, dark && styles.iconDark]}>
        <MaterialIcons name={dark ? "dark-mode" : "light-mode"} size={compact ? 18 : 19} color={dark ? "#70E5BE" : "#16171A"} />
      </View>
      {!compact ? <View style={styles.copy}><Text style={[styles.title, dark && styles.titleDark]}>Appearance</Text><Text style={[styles.detail, dark && styles.detailDark]}>{dark ? "Dark mode" : "Light mode"}</Text></View> : null}
      {!compact ? <View style={[styles.switchTrack, dark && styles.switchTrackDark]}><View style={[styles.switchKnob, dark && styles.switchKnobDark]} /></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: Platform.OS === "web" ? "var(--color-surface)" : "#FFFFFF", borderWidth: 1, borderColor: Platform.OS === "web" ? "var(--color-border)" : "#E7E7EA", borderRadius: 15, paddingHorizontal: 14, paddingVertical: 10 },
  controlDark: { backgroundColor: "#17191E", borderColor: "#30333B" },
  compact: { minHeight: 38, width: 38, padding: 0, justifyContent: "center", borderRadius: 12, backgroundColor: "#1B1D22", borderColor: "#343740" },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#F0F1F3" },
  iconDark: { backgroundColor: "#272A31" },
  copy: { flex: 1 },
  title: { color: Platform.OS === "web" ? "var(--color-foreground)" : "#17181B", fontSize: 14, fontWeight: "900" },
  titleDark: { color: "#F5F7FA" },
  detail: { color: Platform.OS === "web" ? "var(--color-muted)" : "#777982", fontSize: 11, lineHeight: 16, marginTop: 2 },
  detailDark: { color: "#AEB5C1" },
  switchTrack: { width: 38, height: 22, padding: 3, justifyContent: "center", borderRadius: 12, backgroundColor: "#D8DAE0" },
  switchTrackDark: { alignItems: "flex-end", backgroundColor: "#275E4C" },
  switchKnob: { width: 16, height: 16, borderRadius: 9, backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } },
  switchKnobDark: { backgroundColor: "#70E5BE" },
  pressed: { opacity: 0.74, transform: [{ scale: 0.98 }] },
});
