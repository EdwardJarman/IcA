import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, IconButton, SectionTitle, StatusPill, palette } from "@/components/luma-primitives";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkroom, type TaskStatus, type WorkTask } from "@/lib/workroom-store";
import { trpc } from "@/lib/trpc";
import { approvalReason, fileSizeLabel, requiresApproval } from "@/lib/workroom-helpers";
import { useLumaNotifications } from "@/lib/luma-notifications";

const toneForStatus = (status: TaskStatus) => {
  if (status === "Approval required" || status === "Blocked") return "amber" as const;
  if (status === "Failed" || status === "Cancelled") return "coral" as const;
  if (status === "Paused" || status === "Waiting for input") return "muted" as const;
  return "mint" as const;
};

export default function WorkroomScreen() {
  const router = useRouter();
  const { ready, onboardingComplete, completeOnboarding, bots, selectedBotId, selectBot, messages, tasks, approvals, addFile, addMessage, addTask, updateTaskStatus, updateBotStatus, createBot, addApproval } = useWorkroom();
  const [composer, setComposer] = useState("");
  const [botPickerOpen, setBotPickerOpen] = useState(false);
  const [newBotOpen, setNewBotOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState<WorkTask | null>(null);
  const [newBotName, setNewBotName] = useState("");
  const [newBotRole, setNewBotRole] = useState("Researcher");
  const [newBotPurpose, setNewBotPurpose] = useState("");
  const replyMutation = trpc.workroom.reply.useMutation();
  const { installationId, preferences: notificationPreferences, sendTaskAlert } = useLumaNotifications();

  const selectedBot = useMemo(() => bots.find((bot) => bot.id === selectedBotId) ?? bots[0], [bots, selectedBotId]);
  const visibleMessages = messages.filter((message) => message.botId === selectedBot.id);
  const visibleTasks = tasks.filter((task) => task.botId === selectedBot.id);
  const pendingApproval = approvals.find((approval) => approval.botId === selectedBot.id && approval.state === "Pending");

  const handleSend = async () => {
    const clean = composer.trim();
    if (!clean) return;
    const task = addTask({
      botId: selectedBot.id,
      title: clean.length > 48 ? `${clean.slice(0, 48)}…` : clean,
      status: requiresApproval(clean) ? "Approval required" : "Planning",
      summary: "Luma is creating a safe working plan before continuing.",
      nextAction: requiresApproval(clean) ? "Review the requested sensitive action before Luma continues." : "Review the concise plan and continue with low-risk steps.",
      risk: requiresApproval(clean) ? "Medium" : "Low",
      steps: [
        { id: "scope", label: "Clarify the requested outcome", state: "active" },
        { id: "plan", label: "Prepare a short plan", state: "pending" },
        { id: "work", label: "Complete low-risk work", state: "pending" },
        { id: "review", label: "Return a concise result", state: "pending" },
      ],
    });
    addMessage({ botId: selectedBot.id, author: "user", body: clean });
    if (requiresApproval(clean)) {
      addApproval({ botId: selectedBot.id, title: task.title, detail: approvalReason(clean), risk: "Medium" });
      void sendTaskAlert({ kind: "approval", title: "Approval needed in Luma", body: `${selectedBot.name} needs your decision: ${task.title}`, url: "/activity" });
      addMessage({ botId: selectedBot.id, author: "bot", body: `I can prepare the work, but I need your approval before continuing with that step. ${approvalReason(clean)} You can make the decision from Activity.`, kind: "approval", taskId: task.id });
      setComposer("");
      updateBotStatus(selectedBot.id, "Ready");
      return;
    }
    addMessage({ botId: selectedBot.id, author: "system", body: "Task queued · Luma is preparing a short plan and will pause before sensitive actions.", kind: "activity", taskId: task.id });
    updateBotStatus(selectedBot.id, "Working");
    setComposer("");
    try {
      updateTaskStatus(task.id, "Working", "Review the plan, then continue through the remaining low-risk steps.");
      const response = await replyMutation.mutateAsync({
        botName: selectedBot.name,
        botRole: selectedBot.role,
        botPurpose: selectedBot.purpose,
        message: clean,
        recentContext: visibleMessages.slice(-6).map((message) => ({ author: message.author, body: message.body })),
        notification: installationId ? { installationId, enabled: notificationPreferences.completion } : undefined,
      });
      updateTaskStatus(task.id, "Completed", "Task response returned. Review the result and redirect the next step if needed.");
      updateBotStatus(selectedBot.id, "Ready");
      addMessage({
        botId: selectedBot.id,
        author: "bot",
        body: response.text,
        taskId: task.id,
      });
      addMessage({ botId: selectedBot.id, author: "system", body: `Response completed · ${response.model} · ${response.capability}`, kind: "activity", taskId: task.id });
      if (notificationPreferences.completion && !response.pushDelivery.accepted) {
        void sendTaskAlert({ kind: "completion", title: `${selectedBot.name} completed a task`, body: response.text.slice(0, 170), url: "/" });
      }
    } catch {
      updateTaskStatus(task.id, "Partially completed", "The response service was unavailable. Retry when model capacity is available.");
      updateBotStatus(selectedBot.id, "Ready");
      addMessage({
        botId: selectedBot.id,
        author: "bot",
        body: "I saved your task and prepared a safe local plan, but the response service is unavailable right now. Nothing external was attempted. Please retry when model capacity is available.",
        taskId: task.id,
      });
    }
  };

  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true, type: "*/*" });
      if (result.canceled) return;
      const asset = result.assets[0];
      addFile({
        name: asset.name,
        size: fileSizeLabel(asset.size),
        scope: "Bot-private",
        owner: selectedBot.name,
      });
      addMessage({ botId: selectedBot.id, author: "system", body: `Attached ${asset.name}. It is available only to ${selectedBot.name} in this local workroom.`, kind: "activity", attachmentName: asset.name });
    } catch {
      Alert.alert("File attachment unavailable", "Luma could not attach this file. Please try again from the device file picker.");
    }
  };

  const handleCreateBot = () => {
    if (!newBotName.trim() || !newBotPurpose.trim()) {
      Alert.alert("Add a name and goal", "A Bot needs a short name and a clear purpose before it can join the workroom.");
      return;
    }
    createBot({ name: newBotName.trim(), role: newBotRole.trim() || "Assistant", purpose: newBotPurpose.trim() });
    setNewBotName("");
    setNewBotRole("Researcher");
    setNewBotPurpose("");
    setNewBotOpen(false);
  };

  const changeTaskState = (status: TaskStatus) => {
    if (!taskOpen) return;
    updateTaskStatus(taskOpen.id, status, status === "Cancelled" ? "This task will not take further actions." : taskOpen.nextAction);
    setTaskOpen({ ...taskOpen, status });
  };

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Switch Bot" onPress={() => setBotPickerOpen(true)} style={({ pressed }) => [styles.botSelector, pressed && styles.pressed]}>
            <Avatar label={selectedBot.avatar} color={selectedBot.color} size={38} />
            <View style={styles.botSelectorCopy}>
              <Text style={styles.botSelectorName}>{selectedBot.name}</Text>
              <Text style={styles.botSelectorRole}>{selectedBot.role} · {selectedBot.status}</Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={20} color={palette.mist} />
          </Pressable>
          <View style={styles.topbarActions}>
            <IconButton icon="add" label="Create Bot" onPress={() => setNewBotOpen(true)} tone="mint" />
            <IconButton icon="more-horiz" label="Open workroom options" onPress={() => router.navigate("/activity" as never)} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.chatHeading}><Text style={styles.chatHeadingTitle}>Bots</Text><Text style={styles.chatHeadingMeta}>{bots.filter((bot) => bot.status === "Working").length ? `${bots.filter((bot) => bot.status === "Working").length} working` : "All caught up"}</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.botRail}>
            {bots.slice(0, 8).map((bot) => <Pressable key={bot.id} accessibilityRole="button" accessibilityLabel={`Open ${bot.name}`} onPress={() => selectBot(bot.id)} style={({ pressed }) => [styles.botRailItem, bot.id === selectedBot.id && styles.botRailItemSelected, pressed && styles.pressed]}><Avatar label={bot.avatar} color={bot.color} size={46} /><Text numberOfLines={1} style={[styles.botRailName, bot.id === selectedBot.id && styles.botRailNameSelected]}>{bot.name}</Text></Pressable>)}
          </ScrollView>

          <View style={styles.conversationHead}><View><Text style={styles.conversationTitle}>{selectedBot.name}</Text><Text style={styles.conversationDetail}>{selectedBot.role} · {selectedBot.status}</Text></View><StatusPill label={selectedBot.status === "Working" ? "Working" : "Ready"} tone={selectedBot.status === "Working" ? "mint" : "muted"} /></View>

          {pendingApproval ? (
            <Pressable accessibilityRole="button" onPress={() => router.navigate("/activity" as never)} style={({ pressed }) => [styles.approvalBanner, pressed && styles.pressed]}>
              <View style={styles.approvalIcon}><MaterialIcons name="shield" size={19} color={palette.amber} /></View>
              <View style={styles.approvalCopy}>
                <Text style={styles.approvalTitle}>Decision waiting for you</Text>
                <Text style={styles.approvalDetail}>{pendingApproval.title} · {pendingApproval.risk} risk</Text>
              </View>
              <MaterialIcons name="chevron-right" size={21} color={palette.amber} />
            </Pressable>
          ) : null}

          {visibleTasks.slice(0, 1).map((task) => (
            <Pressable key={task.id} accessibilityRole="button" onPress={() => setTaskOpen(task)} style={({ pressed }) => [styles.taskCard, pressed && styles.pressed]}>
              <View style={styles.taskHead}>
                <View style={styles.taskTitleWrap}>
                  <Text numberOfLines={1} style={styles.taskTitle}>{task.title}</Text>
                  <Text numberOfLines={2} style={styles.taskSummary}>{task.summary}</Text>
                </View>
                <StatusPill label={task.status} tone={toneForStatus(task.status)} />
              </View>
              <View style={styles.taskFooter}><Text style={styles.taskNext}>{task.nextAction}</Text><Text style={styles.taskOpen}>Details</Text></View>
            </Pressable>
          ))}

          <SectionTitle eyebrow="Conversation" title={`Work with ${selectedBot.name}`} />
          <View style={styles.conversation}>
            {visibleMessages.map((message) => {
              const isUser = message.author === "user";
              const isSystem = message.author === "system";
              if (isSystem) {
                return <View key={message.id} style={styles.activityRow}><View style={styles.activityDot} /><Text style={styles.activityText}>{message.body}</Text><Text style={styles.activityTime}>{message.createdAt}</Text></View>;
              }
              return (
                <View key={message.id} style={[styles.messageRow, isUser && styles.messageRowUser]}>
                  {!isUser ? <Avatar label={selectedBot.avatar} color={selectedBot.color} size={29} /> : null}
                  <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                    <Text style={[styles.messageAuthor, isUser && styles.userAuthor]}>{isUser ? "You" : selectedBot.name}</Text>
                    <Text style={[styles.messageText, isUser && styles.userText]}>{message.body}</Text>
                    {message.attachmentName ? <View style={styles.inlineAttachment}><MaterialIcons name="attach-file" size={15} color={palette.mint} /><Text style={styles.inlineAttachmentText}>{message.attachmentName}</Text></View> : null}
                    <Text style={[styles.messageTime, isUser && styles.userTime]}>{message.createdAt}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <Pressable accessibilityRole="button" accessibilityLabel="Attach file" onPress={handleAttach} style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}>
              <MaterialIcons name="add" size={23} color={palette.mint} />
            </Pressable>
            <TextInput value={composer} onChangeText={setComposer} placeholder={`Message ${selectedBot.name}`} placeholderTextColor="#788292" multiline style={styles.input} accessibilityLabel={`Message ${selectedBot.name}`} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" onPress={() => void handleSend()} style={({ pressed }) => [styles.sendButton, (!composer.trim() || replyMutation.isPending) && styles.sendDisabled, pressed && composer.trim() && styles.pressed]} disabled={!composer.trim() || replyMutation.isPending}>
              <MaterialIcons name="arrow-upward" size={20} color={composer.trim() ? palette.ink : "#6C7481"} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal transparent visible={botPickerOpen} animationType="slide" onRequestClose={() => setBotPickerOpen(false)}>
        <Pressable style={styles.modalShade} onPress={() => setBotPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetGrabber} />
            <SectionTitle eyebrow="Bots" title="Choose a teammate" action={<IconButton icon="add" label="Create a new Bot" onPress={() => { setBotPickerOpen(false); setNewBotOpen(true); }} tone="mint" />} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetList}>
              {bots.map((bot) => (
                <Pressable key={bot.id} accessibilityRole="button" onPress={() => { selectBot(bot.id); setBotPickerOpen(false); }} style={({ pressed }) => [styles.botChoice, bot.id === selectedBot.id && styles.botChoiceActive, pressed && styles.pressed]}>
                  <Avatar label={bot.avatar} color={bot.color} size={42} />
                  <View style={styles.botChoiceCopy}><Text style={styles.botChoiceName}>{bot.name}</Text><Text numberOfLines={1} style={styles.botChoiceRole}>{bot.role} · {bot.lastActive}</Text></View>
                  <StatusPill label={bot.status} tone={bot.status === "Working" ? "mint" : bot.status === "Paused" ? "amber" : "muted"} />
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={newBotOpen} animationType="slide" onRequestClose={() => setNewBotOpen(false)}>
        <Pressable style={styles.modalShade} onPress={() => setNewBotOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetGrabber} />
            <SectionTitle eyebrow="New Bot" title="Give work a clear owner" />
            <Text style={styles.sheetLead}>Start with a small role and a specific goal. You can refine memory, permissions, and skills later.</Text>
            <Text style={styles.fieldLabel}>NAME</Text>
            <TextInput value={newBotName} onChangeText={setNewBotName} placeholder="e.g. Sol" placeholderTextColor="#788292" style={styles.field} />
            <Text style={styles.fieldLabel}>ROLE</Text>
            <TextInput value={newBotRole} onChangeText={setNewBotRole} placeholder="Researcher" placeholderTextColor="#788292" style={styles.field} />
            <Text style={styles.fieldLabel}>GOAL</Text>
            <TextInput value={newBotPurpose} onChangeText={setNewBotPurpose} placeholder="What should this Bot own?" placeholderTextColor="#788292" multiline style={[styles.field, styles.goalField]} />
            <Pressable accessibilityRole="button" onPress={handleCreateBot} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Create Bot</Text><MaterialIcons name="arrow-forward" size={18} color={palette.ink} /></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={Boolean(taskOpen)} animationType="slide" onRequestClose={() => setTaskOpen(null)}>
        <Pressable style={styles.modalShade} onPress={() => setTaskOpen(null)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetGrabber} />
            {taskOpen ? <>
              <View style={styles.taskModalHead}><View style={styles.taskTitleWrap}><Text style={styles.taskModalTitle}>{taskOpen.title}</Text><Text style={styles.taskSummary}>{taskOpen.summary}</Text></View><StatusPill label={taskOpen.status} tone={toneForStatus(taskOpen.status)} /></View>
              <View style={styles.stepsList}>{taskOpen.steps.map((step, index) => <View key={step.id} style={styles.stepRow}><View style={[styles.stepMarker, step.state === "done" && styles.stepDone, step.state === "active" && styles.stepActive]}>{step.state === "done" ? <MaterialIcons name="check" size={13} color={palette.ink} /> : <Text style={styles.stepNumber}>{index + 1}</Text>}</View><Text style={[styles.stepLabel, step.state === "active" && styles.stepLabelActive]}>{step.label}</Text><Text style={styles.stepState}>{step.state === "active" ? "NOW" : step.state.toUpperCase()}</Text></View>)}</View>
              <View style={styles.taskModalActions}>
                <Pressable accessibilityRole="button" onPress={() => changeTaskState(taskOpen.status === "Paused" ? "Working" : "Paused")} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><MaterialIcons name={taskOpen.status === "Paused" ? "play-arrow" : "pause"} size={18} color={palette.cloud} /><Text style={styles.secondaryButtonText}>{taskOpen.status === "Paused" ? "Resume" : "Pause"}</Text></Pressable>
                <Pressable accessibilityRole="button" onPress={() => changeTaskState("Cancelled")} style={({ pressed }) => [styles.stopButton, pressed && styles.pressed]}><MaterialIcons name="stop" size={18} color={palette.coral} /><Text style={styles.stopButtonText}>Stop</Text></Pressable>
              </View>
            </> : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={ready && !onboardingComplete} animationType="fade" onRequestClose={completeOnboarding}>
        <View style={styles.welcomeShade}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeMark}><View style={styles.markPath} /><MaterialIcons name="auto-awesome" size={21} color={palette.ink} /></View>
            <Text style={styles.welcomeEyebrow}>WELCOME TO LUMA</Text>
            <Text style={styles.welcomeTitle}>Create a Bot, give it real work, and stay in control.</Text>
            <Text style={styles.welcomeDetail}>Start in the safe demo workroom. Luma keeps task states, approvals, and files visible. External browser control and always-on execution are not connected in this build, so it will never claim they happened.</Text>
            <View style={styles.welcomeSteps}><View style={styles.welcomeStep}><Text style={styles.welcomeNumber}>1</Text><Text style={styles.welcomeStepText}>Choose Sable or create a specialized Bot.</Text></View><View style={styles.welcomeStep}><Text style={styles.welcomeNumber}>2</Text><Text style={styles.welcomeStepText}>Send a task and watch the plan become an auditable result.</Text></View><View style={styles.welcomeStep}><Text style={styles.welcomeNumber}>3</Text><Text style={styles.welcomeStepText}>Use Activity for approvals and Library for reusable work.</Text></View></View>
            <Pressable accessibilityRole="button" onPress={completeOnboarding} style={({ pressed }) => [styles.welcomeButton, pressed && styles.pressed]}><Text style={styles.welcomeButtonText}>Open my workroom</Text><MaterialIcons name="arrow-forward" size={18} color={palette.ink} /></Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.graphite },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 9, paddingBottom: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  topbarActions: { flexDirection: "row", gap: 8 },
  botSelector: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10, minWidth: 0 },
  botSelectorCopy: { flex: 1 },
  botSelectorName: { color: palette.cloud, fontSize: 15, lineHeight: 20, fontWeight: "800" },
  botSelectorRole: { color: palette.mist, fontSize: 11, lineHeight: 16, marginTop: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 22, gap: 18, maxWidth: 900, width: "100%", alignSelf: "center" },
  chatHeading: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  chatHeadingTitle: { color: palette.cloud, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  chatHeadingMeta: { color: palette.mist, fontSize: 12 },
  botRail: { gap: 17, paddingVertical: 3, paddingRight: 8 },
  botRailItem: { alignItems: "center", width: 57, gap: 6, paddingVertical: 3 },
  botRailItemSelected: { opacity: 1 },
  botRailName: { color: palette.mist, fontSize: 10, fontWeight: "700", maxWidth: 62 },
  botRailNameSelected: { color: palette.cloud },
  conversationHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 2 },
  conversationTitle: { color: palette.cloud, fontSize: 19, fontWeight: "800", letterSpacing: -0.35 },
  conversationDetail: { color: palette.mist, fontSize: 12, marginTop: 3 },
  approvalBanner: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13, borderRadius: 15, backgroundColor: "#FFF8EA", borderWidth: 1, borderColor: "#F1D092" },
  approvalIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: "#FFF0CB", justifyContent: "center", alignItems: "center" },
  approvalCopy: { flex: 1 },
  approvalTitle: { color: palette.cloud, fontSize: 13, fontWeight: "800" },
  approvalDetail: { color: palette.amber, fontSize: 12, marginTop: 3 },
  taskCard: { backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 14, gap: 9 },
  taskHead: { flexDirection: "row", gap: 10, alignItems: "flex-start", justifyContent: "space-between" },
  taskTitleWrap: { flex: 1, minWidth: 0 },
  taskTitle: { color: palette.cloud, fontSize: 15, fontWeight: "800", lineHeight: 20 },
  taskSummary: { color: palette.mist, fontSize: 12, lineHeight: 18, marginTop: 4 },
  taskFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  taskNext: { flex: 1, color: palette.mist, fontSize: 11, lineHeight: 15 },
  taskOpen: { color: palette.cloud, fontSize: 11, fontWeight: "800" },
  conversation: { gap: 10 },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingRight: 24 },
  messageRowUser: { justifyContent: "flex-end", paddingRight: 0, paddingLeft: 48 },
  messageBubble: { maxWidth: "100%", paddingHorizontal: 13, paddingVertical: 11, borderRadius: 18 },
  botBubble: { backgroundColor: palette.elevated, borderBottomLeftRadius: 6 },
  userBubble: { backgroundColor: palette.ink, borderBottomRightRadius: 6 },
  messageAuthor: { color: palette.mist, fontSize: 10, letterSpacing: 0.4, fontWeight: "800", marginBottom: 4 },
  userAuthor: { color: "#C9CAD0" },
  messageText: { color: palette.cloud, fontSize: 14, lineHeight: 20 },
  userText: { color: "#FFFFFF" },
  messageTime: { color: palette.mist, fontSize: 10, marginTop: 7 },
  userTime: { color: "#C9CAD0" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 4 },
  activityDot: { width: 5, height: 5, borderRadius: 4, backgroundColor: palette.mist },
  activityText: { flex: 1, color: palette.mist, fontSize: 11, lineHeight: 16 },
  activityTime: { color: "#687383", fontSize: 10 },
  inlineAttachment: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 5, paddingHorizontal: 8, paddingVertical: 6, marginTop: 9, backgroundColor: "#FFFFFF", borderRadius: 9 },
  inlineAttachmentText: { color: palette.mint, fontSize: 11, fontWeight: "700" },
  capabilityLine: { flexDirection: "row", gap: 8, backgroundColor: "#1C233080", borderRadius: 14, padding: 12, alignItems: "flex-start" },
  capabilityText: { flex: 1, color: palette.mist, fontSize: 11, lineHeight: 16 },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line, backgroundColor: palette.graphite, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 9, backgroundColor: palette.elevated, borderColor: palette.line, borderWidth: 1, borderRadius: 20, padding: 7, maxWidth: 900, width: "100%", alignSelf: "center" },
  attachButton: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 38, maxHeight: 98, color: palette.cloud, fontSize: 14, lineHeight: 20, paddingTop: 8, paddingBottom: 7, paddingHorizontal: 0 },
  sendButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.ink, alignItems: "center", justifyContent: "center" },
  sendDisabled: { backgroundColor: palette.elevated },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  modalShade: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" },
  sheet: { backgroundColor: palette.graphite, borderTopLeftRadius: 27, borderTopRightRadius: 27, paddingHorizontal: 18, paddingBottom: 24, paddingTop: 9, maxHeight: "84%", borderTopWidth: 1, borderColor: palette.line },
  sheetGrabber: { alignSelf: "center", height: 4, width: 38, borderRadius: 3, backgroundColor: "#526072", marginBottom: 18 },
  sheetList: { gap: 9, paddingTop: 16 },
  botChoice: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: 15, padding: 11 },
  botChoiceActive: { borderColor: palette.cloud, backgroundColor: palette.elevated },
  botChoiceCopy: { flex: 1, minWidth: 0 },
  botChoiceName: { color: palette.cloud, fontSize: 14, fontWeight: "800" },
  botChoiceRole: { color: palette.mist, fontSize: 11, marginTop: 3 },
  sheetLead: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 18 },
  fieldLabel: { color: palette.mint, fontSize: 10, fontWeight: "800", letterSpacing: 1.1, marginBottom: 6, marginTop: 12 },
  field: { color: palette.cloud, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14 },
  goalField: { minHeight: 85, textAlignVertical: "top" },
  primaryButton: { marginTop: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: palette.mint, borderRadius: 15, paddingVertical: 14 },
  primaryButtonText: { color: palette.ink, fontSize: 14, fontWeight: "900" },
  taskModalHead: { flexDirection: "row", gap: 10, justifyContent: "space-between", alignItems: "flex-start" },
  taskModalTitle: { color: palette.cloud, fontSize: 18, lineHeight: 24, fontWeight: "900" },
  stepsList: { marginTop: 20, gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepMarker: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line },
  stepDone: { backgroundColor: palette.mint, borderColor: palette.mint },
  stepActive: { borderColor: palette.mint },
  stepNumber: { color: palette.mist, fontSize: 11, fontWeight: "800" },
  stepLabel: { flex: 1, color: palette.mist, fontSize: 13 },
  stepLabelActive: { color: palette.cloud, fontWeight: "700" },
  stepState: { color: "#6E7888", fontSize: 9, fontWeight: "800", letterSpacing: 0.7 },
  taskModalActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  secondaryButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line },
  secondaryButtonText: { color: palette.cloud, fontWeight: "800", fontSize: 13 },
  stopButton: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 13, borderRadius: 14, backgroundColor: "#FF7B7B10", borderWidth: 1, borderColor: "#FF7B7B40" },
  stopButtonText: { color: palette.coral, fontWeight: "800", fontSize: 13 },
  welcomeShade: { flex: 1, backgroundColor: "#17181B80", alignItems: "center", justifyContent: "center", padding: 22 },
  welcomeCard: { width: "100%", maxWidth: 430, backgroundColor: palette.graphite, borderRadius: 26, borderWidth: 1, borderColor: palette.line, padding: 21 },
  welcomeMark: { width: 54, height: 54, borderRadius: 18, backgroundColor: palette.mint, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 17 },
  markPath: { position: "absolute", width: 30, height: 30, borderRadius: 11, borderWidth: 3, borderColor: "#0B0D1133", transform: [{ rotate: "45deg" }] },
  welcomeEyebrow: { color: palette.mint, fontSize: 10, fontWeight: "900", letterSpacing: 1.3, marginBottom: 7 },
  welcomeTitle: { color: palette.cloud, fontSize: 25, lineHeight: 31, letterSpacing: -0.8, fontWeight: "900" },
  welcomeDetail: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 11 },
  welcomeSteps: { gap: 10, marginTop: 17 },
  welcomeStep: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  welcomeNumber: { width: 20, height: 20, textAlign: "center", paddingTop: 2, color: palette.ink, backgroundColor: palette.mint, borderRadius: 7, fontSize: 11, fontWeight: "900" },
  welcomeStepText: { flex: 1, color: palette.cloud, fontSize: 12, lineHeight: 18 },
  welcomeButton: { marginTop: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: palette.mint, paddingVertical: 14, borderRadius: 15 },
  welcomeButtonText: { color: palette.ink, fontSize: 14, fontWeight: "900" },
});
