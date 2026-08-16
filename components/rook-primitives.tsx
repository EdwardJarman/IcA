import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

export const palette = {
  ink: "#17181B",
  graphite: Platform.OS === "web" ? "var(--color-background)" : "#FFFFFF",
  elevated: Platform.OS === "web" ? "var(--color-surface)" : "#F6F6F7",
  line: Platform.OS === "web" ? "var(--color-border)" : "#E7E7EA",
  cloud: Platform.OS === "web" ? "var(--color-foreground)" : "#17181B",
  mist: Platform.OS === "web" ? "var(--color-muted)" : "#777982",
  mint: "#18B982",
  amber: "#B77912",
  coral: "#D65A5A",
  lavender: "#7563F5",
};

export function Avatar({ label, color = palette.mint, size = 38, icon }: { label: string; color?: string; size?: number; icon?: string }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size * 0.34, backgroundColor: color, borderColor: color }]}> 
      {icon ? <MaterialIcons name={icon as never} size={Math.max(16, size * 0.48)} color="#FFFFFF" /> : <Text style={[styles.avatarLabel, { color: "#FFFFFF", fontSize: Math.max(12, size * 0.4) }]}>{label.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}

export function StatusPill({ label, tone = "mint" }: { label: string; tone?: "mint" | "amber" | "coral" | "muted" }) {
  const color = tone === "amber" ? palette.amber : tone === "coral" ? palette.coral : tone === "muted" ? palette.mist : palette.mint;
  return <View style={[styles.pill, { backgroundColor: `${color}16`, borderColor: `${color}38` }]}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={[styles.pillText, { color }]}>{label}</Text></View>;
}

export function IconButton({ icon, label, onPress, tone = "default" }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; onPress: () => void; tone?: "default" | "mint" | "danger" }) {
  const color = tone === "mint" ? palette.mint : tone === "danger" ? palette.coral : palette.ink;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><MaterialIcons name={icon} size={21} color={color} /></Pressable>;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return <View style={styles.sectionHead}><View style={styles.sectionHeadCopy}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}<Text style={styles.sectionTitle}>{title}</Text></View>{action}</View>;
}

export function EmptyState({ icon, title, detail, action }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name={icon} size={24} color={palette.mint} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text>{action}</View>;
}

export function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarLabel: { fontWeight: "800", letterSpacing: -0.5 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 11 },
  dot: { width: 6, height: 6, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: "700" },
  iconButton: { width: 40, height: 40, borderRadius: 15, backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center", shadowColor: "#17181B", shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionHeadCopy: { flex: 1 },
  eyebrow: { color: palette.mist, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 3 },
  sectionTitle: { color: palette.cloud, fontSize: 19, lineHeight: 25, letterSpacing: -0.35, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 38, paddingHorizontal: 24, gap: 9 },
  emptyIcon: { width: 52, height: 52, borderRadius: 20, backgroundColor: "#7563F512", alignItems: "center", justifyContent: "center", marginBottom: 5 },
  emptyTitle: { color: palette.cloud, fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyDetail: { color: palette.mist, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 260 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line },
});
