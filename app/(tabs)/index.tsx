import * as DocumentPicker from "expo-document-picker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  Avatar,
  EmptyState,
  Field,
  IconButton,
  PrimaryButton,
  SecondaryButton,
  Sheet,
  SheetEyebrow,
  StatusPill,
  toneColors,
  useRookTheme,
} from "@/components/rook-primitives";
import { BotIdentityPicker } from "@/components/bot-identity-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useRookNotifications } from "@/lib/rook-notifications";
import { useDockScroll } from "@/lib/dock-visibility";
import { tint } from "@/lib/ui";
import { useWorkroom, type TaskStatus, type WorkTask } from "@/lib/workroom-store";
import { trpc } from "@/lib/trpc";
import { approvalReason, fileSizeLabel, requiresApproval } from "@/lib/workroom-helpers";

const toneForStatus = (status: TaskStatus) =>
  status === "Approval required" || status === "Blocked"
    ? ("amber" as const)
    : status === "Failed" || status === "Cancelled"
      ? ("coral" as const)
      : status === "Paused" || status === "Waiting for input"
        ? ("muted" as const)
        : ("mint" as const);

export default function WorkroomScreen() {
  const router = useRouter();
  const { colors } = useRookTheme();
  const {
    ready,
    bots,
    selectedBotId,
    selectBot,
    messages,
    tasks,
    approvals,
    addFile,
    addMessage,
    addTask,
    updateTaskStatus,
    updateBotStatus,
    createBot,
    addApproval,
  } = useWorkroom();
  const [composer, setComposer] = useState("");
  const [botPickerOpen, setBotPickerOpen] = useState(false);
  const [newBotOpen, setNewBotOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
  const [taskOpen, setTaskOpen] = useState<WorkTask | null>(null);
  const [newBotName, setNewBotName] = useState("");
  const [newBotRole, setNewBotRole] = useState("");
  const [newBotPurpose, setNewBotPurpose] = useState("");
  const [newBotApproval, setNewBotApproval] = useState("Ask me before anything external, irreversible, or sensitive.");
  const [newBotColor, setNewBotColor] = useState("#0E7C59");
  const [newBotIcon, setNewBotIcon] = useState("auto-awesome");
  const replyMutation = trpc.workroom.reply.useMutation();
  const { preferences: notificationPreferences, sendTaskAlert } = useRookNotifications();
  const dockScroll = useDockScroll();
  const threadRef = useRef<ScrollView>(null);

  const selectedBot = useMemo(() => bots.find((bot) => bot.id === selectedBotId) ?? bots[0], [bots, selectedBotId]);
  const visibleMessages = selectedBot ? messages.filter((message) => message.botId === selectedBot.id) : [];
  const visibleTasks = selectedBot ? tasks.filter((task) => task.botId === selectedBot.id) : [];
  const pendingApproval = selectedBot
    ? approvals.find((approval) => approval.botId === selectedBot.id && approval.state === "Pending")
    : undefined;
  const pendingCount = approvals.filter((approval) => approval.state === "Pending").length;

  /* Keep the newest message in view as the thread grows. */
  useEffect(() => {
    if (visibleMessages.length > 0) threadRef.current?.scrollToEnd({ animated: true });
  }, [visibleMessages.length]);

  const openBotCreation = () => {
    setSetupStep(1);
    setNewBotOpen(true);
  };
  const closeBotCreation = () => {
    setNewBotOpen(false);
    setSetupStep(1);
  };

  const handleCreateBot = () => {
    if (!newBotName.trim()) {
      setSetupStep(1);
      Alert.alert("Name your Bot", "Choose a short name that makes this teammate easy to recognize.");
      return;
    }
    if (!newBotRole.trim() || !newBotPurpose.trim()) {
      setSetupStep(2);
      Alert.alert("Describe the work", "Add a primary job and a clear description of what this Bot should own.");
      return;
    }
    createBot({
      name: newBotName,
      role: newBotRole,
      purpose: newBotPurpose,
      approvalRule: newBotApproval,
      color: newBotColor,
      icon: newBotIcon,
    });
    setNewBotName("");
    setNewBotRole("");
    setNewBotPurpose("");
    setNewBotApproval("Ask me before anything external, irreversible, or sensitive.");
    setNewBotColor("#0E7C59");
    setNewBotIcon("auto-awesome");
    closeBotCreation();
  };

  const handleSend = async () => {
    const clean = composer.trim();
    if (!clean || !selectedBot) return;
    const requiresReview = requiresApproval(clean);
    const task = addTask({
      botId: selectedBot.id,
      title: clean.length > 52 ? `${clean.slice(0, 52)}…` : clean,
      status: requiresReview ? "Approval required" : "Planning",
      summary: requiresReview
        ? "Waiting for your decision before any sensitive step."
        : "Preparing a focused response from your instructions.",
      nextAction: requiresReview ? "Review the proposed action in Updates." : "Review the result and decide what happens next.",
      risk: requiresReview ? "Medium" : "Low",
      steps: [
        { id: "scope", label: "Understand the result you want", state: "active" },
        { id: "work", label: "Do the safe work", state: "pending" },
        { id: "return", label: "Return the result", state: "pending" },
      ],
    });
    addMessage({ botId: selectedBot.id, author: "user", body: clean });
    setComposer("");
    if (requiresReview) {
      addApproval({ botId: selectedBot.id, title: task.title, detail: approvalReason(clean), risk: "Medium" });
      void sendTaskAlert({
        kind: "approval",
        title: "Approval needed in Rook",
        body: `${selectedBot.name} needs your decision`,
        url: "/activity",
      });
      addMessage({
        botId: selectedBot.id,
        author: "bot",
        body: `I can prepare the work, but I need your approval before this step. ${approvalReason(clean)}`,
        kind: "approval",
        taskId: task.id,
      });
      return;
    }
    updateBotStatus(selectedBot.id, "Working");
    try {
      updateTaskStatus(task.id, "Working", "Finishing the requested work.");
      const response = await replyMutation.mutateAsync({
        botName: selectedBot.name,
        botRole: selectedBot.role,
        botPurpose: selectedBot.purpose,
        message: clean,
        recentContext: visibleMessages.slice(-6).map((message) => ({ author: message.author, body: message.body })),
      });
      updateTaskStatus(task.id, "Completed", "Result returned. You can refine or start a new task.");
      updateBotStatus(selectedBot.id, "Ready");
      addMessage({ botId: selectedBot.id, author: "bot", body: response.text, taskId: task.id });
      if (notificationPreferences.completion && !response.pushDelivery.accepted)
        void sendTaskAlert({
          kind: "completion",
          title: `${selectedBot.name} completed a task`,
          body: response.text.slice(0, 170),
          url: "/",
        });
    } catch {
      updateTaskStatus(task.id, "Partially completed", "The response service is unavailable. Try again when model capacity returns.");
      updateBotStatus(selectedBot.id, "Ready");
      addMessage({
        botId: selectedBot.id,
        author: "bot",
        body: "I saved your request, but the response service is unavailable right now. Nothing external was attempted. Please retry shortly.",
        taskId: task.id,
      });
    }
  };

  const handleAttach = async () => {
    if (!selectedBot) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true, type: "*/*" });
      if (result.canceled) return;
      const asset = result.assets[0];
      addFile({ name: asset.name, size: fileSizeLabel(asset.size), scope: "Bot-private", owner: selectedBot.name });
      addMessage({
        botId: selectedBot.id,
        author: "system",
        body: `Attached ${asset.name}. It is available only to ${selectedBot.name} in this local workroom.`,
        kind: "activity",
        attachmentName: asset.name,
      });
    } catch {
      Alert.alert("File attachment unavailable", "Rook could not attach this file. Please try again from the device file picker.");
    }
  };

  const changeTaskState = (status: TaskStatus) => {
    if (!taskOpen) return;
    updateTaskStatus(taskOpen.id, status, status === "Cancelled" ? "This task will not take further actions." : taskOpen.nextAction);
    setTaskOpen({ ...taskOpen, status });
  };

  const canSend = Boolean(composer.trim()) && !replyMutation.isPending;

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Top bar — the active Bot is the conversation's identity. */}
        <View
          style={{
            minHeight: 58,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            gap: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
            backgroundColor: colors.canvas,
          }}
        >
          {selectedBot ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch Bot"
              onPress={() => setBotPickerOpen(true)}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                  paddingVertical: 8,
                  paddingRight: 10,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Avatar label={selectedBot.avatar} color={selectedBot.color} icon={selectedBot.icon} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15.5, fontWeight: "700", letterSpacing: -0.2 }}>
                  {selectedBot.name}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 1 }}>
                  {selectedBot.status === "Working" ? "Working now" : selectedBot.role}
                </Text>
              </View>
              <MaterialIcons name="expand-more" size={20} color={colors.textFaint} />
            </Pressable>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 11,
                  backgroundColor: colors.ink,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="castle" size={17} color={colors.onInk} />
              </View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "700", letterSpacing: -0.3 }}>Rook</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {selectedBot ? (
              <View>
                <IconButton icon="notifications-none" label="Open updates" onPress={() => router.navigate("/activity" as never)} />
                {pendingCount > 0 ? (
                  <View
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.amber,
                      borderWidth: 1.5,
                      borderColor: colors.canvas,
                    }}
                  />
                ) : null}
              </View>
            ) : null}
            <IconButton icon="add" label="Create a Bot" onPress={openBotCreation} tone="accent" />
          </View>
        </View>

        {!ready ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.textFaint, fontSize: 13 }}>Opening your workroom…</Text>
          </View>
        ) : !selectedBot ? (
          /* First-run: one calm invitation, no clutter. */
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingBottom: 40 }}>
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 26,
                backgroundColor: colors.ink,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 26,
              }}
            >
              <MaterialIcons name="castle" size={34} color={colors.onInk} />
            </View>
            <Text style={{ color: colors.text, fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.8, textAlign: "center" }}>
              Start with one good Bot.
            </Text>
            <Text style={{ color: colors.textSoft, fontSize: 14, lineHeight: 21, textAlign: "center", maxWidth: 320, marginTop: 10 }}>
              Give it a name, a job, and a clear point to pause for you. Rook begins exactly where you do.
            </Text>
            <View style={{ marginTop: 24 }}>
              <PrimaryButton label="Make a Bot" icon="add" onPress={openBotCreation} />
            </View>
            <Text style={{ color: colors.textFaint, fontSize: 12, lineHeight: 17, textAlign: "center", maxWidth: 280, marginTop: 18 }}>
              Add more teammates only when the work naturally calls for them.
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              ref={threadRef}
              {...dockScroll}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 18,
                paddingBottom: 22,
                gap: 16,
                maxWidth: 760,
                width: "100%",
                alignSelf: "center",
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Quiet context line that opens the thread. */}
              <View
                style={{
                  alignSelf: "center",
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  maxWidth: "100%",
                }}
              >
                <Text numberOfLines={2} style={{ color: colors.textSoft, fontSize: 12, lineHeight: 17, textAlign: "center" }}>
                  {selectedBot.purpose}
                </Text>
              </View>

              {pendingApproval ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.navigate("/activity" as never)}
                  style={({ pressed }) => [
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 11,
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: colors.amberSoft,
                      borderWidth: 1,
                      borderColor: tint(colors.amber, 0.28),
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      backgroundColor: tint(colors.amber, 0.14),
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="shield" size={18} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.text, fontSize: 13.5, fontWeight: "600" }}>A decision is waiting</Text>
                    <Text numberOfLines={1} style={{ color: colors.amber, fontSize: 12, marginTop: 2 }}>
                      {pendingApproval.title}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.amber} />
                </Pressable>
              ) : null}

              {visibleTasks.slice(0, 1).map((task) => (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open task ${task.title}`}
                  onPress={() => setTaskOpen(task)}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.line,
                      borderRadius: 18,
                      padding: 15,
                      gap: 11,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "600", letterSpacing: -0.1 }}>
                        {task.title}
                      </Text>
                      <Text numberOfLines={2} style={{ color: colors.textSoft, fontSize: 12.5, lineHeight: 18, marginTop: 3 }}>
                        {task.summary}
                      </Text>
                    </View>
                    <StatusPill label={task.status} tone={toneForStatus(task.status)} />
                  </View>
                  <TaskProgress steps={task.steps} />
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <Text numberOfLines={1} style={{ flex: 1, color: colors.textFaint, fontSize: 11.5, lineHeight: 15 }}>
                      {task.nextAction}
                    </Text>
                    <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>Details</Text>
                  </View>
                </Pressable>
              ))}

              {visibleMessages.length ? (
                <View style={{ gap: 14, paddingTop: 2 }}>
                  {visibleMessages.map((message) => {
                    if (message.author === "system" || message.kind === "activity") {
                      return (
                        <View
                          key={message.id}
                          style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 2, maxWidth: "100%" }}
                        >
                          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textFaint }} />
                          <Text style={{ flex: 1, color: colors.textFaint, fontSize: 11.5, lineHeight: 16 }}>{message.body}</Text>
                        </View>
                      );
                    }
                    if (message.author === "user") {
                      return (
                        <View key={message.id} style={{ alignItems: "flex-end", paddingLeft: 48 }}>
                          <View
                            style={{
                              backgroundColor: colors.ink,
                              borderRadius: 20,
                              borderBottomRightRadius: 7,
                              paddingHorizontal: 15,
                              paddingVertical: 11,
                              maxWidth: "100%",
                            }}
                          >
                            <Text style={{ color: colors.onInk, fontSize: 15, lineHeight: 21.5 }}>{message.body}</Text>
                            {message.attachmentName ? <FileChip name={message.attachmentName} /> : null}
                          </View>
                          <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 5, marginRight: 4 }}>
                            {message.createdAt}
                          </Text>
                        </View>
                      );
                    }
                    if (message.kind === "approval") {
                      return (
                        <View
                          key={message.id}
                          style={{
                            flexDirection: "row",
                            gap: 10,
                            backgroundColor: colors.amberSoft,
                            borderWidth: 1,
                            borderColor: tint(colors.amber, 0.25),
                            borderRadius: 16,
                            padding: 13,
                          }}
                        >
                          <MaterialIcons name="shield" size={17} color={colors.amber} />
                          <Text style={{ flex: 1, color: colors.text, fontSize: 13.5, lineHeight: 19.5 }}>{message.body}</Text>
                        </View>
                      );
                    }
                    return (
                      <View key={message.id} style={{ flexDirection: "row", gap: 10, paddingRight: 20 }}>
                        <View style={{ width: 28, alignItems: "center" }}>
                          <Avatar label={selectedBot.avatar} color={selectedBot.color} icon={selectedBot.icon} size={28} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{message.body}</Text>
                          {message.attachmentName ? <FileChip name={message.attachmentName} /> : null}
                          <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 5 }}>{message.createdAt}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyState
                  icon="forum"
                  title={`Talk to ${selectedBot.name}`}
                  detail="Describe the outcome you want, the important context, and when this Bot should pause for you."
                />
              )}
            </ScrollView>

            {/* Composer — a calm, minimal capsule above the home indicator. */}
            <View
              style={{
                backgroundColor: colors.canvas,
                paddingHorizontal: 14,
                paddingTop: 8,
                paddingBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 6,
                  borderRadius: 26,
                  borderWidth: 1,
                  borderColor: colors.line,
                  backgroundColor: colors.surface,
                  paddingLeft: 6,
                  paddingRight: 6,
                  paddingVertical: 6,
                  maxWidth: 760,
                  width: "100%",
                  alignSelf: "center",
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Attach file"
                  onPress={handleAttach}
                  style={({ pressed }) => [
                    {
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.55 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="add" size={22} color={colors.textFaint} />
                </Pressable>
                <TextInput
                  value={composer}
                  onChangeText={setComposer}
                  placeholder={`Message ${selectedBot.name}`}
                  placeholderTextColor={colors.textFaint}
                  multiline
                  style={{
                    flex: 1,
                    minHeight: 36,
                    maxHeight: 108,
                    color: colors.text,
                    fontSize: 15.5,
                    lineHeight: 21,
                    paddingTop: Platform.OS === "ios" ? 8 : 7,
                    paddingBottom: 7,
                    paddingHorizontal: 4,
                    textAlignVertical: "center",
                  }}
                  accessibilityLabel={`Message ${selectedBot.name}`}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  onPress={() => void handleSend()}
                  disabled={!canSend}
                  style={({ pressed }) => [
                    {
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: canSend ? colors.ink : colors.surfaceAlt,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed && canSend ? 0.75 : 1,
                    },
                  ]}
                >
                  <MaterialIcons name="arrow-upward" size={19} color={canSend ? colors.onInk : colors.textFaint} />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      {/* Bot switcher */}
      <Sheet visible={botPickerOpen} onClose={() => setBotPickerOpen(false)}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <View>
            <SheetEyebrow>Switch</SheetEyebrow>
            <Text style={{ color: colors.text, fontSize: 21, lineHeight: 27, fontWeight: "700", letterSpacing: -0.5 }}>
              Your teammates
            </Text>
          </View>
          <IconButton icon="add" label="Create a Bot" onPress={() => { setBotPickerOpen(false); openBotCreation(); }} tone="accent" />
        </View>
        <ScrollView contentContainerStyle={{ paddingTop: 16, paddingBottom: 4, gap: 4 }}>
          {bots.map((bot) => {
            const active = bot.id === selectedBot?.id;
            return (
              <Pressable
                key={bot.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${bot.name}`}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  selectBot(bot.id);
                  setBotPickerOpen(false);
                }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 15,
                    backgroundColor: active ? colors.surfaceAlt : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Avatar label={bot.avatar} color={bot.color} icon={bot.icon} size={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14.5, fontWeight: "600", letterSpacing: -0.1 }}>
                    {bot.name}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 12, marginTop: 2 }}>
                    {bot.status === "Working" ? "Working now" : bot.role}
                  </Text>
                </View>
                {active ? <MaterialIcons name="check" size={19} color={colors.accent} /> : <MaterialIcons name="chevron-right" size={19} color={colors.textFaint} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>

      {/* Create a Bot — three focused steps */}
      <Sheet visible={newBotOpen} onClose={closeBotCreation}>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 3,
                backgroundColor: step <= setupStep ? colors.accent : colors.surfaceAlt,
              }}
            />
          ))}
        </View>
        <SheetEyebrow>New Bot · Step {setupStep} of 3</SheetEyebrow>
        {setupStep === 1 ? (
          <>
            <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.6 }}>
              Name your Bot
            </Text>
            <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 7, marginBottom: 18 }}>
              A short, recognizable name for the teammate you are about to brief.
            </Text>
            <Field label="Name" value={newBotName} onChangeText={setNewBotName} placeholder="Atlas, Ledger, Scout…" autoFocus />
            <BotIdentityPicker color={newBotColor} icon={newBotIcon} onColorChange={setNewBotColor} onIconChange={setNewBotIcon} />
          </>
        ) : null}
        {setupStep === 2 ? (
          <>
            <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.6 }}>
              Describe its work
            </Text>
            <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 7, marginBottom: 18 }}>
              One sentence for the job title, a little more for what it owns.
            </Text>
            <View style={{ gap: 14 }}>
              <Field label="Primary job" value={newBotRole} onChangeText={setNewBotRole} placeholder="Research analyst" autoFocus />
              <Field
                label="What it owns"
                value={newBotPurpose}
                onChangeText={setNewBotPurpose}
                placeholder="Summarizes sources, flags contradictions, returns a brief I can act on."
                multiline
              />
            </View>
          </>
        ) : null}
        {setupStep === 3 ? (
          <>
            <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.6 }}>
              Set the pause point
            </Text>
            <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 7, marginBottom: 18 }}>
              Where should this Bot stop and ask you before continuing?
            </Text>
            <Field label="Approval boundary" value={newBotApproval} onChangeText={setNewBotApproval} multiline autoFocus />
          </>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24 }}>
          {setupStep > 1 ? (
            <SecondaryButton label="Back" onPress={() => setSetupStep((setupStep - 1) as 1 | 2)} />
          ) : (
            <SecondaryButton label="Cancel" onPress={closeBotCreation} />
          )}
          {setupStep < 3 ? (
            <PrimaryButton label="Continue" icon="arrow-forward" onPress={() => setSetupStep((setupStep + 1) as 2 | 3)} />
          ) : (
            <PrimaryButton label="Create Bot" icon="check" onPress={handleCreateBot} />
          )}
        </View>
      </Sheet>

      {/* Task detail */}
      <Sheet visible={Boolean(taskOpen)} onClose={() => setTaskOpen(null)}>
        {taskOpen ? (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <SheetEyebrow>Task</SheetEyebrow>
                <Text style={{ color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: "700", letterSpacing: -0.5 }}>
                  {taskOpen.title}
                </Text>
              </View>
              <StatusPill label={taskOpen.status} tone={toneForStatus(taskOpen.status)} />
            </View>
            <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 10 }}>
              {taskOpen.summary} Started {taskOpen.startedAt}. {taskOpen.risk} risk.
            </Text>
            <TaskProgress steps={taskOpen.steps} />
            <View style={{ marginTop: 16, gap: 13 }}>
              {taskOpen.steps.map((step) => {
                const tone = toneColors(
                  colors,
                  step.state === "done" ? "mint" : step.state === "active" ? "amber" : "muted",
                );
                return (
                  <View key={step.id} style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: step.state === "pending" ? colors.lineStrong : tint(step.state === "done" ? colors.mint : colors.amber, 0.35),
                        backgroundColor: step.state === "pending" ? "transparent" : tone.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {step.state === "done" ? (
                        <MaterialIcons name="check" size={15} color={colors.mint} />
                      ) : step.state === "active" ? (
                        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.amber }} />
                      ) : (
                        <Text style={{ color: colors.textFaint, fontSize: 11, fontWeight: "600" }}>·</Text>
                      )}
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        color: step.state === "active" ? colors.text : colors.textSoft,
                        fontSize: 13.5,
                        fontWeight: step.state === "active" ? "600" : "400",
                      }}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <SecondaryButton label="Pause task" icon="pause" onPress={() => changeTaskState("Paused")} />
              <SecondaryButton label="Stop task" icon="stop" destructive onPress={() => changeTaskState("Cancelled")} />
            </View>
          </>
        ) : null}
      </Sheet>
    </ScreenContainer>
  );
}

/** Segmented progress bar for a task's steps. */
function TaskProgress({ steps }: { steps: WorkTask["steps"] }) {
  const { colors } = useRookTheme();
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {steps.map((step) => (
        <View
          key={step.id}
          accessibilityLabel={step.label}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 3,
            backgroundColor:
              step.state === "done" ? colors.mint : step.state === "active" ? tint(colors.amber, 0.55) : colors.surfaceAlt,
          }}
        />
      ))}
    </View>
  );
}

function FileChip({ name }: { name: string }) {
  const { colors } = useRookTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        marginTop: 8,
        backgroundColor: tint(colors.mint, 0.1),
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 6,
      }}
    >
      <MaterialIcons name="attach-file" size={13} color={colors.mint} />
      <Text numberOfLines={1} style={{ color: colors.mint, fontSize: 11.5, fontWeight: "600" }}>{name}</Text>
    </View>
  );
}
