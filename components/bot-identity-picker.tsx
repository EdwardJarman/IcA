import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tint, useRookTheme } from "@/lib/ui";

export const BOT_COLORS = ["#0E7C59", "#2563EB", "#7563F5", "#DF8D19", "#D95D78", "#5B7086"];
export const BOT_ICONS = ["auto-awesome", "search", "edit-note", "bolt", "insights", "rocket-launch", "code", "support-agent"] as const;

export function BotIdentityPicker({
  color,
  icon,
  onColorChange,
  onIconChange,
}: {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
}) {
  const { colors } = useRookTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSoft }]}>COLOR</Text>
      <View style={styles.colors}>
        {BOT_COLORS.map((option) => {
          const selected = color === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`Choose Bot color ${option}`}
              accessibilityState={{ checked: selected }}
              onPress={() => onColorChange(option)}
              style={[
                styles.colorOption,
                { backgroundColor: tint(option, 0.16), borderColor: selected ? option : "transparent" },
              ]}
            >
              <View style={[styles.colorDot, { backgroundColor: option }]} />
              {selected ? <View style={[styles.colorCheck, { backgroundColor: option }]} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.label, { color: colors.textSoft }]}>ICON</Text>
      <View style={styles.icons}>
        {BOT_ICONS.map((option) => {
          const selected = icon === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={`Choose Bot icon ${option}`}
              accessibilityState={{ checked: selected }}
              onPress={() => onIconChange(option)}
              style={[
                styles.iconOption,
                {
                  backgroundColor: selected ? tint(color, 0.12) : colors.surfaceAlt,
                  borderColor: selected ? tint(color, 0.4) : colors.line,
                },
              ]}
            >
              <MaterialIcons name={option} size={20} color={selected ? color : colors.textSoft} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 9, marginTop: 16 },
  label: { fontSize: 11.5, fontWeight: "600", letterSpacing: 0.8, marginTop: 4 },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  colorOption: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    borderWidth: 1.5,
  },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  colorCheck: { width: 6, height: 6, borderRadius: 3 },
  icons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconOption: {
    width: 44,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
