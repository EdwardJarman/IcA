import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/luma-primitives";

export const BOT_COLORS = ["#7563F5", "#198EDE", "#18B982", "#DF8D19", "#D95D78", "#8E6F47"];
export const BOT_ICONS = ["auto-awesome", "search", "edit-note", "bolt", "insights", "rocket-launch", "code", "support-agent"] as const;

export function BotIdentityPicker({ color, icon, onColorChange, onIconChange }: { color: string; icon: string; onColorChange: (color: string) => void; onIconChange: (icon: string) => void }) {
  return <View style={styles.wrap}>
    <Text style={styles.label}>COLOR</Text><View style={styles.colors}>{BOT_COLORS.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`Choose Bot color ${option}`} accessibilityState={{ checked: color === option }} onPress={() => onColorChange(option)} style={({ pressed }) => [styles.colorOption, { backgroundColor: option }, color === option && styles.colorOptionSelected, pressed && styles.pressed]}>{color === option ? <MaterialIcons name="check" size={16} color="#FFFFFF" /> : null}</Pressable>)}</View>
    <Text style={styles.label}>ICON</Text><View style={styles.icons}>{BOT_ICONS.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={`Choose Bot icon ${option}`} accessibilityState={{ checked: icon === option }} onPress={() => onIconChange(option)} style={({ pressed }) => [styles.iconOption, icon === option && { borderColor: color, backgroundColor: `${color}16` }, pressed && styles.pressed]}><MaterialIcons name={option} size={20} color={icon === option ? color : palette.mist} /></Pressable>)}</View>
  </View>;
}

const styles = StyleSheet.create({ wrap: { gap: 9, marginTop: 16 }, label: { color: palette.mist, fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginTop: 4 }, colors: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, colorOption: { width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" }, colorOptionSelected: { borderColor: palette.cloud, shadowColor: "#17181B", shadowOpacity: 0.14, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } }, icons: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, iconOption: { width: 43, height: 40, borderRadius: 13, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, alignItems: "center", justifyContent: "center" }, pressed: { opacity: 0.74, transform: [{ scale: 0.96 }] } });
