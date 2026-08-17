import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Avatar,
  EmptyState,
  Field,
  IconButton,
  PrimaryButton,
  SecondaryButton,
  ScreenHeader,
  Sheet,
  SheetEyebrow,
  StatusPill,
  useRookTheme,
} from "@/components/rook-primitives";
import { BotIdentityPicker } from "@/components/bot-identity-picker";
import { ScreenContainer } from "@/components/screen-container";
import { useDockScroll } from "@/lib/dock-visibility";
import { tint } from "@/lib/ui";
import { useWorkroom, type Bot } from "@/lib/workroom-store";

export default function BotsScreen() {
  const { colors } = useRookTheme();
  const { bots, selectedBotId, selectBot, updateBotStatus, createBot } = useWorkroom();
  const [openBot, setOpenBot] = useState<Bot | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [purpose, setPurpose] = useState("");
  const [approvalRule, setApprovalRule] = useState("Ask me before anything external, irreversible, or sensitive.");
  const [color, setColor] = useState("#0E7C59");
  const [icon, setIcon] = useState("auto-awesome");
  const dockScroll = useDockScroll();

  const handleCreate = () => {
    if (!name.trim() || !role.trim() || !purpose.trim()) {
      Alert.alert("Finish your Bot", "Add a name, primary job, and working description before creating this Bot.");
      return;
    }
    createBot({ name, role, purpose, approvalRule, color, icon });
    setName("");
    setRole("");
    setPurpose("");
    setApprovalRule("Ask me before anything external, irreversible, or sensitive.");
    setColor("#0E7C59");
    setIcon("auto-awesome");
    setNewOpen(false);
  };

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView {...dockScroll} contentContainerStyle={pageStyles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Bots"
          lead={bots.length ? "A small team that stays close to the work." : "Make one teammate for the work you want to move forward."}
          action={<IconButton icon="add" label="Create a Bot" onPress={() => setNewOpen(true)} tone="accent" />}
        />

        {bots.length ? (
          <>
            <View style={{ gap: 10 }}>
              {bots.map((bot) => (
                <Pressable
                  key={bot.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${bot.name}`}
                  onPress={() => {
                    selectBot(bot.id);
                    setOpenBot(bot);
                  }}
                  style={({ pressed }) => [
                    pageStyles.botCard,
                    { borderColor: bot.id === selectedBotId ? tint(colors.accent, 0.35) : colors.line },
                    pressed && { opacity: 0.78, transform: [{ scale: 0.995 }] },
                  ]}
                >
                  <Avatar label={bot.avatar} color={bot.color} icon={bot.icon} size={46} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "700", letterSpacing: -0.2, flexShrink: 1 }}>
                        {bot.name}
                      </Text>
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor:
                            bot.status === "Working" ? colors.mint : bot.status === "Paused" ? colors.amber : colors.textFaint,
                        }}
                      />
                    </View>
                    <Text numberOfLines={1} style={{ color: colors.textSoft, fontSize: 12.5, marginTop: 3 }}>
                      {bot.role}
                    </Text>
                    <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 4 }}>{bot.lastActive}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setNewOpen(true)}
              style={({ pressed }) => [pageStyles.addAnother, pressed && { opacity: 0.7 }]}
            >
              <MaterialIcons name="add" size={18} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: 13.5, fontWeight: "600" }}>Add another Bot</Text>
            </Pressable>
          </>
        ) : (
          <View style={{ marginTop: 16 }}>
            <EmptyState
              icon="person-add-alt-1"
              title="Your team starts here"
              detail="Begin with one clear job. Add another Bot only when the work naturally splits."
              action={<PrimaryButton label="Make a Bot" icon="add" onPress={() => setNewOpen(true)} />}
            />
          </View>
        )}
      </ScrollView>

      {/* Bot profile */}
      <Sheet visible={Boolean(openBot)} onClose={() => setOpenBot(null)}>
        {openBot ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Avatar label={openBot.avatar} color={openBot.color} icon={openBot.icon} size={56} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: 21, lineHeight: 27, fontWeight: "700", letterSpacing: -0.5 }}>
                  {openBot.name}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textSoft, fontSize: 13, marginTop: 3 }}>
                  {openBot.role}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
              <StatusPill
                label={openBot.status}
                tone={openBot.status === "Working" ? "mint" : openBot.status === "Paused" ? "amber" : "muted"}
              />
              <Text style={{ color: colors.textFaint, fontSize: 12 }}>· {openBot.lastActive}</Text>
            </View>
            <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 20, marginTop: 14 }}>{openBot.purpose}</Text>

            <View style={{ gap: 12, marginTop: 18 }}>
              <InfoBlock label="Memory" value={openBot.memory} />
              <InfoBlock label="Pause point" value={openBot.approvalRule} />
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 24 }}>
              <SecondaryButton
                label={openBot.status === "Paused" ? "Resume" : "Pause"}
                icon={openBot.status === "Paused" ? "play-arrow" : "pause"}
                onPress={() => {
                  const status = openBot.status === "Paused" ? "Ready" : "Paused";
                  updateBotStatus(openBot.id, status);
                  setOpenBot({ ...openBot, status });
                }}
              />
              <PrimaryButton label="Done" onPress={() => setOpenBot(null)} />
            </View>
          </>
        ) : null}
      </Sheet>

      {/* Create a Bot */}
      <Sheet visible={newOpen} onClose={() => setNewOpen(false)}>
        <SheetEyebrow>New Bot</SheetEyebrow>
        <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.6 }}>
          Another teammate
        </Text>
        <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 7, marginBottom: 18 }}>
          Give it a name, a job, and a clear point to pause for you.
        </Text>
        <View style={{ gap: 14 }}>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Atlas, Ledger, Scout…" />
          <Field label="Primary job" value={role} onChangeText={setRole} placeholder="Research analyst" />
          <Field
            label="What it owns"
            value={purpose}
            onChangeText={setPurpose}
            placeholder="Summarizes sources, flags contradictions, returns a brief I can act on."
            multiline
          />
          <Field label="Approval boundary" value={approvalRule} onChangeText={setApprovalRule} multiline />
          <BotIdentityPicker color={color} icon={icon} onColorChange={setColor} onIconChange={setIcon} />
        </View>
        <View style={{ marginTop: 24 }}>
          <PrimaryButton label="Create Bot" icon="check" onPress={handleCreate} />
        </View>
      </Sheet>
    </ScreenContainer>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  const { colors } = useRookTheme();
  return (
    <View style={{ gap: 5 }}>
      <Text style={{ color: colors.accent, fontSize: 11.5, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text style={{ color: colors.textSoft, fontSize: 13, lineHeight: 19 }}>{value}</Text>
    </View>
  );
}


const pageStyles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34, gap: 20, maxWidth: 720, width: "100%", alignSelf: "center" },
  botCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  addAnother: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
