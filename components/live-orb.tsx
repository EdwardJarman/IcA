import { useId } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from "react-native-svg";

export type LiveOrbVariant = "white" | "black" | "webgl" | "custom";

export type LiveOrbProps = {
  className?: string;
  size?: number;
  variant?: LiveOrbVariant;
  color?: string;
  eyeColor?: string;
  colors?: string[];
  interactive?: boolean;
  blink?: boolean;
};

export const WHITE = { color: "#F4F4F5", eyeColor: "#09090B" } as const;
export const BLACK = { color: "#18181B", eyeColor: "#F4F4F5" } as const;
export const CUSTOM_DEFAULT = { color: "#7C5CFF", eyeColor: "#FAFAFA" } as const;
export const WEBGL_COLORS = ["#7C6AF7", "#7DD3C7", "#E8B4D4"];

function resolveVariant(variant: LiveOrbVariant, color?: string, eyeColor?: string, colors?: string[]) {
  if (variant === "black") return { body: BLACK.color, eye: BLACK.eyeColor, palette: WEBGL_COLORS };
  if (variant === "webgl") {
    return { body: WHITE.color, eye: eyeColor ?? "#0C0C10", palette: colors?.length ? colors : WEBGL_COLORS };
  }
  if (variant === "custom") {
    return { body: color ?? CUSTOM_DEFAULT.color, eye: eyeColor ?? CUSTOM_DEFAULT.eyeColor, palette: WEBGL_COLORS };
  }
  return { body: WHITE.color, eye: WHITE.eyeColor, palette: WEBGL_COLORS };
}

/** Native fallback for the upstream DOM/WebGL orb. */
export function LiveOrb({
  size = 280,
  variant = "white",
  color,
  eyeColor,
  colors,
}: LiveOrbProps) {
  const id = useId().replace(/:/g, "");
  const sphereId = `sphere-${id}`;
  const webglId = `webgl-${id}`;
  const resolved = resolveVariant(variant, color, eyeColor, colors);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Orb character"
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={sphereId} cx="34%" cy="26%" rx="70%" ry="70%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={variant === "black" ? 0.24 : 0.7} />
            <Stop offset="0.48" stopColor={resolved.body} />
            <Stop offset="1" stopColor="#07080A" stopOpacity={variant === "white" ? 0.22 : 0.5} />
          </RadialGradient>
          <LinearGradient id={webglId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={resolved.palette[0] ?? WEBGL_COLORS[0]} />
            <Stop offset="0.52" stopColor={resolved.palette[1] ?? WEBGL_COLORS[1]} />
            <Stop offset="1" stopColor={resolved.palette[2] ?? WEBGL_COLORS[2]} />
          </LinearGradient>
        </Defs>
        <Circle cx="50" cy="50" r="43" fill={variant === "webgl" ? `url(#${webglId})` : `url(#${sphereId})`} />
        <Circle cx="37" cy="28" r="13" fill="#FFFFFF" opacity={variant === "black" ? 0.08 : 0.2} />
        <Rect x="33" y="37" width="8" height="24" rx="4" fill={resolved.eye} />
        <Rect x="59" y="37" width="8" height="24" rx="4" fill={resolved.eye} />
      </Svg>
    </View>
  );
}
