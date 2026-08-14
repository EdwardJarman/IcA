import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, IconButton, SectionTitle, StatusPill, palette } from "@/components/luma-primitives";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkroom, type Bot } from "@/lib/workroom-store";

const templates = [
  { role: "Researcher", icon: "search", detail: "Finds current sources and labels uncertainty." },
  { role: "Writer", icon: "edit-note", detail: "Turns rough notes into clear, review-ready drafts." },
  { role: "Coordinator", icon: "account-tree", detail: "Keeps work owned, moving, and visible." },
];

export default function BotsScreen() {
  const { bots, selectedBotId, selectBot, updateBotStatus, createBot } = useWorkroom();
  const [openBot, setOpenBot] = useState<Bot | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Researcher");
  const [purpose, setPurpose] = useState("");

  const handleCreate = () => {
    if (!name.trim() || !purpose.trim()) {
      Alert.alert("A clear owner needs a name and goal", "Add a short name and what this Bot should own.");
      return;
    }
    createBot({ name: name.trim(), role: role.trim() || "Assistant", purpose: purpose.trim() });
    setName("");
    setRole("Researcher");
    setPurpose("");
    setNewOpen(false);
  };

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}><View><Text style={styles.title}>Your Bots</Text><Text style={styles.lead}>A small team for the work you want to keep moving.</Text></View><IconButton icon="add" label="Create a Bot" onPress={() => setNewOpen(true)} tone="mint" /></View>

        <SectionTitle eyebrow="Your team" title={`${bots.length} teammates`} />
        <View style={styles.list}>
          {bots.map((bot) => (
            <Pressable key={bot.id} accessibilityRole="button" onPress={() => { selectBot(bot.id); setOpenBot(bot); }} style={({ pressed }) => [styles.botCard, bot.id === selectedBotId && styles.botCardActive, pressed && styles.pressed]}>
              <Avatar label={bot.avatar} color={bot.color} size={46} />
              <View style={styles.botCopy}><View style={styles.nameLine}><Text style={styles.botName}>{bot.name}</Text><StatusPill label={bot.status} tone={bot.status === "Working" ? "mint" : bot.status === "Paused" ? "amber" : "muted"} /></View><Text numberOfLines={1} style={styles.purpose}>{bot.role} · {bot.lastActive}</Text></View>
              <MaterialIcons name="chevron-right" size={21} color={palette.mist} />
            </Pressable>
          ))}
        </View>

        <SectionTitle eyebrow="Start from a role" title="Templates" />
        <View style={styles.templateGrid}>{templates.map((template) => <Pressable key={template.role} accessibilityRole="button" onPress={() => { setRole(template.role); setNewOpen(true); }} style={({ pressed }) => [styles.template, pressed && styles.pressed]}><MaterialIcons name={template.icon as never} size={20} color={palette.mint} /><Text style={styles.templateTitle}>{template.role}</Text><Text style={styles.templateDetail}>{template.detail}</Text></Pressable>)}</View>
      </ScrollView>

      <Modal transparent visible={Boolean(openBot)} animationType="slide" onRequestClose={() => setOpenBot(null)}>
        <Pressable style={styles.shade} onPress={() => setOpenBot(null)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>{openBot ? <>
          <View style={styles.grabber} />
          <View style={styles.profileHead}><Avatar label={openBot.avatar} color={openBot.color} size={57} /><View style={styles.profileCopy}><Text style={styles.profileName}>{openBot.name}</Text><Text style={styles.profileRole}>{openBot.role}</Text></View><StatusPill label={openBot.status} tone={openBot.status === "Working" ? "mint" : openBot.status === "Paused" ? "amber" : "muted"} /></View>
          <Text style={styles.profilePurpose}>{openBot.purpose}</Text>
          <View style={styles.infoBlock}><Text style={styles.infoLabel}>MEMORY</Text><Text style={styles.infoText}>{openBot.memory}</Text></View>
          <View style={styles.infoBlock}><Text style={styles.infoLabel}>APPROVAL BOUNDARY</Text><Text style={styles.infoText}>{openBot.approvalRule}</Text></View>
          <View style={styles.infoBlock}><Text style={styles.infoLabel}>MODEL STATUS</Text><Text style={styles.infoText}>{openBot.model} · Availability can vary.</Text></View>
          <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => { updateBotStatus(openBot.id, openBot.status === "Paused" ? "Ready" : "Paused"); setOpenBot({ ...openBot, status: openBot.status === "Paused" ? "Ready" : "Paused" }); }} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><MaterialIcons name={openBot.status === "Paused" ? "play-arrow" : "pause"} size={18} color={palette.cloud} /><Text style={styles.secondaryText}>{openBot.status === "Paused" ? "Resume" : "Pause"}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => Alert.alert("Export ready", `${openBot.name}'s visible settings and memory can be reviewed in this workroom. File and account export controls are available from the Library settings.`)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><MaterialIcons name="ios-share" size={18} color={palette.cloud} /><Text style={styles.secondaryText}>Export</Text></Pressable></View>
        </> : null}</Pressable></Pressable>
      </Modal>

      <Modal transparent visible={newOpen} animationType="slide" onRequestClose={() => setNewOpen(false)}>
        <Pressable style={styles.shade} onPress={() => setNewOpen(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.grabber} /><SectionTitle eyebrow="New Bot" title="Choose a small, clear role" /><Text style={styles.sheetLead}>Luma will ask before anything external, destructive, or sensitive. You can tune this Bot later.</Text><Text style={styles.fieldLabel}>NAME</Text><TextInput value={name} onChangeText={setName} style={styles.field} placeholder="e.g. Sol" placeholderTextColor="#788292" /><Text style={styles.fieldLabel}>ROLE</Text><TextInput value={role} onChangeText={setRole} style={styles.field} placeholder="Researcher" placeholderTextColor="#788292" /><Text style={styles.fieldLabel}>GOAL</Text><TextInput value={purpose} onChangeText={setPurpose} style={[styles.field, styles.goal]} placeholder="What should this Bot own?" placeholderTextColor="#788292" multiline /><Pressable accessibilityRole="button" onPress={handleCreate} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Create Bot</Text><MaterialIcons name="arrow-forward" size={18} color={palette.ink} /></Pressable></Pressable></Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, gap: 20, maxWidth: 780, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 14 },
  eyebrow: { color: palette.mist, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 5 },
  title: { color: palette.cloud, fontSize: 24, lineHeight: 30, fontWeight: "800", letterSpacing: -0.6, maxWidth: 280 },
  lead: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 330 },
  list: { gap: 9, marginTop: -5 },
  botCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: palette.graphite, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.line, borderRadius: 0, paddingVertical: 12 },
  botCardActive: { backgroundColor: palette.elevated, borderRadius: 14, paddingHorizontal: 10 },
  botCopy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 7, justifyContent: "space-between" },
  botName: { color: palette.cloud, fontSize: 15, fontWeight: "800" },
  role: { color: palette.mint, fontSize: 11, fontWeight: "700", marginTop: 3 },
  purpose: { color: palette.mist, fontSize: 12, lineHeight: 17, marginTop: 4 },
  templateGrid: { gap: 9 },
  template: { backgroundColor: palette.elevated, borderColor: palette.line, borderWidth: 1, padding: 13, borderRadius: 15, gap: 5 },
  templateTitle: { color: palette.cloud, fontSize: 14, fontWeight: "800", marginTop: 3 },
  templateDetail: { color: palette.mist, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  shade: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  sheet: { backgroundColor: palette.graphite, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 18, paddingBottom: 26, paddingTop: 9, borderTopWidth: 1, borderColor: palette.line },
  grabber: { alignSelf: "center", height: 4, width: 38, borderRadius: 3, backgroundColor: "#526072", marginBottom: 18 },
  profileHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  profileCopy: { flex: 1 },
  profileName: { color: palette.cloud, fontSize: 19, fontWeight: "900" },
  profileRole: { color: palette.mint, fontSize: 12, fontWeight: "700", marginTop: 2 },
  profilePurpose: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 15 },
  infoBlock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line, paddingTop: 12, marginTop: 15 },
  infoLabel: { color: palette.mint, fontSize: 10, letterSpacing: 1, fontWeight: "800", marginBottom: 5 },
  infoText: { color: palette.cloud, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 9, marginTop: 19 },
  secondaryButton: { flex: 1, borderRadius: 14, backgroundColor: palette.elevated, borderColor: palette.line, borderWidth: 1, flexDirection: "row", justifyContent: "center", gap: 6, alignItems: "center", paddingVertical: 13 },
  secondaryText: { color: palette.cloud, fontSize: 13, fontWeight: "800" },
  sheetLead: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 9, marginBottom: 17 },
  fieldLabel: { color: palette.mint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 6, marginTop: 11 },
  field: { color: palette.cloud, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14 },
  goal: { minHeight: 82, textAlignVertical: "top" },
  primary: { marginTop: 20, backgroundColor: palette.mint, borderRadius: 15, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: palette.ink, fontSize: 14, fontWeight: "900" },
});
