const datePrefs = {
  timeZone: "",
  timeFormat: "12",
  dateFormat: "dmy",
  weekStart: 0,
  nextWeek: 0,
  weekend: 6,
};

const weekdayPref = (value, fallback) =>
  Number.isInteger(value) && value >= 0 && value <= 6 ? value : fallback;

export const setDatePrefs = (prefs = {}) => {
  if (typeof prefs.timeZone === "string") datePrefs.timeZone = prefs.timeZone;
  if (prefs.timeFormat === "12" || prefs.timeFormat === "24") datePrefs.timeFormat = prefs.timeFormat;
  if (prefs.dateFormat === "dmy" || prefs.dateFormat === "mdy" || prefs.dateFormat === "ymd") {
    datePrefs.dateFormat = prefs.dateFormat;
  }
  datePrefs.weekStart = weekdayPref(prefs.weekStart, datePrefs.weekStart);
  datePrefs.nextWeek = weekdayPref(prefs.nextWeek, datePrefs.nextWeek);
  datePrefs.weekend = weekdayPref(prefs.weekend, datePrefs.weekend);
};

export const getDatePrefs = () => ({ ...datePrefs });

const zonedParts = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour"), minute: read("minute") };
};

export const localISODate = (date = new Date()) => {
  if (datePrefs.timeZone) {
    try {
      const zoned = zonedParts(date, datePrefs.timeZone);
      if (zoned.year && zoned.month && zoned.day) return `${zoned.year}-${zoned.month}-${zoned.day}`;
    } catch {
      /* Use the computer clock when the zone name is not recognized. */
    }
  }
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
};

export const localTime = (date = new Date()) => {
  if (datePrefs.timeZone) {
    try {
      const zoned = zonedParts(date, datePrefs.timeZone);
      if (zoned.hour && zoned.minute) return `${zoned.hour.padStart(2, "0")}:${zoned.minute.padStart(2, "0")}`;
    } catch {
      /* Use the computer clock when the zone name is not recognized. */
    }
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const timestampDate = (value) =>
  Number.isFinite(value) ? localISODate(new Date(value)) : null;

const parts = (iso) => iso.split("-").map(Number);

export const addDays = (iso, days) => {
  const [year, month, day] = parts(iso);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localISODate(date);
};

export const addMonths = (iso, months) => {
  const [year, month, day] = parts(iso);
  const date = new Date(year, month - 1 + months, 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, last));
  return localISODate(date);
};

export const weekdayIndex = (iso) => {
  const [year, month, day] = parts(iso);
  return new Date(year, month - 1, day).getDay();
};

export const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const numericDate = (iso) => {
  const [year, month, day] = parts(iso);
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  if (datePrefs.dateFormat === "mdy") return `${mm}-${dd}-${year}`;
  if (datePrefs.dateFormat === "ymd") return `${year}-${mm}-${dd}`;
  return `${dd}-${mm}-${year}`;
};

export const formatDue = (iso, today) => {
  if (!iso) return "";
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  const [year, month, day] = parts(iso);
  const weekday = new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: "short" });
  return `${weekday}, ${numericDate(iso)}`;
};

const formatClock = (dueTime) => {
  if (datePrefs.timeFormat === "24") return dueTime;
  const [hour, minute] = dueTime.split(":").map(Number);
  const clock = new Date(2000, 0, 1, hour, minute);
  return clock.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export const formatWhen = (due, dueTime, today) => {
  if (!due) return "";
  const label = formatDue(due, today);
  if (!dueTime) return label;
  return `${label} ${formatClock(dueTime)}`;
};

export const startOfWeek = (iso, weekStart = datePrefs.weekStart) => {
  const start = Number.isInteger(weekStart) ? weekStart : 0;
  return addDays(iso, -((weekdayIndex(iso) - start + 7) % 7));
};

export const upcomingWeekday = (iso, weekday, includeToday = false) =>
  includeToday ? nextWeekdayOnOrAfter(iso, weekday) : nextWeekdayAfter(iso, weekday);

const minutesOf = (time) => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};

const timeFromMinutes = (value) => {
  const wrapped = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
};

export const automaticReminder = (dueTime, mode) => {
  if (!normalizeTime(dueTime) || !mode || mode === "none") return null;
  if (mode === "at") return dueTime;
  if (mode === "10") return timeFromMinutes(minutesOf(dueTime) - 10);
  if (mode === "60") return timeFromMinutes(minutesOf(dueTime) - 60);
  return null;
};

export const nextWeekdayOnOrAfter = (iso, weekday) => {
  const delta = (weekday - weekdayIndex(iso) + 7) % 7;
  return addDays(iso, delta);
};

const nextWeekdayAfter = (iso, weekday) =>
  nextWeekdayOnOrAfter(addDays(iso, 1), weekday);

export const normalizeDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export const normalizeTime = (value) =>
  typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;

const EVERY = new Set(["day", "week", "weekday", "month", "year"]);

export const normalizeRecurrence = (value) => {
  if (!value || typeof value !== "object") return null;
  if (!EVERY.has(value.every)) return null;
  const interval = Number.isFinite(value.interval)
    ? Math.min(99, Math.max(1, Math.round(value.interval)))
    : 1;
  const weekday =
    Number.isInteger(value.weekday) && value.weekday >= 0 && value.weekday <= 6
      ? value.weekday
      : null;
  return { every: value.every, interval, weekday };
};

export const nextOccurrence = (iso, rule) => {
  const recurrence = normalizeRecurrence(rule);
  if (!recurrence) return iso;
  const { every, interval, weekday } = recurrence;
  if (every === "day") return addDays(iso, interval);
  if (every === "weekday") {
    let cursor = iso;
    let left = interval;
    while (left > 0) {
      cursor = addDays(cursor, 1);
      const day = weekdayIndex(cursor);
      if (day !== 0 && day !== 6) left -= 1;
    }
    return cursor;
  }
  if (every === "week") {
    if (weekday === null) return addDays(iso, 7 * interval);
    let cursor = iso;
    for (let step = 0; step < interval; step += 1) {
      cursor = nextWeekdayAfter(cursor, weekday);
    }
    return cursor;
  }
  if (every === "month") return addMonths(iso, interval);
  return addMonths(iso, 12 * interval);
};

export const describeRecurrence = (rule) => {
  const recurrence = normalizeRecurrence(rule);
  if (!recurrence) return "";
  const { every, interval, weekday } = recurrence;
  if (every === "weekday") {
    return interval === 1 ? "Every weekday" : `Every ${interval} weekdays`;
  }
  if (every === "week" && weekday !== null) {
    const name = WEEKDAY_NAMES[weekday];
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    return interval === 1 ? `Every ${label}` : `Every ${interval} weeks on ${label}`;
  }
  const unit = { day: "day", week: "week", month: "month", year: "year" }[every];
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
};

export const recurrenceFromKey = (key) => {
  if (key === "day") return { every: "day", interval: 1, weekday: null };
  if (key === "weekday") return { every: "weekday", interval: 1, weekday: null };
  if (key === "week") return { every: "week", interval: 1, weekday: null };
  if (key === "month") return { every: "month", interval: 1, weekday: null };
  if (key === "year") return { every: "year", interval: 1, weekday: null };
  return null;
};

export const recurrenceKey = (rule) => {
  const recurrence = normalizeRecurrence(rule);
  if (!recurrence) return "none";
  if (
    recurrence.interval === 1 &&
    recurrence.weekday === null &&
    ["day", "weekday", "week", "month", "year"].includes(recurrence.every)
  ) {
    return recurrence.every;
  }
  return "custom";
};
