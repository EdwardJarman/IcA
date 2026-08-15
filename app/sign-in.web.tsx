import { SignIn } from "@clerk/expo/web";
import { StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { palette } from "@/components/rook-primitives";

export default function WebSignInScreen() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1">
      <View style={styles.screen}>
        <Text style={styles.wordmark}>Rook</Text>
        <Text style={styles.title}>Your workroom, ready when you are.</Text>
        <Text style={styles.detail}>Sign in securely to continue to your Bots, tasks, and private workroom.</Text>
        <View style={styles.card}>
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" forceRedirectUrl="/" />
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
