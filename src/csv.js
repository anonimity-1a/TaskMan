import { getDatePrefs } from "./dates.js";
import {
  addComment,
  addSection,
  addTaskFromResolved,
  describeRecurrence,
  setProjectView,
} from "./model.js";
import { parseQuickAdd } from "./parse.js";

const HEADER = [
  "TYPE",
  "CONTENT",
  "DESCRIPTION",
  "PRIORITY",
  "INDENT",
  "AUTHOR",
  "RESPONSIBLE",
  "DATE",
  "DATE_LANG",
  "TIMEZONE",
  "DURATION",
  "DURATION_UNIT",
  "DEADLINE",
  "DEADLINE_LANG",
];

const cellText = (value) => {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
};

const parseCsv = (source) => {
  const text = String(source ?? "").replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const commas = (first.match(/,/g) ?? []).length;
  const semis = (first.match(/;/g) ?? []).length;
  const delimiter = semis > commas ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim()));
};

const headerIndex = (header) => {
  const map = new Map();
  header.forEach((name, index) => map.set(name.trim().toUpperCase(), index));
  return map;
};

const read = (row, columns, name) => {
  const index = columns.get(name);
  if (index === undefined) return "";
  return (row[index] ?? "").trim();
};

const taskmanPriority = (value) => {
  const text = String(value ?? "").trim().toLowerCase();
  const marked = text.match(/^p([1-4])$/);
  if (marked) return Number(marked[1]);
  const number = Number(text);
  if (number === 1 || number === 2 || number === 3 || number === 4) return 5 - number;
  return 4;
};

const todoistPriority = (value) => {
  const level = value === 1 || value === 2 || value === 3 || value === 4 ? value : 4;
  return 5 - level;
};

const readWhen = (value, today) => {
  const raw = String(value ?? "").trim();
  if (!raw) return { due: null, dueTime: null, recurrence: null };
  const iso = raw.match(/(\d{4}-\d{2}-\d{2})(?:[T ]([01]\d|2[0-3]):([0-5]\d))?/);
  const parsed = parseQuickAdd(raw, { projects: [], labels: [] }, today);
  return {
    due: iso?.[1] ?? parsed.due ?? null,
    dueTime: iso?.[2] ? `${iso[2]}:${iso[3]}` : (parsed.dueTime ?? null),
    recurrence: parsed.recurrence ?? null,
  };
};

const labelNamesFrom = (content, labelsCell) => {
  const names = [];
  const title = String(content ?? "")
    .replace(/(^|\s)@([^\s@,]+)/g, (_full, lead, name) => {
      names.push(name);
      return lead ? " " : "";
    })
    .replace(/\s+/g, " ")
    .trim();
  for (const name of String(labelsCell ?? "").split(/[, ]+/)) {
    const trimmed = name.replace(/^@/, "").trim();
    if (trimmed) names.push(trimmed);
  }
  return { title, names };
};

const dateCell = (task) => {
  const parts = [];
  if (task.recurrence) parts.push(describeRecurrence(task.recurrence).toLowerCase());
  if (task.due) parts.push(task.dueTime ? `${task.due} ${task.dueTime}` : task.due);
  return parts.join(" ");
};

const contentCell = (doc, task) => {
  const labels = doc.labels
    .filter((label) => task.labelIds.includes(label.id))
    .map((label) => `@${label.name}`);
  return [task.title, ...labels].join(" ");
};

const taskRows = (doc, tasks, parentId, indent, sectionId) => {
  const children = tasks
    .filter((task) => (task.parentId ?? null) === parentId && (parentId || (task.sectionId ?? null) === sectionId))
    .filter((task) => !task.completed)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  return children.flatMap((task) => [
    [
      "task",
      contentCell(doc, task),
      task.description ?? "",
      String(todoistPriority(task.priority)),
      String(indent),
      "",
      "",
      dateCell(task),
      "en",
      getDatePrefs().timeZone || "",
      "",
      "",
      task.deadline ?? "",
      task.deadline ? "en" : "",
    ],
    ...taskRows(doc, tasks, task.id, indent + 1, null),
  ]);
};

