const KEY = "taskman-settings";

export const QUICK_ACTIONS = [
  { id: "project", label: "Project", locked: true },
  { id: "date", label: "Date" },
  { id: "assignee", label: "Assignee" },
  { id: "attachment", label: "Attachment" },
  { id: "priority", label: "Priority" },
  { id: "reminders", label: "Reminders" },
  { id: "labels", label: "Labels" },
  { id: "deadline", label: "Deadline" },
  { id: "location", label: "Location" },
];

const ACTION_IDS = QUICK_ACTIONS.map((action) => action.id);

export const WEEKDAY_OPTIONS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const SETTINGS_SECTIONS = [
  { id: "account", label: "Account" },
  { id: "general", label: "General" },
  { id: "subscription", label: "Subscription" },
  { id: "theme", label: "Theme" },
  { id: "sidebar", label: "Sidebar" },
  { id: "quick-add", label: "Quick Add" },
  { id: "productivity", label: "Productivity" },
  { id: "reminders", label: "Reminders" },
  { id: "notifications", label: "Notifications" },
  { id: "backups", label: "Backups" },
  { id: "integrations", label: "Integrations" },
  { id: "calendars", label: "Calendars" },
];

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export const defaultSettings = () => ({
  avatar: "",
  language: "en",
  homeView: "inbox",
  timeZone: browserZone(),
  timeFormat: "12",
  dateFormat: "dmy",
  weekStart: 0,
  nextWeek: 0,
  weekend: 6,
  smartDates: true,
  soundDesktop: true,
  soundMobile: true,
  resetSubtasks: true,
  autoAcceptInvites: true,
  emailAssist: false,
  experimental: false,
  appearance: "dark",
  syncTheme: true,
  palette: "todoist",
  sidebar: {
    inbox: true,
    today: true,
    upcoming: true,
    browse: true,
    reporting: true,
  },
  showCounts: true,
  quickAdd: {
    shown: ["project", "date", "assignee", "attachment", "priority", "reminders"],
    more: ["labels", "deadline", "location"],
    showLabels: true,
    showDescription: false,
  },
  reminders: {
    automatic: "at",
    desktop: true,
    mobile: true,
    email: false,
  },
  teams: [],
});

const storageKey = (userId) => (userId ? `${KEY}:${userId}` : KEY);

const weekday = (value, fallback) =>
  Number.isInteger(value) && value >= 0 && value <= 6 ? value : fallback;

const uniqueActions = (ids, fallback) => {
  const list = Array.isArray(ids) ? ids.filter((id) => ACTION_IDS.includes(id)) : fallback;
  return [...new Set(list)];
};

export const sanitizeSettings = (value) => {
  const base = defaultSettings();
  const source = value && typeof value === "object" ? value : {};
  const shown = uniqueActions(source.quickAdd?.shown, base.quickAdd.shown);
  if (!shown.includes("project")) shown.unshift("project");
  const more = uniqueActions(source.quickAdd?.more, base.quickAdd.more).filter((id) => !shown.includes(id));
  for (const id of ACTION_IDS) {
    if (!shown.includes(id) && !more.includes(id)) more.push(id);
  }
  const sidebar = { ...base.sidebar, ...(source.sidebar ?? {}) };
  for (const key of Object.keys(base.sidebar)) sidebar[key] = sidebar[key] !== false;
  const teams = Array.isArray(source.teams) ? source.teams.map(sanitizeTeam).filter(Boolean).slice(0, 20) : [];
  return {
    ...base,
    avatar: typeof source.avatar === "string" && source.avatar.startsWith("data:image/") ? source.avatar : "",
    language: "en",
    homeView: ["inbox", "today", "upcoming"].includes(source.homeView) ? source.homeView : "inbox",
    timeZone: typeof source.timeZone === "string" && source.timeZone ? source.timeZone : base.timeZone,
    timeFormat: source.timeFormat === "24" ? "24" : "12",
    dateFormat: ["dmy", "mdy", "ymd"].includes(source.dateFormat) ? source.dateFormat : "dmy",
    weekStart: weekday(source.weekStart, 0),
    nextWeek: weekday(source.nextWeek, 0),
    weekend: weekday(source.weekend, 6),
    smartDates: source.smartDates !== false,
    soundDesktop: source.soundDesktop !== false,
    soundMobile: source.soundMobile !== false,
    resetSubtasks: source.resetSubtasks !== false,
    autoAcceptInvites: source.autoAcceptInvites !== false,
    emailAssist: source.emailAssist === true,
    experimental: source.experimental === true,
    appearance: ["light", "dark", "system"].includes(source.appearance) ? source.appearance : "dark",
    syncTheme: source.syncTheme !== false,
    palette: ["todoist", "moonstone", "tangerine"].includes(source.palette) ? source.palette : "todoist",
    sidebar,
    showCounts: source.showCounts !== false,
    quickAdd: {
      shown,
      more,
      showLabels: source.quickAdd?.showLabels !== false,
      showDescription: source.quickAdd?.showDescription === true,
    },
    reminders: {
      automatic: ["none", "at", "10", "60"].includes(source.reminders?.automatic) ? source.reminders.automatic : "at",
      desktop: source.reminders?.desktop !== false,
      mobile: source.reminders?.mobile !== false,
      email: source.reminders?.email === true,
    },
    teams,
  };
};

const emailOf = (value) => {
  const email = String(value ?? "").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

const sanitizeTeam = (team) => {
  if (!team || typeof team.id !== "string" || !team.id) return null;
  const name = String(team.name ?? "").trim().slice(0, 120);
  if (!name) return null;
  return {
    id: team.id.slice(0, 80),
    name,
    logo: typeof team.logo === "string" && team.logo.startsWith("data:image/") ? team.logo : "",
    size: ["1", "2-7", "8-15", "16-24", "25+"].includes(team.size) ? team.size : "1",
    work: ["projects", "processes", "both"].includes(team.work) ? team.work : "projects",
    access: team.access === "restricted" ? "restricted" : "team",
    discovery: team.discovery === true,
    inviteEnabled: team.inviteEnabled !== false,
    inviteCode: typeof team.inviteCode === "string" ? team.inviteCode.replace(/[^\w-]/g, "").slice(0, 80) : "",
    invites: Array.isArray(team.invites) ? [...new Set(team.invites.map(emailOf).filter(Boolean))].slice(0, 50) : [],
  };
};

export const loadSettings = (userId) => {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(storageKey(userId)) ?? ""));
  } catch {
    return defaultSettings();
  }
};

export const saveSettings = (userId, settings) => {
  const next = sanitizeSettings(settings);
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
};

export const clearSettings = (userId) => {
  localStorage.removeItem(storageKey(userId));
};

export const resolvedAppearance = (appearance) => {
  if (appearance !== "system") return appearance === "light" ? "light" : "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const applyTheme = (settings) => {
  const appearance = resolvedAppearance(settings?.appearance);
  document.documentElement.dataset.appearance = appearance;
  document.documentElement.dataset.palette = settings?.palette || "todoist";
  document.documentElement.style.colorScheme = appearance;
};

export const playCompleteSound = () => {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  const context = new Context();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
  oscillator.stop(context.currentTime + 0.13);
  oscillator.onended = () => context.close().catch(() => undefined);
};
