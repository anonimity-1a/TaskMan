import { COLORS, INBOX_ID, normalizePriority } from "./constants.js";
import {
  nextOccurrence,
  normalizeDate,
  normalizeRecurrence,
  normalizeTime,
} from "./dates.js";

export { COLORS, COLOR_STYLES, INBOX_ID, PRIORITY_STYLES, cycleColor } from "./constants.js";
export {
  describeRecurrence,
  formatDue,
  formatWhen,
  localISODate,
  recurrenceFromKey,
  recurrenceKey,
} from "./dates.js";
export { emptyDocument } from "./normalize.js";

export const createId = () => crypto.randomUUID();

const clip = (value, max) => String(value ?? "").trim().slice(0, max);

const nextColor = (items) => COLORS[items.length % COLORS.length];

export const taskById = (doc, id) => doc.tasks.find((task) => task.id === id) ?? null;

export const projectById = (doc, id) =>
  doc.projects.find((project) => project.id === id) ?? null;

export const childrenOf = (doc, parentId) =>
  doc.tasks
    .filter((task) => task.parentId === parentId)
    .sort((left, right) => left.order - right.order || left.createdAt - right.createdAt);

export const commentsFor = (doc, taskId) =>
  doc.comments
    .filter((comment) => comment.taskId === taskId)
    .sort((left, right) => left.createdAt - right.createdAt);

const knownLabelIds = (doc, ids) =>
  (ids ?? []).filter((id) => doc.labels.some((label) => label.id === id));

const descendantIds = (doc, id) => {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const task of doc.tasks) {
      if (task.parentId && ids.has(task.parentId) && !ids.has(task.id)) {
        ids.add(task.id);
        grew = true;
      }
    }
  }
  return ids;
};

