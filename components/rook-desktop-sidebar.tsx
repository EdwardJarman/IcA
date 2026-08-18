import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BotCreateSheet } from "@/components/bot-create-sheet";
import { GlassSurface, useGlassTone } from "@/components/liquid-glass";
import { Avatar } from "@/components/rook-primitives";
import { useAuth } from "@/hooks/use-auth";
import { botDragSourceProps, useBotDrag } from "@/lib/bot-drag";
import { tint, useRookTheme } from "@/lib/ui";
import { useWorkroom, type Bot } from "@/lib/workroom-store";

/**
 * The desktop rail: a slab of liquid glass holding the Bot roster and nothing
 * else. There are no navigation sections — the product is one chat, and the only
 * job of this panel is to hand Bots to it. Drag a Bot onto the chat (or click it)
 * and it joins the room.
 *
 * A brand-new account sees a genuinely empty roster. No sample teammates.
 */

/** Wide-canvas width where web switches from dock to sidebar. */
export const DESKTOP_NAV_BREAKPOINT = 960;
/** Floating sidebar panel width and canvas margins, on the 4pt grid. */
export const SIDEBAR_WIDTH = 248;
export const SIDEBAR_MARGIN = 12;
export const STAGE_GUTTER = 12;

/**
 * Playful identity light floating behind the glass. Soft, low-saturation blobs
 * from the identity palette — the slab refracts them, which is what makes it
 * read as liquid glass instead of frosted plastic.
 */
const COLOR_BLOBS = [
  { size: 168, top: -44, left: -52, color: "#8B5CF6" },
  { size: 128, top: 132, left: 132, color: "#22C55E" },
  { size: 104, top: 304, left: -28, color: "#F472B6" },
  { size: 148, top: 452, left: 84, color: "#14B8A6" },
  { size: 96, top: 560, left: -36, color: "#3B82F6" },
];

/** Scene inset that keeps desktop content clear of the floating sidebar. */
export const DESKTOP_STAGE_INSET = {
  paddingLeft: SIDEBAR_MARGIN + SIDEBAR_WIDTH + STAGE_GUTTER,
  paddingTop: STAGE_GUTTER,
  paddingRight: STAGE_GUTTER,
  paddingBottom: STAGE_GUTTER,
};

