import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export const palette = {
  ink: "#17181B",
  graphite: "#FFFFFF",
  elevated: "#F6F6F7",
  line: "#E7E7EA",
  cloud: "#17181B",
  mist: "#777982",
  mint: "#18B982",
  amber: "#B77912",
  coral: "#D65A5A",
  lavender: "#7563F5",
};

export function Avatar({ label, color = palette.mint, size = 38 }: { label: string; color?: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderColor: color }]}> 
      <Text style={[styles.avatarLabel, { color: "#FFFFFF", fontSize: Math.max(12, size * 0.4) }]}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export function StatusPill({ label, tone = "mint" }: { label: string; tone?: "mint" | "amber" | "coral" | "muted" }) {
  const color = tone === "amber" ? palette.amber : tone === "coral" ? palette.coral : tone === "muted" ? palette.mist : palette.mint;
  return (
    <View style={[styles.pill, { backgroundColor: `${color}16`, borderColor: `${color}38` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function IconButton({ icon, label, onPress, tone = "default" }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; label: string; onPress: () => void; tone?: "default" | "mint" | "danger" }) {
  const color = tone === "mint" ? palette.mint : tone === "danger" ? palette.coral : palette.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <MaterialIcons name={icon} size={21} color={color} />
    </Pressable>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionHeadCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ icon, title, detail, action }: { icon: React.ComponentProps<typeof MaterialIcons>["name"]; title: string; detail: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><MaterialIcons name={icon} size={24} color={palette.mint} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDetail}>{detail}</Text>
      {action}
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarLabel: { fontWeight: "800", letterSpacing: -0.5 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: "700" },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionHeadCopy: { flex: 1 },
  eyebrow: { color: palette.mist, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 3 },
  sectionTitle: { color: palette.cloud, fontSize: 19, lineHeight: 25, letterSpacing: -0.35, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 34, paddingHorizontal: 24, gap: 9 },
  emptyIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "#18B98216", alignItems: "center", justifyContent: "center", marginBottom: 3 },
  emptyTitle: { color: palette.cloud, fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyDetail: { color: palette.mist, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 260 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line },
});
