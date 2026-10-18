export const localISODate = (date = new Date()) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
};

export const localTime = (date = new Date()) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

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

export const formatDue = (iso, today) => {
  if (!iso) return "";
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  const [year, month, day] = parts(iso);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatWhen = (due, dueTime, today) => {
  if (!due) return "";
  const label = formatDue(due, today);
  return dueTime ? `${label} ${dueTime}` : label;
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
