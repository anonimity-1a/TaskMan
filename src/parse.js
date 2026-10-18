import {
  WEEKDAY_NAMES,
  addDays,
  addMonths,
  nextWeekdayOnOrAfter,
  normalizeTime,
  weekdayIndex,
} from "./dates.js";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const collapse = (value) => value.replace(/\s+/g, " ").trim();

const consumeLabels = (input, labels) => {
  const labelIds = [];
  const newLabels = [];
  const rest = input.replace(
    /(^|\s)@(?:"([^"]+)"|([\w-]+))/g,
    (full, lead, quoted, word) => {
      const name = (quoted ?? word ?? "").trim().slice(0, 40);
      if (!name) return full;
      const existing = labels.find(
        (label) => label.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        if (!labelIds.includes(existing.id)) labelIds.push(existing.id);
      } else if (
        !newLabels.some((item) => item.toLowerCase() === name.toLowerCase())
      ) {
        newLabels.push(name);
      }
      return lead;
    },
  );
  return { rest, labelIds, newLabels };
};

const consumeProject = (input, projects) => {
  let projectId = null;
  let rest = input.replace(/(^|\s)#"([^"]+)"/g, (full, lead, name) => {
    const project = projects.find(
      (item) => !item.archived && item.name.toLowerCase() === name.toLowerCase(),
    );
    if (!project) return full;
    projectId = project.id;
    return lead;
  });
  if (projectId) return { rest, projectId };

  const available = projects
    .filter((project) => !project.archived)
    .sort((left, right) => right.name.length - left.name.length);
  let best = null;
  for (const project of available) {
    const pattern = new RegExp(
      `(^|\\s)#${escapeRegExp(project.name)}(?=\\s|$)`,
      "i",
    );
    const match = pattern.exec(rest);
    if (!match) continue;
    if (
      !best ||
      match.index < best.index ||
      (match.index === best.index && project.name.length > best.name.length)
    ) {
      best = { index: match.index, name: project.name, project, pattern };
    }
  }
  if (!best) return { rest, projectId: null };
  return { rest: rest.replace(best.pattern, "$1"), projectId: best.project.id };
};

