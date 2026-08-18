import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BOT_SHAPES,
  BotGlyph,
  DEFAULT_BOT_SHAPE,
  botShapeIcon,
  getBotShape,
  type BotShape,
} from "@/components/bot-glyph";
import { GlassChip } from "@/components/liquid-glass";
import { tint, useRookTheme } from "@/lib/ui";

export const BOT_COLORS = [
  "#A66D3B",
  "#F04455",
  "#F97316",
  "#F5AA32",
  "#23B26D",
  "#2AA9A1",
  "#3B82F6",
  "#7C5CFC",
  "#EC5EA8",
  "#707784",
] as const;

export const DEFAULT_BOT_COLOR = "#23B26D";
export const DEFAULT_BOT_ICON = botShapeIcon(DEFAULT_BOT_SHAPE);

const SHAPE_LABELS: Record<BotShape, string> = {
  orb: "Orb",
  drop: "Drop",
  capsule: "Capsule",
  "soft-square": "Soft square",
  kite: "Kite",
  hex: "Hexagon",
  cloud: "Cloud",
};

export function BotIdentityPicker({
  color,
  icon,
  onColorChange,
  onIconChange,
  showPreview = true,
}: {
  color: string;
  icon: string;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
  showPreview?: boolean;
}) {
  const { colors, dark } = useRookTheme();
  const shape = getBotShape(icon) ?? DEFAULT_BOT_SHAPE;

  return (
    <View style={styles.wrap}>
      {showPreview ? (
        <View style={styles.previewWrap}>
          <View
            style={[
              styles.previewGlow,
              { backgroundColor: tint(color, dark ? 0.28 : 0.18) },
            ]}
          />
          <GlassChip
            radius={30}
            blur={24}
            raised
            style={styles.previewGlass}
            contentStyle={styles.previewGlassContent}
          >
            <BotGlyph shape={shape} color={color} size={78} />
          </GlassChip>
        </View>
      ) : null}

      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.textSoft }]}>COLOR</Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {BOT_COLORS.map((option) => {
            const selected = color === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={`Choose Bot color ${option}`}
                accessibilityState={{ checked: selected }}
                onPress={() => onColorChange(option)}
                style={({ pressed }) => [
                  styles.colorOption,
                  {
                    borderColor: selected ? colors.text : "transparent",
                    backgroundColor: selected
                      ? colors.surfaceAlt
                      : "transparent",
                    opacity: pressed ? 0.68 : 1,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <View style={[styles.colorDot, { backgroundColor: option }]} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.textSoft }]}>SHAPE</Text>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {BOT_SHAPES.map((option) => {
            const selected = shape === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityLabel={`Choose ${SHAPE_LABELS[option]} Bot shape`}
                accessibilityState={{ checked: selected }}
                onPress={() => onIconChange(botShapeIcon(option))}
                style={({ pressed }) => [
                  styles.shapeOption,
                  {
                    borderColor: selected ? color : colors.line,
                    backgroundColor: selected
                      ? tint(color, dark ? 0.24 : 0.12)
                      : colors.surfaceAlt,
                    opacity: pressed ? 0.68 : 1,
                    transform: [{ scale: pressed ? 0.94 : 1 }],
                  },
                ]}
              >
                <BotGlyph
                  shape={option}
                  color={selected ? color : colors.textFaint}
                  size={26}
                  showEyes={false}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  previewWrap: {
    height: 108,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  previewGlow: {
    position: "absolute",
    width: 110,
    height: 72,
    borderRadius: 999,
    transform: [{ scaleX: 1.2 }],
  },
  previewGlass: {
    width: 96,
    height: 96,
  },
  previewGlassContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  group: {
    gap: 6,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1,
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
  },
  shapeOption: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
