import { type ReactNode } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useRookTheme } from "@/components/rook-primitives";

const bloomImage = require("@/assets/images/bloom-background.webp");

export function AuthWebShell({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: ReactNode }) {
  const { colors } = useRookTheme();
  const { width } = useWindowDimensions();
  const split = width >= 880;

  return (
    <View style={[styles.page, { backgroundColor: colors.canvas }]}>
      <View style={[styles.authPanel, split ? styles.authPanelSplit : styles.authPanelFull]}>
        <View style={styles.authContent}>
          <View style={styles.brandRow}>
            <View style={[styles.brandMark, { backgroundColor: colors.ink }]}>
              <Text style={{ color: colors.onInk, fontSize: 16, fontWeight: "800" }}>R</Text>
            </View>
            <Text style={[styles.wordmark, { color: colors.text }]}>Rook</Text>
          </View>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.detail, { color: colors.textSoft }]}>{detail}</Text>
          <View style={styles.clerkSlot}>{children}</View>
        </View>
      </View>
      {split ? (
        <View style={styles.visualPanel}>
          <Image source={bloomImage} resizeMode="cover" style={styles.visual} />
          <View style={styles.visualShade} />
          <View style={styles.visualCopy}>
            <Text style={styles.visualEyebrow}>ROOK WORKROOM</Text>
            <Text style={styles.visualTitle}>Where focus finds momentum.</Text>
            <Text style={styles.visualDetail}>
              Build one deliberate team at a time, with every decision visible and yours to guide.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: "row" },
  authPanel: { minHeight: "100%", justifyContent: "center" },
  authPanelSplit: { width: "47%", minWidth: 460, paddingHorizontal: 56 },
  authPanelFull: { flex: 1, paddingHorizontal: 24 },
  authContent: { width: "100%", maxWidth: 430, alignSelf: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 56 },
  brandMark: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  wordmark: { fontSize: 20, fontWeight: "700", letterSpacing: -0.7 },
  eyebrow: { fontSize: 11.5, fontWeight: "700", letterSpacing: 1.4, marginBottom: 10, textTransform: "uppercase" },
  title: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: -1.1, maxWidth: 400 },
  detail: { fontSize: 14, lineHeight: 21, marginTop: 12, marginBottom: 30, maxWidth: 400 },
  clerkSlot: { alignItems: "flex-start", width: "100%" },
  visualPanel: { flex: 1, overflow: "hidden", backgroundColor: "#0A100E" },
  visual: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  visualShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(8, 12, 12, 0.34)" },
  visualCopy: { position: "absolute", left: 56, right: 56, bottom: 58, maxWidth: 420 },
  visualEyebrow: { color: "#8FF0CD", fontSize: 11, fontWeight: "700", letterSpacing: 1.6, marginBottom: 10, textTransform: "uppercase" },
  visualTitle: { color: "#FFFFFF", fontSize: 32, lineHeight: 39, fontWeight: "700", letterSpacing: -0.9 },
  visualDetail: { color: "#C3CDCB", fontSize: 13.5, lineHeight: 21, marginTop: 11, maxWidth: 370 },
});
