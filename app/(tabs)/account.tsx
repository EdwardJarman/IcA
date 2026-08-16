import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AccountControls } from "./library";
import { palette } from "@/components/rook-primitives";
import { ScreenContainer } from "@/components/screen-container";
import { ThemeToggle } from "@/components/theme-toggle";
import { useDockScroll } from "@/lib/dock-visibility";
import { useWorkroom } from "@/lib/workroom-store";

/** A direct home for profile, data, and session controls. */
export default function AccountScreen() {
  const { syncStatus } = useWorkroom();
  const dockScroll = useDockScroll();

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView {...dockScroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconWrap}><MaterialIcons name="account-circle" size={26} color={palette.cloud} /></View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.title}>Your space, on your terms.</Text>
            <Text style={styles.detail}>Manage your Rook session, data, and workroom preferences in one predictable place.</Text>
          </View>
        </View>
        <ThemeToggle />
        <AccountControls syncStatus={syncStatus} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 30, gap: 22, maxWidth: 780, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", gap: 13, alignItems: "flex-start" },
  iconWrap: { width: 48, height: 48, borderRadius: 17, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  eyebrow: { color: palette.mist, fontSize: 10, letterSpacing: 1.1, fontWeight: "900", marginBottom: 5 },
  title: { color: palette.cloud, fontSize: 23, fontWeight: "900", letterSpacing: -0.65, lineHeight: 29 },
  detail: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 490 },
});