export function RookDesktopSidebar({ navigation }: BottomTabBarProps) {
  const { colors } = useRookTheme();
  const glass = useGlassTone();
  const { user } = useAuth();
  const { bots } = useWorkroom();
  const { beginDrag, endDrag, draggingBot, chatBotIds, addBotToChat } = useBotDrag();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const displayName = user?.name ?? user?.email?.split("@")[0] ?? null;
  const showDragHint = bots.length > 0 && chatBotIds.length === 0;

  return (
    <>
      <View
        style={[styles.frame, { width: SIDEBAR_WIDTH, left: SIDEBAR_MARGIN }]}
        accessibilityLabel="Bot roster"
      >
        {/* Soft identity light behind the glass — what the slab refracts. Clipped
            to the panel's own radius so color never bleeds onto the stage. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 26, overflow: "hidden" }]}>
          {COLOR_BLOBS.map((blob, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                top: blob.top,
                left: blob.left,
                width: blob.size,
                height: blob.size,
                borderRadius: blob.size / 2,
                backgroundColor: tint(blob.color, glass.dark ? 0.22 : 0.3),
              }}
            />
          ))}
        </View>
        <GlassSurface radius={26} blur={36} style={{ flex: 1 }} contentStyle={styles.panel}>
          {/* Workspace identity — a small mark and the product name, nothing louder. */}
          <View style={styles.brand}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 10.5,
                backgroundColor: colors.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.onInk, fontSize: 15, fontWeight: "800" }}>R</Text>
            </View>
            <Text style={{ color: colors.text, fontSize: 15.5, fontWeight: "700", letterSpacing: -0.3 }}>Rook</Text>
          </View>

          {/* Roster header. The only action in the panel. */}
          <View style={styles.rosterHeader}>
            <Text style={{ color: colors.textSoft, fontSize: 12, fontWeight: "600", letterSpacing: 0.2 }}>Bots</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a Bot"
              onPress={() => setCreateOpen(true)}
              onHoverIn={() => setHoveredKey("new-bot")}
              onHoverOut={() => setHoveredKey((current) => (current === "new-bot" ? null : current))}
              style={({ pressed }) => [
                styles.newBot,
                hoveredKey === "new-bot" && { backgroundColor: tint(colors.text, glass.dark ? 0.12 : 0.06) },
                pressed && { opacity: 0.6, transform: [{ scale: 0.96 }] },
              ]}
            >
              <MaterialIcons name="add" size={18} color={colors.textSoft} />
            </Pressable>
          </View>

          {bots.length === 0 ? (
            /* Blank by design: an empty roster is empty. */
            <View style={{ flex: 1 }} />
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 8, gap: 2 }}
              showsVerticalScrollIndicator={false}
            >
              {bots.map((bot) => (
                <SidebarBotRow
                  key={bot.id}
                  bot={bot}
                  inChat={chatBotIds.includes(bot.id)}
                  dragging={draggingBot?.id === bot.id}
                  hovered={hoveredKey === bot.id}
                  onHoverChange={(hovered) =>
                    setHoveredKey((current) => (hovered ? bot.id : current === bot.id ? null : current))
                  }
                  onPress={() => addBotToChat(bot.id)}
                  onDragStart={() => beginDrag(bot)}
                  onDragEnd={endDrag}
                />
              ))}
            </ScrollView>
          )}

          {showDragHint ? (
            <Text style={{ color: colors.textFaint, fontSize: 11.5, lineHeight: 16, paddingHorizontal: 10, paddingBottom: 10 }}>
              Drag a Bot into the chat to bring it in.
            </Text>
          ) : null}

          {/* Compact account footer — who is signed in, one quiet hop from settings. */}
          {displayName ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open account"
              onPress={() => navigation.navigate("account")}
              onHoverIn={() => setHoveredKey("account-chip")}
              onHoverOut={() => setHoveredKey((current) => (current === "account-chip" ? null : current))}
              style={({ pressed }) => [
                styles.account,
                {
                  backgroundColor:
                    hoveredKey === "account-chip" ? tint(colors.text, glass.dark ? 0.1 : 0.05) : "transparent",
                  borderTopColor: glass.rimShade,
                },
                pressed && { opacity: 0.72 },
              ]}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 11,
                  backgroundColor: tint(colors.accent, glass.dark ? 0.24 : 0.13),
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: tint(colors.accent, glass.dark ? 0.4 : 0.26),
                }}
              >
                <Text style={{ color: colors.accent, fontSize: 14, fontWeight: "700", letterSpacing: -0.2 }}>
                  {displayName.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.text, fontSize: 13, fontWeight: "600", letterSpacing: -0.1 }}
                >
                  {displayName}
                </Text>
                {user?.email ? (
                  <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11, marginTop: 1 }}>
                    {user.email}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ) : null}
        </GlassSurface>
      </View>

      <BotCreateSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(bot) => addBotToChat(bot.id)}
      />
    </>
  );
}

/** One roster row: the Bot's mark, its name, its job. Draggable on web. */
function SidebarBotRow({
  bot,
  inChat,
  dragging,
  hovered,
  onHoverChange,
  onPress,
  onDragStart,
  onDragEnd,
}: {
  bot: Bot;
  inChat: boolean;
  dragging: boolean;
  hovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onPress: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const { colors } = useRookTheme();
  const glass = useGlassTone();
  const dragProps = botDragSourceProps(bot, { onStart: onDragStart, onEnd: onDragEnd });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={inChat ? `${bot.name}, already in the chat` : `Add ${bot.name} to the chat`}
      accessibilityHint={Platform.OS === "web" ? "Drag onto the chat, or press to add." : undefined}
      onHoverIn={() => onHoverChange(true)}
      onHoverOut={() => onHoverChange(false)}
      onPress={onPress}
      {...dragProps}
      style={({ pressed }) => [
        styles.item,
        hovered && { backgroundColor: tint(colors.text, glass.dark ? 0.1 : 0.05) },
        dragging && { opacity: 0.4 },
        pressed && { opacity: 0.72 },
        Platform.OS === "web" ? ({ cursor: "grab" } as never) : null,
      ]}
    >
      <Avatar label={bot.avatar} color={bot.color} icon={bot.icon} size={32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13.5, fontWeight: "600", letterSpacing: -0.1 }}>
          {bot.name}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 1 }}>
          {bot.status === "Working" ? "Working now" : bot.role}
        </Text>
      </View>
      {inChat ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: "absolute",
    top: SIDEBAR_MARGIN,
    bottom: SIDEBAR_MARGIN,
    zIndex: 50,
  },
  panel: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  brand: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10.5,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  rosterHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 2,
    marginBottom: 4,
  },
  newBot: {
    width: 30,
    height: 30,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  account: {
    marginTop: 4,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
