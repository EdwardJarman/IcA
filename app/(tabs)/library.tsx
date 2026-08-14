import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Divider, EmptyState, IconButton, SectionTitle, StatusPill, palette } from "@/components/luma-primitives";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkroom, type Skill } from "@/lib/workroom-store";
import { useLumaNotifications } from "@/lib/luma-notifications";

type LibrarySection = "Skills" | "Routines" | "Files" | "Search" | "Privacy";

export default function LibraryScreen() {
  const { skills, routines, files, bots, addSkill, addRoutine, toggleRoutine } = useWorkroom();
  const [section, setSection] = useState<LibrarySection>("Skills");
  const [skillOpen, setSkillOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [routineOpen, setRoutineOpen] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [routineCadence, setRoutineCadence] = useState("Weekdays · 09:00");
  const [search, setSearch] = useState("");
  const { status: notificationStatus, preferences: notificationPreferences, enableAlerts, setPreference } = useLumaNotifications();

  const handleEnableAlerts = async () => {
    await enableAlerts();
    Alert.alert("Task alerts updated", "Luma will use device notifications for task completions and approval requests when a supported native build and device token are available. Local alerts remain the fallback.");
  };

  const searchResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return [
      ...bots.filter((bot) => `${bot.name} ${bot.role} ${bot.purpose}`.toLowerCase().includes(query)).map((bot) => ({ type: "Bot", title: bot.name, detail: bot.role })),
      ...skills.filter((skill) => `${skill.name} ${skill.description}`.toLowerCase().includes(query)).map((skill) => ({ type: "Skill", title: skill.name, detail: skill.description })),
      ...routines.filter((routine) => `${routine.name} ${routine.summary}`.toLowerCase().includes(query)).map((routine) => ({ type: "Routine", title: routine.name, detail: routine.cadence })),
      ...files.filter((file) => `${file.name} ${file.owner}`.toLowerCase().includes(query)).map((file) => ({ type: "File", title: file.name, detail: `${file.scope} · ${file.owner}` })),
    ];
  }, [bots, files, routines, search, skills]);

  const createSkill = () => {
    if (!skillName.trim() || !skillDescription.trim()) {
      Alert.alert("Finish the skill draft", "Add a clear name and enough detail for a teammate to review the process.");
      return;
    }
    addSkill({
      name: skillName.trim(),
      owner: bots[0]?.name ?? "Luma",
      status: "Draft",
      description: skillDescription.trim(),
      version: "v0.1",
      approvals: "Review approval boundaries before enabling",
    });
    setSkillName("");
    setSkillDescription("");
    setSkillOpen(false);
    setSection("Skills");
  };

  const createRoutine = () => {
    if (!routineName.trim() || !routineCadence.trim()) {
      Alert.alert("Finish the routine draft", "Add a name and a clear schedule before saving the routine.");
      return;
    }
    addRoutine({
      name: routineName.trim(),
      owner: bots[0]?.name ?? "Luma",
      cadence: routineCadence.trim(),
      nextRun: "Paused until enabled",
      state: "Paused",
      summary: "Review inputs, approval boundaries, and capability status before enabling this routine.",
    });
    setRoutineName("");
    setRoutineCadence("Weekdays · 09:00");
    setRoutineOpen(false);
    setSection("Routines");
  };

  const tabs: LibrarySection[] = ["Skills", "Routines", "Files", "Search", "Privacy"];

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.head}><View><Text style={styles.title}>Library</Text><Text style={styles.lead}>Reusable work, files, and the controls that keep each Bot clear.</Text></View><IconButton icon={section === "Skills" || section === "Routines" ? "add" : "tune"} label={section === "Skills" ? "Create skill" : section === "Routines" ? "Create routine" : "Library options"} onPress={() => section === "Skills" ? setSkillOpen(true) : section === "Routines" ? setRoutineOpen(true) : Alert.alert("Library controls", "This area keeps process, files, privacy choices, and schedule state visible. Select a card to review its details.")} tone="mint" /></View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmented}>
          {tabs.map((tab) => <Pressable key={tab} accessibilityRole="tab" accessibilityState={{ selected: section === tab }} onPress={() => setSection(tab)} style={({ pressed }) => [styles.segment, section === tab && styles.segmentActive, pressed && styles.pressed]}><Text style={[styles.segmentText, section === tab && styles.segmentTextActive]}>{tab}</Text></Pressable>)}
        </ScrollView>

        {section === "Skills" ? <SkillsPanel skills={skills} onCreate={() => setSkillOpen(true)} /> : null}
        {section === "Routines" ? <View style={styles.panel}><SectionTitle eyebrow="Automation" title="Routines" action={<Pressable accessibilityRole="button" onPress={() => setRoutineOpen(true)} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionText}>NEW</Text></Pressable>} /> <Text style={styles.panelLead}>Background execution is capability-dependent. These routines are stored locally and make their boundaries visible.</Text><View style={styles.cards}>{routines.map((routine) => <View key={routine.id} style={styles.routineCard}><View style={styles.routineHead}><View style={styles.routineTitleWrap}><Text style={styles.cardTitle}>{routine.name}</Text><Text style={styles.cardMeta}>{routine.owner} · {routine.cadence}</Text></View><StatusPill label={routine.state} tone={routine.state === "Active" ? "mint" : "muted"} /></View><Text style={styles.cardDetail}>{routine.summary}</Text><View style={styles.routineFoot}><Text style={styles.nextRun}>NEXT · {routine.nextRun}</Text><Pressable accessibilityRole="button" onPress={() => toggleRoutine(routine.id)} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}><Text style={styles.smallActionText}>{routine.state === "Active" ? "Pause" : "Resume"}</Text></Pressable></View></View>)}</View><View style={styles.infoLine}><MaterialIcons name="schedule" size={16} color={palette.mist} /><Text style={styles.infoText}>When background execution is unavailable, Luma will show a paused state instead of claiming that a routine ran.</Text></View></View> : null}
        {section === "Files" ? <View style={styles.panel}><SectionTitle eyebrow="Artifacts" title="Files" /> <Text style={styles.panelLead}>Attachments remain visibly scoped. Uploads from the composer are Bot-private in this build.</Text><View style={styles.cards}>{files.map((file) => <Pressable key={file.id} accessibilityRole="button" onPress={() => Alert.alert(file.name, `${file.size}\n${file.scope}\nOwned by ${file.owner}\n${file.updatedAt}`)} style={({ pressed }) => [styles.fileCard, pressed && styles.pressed]}><View style={styles.fileIcon}><MaterialIcons name={file.name.endsWith(".pdf") ? "picture-as-pdf" : "description"} size={19} color={palette.mint} /></View><View style={styles.fileCopy}><Text numberOfLines={1} style={styles.cardTitle}>{file.name}</Text><Text style={styles.cardMeta}>{file.size} · {file.updatedAt}</Text><Text style={styles.fileScope}>{file.scope}</Text></View><MaterialIcons name="chevron-right" size={20} color={palette.mist} /></Pressable>)}</View></View> : null}
        {section === "Search" ? <View style={styles.panel}><SectionTitle eyebrow="Find prior work" title="Search" /><View style={styles.searchInput}><MaterialIcons name="search" size={19} color={palette.mist} /><TextInput value={search} onChangeText={setSearch} placeholder="Bots, files, skills, routines…" placeholderTextColor="#788292" style={styles.searchText} accessibilityLabel="Search Luma workroom" /></View>{search.trim() ? <View style={styles.cards}>{searchResults.length ? searchResults.map((result, index) => <View key={`${result.type}-${result.title}-${index}`} style={styles.searchResult}><Text style={styles.resultType}>{result.type.toUpperCase()}</Text><View style={styles.resultCopy}><Text style={styles.cardTitle}>{result.title}</Text><Text numberOfLines={1} style={styles.cardMeta}>{result.detail}</Text></View><MaterialIcons name="north-east" size={18} color={palette.mist} /></View>) : <EmptyState icon="search-off" title="No matching work" detail="Try a Bot name, process title, owner, or file name." />}</View> : <EmptyState icon="manage-search" title="Search the workroom" detail="Find Bots, files, processes, routines, and other visible work without losing context." />}</View> : null}
        {section === "Privacy" ? <View style={styles.panel}><SectionTitle eyebrow="Control" title="Privacy and data" /><Text style={styles.panelLead}>Luma uses local workroom storage in this build. Connection and cloud-execution controls are deliberately shown as unavailable until a trusted service is connected.</Text><View style={styles.privacyCard}><View style={styles.privacyIcon}><MaterialIcons name="storage" size={19} color={palette.mint} /></View><View style={styles.privacyCopy}><Text style={styles.cardTitle}>Workroom data</Text><Text style={styles.cardDetail}>Messages, files, tasks, routines, and settings are saved on this device for continuity after refresh or app closure.</Text></View></View><Divider /><View style={styles.privacyRow}><View><Text style={styles.cardTitle}>Task alerts</Text><Text style={styles.cardMeta}>Task completions and approval requests</Text></View><StatusPill label={notificationStatus} tone={notificationStatus === "Enabled" ? "mint" : notificationStatus === "Permission denied" ? "amber" : "muted"} /></View><View style={styles.preferenceRow}><View><Text style={styles.cardTitle}>Approval alerts</Text><Text style={styles.cardMeta}>High-priority decisions</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: notificationPreferences.approval }} onPress={() => setPreference("approval", !notificationPreferences.approval)} style={({ pressed }) => [styles.preferenceToggle, notificationPreferences.approval && styles.preferenceToggleActive, pressed && styles.pressed]}><Text style={[styles.preferenceToggleText, notificationPreferences.approval && styles.preferenceToggleTextActive]}>{notificationPreferences.approval ? "On" : "Off"}</Text></Pressable></View><View style={styles.preferenceRow}><View><Text style={styles.cardTitle}>Completion alerts</Text><Text style={styles.cardMeta}>Finished task summaries</Text></View><Pressable accessibilityRole="switch" accessibilityState={{ checked: notificationPreferences.completion }} onPress={() => setPreference("completion", !notificationPreferences.completion)} style={({ pressed }) => [styles.preferenceToggle, notificationPreferences.completion && styles.preferenceToggleActive, pressed && styles.pressed]}><Text style={[styles.preferenceToggleText, notificationPreferences.completion && styles.preferenceToggleTextActive]}>{notificationPreferences.completion ? "On" : "Off"}</Text></Pressable></View><View style={styles.privacyRow}><View><Text style={styles.cardTitle}>Browser sessions</Text><Text style={styles.cardMeta}>No external session connected</Text></View><StatusPill label="Unavailable" tone="muted" /></View><View style={styles.privacyRow}><View><Text style={styles.cardTitle}>Model provider</Text><Text style={styles.cardMeta}>Free-model state shown when available</Text></View><StatusPill label="Transparent" tone="mint" /></View><Pressable accessibilityRole="button" onPress={() => void handleEnableAlerts()} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><MaterialIcons name="notifications-active" size={18} color={palette.cloud} /><Text style={styles.secondaryText}>Enable task alerts</Text></Pressable></View> : null}
      </ScrollView>

      <Modal transparent visible={skillOpen} animationType="slide" onRequestClose={() => setSkillOpen(false)}>
        <Pressable style={styles.shade} onPress={() => setSkillOpen(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.grabber} /><SectionTitle eyebrow="New skill" title="Save a process, not a guess" /><Text style={styles.sheetLead}>After saving, review required inputs, validation, errors, and approval boundaries before you enable it.</Text><Text style={styles.fieldLabel}>SKILL NAME</Text><TextInput value={skillName} onChangeText={setSkillName} placeholder="e.g. Weekly source review" placeholderTextColor="#788292" style={styles.field} /><Text style={styles.fieldLabel}>PROCESS SUMMARY</Text><TextInput value={skillDescription} onChangeText={setSkillDescription} placeholder="What it does, validates, and returns…" placeholderTextColor="#788292" multiline style={[styles.field, styles.detailField]} /><Pressable accessibilityRole="button" onPress={createSkill} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Save draft skill</Text><MaterialIcons name="arrow-forward" size={18} color={palette.ink} /></Pressable></Pressable></Pressable>
      </Modal>
      <Modal transparent visible={routineOpen} animationType="slide" onRequestClose={() => setRoutineOpen(false)}>
        <Pressable style={styles.shade} onPress={() => setRoutineOpen(false)}><Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}><View style={styles.grabber} /><SectionTitle eyebrow="New routine" title="Automate only after review" /><Text style={styles.sheetLead}>This starts paused. Confirm its schedule, input source, approval boundary, and supported background capability before you enable it.</Text><Text style={styles.fieldLabel}>ROUTINE NAME</Text><TextInput value={routineName} onChangeText={setRoutineName} placeholder="e.g. Daily delivery scan" placeholderTextColor="#788292" style={styles.field} /><Text style={styles.fieldLabel}>SCHEDULE</Text><TextInput value={routineCadence} onChangeText={setRoutineCadence} placeholder="Weekdays · 09:00" placeholderTextColor="#788292" style={styles.field} /><View style={styles.routineDisclosure}><MaterialIcons name="shield" size={17} color={palette.amber} /><Text style={styles.routineDisclosureText}>External sources and autonomous cloud execution are unavailable in this build. The routine will remain paused until a supported capability is connected.</Text></View><Pressable accessibilityRole="button" onPress={createRoutine} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><Text style={styles.primaryText}>Save paused routine</Text><MaterialIcons name="arrow-forward" size={18} color={palette.ink} /></Pressable></Pressable></Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function SkillsPanel({ skills, onCreate }: { skills: Skill[]; onCreate: () => void }) {
  return <View style={styles.panel}><SectionTitle eyebrow="Reusable work" title="Skills" action={<Pressable accessibilityRole="button" onPress={onCreate} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionText}>NEW</Text></Pressable>} /><Text style={styles.panelLead}>A skill captures the purpose, required access, decision rules, validation, output, and approval boundaries for a repeatable process.</Text><View style={styles.cards}>{skills.map((skill) => <Pressable key={skill.id} accessibilityRole="button" onPress={() => Alert.alert(skill.name, `${skill.description}\n\n${skill.version} · Owner: ${skill.owner}\n${skill.approvals}`)} style={({ pressed }) => [styles.skillCard, pressed && styles.pressed]}><View style={styles.skillHead}><View style={styles.routineTitleWrap}><Text style={styles.cardTitle}>{skill.name}</Text><Text style={styles.cardMeta}>{skill.owner} · {skill.version}</Text></View><StatusPill label={skill.status} tone={skill.status === "Enabled" ? "mint" : skill.status === "Testing" ? "amber" : "muted"} /></View><Text style={styles.cardDetail}>{skill.description}</Text><View style={styles.skillFoot}><MaterialIcons name="verified-user" size={14} color={palette.mint} /><Text style={styles.approvalFoot}>{skill.approvals}</Text></View></Pressable>)}</View><View style={styles.infoLine}><MaterialIcons name="info-outline" size={16} color={palette.mist} /><Text style={styles.infoText}>Teach-by-demonstration can be used only after review and a safe test. This build keeps that flow intentionally draft-only.</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, gap: 18, maxWidth: 780, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  eyebrow: { color: palette.mist, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 5 },
  title: { color: palette.cloud, fontSize: 24, fontWeight: "800", letterSpacing: -0.6, lineHeight: 30, maxWidth: 280 },
  lead: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 330 },
  segmented: { gap: 8, paddingVertical: 1 },
  segment: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 13, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line },
  segmentActive: { borderColor: palette.cloud, backgroundColor: palette.graphite },
  segmentText: { color: palette.mist, fontSize: 12, fontWeight: "800" },
  segmentTextActive: { color: palette.mint },
  panel: { gap: 13 },
  panelLead: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: -7 },
  cards: { gap: 9 },
  skillCard: { backgroundColor: palette.elevated, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 14, gap: 9 },
  skillHead: { flexDirection: "row", gap: 10, alignItems: "flex-start", justifyContent: "space-between" },
  routineCard: { backgroundColor: palette.elevated, borderRadius: 15, borderWidth: 1, borderColor: palette.line, padding: 14, gap: 9 },
  routineHead: { flexDirection: "row", gap: 10, alignItems: "flex-start", justifyContent: "space-between" },
  routineTitleWrap: { flex: 1, minWidth: 0 },
  cardTitle: { color: palette.cloud, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  cardMeta: { color: palette.mist, fontSize: 11, lineHeight: 16, marginTop: 3 },
  cardDetail: { color: palette.mist, fontSize: 12, lineHeight: 18 },
  skillFoot: { flexDirection: "row", gap: 6, alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line, paddingTop: 9 },
  approvalFoot: { flex: 1, color: palette.mint, fontSize: 10, lineHeight: 14 },
  routineFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 3 },
  nextRun: { flex: 1, color: palette.mist, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  smallAction: { borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line },
  smallActionText: { color: palette.cloud, fontSize: 11, fontWeight: "800" },
  infoLine: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 11, borderRadius: 14, backgroundColor: palette.elevated, marginTop: 2 },
  infoText: { flex: 1, color: palette.mist, fontSize: 11, lineHeight: 16 },
  fileCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 12, borderRadius: 15, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line },
  fileIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "#77F3C414", alignItems: "center", justifyContent: "center" },
  fileCopy: { flex: 1, minWidth: 0 },
  fileScope: { color: palette.mint, fontSize: 10, fontWeight: "700", marginTop: 4 },
  searchInput: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 15, paddingHorizontal: 12 },
  searchText: { flex: 1, color: palette.cloud, fontSize: 14, height: 46 },
  searchResult: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 12 },
  resultType: { color: palette.mint, fontSize: 9, fontWeight: "900", letterSpacing: 0.8, width: 48 },
  resultCopy: { flex: 1, minWidth: 0 },
  privacyCard: { flexDirection: "row", gap: 11, padding: 13, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 15 },
  privacyIcon: { width: 37, height: 37, borderRadius: 13, backgroundColor: "#77F3C414", alignItems: "center", justifyContent: "center" },
  privacyCopy: { flex: 1 },
  privacyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9, paddingVertical: 13 },
  preferenceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9, paddingVertical: 10 },
  preferenceToggle: { minWidth: 50, alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line },
  preferenceToggleActive: { backgroundColor: "#77F3C41C", borderColor: "#77F3C466" },
  preferenceToggleText: { color: palette.mist, fontSize: 11, fontWeight: "900" },
  preferenceToggleTextActive: { color: palette.mint },
  secondaryButton: { flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingVertical: 13, marginTop: 4 },
  secondaryText: { color: palette.cloud, fontSize: 13, fontWeight: "800" },
  textAction: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: "#77F3C414" },
  textActionText: { color: palette.mint, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  shade: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  sheet: { backgroundColor: palette.graphite, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 18, paddingBottom: 26, paddingTop: 9, borderTopWidth: 1, borderColor: palette.line },
  grabber: { alignSelf: "center", height: 4, width: 38, borderRadius: 3, backgroundColor: "#526072", marginBottom: 18 },
  sheetLead: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 9, marginBottom: 16 },
  fieldLabel: { color: palette.mint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 6, marginTop: 11 },
  field: { color: palette.cloud, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14 },
  detailField: { minHeight: 86, textAlignVertical: "top" },
  primary: { marginTop: 20, backgroundColor: palette.mint, borderRadius: 15, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: palette.ink, fontSize: 14, fontWeight: "900" },
  routineDisclosure: { marginTop: 15, flexDirection: "row", gap: 8, backgroundColor: "#F6C65B12", borderWidth: 1, borderColor: "#F6C65B38", borderRadius: 13, padding: 10 },
  routineDisclosureText: { flex: 1, color: palette.amber, fontSize: 11, lineHeight: 16 },
});
