import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar, Divider, EmptyState, IconButton, SectionTitle, StatusPill, palette } from "@/components/luma-primitives";
import { ScreenContainer } from "@/components/screen-container";
import { useWorkroom } from "@/lib/workroom-store";

export default function ActivityScreen() {
  const { approvals, bots, activity, notifications, resolveApproval, markNotificationsRead } = useWorkroom();
  const pendingApprovals = approvals.filter((approval) => approval.state === "Pending");
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <ScreenContainer containerClassName="bg-background" className="flex-1" edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}><View><Text style={styles.title}>Activity</Text><Text style={styles.lead}>Decisions, handoffs, and updates in one quiet timeline.</Text></View><IconButton icon="done-all" label="Mark notifications read" onPress={markNotificationsRead} tone={unreadCount ? "mint" : "default"} /></View>

        <SectionTitle eyebrow="Decision queue" title={pendingApprovals.length ? `${pendingApprovals.length} approval${pendingApprovals.length === 1 ? "" : "s"} waiting` : "No approvals waiting"} />
        {pendingApprovals.length ? <View style={styles.cards}>{pendingApprovals.map((approval) => { const bot = bots.find((entry) => entry.id === approval.botId); return <View key={approval.id} style={styles.approvalCard}><View style={styles.approvalHead}><View style={styles.approvalIdentity}>{bot ? <Avatar label={bot.avatar} color={bot.color} size={36} /> : null}<View><Text style={styles.cardTitle}>{approval.title}</Text><Text style={styles.cardMeta}>{bot?.name ?? "Luma"} · {approval.createdAt}</Text></View></View><StatusPill label={`${approval.risk} risk`} tone="amber" /></View><Text style={styles.cardDetail}>{approval.detail}</Text><View style={styles.approvalActions}><Pressable accessibilityRole="button" onPress={() => resolveApproval(approval.id, "Declined")} style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}><Text style={styles.declineText}>Decline</Text></Pressable><Pressable accessibilityRole="button" onPress={() => resolveApproval(approval.id, "Approved")} style={({ pressed }) => [styles.approveButton, pressed && styles.pressed]}><MaterialIcons name="check" size={18} color={palette.ink} /><Text style={styles.approveText}>Approve</Text></Pressable></View></View>; })}</View> : <EmptyState icon="verified-user" title="Nothing needs a decision" detail="Luma will bring external, irreversible, sensitive, or high-impact actions here before continuing." />}

        <SectionTitle eyebrow="Team flow" title="Visible handoffs" />
        <View style={styles.handoffCard}><View style={styles.handoffLine}><View style={styles.handoffNode}><Text style={styles.handoffInitial}>S</Text></View><View style={styles.handoffConnector} /><View style={[styles.handoffNode, { borderColor: "#B9B5FF66", backgroundColor: "#B9B5FF16" }]}><Text style={[styles.handoffInitial, { color: palette.lavender }]}>N</Text></View><View style={styles.handoffConnector} /><View style={[styles.handoffNode, { borderColor: "#F6C65B66", backgroundColor: "#F6C65B16" }]}><Text style={[styles.handoffInitial, { color: palette.amber }]}>M</Text></View></View><Text style={styles.handoffTitle}>Launch brief workroom</Text><Text style={styles.cardDetail}>Sable owns the source outline, Nova owns delivery checks, and Mira is queued to shape the review draft. One owner is shown for each stage.</Text><View style={styles.handoffFoot}><StatusPill label="Sable owns now" tone="mint" /><Pressable accessibilityRole="button" onPress={() => Alert.alert("Reassign work", "Open the relevant conversation to direct a message to another Bot or stop the current task. This handoff timeline is intentionally visible and auditable.")} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionText}>VIEW CONTEXT</Text></Pressable></View></View>

        <SectionTitle eyebrow="Recent work" title="Activity trail" />
        <View style={styles.timeline}>{activity.map((entry, index) => <View key={entry.id} style={styles.timelineRow}><View style={styles.timelineRail}><View style={[styles.timelineDot, entry.tone === "amber" && { backgroundColor: palette.amber }, entry.tone === "coral" && { backgroundColor: palette.coral }, entry.tone === "muted" && { backgroundColor: palette.mist }]} />{index < activity.length - 1 ? <View style={styles.timelineLine} /> : null}</View><View style={styles.timelineCopy}><Text style={styles.timelineTitle}>{entry.title}</Text><Text style={styles.timelineDetail}>{entry.detail}</Text><Text style={styles.timelineTime}>{entry.createdAt}</Text></View></View>)}</View>

        <SectionTitle eyebrow="Notification inbox" title={unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "All caught up"} />
        <View style={styles.notificationCard}>{notifications.map((notification, index) => <View key={notification.id}>{index ? <Divider /> : null}<View style={styles.notificationRow}><View style={[styles.notificationIcon, notification.tone === "amber" && { backgroundColor: "#F6C65B16" }, notification.tone === "coral" && { backgroundColor: "#FF7B7B16" }]}><MaterialIcons name={notification.tone === "amber" ? "priority-high" : notification.tone === "coral" ? "error-outline" : "check-circle-outline"} size={18} color={notification.tone === "amber" ? palette.amber : notification.tone === "coral" ? palette.coral : palette.mint} /></View><View style={styles.notificationCopy}><Text style={[styles.cardTitle, !notification.read && styles.notificationUnread]}>{notification.title}</Text><Text style={styles.cardMeta}>{notification.detail}</Text></View><Text style={styles.noticeTime}>{notification.createdAt}</Text></View></View>)}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, gap: 20, maxWidth: 780, width: "100%", alignSelf: "center" },
  head: { flexDirection: "row", justifyContent: "space-between", gap: 14 },
  eyebrow: { color: palette.mist, fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginBottom: 5 },
  title: { color: palette.cloud, fontSize: 24, fontWeight: "800", letterSpacing: -0.6, lineHeight: 30 },
  lead: { color: palette.mist, fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 330 },
  cards: { gap: 9 },
  approvalCard: { backgroundColor: "#FFF9EE", borderWidth: 1, borderColor: "#F0D59D", borderRadius: 15, padding: 14, gap: 12 },
  approvalHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  approvalIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9, minWidth: 0 },
  cardTitle: { color: palette.cloud, fontSize: 14, lineHeight: 19, fontWeight: "800" },
  cardMeta: { color: palette.mist, fontSize: 11, lineHeight: 16, marginTop: 3 },
  cardDetail: { color: palette.mist, fontSize: 12, lineHeight: 18 },
  approvalActions: { flexDirection: "row", gap: 9 },
  declineButton: { flex: 1, alignItems: "center", borderRadius: 13, paddingVertical: 12, borderWidth: 1, borderColor: "#FF7B7B50", backgroundColor: "#FF7B7B0E" },
  declineText: { color: palette.coral, fontSize: 13, fontWeight: "800" },
  approveButton: { flex: 1, flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", borderRadius: 13, paddingVertical: 12, backgroundColor: palette.mint },
  approveText: { color: palette.ink, fontSize: 13, fontWeight: "900" },
  handoffCard: { backgroundColor: palette.elevated, borderWidth: 1, borderColor: palette.line, borderRadius: 15, padding: 15, gap: 10 },
  handoffLine: { flexDirection: "row", alignItems: "center", paddingVertical: 3 },
  handoffNode: { width: 32, height: 32, borderRadius: 11, backgroundColor: "#18B98216", borderWidth: 1, borderColor: "#18B98266", alignItems: "center", justifyContent: "center" },
  handoffInitial: { color: palette.mint, fontSize: 13, fontWeight: "900" },
  handoffConnector: { height: 1, flex: 1, backgroundColor: palette.line, marginHorizontal: 6 },
  handoffTitle: { color: palette.cloud, fontSize: 14, fontWeight: "800" },
  handoffFoot: { paddingTop: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  textAction: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: "#18B98214" },
  textActionText: { color: palette.mint, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: "row", minHeight: 66 },
  timelineRail: { width: 23, alignItems: "center" },
  timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.mint, marginTop: 4 },
  timelineLine: { width: 1, flex: 1, backgroundColor: palette.line, marginVertical: 4 },
  timelineCopy: { flex: 1, paddingBottom: 14, paddingLeft: 7 },
  timelineTitle: { color: palette.cloud, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  timelineDetail: { color: palette.mist, fontSize: 11, lineHeight: 16, marginTop: 3 },
  timelineTime: { color: "#687383", fontSize: 10, marginTop: 5 },
  notificationCard: { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, borderRadius: 15, overflow: "hidden" },
  notificationRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 13 },
  notificationIcon: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#18B98214" },
  notificationCopy: { flex: 1, minWidth: 0 },
  notificationUnread: { color: palette.mint },
  noticeTime: { color: palette.mist, fontSize: 10 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
});
