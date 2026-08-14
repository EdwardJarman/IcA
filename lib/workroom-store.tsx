import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type TaskStatus =
  | "Draft"
  | "Queued"
  | "Planning"
  | "Working"
  | "Waiting for input"
  | "Approval required"
  | "Blocked"
  | "Paused"
  | "Retrying"
  | "Completed"
  | "Partially completed"
  | "Failed"
  | "Cancelled";

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

export type WorkMessage = {
  id: string;
  botId: string;
  author: "user" | "bot" | "system";
  body: string;
  createdAt: string;
  kind?: "message" | "activity" | "result" | "approval" | "handoff";
  taskId?: string;
  attachmentName?: string;
};

export type WorkTask = {
  id: string;
  botId: string;
  title: string;
  status: TaskStatus;
  summary: string;
  startedAt: string;
  nextAction: string;
  risk: "Low" | "Medium" | "High";
  steps: { id: string; label: string; state: "done" | "active" | "pending" }[];
};

export type Skill = {
  id: string;
  name: string;
  owner: string;
  status: "Enabled" | "Draft" | "Testing" | "Paused";
  description: string;
  version: string;
  approvals: string;
};

export type Routine = {
  id: string;
  name: string;
  owner: string;
  cadence: string;
  nextRun: string;
  state: "Active" | "Paused";
  summary: string;
};

export type Approval = {
  id: string;
  title: string;
  detail: string;
  botId: string;
  risk: "Medium" | "High";
  state: "Pending" | "Approved" | "Declined";
  createdAt: string;
};

export type WorkFile = {
  id: string;
  name: string;
  size: string;
  scope: "Bot-private" | "Selected-Bot shared" | "Account-wide shared";
  owner: string;
  updatedAt: string;
};

export type WorkNotification = {
  id: string;
  title: string;
  detail: string;
  tone: "mint" | "amber" | "coral";
  read: boolean;
  createdAt: string;
};

export type Activity = {
  id: string;
  title: string;
  detail: string;
  tone: "mint" | "amber" | "coral" | "muted";
  createdAt: string;
};

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
  createBot: (values: Pick<Bot, "name" | "role" | "purpose">) => void;
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

const STORAGE_KEY = "luma-workroom-state-v1";

const initialBots: Bot[] = [
  {
    id: "sable",
    name: "Sable",
    role: "Researcher",
    purpose: "Turns scattered sources into focused briefs with traceable evidence.",
    avatar: "S",
    color: "#77F3C4",
    status: "Working",
    memory: "Prefers source-backed claims, short sections, and a calm factual tone.",
    approvalRule: "Ask before publishing, sending, deleting, or using external accounts.",
    model: "Hosted demo model · text",
    lastActive: "Working now",
  },
  {
    id: "nova",
    name: "Nova",
    role: "Project Coordinator",
    purpose: "Keeps delivery work moving with owners, next actions, and calm check-ins.",
    avatar: "N",
    color: "#B9B5FF",
    status: "Ready",
    memory: "Escalate blockers early. Keep one clear owner per handoff.",
    approvalRule: "Ask before changing schedules or contacting external parties.",
    model: "Hosted demo model · text",
    lastActive: "12m ago",
  },
  {
    id: "mira",
    name: "Mira",
    role: "Writer",
    purpose: "Shapes clear drafts, product notes, and launch-ready language.",
    avatar: "M",
    color: "#F6C65B",
    status: "Ready",
    memory: "Use short sentences, concrete verbs, and show the decision behind the copy.",
    approvalRule: "Ask before publishing anything outside Luma.",
    model: "Hosted demo model · text",
    lastActive: "1h ago",
  },
];

const initialTasks: WorkTask[] = [
  {
    id: "task-brief",
    botId: "sable",
    title: "Prepare launch brief",
    status: "Working",
    summary: "Collect current public context, resolve key questions, and leave a cited brief for review.",
    startedAt: "08:42",
    nextAction: "Review the source outline before turning it into a draft.",
    risk: "Low",
    steps: [
      { id: "one", label: "Frame the question", state: "done" },
      { id: "two", label: "Collect public context", state: "done" },
      { id: "three", label: "Draft source outline", state: "active" },
      { id: "four", label: "Write concise brief", state: "pending" },
    ],
  },
];

const initialMessages: WorkMessage[] = [
  {
    id: "message-one",
    botId: "sable",
    author: "system",
    body: "Sable is working from the shared launch workspace. Browser and connector access are unavailable in this demo; no external action will be taken.",
    createdAt: "08:42",
    kind: "activity",
    taskId: "task-brief",
  },
  {
    id: "message-two",
    botId: "sable",
    author: "user",
    body: "Build a concise launch brief for the new workroom experience. Keep it factual, cite the public sources, and do not publish anything.",
    createdAt: "08:43",
  },
  {
    id: "message-three",
    botId: "sable",
    author: "bot",
    body: "I’ll collect the public context, separate known facts from assumptions, and return a short review-ready outline. I will pause before any external communication or publishing step.",
    createdAt: "08:43",
  },
  {
    id: "message-four",
    botId: "sable",
    author: "system",
    body: "Plan saved · 2 of 4 steps completed · Source outline in progress",
    createdAt: "08:44",
    kind: "activity",
    taskId: "task-brief",
  },
];

