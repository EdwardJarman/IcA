import { useHostedAuth } from "@clerk/expo/hosted-auth";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/components/luma-primitives";
import { ScreenContainer } from "@/components/screen-container";

type AuthMode = "sign-in" | "sign-up";

export default function SignInScreen() {
  const { startHostedAuth } = useHostedAuth();
  const [mode, setMode] = useState<AuthMode | null>(null);

  const begin = async (nextMode: AuthMode) => {
    setMode(nextMode);
    try {
      await startHostedAuth({ mode: nextMode });
    } catch {
      Alert.alert("Sign-in unavailable", "UmU could not open the secure Clerk sign-in page. Please check your connection and try again.");
    } finally {
      setMode(null);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1">
      <View style={styles.screen}>
        <View style={styles.orbit}>
          <View style={styles.dotOne} />
          <View style={styles.dotTwo} />
          <View style={styles.dotThree} />
          <View style={styles.mark}><MaterialIcons name="auto-awesome" size={32} color="#FFFFFF" /></View>
        </View>
        <Text style={styles.wordmark}>UmU</Text>
        <Text style={styles.title}>A small team for{"\n"}your real work.</Text>
        <Text style={styles.detail}>Make every Bot your own. Keep conversations, decisions, and files close without the noise.</Text>
        <View style={styles.actions}>
          <AuthButton mode="sign-in" label="Sign in" icon="login" loading={mode} onPress={() => void begin("sign-in")} />
          <AuthButton mode="sign-up" label="Create an account" icon="person-add-alt-1" loading={mode} onPress={() => void begin("sign-up")} />
        </View>
        <Text style={styles.legal}>Secure sign-in is provided by Clerk. UmU never sees your password.</Text>
      </View>
    </ScreenContainer>
  );
}

function AuthButton({ mode, label, icon, loading, onPress }: { mode: AuthMode; label: string; icon: "login" | "person-add-alt-1"; loading: AuthMode | null; onPress: () => void }) {
  const isLoading = loading === mode;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={Boolean(loading)} style={({ pressed }) => [styles.providerButton, pressed && !loading && styles.pressed, Boolean(loading) && styles.disabled]}>
      {isLoading ? <ActivityIndicator color={palette.cloud} /> : <MaterialIcons name={icon} size={20} color={palette.cloud} />}
      <Text style={styles.providerText}>{isLoading ? "Opening secure sign-in…" : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 27, paddingBottom: 20 },
  orbit: { width: 144, height: 144, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  mark: { width: 74, height: 74, borderRadius: 28, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center", shadowColor: palette.lavender, shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  dotOne: { position: "absolute", width: 23, height: 23, borderRadius: 9, backgroundColor: palette.mint, top: 7, left: 22, transform: [{ rotate: "16deg" }] },
  dotTwo: { position: "absolute", width: 20, height: 20, borderRadius: 10, backgroundColor: "#198EDE", bottom: 16, left: 8 },
  dotThree: { position: "absolute", width: 18, height: 18, borderRadius: 8, backgroundColor: "#DF8D19", bottom: 8, right: 14 },
  wordmark: { color: palette.cloud, fontSize: 20, letterSpacing: -0.8, fontWeight: "900", marginBottom: 8 },
  title: { color: palette.cloud, fontSize: 29, lineHeight: 35, letterSpacing: -0.9, fontWeight: "900", textAlign: "center" },
  detail: { color: palette.mist, textAlign: "center", fontSize: 14, lineHeight: 21, marginTop: 11, maxWidth: 335 },
  actions: { width: "100%", maxWidth: 370, gap: 10, marginTop: 30 },
  providerButton: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 18, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line },
  providerText: { color: palette.cloud, fontSize: 14, fontWeight: "900" },
  legal: { color: palette.mist, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 17, maxWidth: 335 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.66 },
});
