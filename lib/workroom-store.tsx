import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type TaskStatus = "Draft" | "Queued" | "Planning" | "Working" | "Waiting for input" | "Approval required" | "Blocked" | "Paused" | "Retrying" | "Completed" | "Partially completed" | "Failed" | "Cancelled";

export type Bot = {
  id: string;
  name: string;
  role: string;
  purpose: string;
  avatar: string;
  color: string;
  status: "Ready" | "Working" | "Paused";
  memory: string;
  approvalRule: string;
  model: string;
  lastActive: string;
};

export type WorkMessage = { id: string; botId: string; author: "user" | "bot" | "system"; body: string; createdAt: string; kind?: "message" | "activity" | "result" | "approval" | "handoff"; taskId?: string; attachmentName?: string };
export type WorkTask = { id: string; botId: string; title: string; status: TaskStatus; summary: string; startedAt: string; nextAction: string; risk: "Low" | "Medium" | "High"; steps: { id: string; label: string; state: "done" | "active" | "pending" }[] };
export type Skill = { id: string; name: string; owner: string; status: "Enabled" | "Draft" | "Testing" | "Paused"; description: string; version: string; approvals: string };
export type Routine = { id: string; name: string; owner: string; cadence: string; nextRun: string; state: "Active" | "Paused"; summary: string };
export type Approval = { id: string; title: string; detail: string; botId: string; risk: "Medium" | "High"; state: "Pending" | "Approved" | "Declined"; createdAt: string };
export type WorkFile = { id: string; name: string; size: string; scope: "Bot-private" | "Selected-Bot shared" | "Account-wide shared"; owner: string; updatedAt: string };
export type WorkNotification = { id: string; title: string; detail: string; tone: "mint" | "amber" | "coral"; read: boolean; createdAt: string };
export type Activity = { id: string; title: string; detail: string; tone: "mint" | "amber" | "coral" | "muted"; createdAt: string };

type BotInput = Pick<Bot, "name" | "role" | "purpose"> & { approvalRule?: string };
type WorkroomContextValue = {
  ready: boolean;
  onboardingComplete: boolean;
  selectedBotId: string;
  bots: Bot[];
  messages: WorkMessage[];
  tasks: WorkTask[];
  skills: Skill[];
  routines: Routine[];
  approvals: Approval[];
  files: WorkFile[];
  notifications: WorkNotification[];
  activity: Activity[];
  selectBot: (id: string) => void;
  createBot: (values: BotInput) => Bot;
  updateBotStatus: (id: string, status: Bot["status"]) => void;
  addMessage: (message: Omit<WorkMessage, "id" | "createdAt">) => void;
  addTask: (task: Omit<WorkTask, "id" | "startedAt">) => WorkTask;
  updateTaskStatus: (id: string, status: TaskStatus, nextAction?: string) => void;
  addSkill: (skill: Omit<Skill, "id">) => void;
  addApproval: (approval: Omit<Approval, "id" | "createdAt" | "state">) => void;
  addRoutine: (routine: Omit<Routine, "id">) => void;
  toggleRoutine: (id: string) => void;
  resolveApproval: (id: string, state: "Approved" | "Declined") => void;
  addFile: (file: Omit<WorkFile, "id" | "updatedAt">) => void;
  markNotificationsRead: () => void;
  addActivity: (entry: Omit<Activity, "id" | "createdAt">) => void;
  completeOnboarding: () => void;
};

