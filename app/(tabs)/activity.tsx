import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  Avatar,
  EmptyState,
  ScreenHeader,
  SectionHeader,
  SecondaryButton,
  StatusPill,
  useRookTheme,
} from "@/components/rook-primitives";
import { ScreenContainer } from "@/components/screen-container";
import { useDockScroll } from "@/lib/dock-visibility";
import { tint, type ToneName } from "@/lib/ui";
import { useWorkroom } from "@/lib/workroom-store";

export default function ActivityScreen() {
  const { colors } = useRookTheme();
  const { approvals, bots, activity, notifications, resolveApproval, markNotificationsRead } = useWorkroom();
  const pendingApprovals = approvals.filter((approval) => approval.state === "Pending");
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const dockScroll = useDockScroll();

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView
        {...dockScroll}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 34, gap: 22, maxWidth: 720, width: "100%", alignSelf: "center" }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Updates"
          lead="The moments where your work needs you, in one quiet place."
          action={
            notifications.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mark notifications read"
                onPress={markNotificationsRead}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceAlt,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="done-all" size={16} color={unreadCount ? colors.accent : colors.textFaint} />
                <Text style={{ color: unreadCount ? colors.accent : colors.textFaint, fontSize: 12.5, fontWeight: "600" }}>
                  {unreadCount ? `Mark ${unreadCount} read` : "All read"}
                </Text>
              </Pressable>
            ) : undefined
          }
        />

        <View style={{ gap: 14 }}>
          <SectionHeader title={pendingApprovals.length ? `${pendingApprovals.length} waiting on you` : "Nothing needs you"} caption="Decisions your Bots paused for." />
          {pendingApprovals.length ? (
            <View style={{ gap: 10 }}>
              {pendingApprovals.map((approval) => {
                const bot = bots.find((entry) => entry.id === approval.botId);
                return (
                  <View
                    key={approval.id}
                    style={{
                      backgroundColor: colors.amberSoft,
                      borderWidth: 1,
                      borderColor: tint(colors.amber, 0.3),
                      borderRadius: 18,
                      padding: 16,
                      gap: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        {bot ? <Avatar label={bot.avatar} color={bot.color} icon={bot.icon} size={36} /> : null}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text numberOfLines={2} style={{ color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: "600", letterSpacing: -0.1 }}>
                            {approval.title}
                          </Text>
                          <Text style={{ color: colors.textFaint, fontSize: 11.5, marginTop: 2 }}>
                            {bot?.name ?? "Bot"} · {approval.createdAt}
                          </Text>
                        </View>
                      </View>
                      <StatusPill label={`${approval.risk} risk`} tone="amber" />
                    </View>
                    <Text style={{ color: colors.textSoft, fontSize: 13, lineHeight: 19 }}>{approval.detail}</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <SecondaryButton label="Decline" onPress={() => resolveApproval(approval.id, "Declined")} destructive />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Approve ${approval.title}`}
                        onPress={() => resolveApproval(approval.id, "Approved")}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            minHeight: 48,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 7,
                            borderRadius: 16,
                            backgroundColor: colors.ink,
                          },
                          pressed && { opacity: 0.78 },
                        ]}
                      >
                        <MaterialIcons name="check" size={17} color={colors.onInk} />
                        <Text style={{ color: colors.onInk, fontSize: 15, fontWeight: "600" }}>Approve</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState icon="verified-user" title="Nothing needs a decision" detail="When a Bot reaches a pause point you set, its request will appear here." />
          )}
        </View>

        <View style={{ gap: 14 }}>
          <SectionHeader title="What moved" caption="A quiet trail of everything that changed." />
          {activity.length ? (
            <View style={{ paddingLeft: 3 }}>
              {activity.map((entry, index) => {
                const tone: ToneName = entry.tone === "mint" ? "mint" : entry.tone === "amber" ? "amber" : entry.tone === "coral" ? "coral" : "muted";
                const dot =
                  tone === "amber" ? colors.amber : tone === "coral" ? colors.coral : tone === "mint" ? colors.mint : colors.textFaint;
                return (
                  <View key={entry.id} style={{ flexDirection: "row", minHeight: 64 }}>
                    <View style={{ width: 22, alignItems: "center" }}>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot, marginTop: 5 }} />
                      {index < activity.length - 1 ? <View style={{ width: 1.5, flex: 1, backgroundColor: colors.line, marginVertical: 4 }} /> : null}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 14, paddingLeft: 8 }}>
                      <Text style={{ color: colors.text, fontSize: 13.5, lineHeight: 18.5, fontWeight: "600" }}>{entry.title}</Text>
                      <Text style={{ color: colors.textSoft, fontSize: 12, lineHeight: 17, marginTop: 2 }}>{entry.detail}</Text>
                      <Text style={{ color: colors.textFaint, fontSize: 10.5, marginTop: 4 }}>{entry.createdAt}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState icon="timeline" title="Your timeline is clear" detail="Creating a Bot and giving it work will start a real activity trail." />
          )}
        </View>

        <View style={{ gap: 14 }}>
          <SectionHeader title={unreadCount ? `${unreadCount} unread alerts` : "All caught up"} caption="Completions and blockers, delivered quietly." />
          {notifications.length ? (
            <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, overflow: "hidden" }}>
              {notifications.map((notification, index) => {
                const tone: ToneName = notification.tone;
                const iconColor = tone === "amber" ? colors.amber : tone === "coral" ? colors.coral : colors.mint;
                return (
                  <View key={notification.id}>
                    {index ? <View style={{ height: 1, backgroundColor: colors.line }} /> : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 11, padding: 14 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 13,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor:
                            tone === "amber" ? colors.amberSoft : tone === "coral" ? colors.coralSoft : colors.mintSoft,
                        }}
                      >
                        <MaterialIcons
                          name={tone === "amber" ? "priority-high" : tone === "coral" ? "error-outline" : "check-circle-outline"}
                          size={18}
                          color={iconColor}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: notification.read ? colors.textSoft : colors.text,
                            fontSize: 13.5,
                            fontWeight: notification.read ? "500" : "700",
                            letterSpacing: -0.1,
                          }}
                        >
                          {notification.title}
                        </Text>
                        <Text numberOfLines={2} style={{ color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: 2 }}>
                          {notification.detail}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textFaint, fontSize: 10.5 }}>{notification.createdAt}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <EmptyState icon="notifications-none" title="No alerts yet" detail="Task completions and approval requests will appear here after you start work." />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
