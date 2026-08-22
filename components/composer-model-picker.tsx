import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Sheet, SheetEyebrow } from "@/components/rook-primitives";
import { defaultModelForProvider, modelsForProvider, providerLabel, type AiProvider } from "@/lib/ai-provider";
import { trpc } from "@/lib/trpc";
import { tint, useRookTheme } from "@/lib/ui";

export function ComposerModelPicker({
  value,
  provider,
  onChange,
}: {
  value: string;
  provider: AiProvider;
  onChange: (modelId: string) => void;
}) {
  const { colors, dark } = useRookTheme();
  const [open, setOpen] = useState(false);
  const catalog = trpc.ai.models.useQuery(undefined, { staleTime: 5 * 60 * 1000, retry: 1 });
  const models = useMemo(
    () => modelsForProvider(catalog.data?.models ?? [], provider),
    [catalog.data?.models, provider],
  );
  const selected = useMemo(
    () => models.find((model) => model.id === value) ?? defaultModelForProvider(models, provider),
    [models, provider, value],
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose ${providerLabel(provider)} model`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          maxWidth: 190,
          minHeight: 32,
          borderRadius: 999,
          paddingHorizontal: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: tint(colors.text, dark ? 0.08 : 0.045),
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <MaterialIcons name="auto-awesome" size={14} color={colors.textSoft} />
        <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.textSoft, fontSize: 11.5, fontWeight: "600" }}>
          {catalog.isLoading ? "Loading…" : selected?.name || providerLabel(provider)}
        </Text>
        <MaterialIcons name="expand-more" size={15} color={colors.textFaint} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <SheetEyebrow>{providerLabel(provider)}</SheetEyebrow>
        <Text style={{ color: colors.text, fontSize: 21, lineHeight: 27, fontWeight: "700", letterSpacing: -0.5 }}>Choose a model</Text>
        <Text style={{ color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: 5 }}>
          This model will be used for the focused Bot. Change the provider itself from Account.
        </Text>
        <ScrollView style={{ maxHeight: 390 }} contentContainerStyle={{ paddingTop: 16, paddingBottom: 4, gap: 4 }} showsVerticalScrollIndicator={false}>
          {models.map((model) => {
            const active = model.id === selected?.id;
            return (
              <Pressable
                key={model.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                style={({ pressed }) => ({
                  minHeight: 58,
                  borderRadius: 15,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 11,
                  backgroundColor: active ? tint(colors.accent, dark ? 0.16 : 0.07) : "transparent",
                  opacity: pressed ? 0.68 : 1,
                })}
              >
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: active ? tint(colors.accent, 0.13) : colors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={model.automatic ? "route" : "memory"} size={16} color={active ? colors.accent : colors.textFaint} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13.5, fontWeight: active ? "700" : "600" }}>{model.name}</Text>
                  <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11, marginTop: 2 }}>{model.provider} · {model.usageLabel}</Text>
                </View>
                {active ? <MaterialIcons name="check" size={18} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
          {!catalog.isLoading && !models.length ? (
            <View style={{ paddingVertical: 24, gap: 7, alignItems: "center" }}>
              <MaterialIcons name="link-off" size={24} color={colors.textFaint} />
              <Text style={{ color: colors.text, fontSize: 13.5, fontWeight: "600" }}>No {providerLabel(provider)} models available</Text>
              <Text style={{ color: colors.textFaint, fontSize: 11.5, lineHeight: 17, textAlign: "center" }}>
                {provider === "chatgpt" ? "Reconnect ChatGPT from Account, then try again." : "Rook could not load the free model list right now."}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </Sheet>
    </>
  );
}