export const exportTodoistCsv = (doc, projectId) => {
  const project = doc.projects.find((item) => item.id === projectId);
  const tasks = doc.tasks.filter((task) => task.projectId === projectId);
  const sections = doc.sections
    .filter((section) => section.projectId === projectId)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
  const rows = [
    HEADER,
    ["meta", `view_style=${project?.view || "list"}`, "", "", "", "", "", "", "", "", "", "", "", ""],
  ];
  for (const section of sections) {
    rows.push(["section", section.name, "", "", "", "", "", "", "", "", "", "", "", ""]);
    rows.push(...taskRows(doc, tasks, null, 1, section.id));
  }
  rows.push(...taskRows(doc, tasks, null, 1, null));
  return rows.map((row) => row.map(cellText).join(",")).join("\n");
};

export const importTodoistCsv = (doc, source, { projectId, today }) => {
  const table = parseCsv(source);
  if (table.length === 0) return { doc, count: 0, sections: 0, error: "That file has no tasks to import." };
  const looksLikeHeader = table[0].some((cell) => cell.trim().toUpperCase() === "CONTENT");
  const columns = looksLikeHeader
    ? headerIndex(table[0])
    : headerIndex(HEADER);
  const body = looksLikeHeader ? table.slice(1) : table;
  if (!columns.has("CONTENT") && !columns.has("TYPE")) {
    return { doc, count: 0, sections: 0, error: "That file is not a Todoist CSV." };
  }
  let next = doc;
  let count = 0;
  let sectionCount = 0;
  let sectionId = null;
  let lastTaskId = null;
  const stack = [];

  for (const row of body) {
    const type = (read(row, columns, "TYPE") || "task").toLowerCase();
    const content = read(row, columns, "CONTENT");
    if (type === "meta") {
      const style = content.match(/view_style=(list|board|calendar)/);
      if (style) next = setProjectView(next, projectId, style[1]);
      continue;
    }
    if (type === "section") {
      if (!content) continue;
      const existing = next.sections.find(
        (section) => section.projectId === projectId && section.name.toLowerCase() === content.toLowerCase(),
      );
      if (existing) sectionId = existing.id;
      else {
        const before = new Set(next.sections.map((section) => section.id));
        next = addSection(next, projectId, content);
        sectionId = next.sections.find((section) => !before.has(section.id))?.id ?? null;
        if (sectionId) sectionCount += 1;
      }
      stack.length = 0;
      lastTaskId = null;
      continue;
    }
    if (type === "note") {
      if (lastTaskId && content) next = addComment(next, lastTaskId, content);
      continue;
    }
    if (type !== "task" || !content) continue;
    const indent = Math.max(1, Number(read(row, columns, "INDENT")) || 1);
    const parent = indent > 1 ? [...stack].reverse().find((item) => item.indent < indent) : null;
    const { title, names } = labelNamesFrom(content, read(row, columns, "LABELS"));
    if (!title) continue;
    const when = readWhen(read(row, columns, "DATE"), today);
    const deadline = readWhen(read(row, columns, "DEADLINE"), today).due;
    const before = new Set(next.tasks.map((task) => task.id));
    next = addTaskFromResolved(next, {
      title,
      description: read(row, columns, "DESCRIPTION"),
      priority: taskmanPriority(read(row, columns, "PRIORITY")),
      projectId,
      parentId: parent?.id ?? null,
      sectionId: parent ? null : sectionId,
      due: when.due,
      dueTime: when.dueTime,
      recurrence: when.recurrence,
      deadline,
      labelIds: [],
      newLabels: names,
    });
    const created = next.tasks.find((task) => !before.has(task.id));
    if (!created) continue;
    count += 1;
    lastTaskId = created.id;
    stack.splice(0, stack.length, ...stack.filter((item) => item.indent < indent), {
      indent,
      id: created.id,
    });
  }

  if (count === 0 && sectionCount === 0) {
    return { doc, count: 0, sections: 0, error: "That file has no tasks to import." };
  }
  return { doc: next, count, sections: sectionCount, error: "" };
};