const RECURRENCE =
  /\bevery\s+(?:(\d{1,2})\s+)?(weekdays?|days?|weeks?|months?|years?|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;

const consumeRecurrence = (input, today) => {
  const match = input.match(RECURRENCE);
  if (!match) return { rest: input, recurrence: null, due: null };
  const interval = Math.min(99, Math.max(1, match[1] ? Number(match[1]) : 1));
  const word = match[2].toLowerCase();
  let recurrence;
  let due = today;
  if (WEEKDAY_NAMES.includes(word)) {
    const weekday = WEEKDAY_NAMES.indexOf(word);
    recurrence = { every: "week", interval, weekday };
    due = nextWeekdayOnOrAfter(today, weekday);
  } else if (word.startsWith("weekday")) {
    recurrence = { every: "weekday", interval, weekday: null };
    const day = weekdayIndex(today);
    due = day === 0 || day === 6 ? nextWeekdayOnOrAfter(today, 1) : today;
  } else if (word.startsWith("day")) {
    recurrence = { every: "day", interval, weekday: null };
  } else if (word.startsWith("week")) {
    recurrence = { every: "week", interval, weekday: null };
  } else if (word.startsWith("month")) {
    recurrence = { every: "month", interval, weekday: null };
  } else {
    recurrence = { every: "year", interval, weekday: null };
  }
  return { rest: input.replace(match[0], " "), recurrence, due };
};

const clockFromMatch = (hourText, minuteText, suffix) => {
  let hour = Number(hourText);
  const minute = minuteText ? Number(minuteText) : 0;
  if (suffix) {
    const marker = suffix.toLowerCase();
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (marker === "am") hour = hour === 12 ? 0 : hour;
    if (marker === "pm") hour = hour === 12 ? 12 : hour + 12;
  } else if (hour > 23 || minute > 59) {
    return null;
  }
  return normalizeTime(
    `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  );
};

const consumeTime = (input) => {
  let dueTime = null;
  let rest = input.replace(
    /\bat\s+(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i,
    (full, hour, minute, suffix) => {
      const time = clockFromMatch(hour, minute, suffix);
      if (!time) return full;
      dueTime = time;
      return " ";
    },
  );
  if (!dueTime) {
    rest = rest.replace(/\bat\s+([01]?\d|2[0-3]):([0-5]\d)\b/, (full, hour, minute) => {
      const time = clockFromMatch(hour, minute, null);
      if (!time) return full;
      dueTime = time;
      return " ";
    });
  }
  return { rest, dueTime };
};

const DATE_RULES = [
  { re: /\bnext week\b/i, apply: (today) => addDays(today, 7) },
  { re: /\bnext month\b/i, apply: (today) => addMonths(today, 1) },
  { re: /\bnext year\b/i, apply: (today) => addMonths(today, 12) },
  { re: /\btomorrow\b/i, apply: (today) => addDays(today, 1) },
  { re: /\byesterday\b/i, apply: (today) => addDays(today, -1) },
  { re: /\btoday\b/i, apply: (today) => today },
  {
    re: /\bin\s+(\d{1,3})\s+days?\b/i,
    apply: (today, match) => addDays(today, Number(match[1])),
  },
  {
    re: /\bin\s+(\d{1,2})\s+weeks?\b/i,
    apply: (today, match) => addDays(today, 7 * Number(match[1])),
  },
  {
    re: /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
    apply: (today, match) =>
      nextWeekdayOnOrAfter(today, WEEKDAY_NAMES.indexOf(match[1].toLowerCase())),
  },
];

const consumeDate = (input, today) => {
  let due = null;
  let rest = input;
  let guard = 0;
  while (guard < 6) {
    guard += 1;
    let chosen = null;
    for (const rule of DATE_RULES) {
      const match = rule.re.exec(rest);
      if (!match) continue;
      if (!chosen || match.index < chosen.match.index) chosen = { rule, match };
    }
    if (!chosen) break;
    due = chosen.rule.apply(today, chosen.match);
    rest = `${rest.slice(0, chosen.match.index)} ${rest.slice(chosen.match.index + chosen.match[0].length)}`;
  }
  return { rest, due };
};

const consumePriority = (input) => {
  let priority = null;
  const rest = input.replace(/\bp([1-4])\b/gi, (full, level) => {
    if (priority === null) priority = Number(level);
    return " ";
  });
  return { rest, priority };
};

export const parseQuickAdd = (text, doc, today) => {
  const projects = doc?.projects ?? [];
  const labels = doc?.labels ?? [];
  let rest = String(text ?? "");
  const project = consumeProject(rest, projects);
  rest = project.rest;
  const label = consumeLabels(rest, labels);
  rest = label.rest;
  const recurrence = consumeRecurrence(rest, today);
  rest = recurrence.rest;
  const time = consumeTime(rest);
  rest = time.rest;
  const date = consumeDate(rest, today);
  rest = date.rest;
  const priority = consumePriority(rest);
  rest = priority.rest;
  return {
    title: collapse(rest).slice(0, 500),
    projectId: project.projectId,
    labelIds: label.labelIds,
    newLabels: label.newLabels,
    due: date.due ?? recurrence.due,
    dueTime: time.dueTime,
    recurrence: recurrence.recurrence,
    priority: priority.priority,
  };
};

export const resolveQuickAdd = (doc, form, today) => {
  const parsed = parseQuickAdd(form.raw, doc, today);
  const baseLabels = form.labelIds ?? [];
  return {
    title: parsed.title,
    projectId: form.projectTouched
      ? form.projectId
      : (parsed.projectId ?? form.projectId),
    due: form.dueTouched ? form.due || null : (parsed.due ?? (form.due || null)),
    dueTime: form.timeTouched
      ? form.dueTime || null
      : (parsed.dueTime ?? (form.dueTime || null)),
    priority: form.priorityTouched
      ? form.priority
      : (parsed.priority ?? form.priority ?? 4),
    recurrence: form.recurrenceTouched
      ? form.recurrence
      : (parsed.recurrence ?? form.recurrence ?? null),
    labelIds: form.labelsTouched
      ? baseLabels
      : [...new Set([...baseLabels, ...parsed.labelIds])],
    newLabels: form.labelsTouched ? [] : parsed.newLabels,
    parentId: form.parentId ?? null,
    sectionId: form.sectionId ?? null,
    description: "",
    deadline: null,
    reminder: null,
  };
};