const STORAGE_KEY = "luma-workroom-clean-slate-v2";
const BOT_COLORS = ["#7563F5", "#198EDE", "#18B982", "#DF8D19", "#D95D78", "#8E6F47"];
const WorkroomContext = createContext<WorkroomContextValue | undefined>(undefined);
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function WorkroomProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [bots, setBots] = useState<Bot[]>([]);
  const [messages, setMessages] = useState<WorkMessage[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [files, setFiles] = useState<WorkFile[]>([]);
  const [notifications, setNotifications] = useState<WorkNotification[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Partial<{ selectedBotId: string; onboardingComplete: boolean; bots: Bot[]; messages: WorkMessage[]; tasks: WorkTask[]; skills: Skill[]; routines: Routine[]; approvals: Approval[]; files: WorkFile[]; notifications: WorkNotification[]; activity: Activity[] }>;
          const storedBots = Array.isArray(stored.bots) ? stored.bots : [];
          setBots(storedBots);
          setMessages(Array.isArray(stored.messages) ? stored.messages : []);
          setTasks(Array.isArray(stored.tasks) ? stored.tasks : []);
          setSkills(Array.isArray(stored.skills) ? stored.skills : []);
          setRoutines(Array.isArray(stored.routines) ? stored.routines : []);
          setApprovals(Array.isArray(stored.approvals) ? stored.approvals : []);
          setFiles(Array.isArray(stored.files) ? stored.files : []);
          setNotifications(Array.isArray(stored.notifications) ? stored.notifications : []);
          setActivity(Array.isArray(stored.activity) ? stored.activity : []);
          setOnboardingComplete(Boolean(stored.onboardingComplete));
          setSelectedBotId(storedBots.some((bot) => bot.id === stored.selectedBotId) ? stored.selectedBotId ?? "" : storedBots[0]?.id ?? "");
        }
      } catch {
        // A malformed local cache must not prevent a user from beginning a clean workroom.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedBotId, onboardingComplete, bots, messages, tasks, skills, routines, approvals, files, notifications, activity }));
  }, [ready, selectedBotId, onboardingComplete, bots, messages, tasks, skills, routines, approvals, files, notifications, activity]);

  const addActivity = useCallback((entry: Omit<Activity, "id" | "createdAt">) => setActivity((current) => [{ ...entry, id: makeId("activity"), createdAt: "Now" }, ...current]), []);
  const addMessage = useCallback((message: Omit<WorkMessage, "id" | "createdAt">) => setMessages((current) => [...current, { ...message, id: makeId("message"), createdAt: timeNow() }]), []);

  const createBot = useCallback((values: BotInput) => {
    const newBot: Bot = {
      id: makeId("bot"),
      name: values.name.trim(),
      role: values.role.trim(),
      purpose: values.purpose.trim(),
      avatar: values.name.trim().slice(0, 1).toUpperCase(),
      color: BOT_COLORS[bots.length % BOT_COLORS.length],
      status: "Ready",
      memory: "No preferences saved yet.",
      approvalRule: values.approvalRule?.trim() || "Ask before external, irreversible, or sensitive actions.",
      model: "Server model when available",
      lastActive: "Just created",
    };
    setBots((current) => [newBot, ...current]);
    setSelectedBotId(newBot.id);
    setOnboardingComplete(true);
    addActivity({ title: `${newBot.name} is ready`, detail: `${newBot.role} created from your instructions`, tone: "mint" });
    return newBot;
  }, [addActivity, bots.length]);

  const updateBotStatus = useCallback((id: string, status: Bot["status"]) => setBots((current) => current.map((bot) => bot.id === id ? { ...bot, status, lastActive: status === "Working" ? "Working now" : "Just updated" } : bot)), []);
  const addTask = useCallback((task: Omit<WorkTask, "id" | "startedAt">) => { const next = { ...task, id: makeId("task"), startedAt: timeNow() }; setTasks((current) => [next, ...current]); return next; }, []);
  const updateTaskStatus = useCallback((id: string, status: TaskStatus, nextAction?: string) => setTasks((current) => current.map((task) => task.id === id ? { ...task, status, nextAction: nextAction ?? task.nextAction } : task)), []);
  const addSkill = useCallback((skill: Omit<Skill, "id">) => { setSkills((current) => [{ ...skill, id: makeId("skill") }, ...current]); addActivity({ title: `Skill saved: ${skill.name}`, detail: "Review its rules and test it on a safe example before automation.", tone: "mint" }); }, [addActivity]);
  const addApproval = useCallback((approval: Omit<Approval, "id" | "createdAt" | "state">) => { setApprovals((current) => [{ ...approval, id: makeId("approval"), state: "Pending", createdAt: timeNow() }, ...current]); setNotifications((current) => [{ id: makeId("notification"), title: "Approval needed", detail: approval.title, tone: "amber", read: false, createdAt: "Now" }, ...current]); addActivity({ title: "Approval required", detail: approval.title, tone: "amber" }); }, [addActivity]);
  const addRoutine = useCallback((routine: Omit<Routine, "id">) => { setRoutines((current) => [{ ...routine, id: makeId("routine") }, ...current]); addActivity({ title: `Routine created: ${routine.name}`, detail: `${routine.owner} · ${routine.state}`, tone: routine.state === "Active" ? "mint" : "muted" }); }, [addActivity]);
  const toggleRoutine = useCallback((id: string) => setRoutines((current) => current.map((routine) => routine.id === id ? { ...routine, state: routine.state === "Active" ? "Paused" : "Active" } : routine)), []);
  const resolveApproval = useCallback((id: string, state: "Approved" | "Declined") => { const found = approvals.find((approval) => approval.id === id); if (!found || found.state !== "Pending") return; setApprovals((current) => current.map((approval) => approval.id === id ? { ...approval, state } : approval)); addActivity({ title: `Approval ${state.toLowerCase()}`, detail: found.title, tone: state === "Approved" ? "mint" : "coral" }); setNotifications((current) => current.map((notification) => notification.title === "Approval needed" ? { ...notification, read: true } : notification)); }, [addActivity, approvals]);
  const addFile = useCallback((file: Omit<WorkFile, "id" | "updatedAt">) => setFiles((current) => [{ ...file, id: makeId("file"), updatedAt: "Added just now" }, ...current]), []);
  const markNotificationsRead = useCallback(() => setNotifications((current) => current.map((notification) => ({ ...notification, read: true }))), []);

  const value = useMemo<WorkroomContextValue>(() => ({ ready, onboardingComplete, selectedBotId, bots, messages, tasks, skills, routines, approvals, files, notifications, activity, selectBot: setSelectedBotId, createBot, updateBotStatus, addMessage, addTask, updateTaskStatus, addSkill, addApproval, addRoutine, toggleRoutine, resolveApproval, addFile, markNotificationsRead, addActivity, completeOnboarding: () => setOnboardingComplete(true) }), [ready, onboardingComplete, selectedBotId, bots, messages, tasks, skills, routines, approvals, files, notifications, activity, createBot, updateBotStatus, addMessage, addTask, updateTaskStatus, addSkill, addApproval, addRoutine, toggleRoutine, resolveApproval, addFile, markNotificationsRead, addActivity]);
  return <WorkroomContext.Provider value={value}>{children}</WorkroomContext.Provider>;
}

export function useWorkroom() {
  const context = useContext(WorkroomContext);
  if (!context) throw new Error("useWorkroom must be used within WorkroomProvider");
  return context;
}
