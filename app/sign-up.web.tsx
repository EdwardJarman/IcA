import { SignUp } from "@clerk/expo/web";
import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/components/rook-primitives";

export default function WebSignUpScreen() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1">
      <View style={styles.screen}>
        <Text style={styles.wordmark}>Rook</Text>
        <Text style={styles.title}>Start with a clear workroom.</Text>
        <Text style={styles.detail}>Create your secure Rook account, then make your first Bot from scratch.</Text>
        <View style={styles.card}>
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/" />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", padding: 24 },
  wordmark: { color: palette.cloud, fontSize: 21, fontWeight: "900", letterSpacing: -0.8, marginBottom: 10 },
  title: { color: palette.cloud, fontSize: 27, lineHeight: 33, letterSpacing: -0.8, fontWeight: "900", textAlign: "center", maxWidth: 380 },
  detail: { color: palette.mist, fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 390, marginTop: 8, marginBottom: 24 },
  card: { width: "100%", maxWidth: 430, alignItems: "center" },
});