const ensureLabel = (doc, name) => {
  const trimmed = clip(name, 40);
  const existing = doc.labels.find(
    (label) => label.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return { doc, id: existing.id };
  const id = createId();
  return {
    id,
    doc: {
      ...doc,
      labels: [
        ...doc.labels,
        { id, name: trimmed, color: nextColor(doc.labels), favorite: false },
      ],
    },
  };
};

export const addProject = (doc, name) => {
  const trimmed = clip(name, 80);
  if (!trimmed) return doc;
  return {
    ...doc,
    projects: [
      ...doc.projects,
      {
        id: createId(),
        name: trimmed,
        color: nextColor(doc.projects),
        favorite: false,
        archived: false,
        view: "list",
      },
    ],
  };
};

export const renameProject = (doc, id, name) => {
  const trimmed = clip(name, 80);
  const current = projectById(doc, id);
  if (!trimmed || !current || current.name === trimmed) return doc;
  return {
    ...doc,
    projects: doc.projects.map((project) =>
      project.id === id ? { ...project, name: trimmed } : project,
    ),
  };
};

export const setProjectColor = (doc, id, color) => {
  if (!COLORS.includes(color)) return doc;
  return {
    ...doc,
    projects: doc.projects.map((project) =>
      project.id === id ? { ...project, color } : project,
    ),
  };
};

export const setProjectView = (doc, id, view) => ({
  ...doc,
  projects: doc.projects.map((project) =>
    project.id === id ? { ...project, view: view === "board" ? "board" : "list" } : project,
  ),
});

export const setProjectArchived = (doc, id, archived) => {
  if (id === INBOX_ID) return doc;
  return {
    ...doc,
    projects: doc.projects.map((project) =>
      project.id === id
        ? { ...project, archived: Boolean(archived), favorite: archived ? false : project.favorite }
        : project,
    ),
  };
};

export const deleteProject = (doc, id) => {
  if (id === INBOX_ID) return doc;
  return {
    ...doc,
    projects: doc.projects.filter((project) => project.id !== id),
    sections: doc.sections.filter((section) => section.projectId !== id),
    tasks: doc.tasks.map((task) =>
      task.projectId === id ? { ...task, projectId: INBOX_ID, sectionId: null } : task,
    ),
  };
};

export const addSection = (doc, projectId, name) => {
  const trimmed = clip(name, 80);
  if (!trimmed || !projectById(doc, projectId)) return doc;
  const order = doc.sections.filter((section) => section.projectId === projectId).length;
  return {
    ...doc,
    sections: [...doc.sections, { id: createId(), projectId, name: trimmed, order }],
  };
};

export const renameSection = (doc, id, name) => {
  const trimmed = clip(name, 80);
  const current = doc.sections.find((section) => section.id === id);
  if (!trimmed || !current || current.name === trimmed) return doc;
  return {
    ...doc,
    sections: doc.sections.map((section) =>
      section.id === id ? { ...section, name: trimmed } : section,
    ),
  };
};

export const deleteSection = (doc, id) => ({
  ...doc,
  sections: doc.sections.filter((section) => section.id !== id),
  tasks: doc.tasks.map((task) =>
    task.sectionId === id ? { ...task, sectionId: null } : task,
  ),
});

export const addLabel = (doc, name) => {
  const trimmed = clip(name, 40);
  if (!trimmed) return doc;
  if (doc.labels.some((label) => label.name.toLowerCase() === trimmed.toLowerCase())) {
    return doc;
  }
  return {
    ...doc,
    labels: [
      ...doc.labels,
      { id: createId(), name: trimmed, color: nextColor(doc.labels), favorite: false },
    ],
  };
};

export const renameLabel = (doc, id, name) => {
  const trimmed = clip(name, 40);
  const current = doc.labels.find((label) => label.id === id);
  if (!trimmed || !current || current.name === trimmed) return doc;
  return {
    ...doc,
    labels: doc.labels.map((label) => (label.id === id ? { ...label, name: trimmed } : label)),
  };
};

export const setLabelColor = (doc, id, color) => {
  if (!COLORS.includes(color)) return doc;
  return {
    ...doc,
    labels: doc.labels.map((label) => (label.id === id ? { ...label, color } : label)),
  };
};

export const deleteLabel = (doc, id) => ({
  ...doc,
  labels: doc.labels.filter((label) => label.id !== id),
  tasks: doc.tasks.map((task) => ({
    ...task,
    labelIds: task.labelIds.filter((labelId) => labelId !== id),
  })),
});

export const addFilter = (doc, name, query) => {
  const trimmed = clip(name, 40);
  const textQuery = clip(query, 240);
  if (!trimmed || !textQuery) return doc;
  return {
    ...doc,
    filters: [
      ...doc.filters,
      {
        id: createId(),
        name: trimmed,
        query: textQuery,
        color: nextColor(doc.filters),
        favorite: false,
      },
    ],
  };
};

export const updateFilter = (doc, id, patch) => {
  const current = doc.filters.find((filter) => filter.id === id);
  if (!current) return doc;
  const name = patch.name === undefined ? current.name : clip(patch.name, 40);
  const query = patch.query === undefined ? current.query : clip(patch.query, 240);
  if (!name || !query || (name === current.name && query === current.query)) return doc;
  return {
    ...doc,
    filters: doc.filters.map((filter) =>
      filter.id === id ? { ...filter, name, query } : filter,
    ),
  };
};

export const setFilterColor = (doc, id, color) => {
  if (!COLORS.includes(color)) return doc;
  return {
    ...doc,
    filters: doc.filters.map((filter) =>
      filter.id === id ? { ...filter, color } : filter,
    ),
  };
};

export const deleteFilter = (doc, id) => ({
  ...doc,
  filters: doc.filters.filter((filter) => filter.id !== id),
});

export const toggleFavorite = (doc, kind, id) => {
  const key = kind === "project" ? "projects" : kind === "label" ? "labels" : "filters";
  return {
    ...doc,
    [key]: doc[key].map((item) =>
      item.id === id ? { ...item, favorite: !item.favorite } : item,
    ),
  };
};

const applyPatch = (doc, task, patch) => {
  const next = { ...task };
  if ("title" in patch) {
    const title = clip(patch.title, 500);
    if (title) next.title = title;
  }
  if ("description" in patch) next.description = clip(patch.description, 4000);
  if ("due" in patch) next.due = normalizeDate(patch.due);
  if ("dueTime" in patch) next.dueTime = normalizeTime(patch.dueTime);
  if ("deadline" in patch) next.deadline = normalizeDate(patch.deadline);
  if ("recurrence" in patch) next.recurrence = normalizeRecurrence(patch.recurrence);
  if ("priority" in patch) next.priority = normalizePriority(patch.priority);
  if ("reminder" in patch) next.reminder = normalizeTime(patch.reminder);
  if ("remindedAt" in patch) next.remindedAt = patch.remindedAt || null;
  if ("completed" in patch) {
    next.completed = patch.completed === true;
    next.completedAt = next.completed
      ? Number.isFinite(patch.completedAt)
        ? patch.completedAt
        : Date.now()
      : null;
  }
  if ("labelIds" in patch) next.labelIds = knownLabelIds(doc, patch.labelIds);
  if ("order" in patch && Number.isFinite(patch.order)) next.order = patch.order;
  if (
    "projectId" in patch &&
    !task.parentId &&
    doc.projects.some((project) => project.id === patch.projectId) &&
    patch.projectId !== task.projectId
  ) {
    next.projectId = patch.projectId;
    next.sectionId = null;
  }
  if ("sectionId" in patch && !task.parentId) {
    if (patch.sectionId === null) next.sectionId = null;
    else if (
      doc.sections.some(
        (section) => section.id === patch.sectionId && section.projectId === next.projectId,
      )
    ) {
      next.sectionId = patch.sectionId;
    }
  }
  if (("due" in patch || "reminder" in patch) && !("remindedAt" in patch)) {
    next.remindedAt = null;
  }
  return next;
};

export const updateTask = (doc, id, patch) => {
  const target = taskById(doc, id);
  if (!target) return doc;
  const tasks = doc.tasks.map((task) =>
    task.id === id ? applyPatch(doc, task, patch) : task,
  );
  let next = { ...doc, tasks };
  const updated = taskById(next, id);
  if (updated && updated.projectId !== target.projectId) {
    const ids = descendantIds(next, id);
    next = {
      ...next,
      tasks: next.tasks.map((task) =>
        ids.has(task.id) && task.id !== id
          ? { ...task, projectId: updated.projectId, sectionId: null }
          : task,
      ),
    };
  }
  return next;
};

export const addTask = (doc, input) => {
  const title = clip(input.title, 500);
  if (!title) return doc;
  const parent = input.parentId ? taskById(doc, input.parentId) : null;
  if (input.parentId && !parent) return doc;
  const projectId = parent
    ? parent.projectId
    : doc.projects.some((project) => project.id === input.projectId)
      ? input.projectId
      : INBOX_ID;
  const sectionId =
    !parent &&
    input.sectionId &&
    doc.sections.some(
      (section) => section.id === input.sectionId && section.projectId === projectId,
    )
      ? input.sectionId
      : null;
  const order = doc.tasks.reduce((max, task) => Math.max(max, task.order ?? 0), 0) + 1;
  const task = {
    id: createId(),
    projectId,
    parentId: parent ? parent.id : null,
    sectionId,
    title,
    description: clip(input.description, 4000),
    due: normalizeDate(input.due),
    dueTime: normalizeTime(input.dueTime),
    deadline: normalizeDate(input.deadline),
    recurrence: normalizeRecurrence(input.recurrence),
    priority: normalizePriority(input.priority),
    reminder: normalizeTime(input.reminder),
    remindedAt: null,
    completed: false,
    completedAt: null,
    labelIds: knownLabelIds(doc, input.labelIds),
    order,
    createdAt: Date.now(),
  };
  return { ...doc, tasks: [...doc.tasks, task] };
};

export const addTaskFromResolved = (doc, resolved) => {
  let next = doc;
  const labelIds = [...(resolved.labelIds ?? [])];
  for (const name of resolved.newLabels ?? []) {
    const ensured = ensureLabel(next, name);
    next = ensured.doc;
    if (!labelIds.includes(ensured.id)) labelIds.push(ensured.id);
  }
  return addTask(next, { ...resolved, labelIds });
};

export const toggleTask = (doc, id) => {
  const task = taskById(doc, id);
  if (!task) return doc;
  if (!task.completed && task.recurrence && task.due) {
    return updateTask(doc, id, { due: nextOccurrence(task.due, task.recurrence) });
  }
  const completed = !task.completed;
  let next = updateTask(doc, id, { completed });
  if (completed) {
    for (const descId of descendantIds(doc, id)) {
      if (descId === id) continue;
      next = updateTask(next, descId, { completed: true });
    }
  }
  return next;
};

export const completeForever = (doc, id) => {
  const cleared = updateTask(doc, id, { recurrence: null });
  const task = taskById(cleared, id);
  if (!task || task.completed) return cleared;
  return toggleTask(cleared, id);
};

export const deleteTask = (doc, id) => {
  const ids = descendantIds(doc, id);
  return {
    ...doc,
    tasks: doc.tasks.filter((task) => !ids.has(task.id)),
    comments: doc.comments.filter((comment) => !ids.has(comment.taskId)),
  };
};

export const duplicateTask = (doc, id) => {
  const root = taskById(doc, id);
  if (!root) return doc;
  const map = new Map();
  const clones = [];
  const queue = [root];
  const seen = new Set();
  let order = doc.tasks.reduce((max, task) => Math.max(max, task.order ?? 0), 0);
  while (queue.length > 0) {
    const current = queue.shift();
    if (seen.has(current.id)) continue;
    seen.add(current.id);
    order += 1;
    const copyId = createId();
    map.set(current.id, copyId);
    clones.push({
      ...current,
      id: copyId,
      title: current.id === root.id ? clip(`${current.title} copy`, 500) : current.title,
      completed: false,
      completedAt: null,
      remindedAt: null,
      order,
      createdAt: Date.now(),
    });
    for (const child of childrenOf(doc, current.id)) queue.push(child);
  }
  for (const clone of clones) {
    clone.parentId = clone.parentId
      ? (map.get(clone.parentId) ?? clone.parentId)
      : null;
  }
  return { ...doc, tasks: [...doc.tasks, ...clones] };
};

export const moveTaskToSection = (doc, id, sectionId) => {
  const task = taskById(doc, id);
  if (!task || task.parentId) return doc;
  const order = doc.tasks.reduce((max, item) => Math.max(max, item.order ?? 0), 0) + 1;
  return updateTask(doc, id, { sectionId: sectionId ?? null, order });
};

export const reorderTask = (doc, draggedId, targetId) => {
  const dragged = taskById(doc, draggedId);
  const target = taskById(doc, targetId);
  if (!dragged || !target || dragged.id === target.id) return doc;
  if (dragged.parentId || target.parentId) return doc;
  if (dragged.projectId !== target.projectId) return doc;
  const siblings = doc.tasks.filter(
    (task) =>
      !task.parentId &&
      !task.completed &&
      task.projectId === target.projectId &&
      (task.sectionId ?? null) === (target.sectionId ?? null) &&
      task.id !== dragged.id,
  );
  siblings.sort((left, right) => left.order - right.order || left.createdAt - right.createdAt);
  const index = siblings.findIndex((task) => task.id === target.id);
  siblings.splice(index < 0 ? siblings.length : index, 0, dragged);
  const orders = new Map(siblings.map((task, position) => [task.id, position + 1]));
  return {
    ...doc,
    tasks: doc.tasks.map((task) => {
      if (task.id === dragged.id) {
        return { ...task, sectionId: target.sectionId ?? null, order: orders.get(task.id) };
      }
      if (orders.has(task.id)) return { ...task, order: orders.get(task.id) };
      return task;
    }),
  };
};

export const addComment = (doc, taskId, body) => {
  const message = clip(body, 2000);
  if (!message || !taskById(doc, taskId)) return doc;
  return {
    ...doc,
    comments: [
      ...doc.comments,
      { id: createId(), taskId, body: message, createdAt: Date.now() },
    ],
  };
};

export const deleteComment = (doc, id) => ({
  ...doc,
  comments: doc.comments.filter((comment) => comment.id !== id),
});

export const dueReminders = (doc, today, time) =>
  doc.tasks.filter((task) => {
    if (task.completed || !task.due || !task.reminder) return false;
    const stamp = `${task.due}T${task.reminder}`;
    if (task.remindedAt === stamp) return false;
    return stamp <= `${today}T${time}`;
  });

export const stampReminder = (doc, task) =>
  updateTask(doc, task.id, { remindedAt: `${task.due}T${task.reminder}` });