const initialSkills: Skill[] = [
  {
    id: "skill-brief",
    name: "Source-backed brief",
    owner: "Sable",
    status: "Enabled",
    description: "Gather current sources, label uncertainty, validate claims, and return a concise linked brief.",
    version: "v1.2",
    approvals: "External sharing always requires approval",
  },
  {
    id: "skill-handoff",
    name: "Clean handoff",
    owner: "Nova",
    status: "Testing",
    description: "Assign one owner, include acceptance criteria, and announce blockers without duplication.",
    version: "v0.4",
    approvals: "No external messages",
  },
];

const initialRoutines: Routine[] = [
  {
    id: "routine-morning",
    name: "Morning work scan",
    owner: "Nova",
    cadence: "Weekdays · 08:30",
    nextRun: "Tomorrow, 08:30",
    state: "Active",
    summary: "Summarize active tasks and bring only blocked work to the front.",
  },
  {
    id: "routine-review",
    name: "Friday draft review",
    owner: "Mira",
    cadence: "Friday · 15:00",
    nextRun: "Fri, 15:00",
    state: "Paused",
    summary: "Review ready drafts, leave notes, and never publish automatically.",
  },
];

const initialApprovals: Approval[] = [
  {
    id: "approval-one",
    title: "Send weekly project recap",
    detail: "Nova prepared a recap for the internal project group. It will remain unsent until you choose an action.",
    botId: "nova",
    risk: "Medium",
    state: "Pending",
    createdAt: "08:18",
  },
];

const initialFiles: WorkFile[] = [
  {
    id: "file-brief",
    name: "launch-brief-outline.md",
    size: "12 KB",
    scope: "Bot-private",
    owner: "Sable",
    updatedAt: "Updated 4m ago",
  },
  {
    id: "file-plan",
    name: "delivery-checklist.pdf",
    size: "248 KB",
    scope: "Selected-Bot shared",
    owner: "Nova + Mira",
    updatedAt: "Updated yesterday",
  },
];

const initialActivity: Activity[] = [
  { id: "activity-one", title: "Sable is drafting the source outline", detail: "Prepare launch brief · 2 of 4 steps complete", tone: "mint", createdAt: "Now" },
  { id: "activity-two", title: "Approval awaiting your decision", detail: "Nova · Send weekly project recap", tone: "amber", createdAt: "26m" },
  { id: "activity-three", title: "Routine completed", detail: "Morning work scan · 4 summaries returned", tone: "muted", createdAt: "Yesterday" },
];

const initialNotifications: WorkNotification[] = [
  { id: "note-one", title: "Approval needed", detail: "Nova prepared a weekly recap for review.", tone: "amber", read: false, createdAt: "26m" },
  { id: "note-two", title: "Routine completed", detail: "Morning work scan finished with four summaries.", tone: "mint", read: false, createdAt: "Yesterday" },
];

