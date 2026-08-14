import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin, type OAuthProvider } from "@/constants/oauth";
import { palette } from "@/components/luma-primitives";

export default function SignInScreen() {
  const [provider, setProvider] = useState<OAuthProvider | null>(null);
  const begin = async (nextProvider: OAuthProvider) => {
    setProvider(nextProvider);
    try {
      await startOAuthLogin(nextProvider);
    } catch {
      Alert.alert("Sign-in unavailable", "Luma could not open the secure sign-in page. Please check your connection and try again.");
    } finally {
      setProvider(null);
    }
  };

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="bg-background" className="flex-1">
    <View style={styles.screen}><View style={styles.orbit}><View style={styles.dotOne} /><View style={styles.dotTwo} /><View style={styles.dotThree} /><View style={styles.mark}><MaterialIcons name="auto-awesome" size={32} color="#FFFFFF" /></View></View><Text style={styles.title}>Your workroom,{"\n"}your way.</Text><Text style={styles.detail}>Create your own Bots and keep their work, approvals, and files in one calm place.</Text><View style={styles.actions}><ProviderButton provider="google" label="Continue with Google" icon="G" loading={provider} onPress={() => void begin("google")} /><ProviderButton provider="github" label="Continue with GitHub" icon="code" loading={provider} onPress={() => void begin("github")} /></View><Text style={styles.legal}>By continuing, you agree to use the connected identity provider’s secure sign-in flow. Luma never sees your provider password.</Text></View>
  </ScreenContainer>;
}

function ProviderButton({ provider, label, icon, loading, onPress }: { provider: OAuthProvider; label: string; icon: string; loading: OAuthProvider | null; onPress: () => void }) { const isLoading = loading === provider; return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={Boolean(loading)} style={({ pressed }) => [styles.providerButton, pressed && !loading && styles.pressed, Boolean(loading) && styles.disabled]}>{isLoading ? <ActivityIndicator color={palette.cloud} /> : icon === "G" ? <View style={styles.googleIcon}><Text style={styles.googleLetter}>G</Text></View> : <MaterialIcons name="code" size={21} color={palette.cloud} />}<Text style={styles.providerText}>{isLoading ? "Opening secure sign-in…" : label}</Text></Pressable>; }

const styles = StyleSheet.create({ screen: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 27, paddingBottom: 20 }, orbit: { width: 172, height: 172, alignItems: "center", justifyContent: "center", marginBottom: 25 }, mark: { width: 74, height: 74, borderRadius: 28, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center", shadowColor: palette.lavender, shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } }, dotOne: { position: "absolute", width: 23, height: 23, borderRadius: 9, backgroundColor: palette.mint, top: 7, left: 31, transform: [{ rotate: "16deg" }] }, dotTwo: { position: "absolute", width: 20, height: 20, borderRadius: 10, backgroundColor: "#198EDE", bottom: 20, left: 13 }, dotThree: { position: "absolute", width: 18, height: 18, borderRadius: 8, backgroundColor: "#DF8D19", bottom: 11, right: 25 }, title: { color: palette.cloud, fontSize: 29, lineHeight: 35, letterSpacing: -0.9, fontWeight: "900", textAlign: "center" }, detail: { color: palette.mist, textAlign: "center", fontSize: 14, lineHeight: 21, marginTop: 11, maxWidth: 335 }, actions: { width: "100%", maxWidth: 370, gap: 10, marginTop: 30 }, providerButton: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 17, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line }, providerText: { color: palette.cloud, fontSize: 14, fontWeight: "900" }, googleIcon: { width: 22, height: 22, alignItems: "center", justifyContent: "center" }, googleLetter: { color: "#4285F4", fontSize: 20, fontWeight: "900" }, legal: { color: palette.mist, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 17, maxWidth: 335 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, disabled: { opacity: 0.66 } });
