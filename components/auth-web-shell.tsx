import { type ReactNode } from "react";
import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";

const bloomImage = require("@/assets/images/bloom-background.webp");

export function AuthWebShell({ eyebrow, title, detail, children }: { eyebrow: string; title: string; detail: string; children: ReactNode }) {
  const { width } = useWindowDimensions();
  const split = width >= 860;

  return (
    <View style={styles.page}>
      <View style={[styles.authPanel, split ? styles.authPanelSplit : styles.authPanelFull]}>
        <View style={styles.authContent}>
          <View style={styles.brandRow}><View style={styles.brandMark}>R</View><Text style={styles.wordmark}>Rook</Text></View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.detail}>{detail}</Text>
          <View style={styles.clerkSlot}>{children}</View>
        </View>
      </View>
      {split ? <View style={styles.visualPanel}><Image source={bloomImage} resizeMode="cover" style={styles.visual} /><View style={styles.visualShade} /><View style={styles.visualCopy}><Text style={styles.visualEyebrow}>ROOK WORKROOM</Text><Text style={styles.visualTitle}>Where focus finds momentum.</Text><Text style={styles.visualDetail}>Build one deliberate team at a time, with every decision visible and yours to guide.</Text></View></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, flexDirection: "row", backgroundColor: "#000000" },
  authPanel: { minHeight: "100%", justifyContent: "center", backgroundColor: "#050506" },
  authPanelSplit: { width: "46%", minWidth: 450, paddingHorizontal: 56 },
  authPanelFull: { flex: 1, paddingHorizontal: 24 },
  authContent: { width: "100%", maxWidth: 430, alignSelf: "flex-start" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 58 },
  brandMark: { width: 32, height: 32, borderRadius: 11, overflow: "hidden", backgroundColor: "#7563F5", color: "#FFFFFF", fontSize: 15, fontWeight: "900", textAlign: "center", lineHeight: 32 },
  wordmark: { color: "#FFFFFF", fontSize: 20, fontWeight: "900", letterSpacing: -0.7 },
  eyebrow: { color: "#70E5BE", fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginBottom: 10 },
  title: { color: "#FFFFFF", fontSize: 33, lineHeight: 39, fontWeight: "900", letterSpacing: -1.1, maxWidth: 390 },
  detail: { color: "#A7ADB8", fontSize: 14, lineHeight: 21, marginTop: 11, marginBottom: 28, maxWidth: 400 },
  clerkSlot: { alignItems: "flex-start", width: "100%" },
  visualPanel: { flex: 1, overflow: "hidden", backgroundColor: "#07100F" },
  visual: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  visualShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.22)" },
  visualCopy: { position: "absolute", left: 56, right: 56, bottom: 58, maxWidth: 410 },
  visualEyebrow: { color: "#89F1D0", fontSize: 10, fontWeight: "900", letterSpacing: 1.6, marginBottom: 9 },
  visualTitle: { color: "#FFFFFF", fontSize: 31, lineHeight: 38, fontWeight: "900", letterSpacing: -0.9 },
  visualDetail: { color: "#C1CBCB", fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 360 },
});
