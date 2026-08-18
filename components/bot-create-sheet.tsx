import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { BotIdentityPicker } from "@/components/bot-identity-picker";
import {
  Field,
  PrimaryButton,
  SecondaryButton,
  Sheet,
  SheetEyebrow,
  useRookTheme,
} from "@/components/rook-primitives";
import { useWorkroom, type Bot } from "@/lib/workroom-store";

const DEFAULT_APPROVAL = "Ask me before anything external, irreversible, or sensitive.";
const DEFAULT_COLOR = "#0E7C59";
const DEFAULT_ICON = "auto-awesome";

/**
 * Bot creation in three focused steps: who it is, what it owns, where it pauses.
 *
 * Shared by the sidebar roster and the chat's empty state so there is exactly
 * one way to make a teammate.
 */
export function BotCreateSheet({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated?: (bot: Bot) => void;
}) {
  const { colors } = useRookTheme();
  const { createBot } = useWorkroom();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [purpose, setPurpose] = useState("");
  const [approvalRule, setApprovalRule] = useState(DEFAULT_APPROVAL);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);

  const close = () => {
    setStep(1);
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) {
      setStep(1);
      Alert.alert("Name your Bot", "Choose a short name that makes this teammate easy to recognize.");
      return;
    }
    if (!role.trim() || !purpose.trim()) {
      setStep(2);
      Alert.alert("Describe the work", "Add a primary job and a clear description of what this Bot should own.");
      return;
    }
    const bot = createBot({ name, role, purpose, approvalRule, color, icon });
    setName("");
    setRole("");
    setPurpose("");
    setApprovalRule(DEFAULT_APPROVAL);
    setColor(DEFAULT_COLOR);
    setIcon(DEFAULT_ICON);
    close();
    onCreated?.(bot);
  };

  return (
    <Sheet visible={visible} onClose={close}>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
        {[1, 2, 3].map((index) => (
          <View
            key={index}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 3,
              backgroundColor: index <= step ? colors.accent : colors.surfaceAlt,
            }}
          />
        ))}
      </View>
      <SheetEyebrow>New Bot · Step {step} of 3</SheetEyebrow>

      {step === 1 ? (
        <>
          <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.6 }}>
            Name your Bot
          </Text>
          <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 7, marginBottom: 18 }}>
            A short, recognizable name for the teammate you are about to brief.
          </Text>
          <Field label="Name" value={name} onChangeText={setName} placeholder="Atlas, Ledger, Scout…" autoFocus />
          <BotIdentityPicker color={color} icon={icon} onColorChange={setColor} onIconChange={setIcon} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.6 }}>
            Describe its work
          </Text>
          <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 7, marginBottom: 18 }}>
            One sentence for the job title, a little more for what it owns.
          </Text>
          <View style={{ gap: 14 }}>
            <Field label="Primary job" value={role} onChangeText={setRole} placeholder="Research analyst" autoFocus />
            <Field
              label="What it owns"
              value={purpose}
              onChangeText={setPurpose}
              placeholder="Summarizes sources, flags contradictions, returns a brief I can act on."
              multiline
            />
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Text style={{ color: colors.text, fontSize: 23, lineHeight: 29, fontWeight: "700", letterSpacing: -0.6 }}>
            Set the pause point
          </Text>
          <Text style={{ color: colors.textSoft, fontSize: 13.5, lineHeight: 19.5, marginTop: 7, marginBottom: 18 }}>
            Where should this Bot stop and ask you before continuing?
          </Text>
          <Field label="Approval boundary" value={approvalRule} onChangeText={setApprovalRule} multiline autoFocus />
        </>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 24 }}>
        {step > 1 ? (
          <SecondaryButton label="Back" onPress={() => setStep((step - 1) as 1 | 2)} />
        ) : (
          <SecondaryButton label="Cancel" onPress={close} />
        )}
        {step < 3 ? (
          <PrimaryButton label="Continue" icon="arrow-forward" onPress={() => setStep((step + 1) as 2 | 3)} />
        ) : (
          <PrimaryButton label="Create Bot" icon="check" onPress={handleCreate} />
        )}
      </View>
    </Sheet>
  );
}
