import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Avatar } from "@/components/rook-primitives";
import { DRIVE_PIXEL_DELAYS, formatWorkingElapsed } from "@/lib/ai-working";
import { useRookTheme } from "@/lib/ui";
import type { Bot } from "@/lib/workroom-store";

export function AiWorkingIndicator({ bot }: { bot: Bot }) {
  const { colors } = useRookTheme();
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    setElapsedMs(0);
    const interval = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${bot.name} is working`}
      accessibilityLiveRegion="polite"
      style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 20, paddingVertical: 3 }}
    >
      <View style={{ width: 28, alignItems: "center" }}>
        <Avatar label={bot.avatar} color={bot.color} icon={bot.icon} size={28} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={{ width: 16, height: 16, flexDirection: "row", flexWrap: "wrap", gap: 2 }}
        >
          {DRIVE_PIXEL_DELAYS.map((delay, index) => (
            <DrivePixel key={index} delay={delay} color={colors.text} />
          ))}
        </View>
        <WorkingLabel color={colors.textSoft} />
        <Text
          accessible={false}
          style={{ color: colors.textFaint, fontSize: 11.5, lineHeight: 16, fontVariant: ["tabular-nums"] }}
        >
          {formatWorkingElapsed(elapsedMs)}
        </Text>
      </View>
    </View>
  );
}

function DrivePixel({ delay, color }: { delay: number; color: string }) {
  const reducedMotion = useReducedMotion();
  const intensity = useSharedValue(0.14);

  useEffect(() => {
    cancelAnimation(intensity);
    if (reducedMotion) {
      intensity.value = 0.22;
      return;
    }
    intensity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
          withTiming(0.14, { duration: 470, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(intensity);
  }, [delay, intensity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: intensity.value,
    transform: [{ scale: 0.9 + intensity.value * 0.1 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 4,
          height: 4,
          borderRadius: 1,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

function WorkingLabel({ color }: { color: string }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.68);

  useEffect(() => {
    cancelAnimation(opacity);
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.58, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.Text style={[{ color, fontSize: 13, lineHeight: 18, fontWeight: "600" }, animatedStyle]}>
      Working
    </Animated.Text>
  );
}