const WorkroomContext = createContext<WorkroomContextValue | undefined>(undefined);

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const timeNow = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function WorkroomProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState("sable");
  const [bots, setBots] = useState<Bot[]>(initialBots);
  const [messages, setMessages] = useState<WorkMessage[]>(initialMessages);
  const [tasks, setTasks] = useState<WorkTask[]>(initialTasks);
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [files, setFiles] = useState<WorkFile[]>(initialFiles);
  const [notifications, setNotifications] = useState<WorkNotification[]>(initialNotifications);
  const [activity, setActivity] = useState<Activity[]>(initialActivity);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as Partial<{
            selectedBotId: string;
            onboardingComplete: boolean;
            bots: Bot[];
            messages: WorkMessage[];
            tasks: WorkTask[];
            skills: Skill[];
            routines: Routine[];
            approvals: Approval[];
            files: WorkFile[];
            notifications: WorkNotification[];
            activity: Activity[];
          }>;
          if (stored.selectedBotId) setSelectedBotId(stored.selectedBotId);
          if (stored.onboardingComplete) setOnboardingComplete(stored.onboardingComplete);
          if (stored.bots) setBots(stored.bots);
          if (stored.messages) setMessages(stored.messages);
          if (stored.tasks) setTasks(stored.tasks);
          if (stored.skills) setSkills(stored.skills);
          if (stored.routines) setRoutines(stored.routines);
          if (stored.approvals) setApprovals(stored.approvals);
          if (stored.files) setFiles(stored.files);
          if (stored.notifications) setNotifications(stored.notifications);
          if (stored.activity) setActivity(stored.activity);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const payload = { selectedBotId, onboardingComplete, bots, messages, tasks, skills, routines, approvals, files, notifications, activity };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [ready, selectedBotId, onboardingComplete, bots, messages, tasks, skills, routines, approvals, files, notifications, activity]);

  const addActivity = useCallback((entry: Omit<Activity, "id" | "createdAt">) => {
    setActivity((current) => [{ ...entry, id: makeId("activity"), createdAt: "Now" }, ...current]);
  }, []);

  const addMessage = useCallback((message: Omit<WorkMessage, "id" | "createdAt">) => {
    setMessages((current) => [...current, { ...message, id: makeId("message"), createdAt: timeNow() }]);
  }, []);

  const createBot = useCallback((values: Pick<Bot, "name" | "role" | "purpose">) => {
    const newBot: Bot = {
      id: makeId("bot"),
      ...values,
      avatar: values.name.slice(0, 1).toUpperCase(),
      color: "#77F3C4",
      status: "Ready",
      memory: "No saved preferences yet. You can review learned context here.",
      approvalRule: "Ask before external, irreversible, or sensitive actions.",
      model: "Hosted demo model · text",
      lastActive: "Just created",
    };
    setBots((current) => [newBot, ...current]);
    setSelectedBotId(newBot.id);
    addActivity({ title: `${newBot.name} joined the workroom`, detail: `${newBot.role} Bot ready for a safe first task`, tone: "mint" });
  }, [addActivity]);

  const updateBotStatus = useCallback((id: string, status: Bot["status"]) => {
    setBots((current) => current.map((bot) => (bot.id === id ? { ...bot, status, lastActive: status === "Working" ? "Working now" : "Just updated" } : bot)));
  }, []);

  const addTask = useCallback((task: Omit<WorkTask, "id" | "startedAt">) => {
    const newTask: WorkTask = { ...task, id: makeId("task"), startedAt: timeNow() };
    setTasks((current) => [newTask, ...current]);
    return newTask;
  }, []);

  const updateTaskStatus = useCallback((id: string, status: TaskStatus, nextAction?: string) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, status, nextAction: nextAction ?? task.nextAction } : task)));
  }, []);

  const addSkill = useCallback((skill: Omit<Skill, "id">) => {
    setSkills((current) => [{ ...skill, id: makeId("skill") }, ...current]);
    addActivity({ title: `Skill saved: ${skill.name}`, detail: "Review its rules and test it on a safe example before automation.", tone: "mint" });
  }, [addActivity]);

  const addApproval = useCallback((approval: Omit<Approval, "id" | "createdAt" | "state">) => {
    setApprovals((current) => [{ ...approval, id: makeId("approval"), state: "Pending", createdAt: timeNow() }, ...current]);
    setNotifications((current) => [{ id: makeId("notification"), title: "Approval needed", detail: approval.title, tone: "amber", read: false, createdAt: "Now" }, ...current]);
    addActivity({ title: "Approval required", detail: approval.title, tone: "amber" });
  }, [addActivity]);

  const addRoutine = useCallback((routine: Omit<Routine, "id">) => {
    setRoutines((current) => [{ ...routine, id: makeId("routine") }, ...current]);
    addActivity({ title: `Routine created: ${routine.name}`, detail: `${routine.owner} · ${routine.state}`, tone: routine.state === "Active" ? "mint" : "muted" });
  }, [addActivity]);

  const toggleRoutine = useCallback((id: string) => {
    setRoutines((current) => current.map((routine) => (routine.id === id ? { ...routine, state: routine.state === "Active" ? "Paused" : "Active" } : routine)));
  }, []);

  const resolveApproval = useCallback((id: string, state: "Approved" | "Declined") => {
    const found = approvals.find((approval) => approval.id === id);
    if (!found || found.state !== "Pending") return;
    setApprovals((current) => current.map((approval) => (approval.id === id ? { ...approval, state } : approval)));
    addActivity({ title: `Approval ${state.toLowerCase()}`, detail: found.title, tone: state === "Approved" ? "mint" : "coral" });
    setNotifications((current) => current.map((notification) => (notification.title === "Approval needed" ? { ...notification, read: true } : notification)));
  }, [addActivity, approvals]);

  const addFile = useCallback((file: Omit<WorkFile, "id" | "updatedAt">) => {
    setFiles((current) => [{ ...file, id: makeId("file"), updatedAt: "Added just now" }, ...current]);
  }, []);

  const markNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }, []);

  const value = useMemo<WorkroomContextValue>(() => ({
    ready,
    onboardingComplete,
    selectedBotId,
    bots,
    messages,
    tasks,
    skills,
    routines,
    approvals,
    files,
    notifications,
    activity,
    selectBot: setSelectedBotId,
    createBot,
    updateBotStatus,
    addMessage,
    addTask,
    updateTaskStatus,
    addSkill,
    addApproval,
    addRoutine,
    toggleRoutine,
    resolveApproval,
    addFile,
    markNotificationsRead,
    addActivity,
    completeOnboarding: () => setOnboardingComplete(true),
  }), [ready, onboardingComplete, selectedBotId, bots, messages, tasks, skills, routines, approvals, files, notifications, activity, createBot, updateBotStatus, addMessage, addTask, updateTaskStatus, addSkill, addApproval, addRoutine, toggleRoutine, resolveApproval, addFile, markNotificationsRead, addActivity]);

  return <WorkroomContext.Provider value={value}>{children}</WorkroomContext.Provider>;
}

export function useWorkroom() {
  const context = useContext(WorkroomContext);
  if (!context) throw new Error("useWorkroom must be used within WorkroomProvider");
  return context;
}
