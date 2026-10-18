export const INBOX_ID = "inbox";

export const COLORS = [
  "stone",
  "indigo",
  "emerald",
  "amber",
  "rose",
  "sky",
  "violet",
];

export const COLOR_STYLES = {
  stone: { dot: "bg-stone-400", chip: "bg-stone-100 text-stone-700" },
  indigo: { dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700" },
  emerald: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800" },
  rose: { dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
  sky: { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-800" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
};

export const createId = () => crypto.randomUUID();

export const localISODate = (date = new Date()) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
};

export const addDays = (iso, days) => {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localISODate(date);
};

export const formatDue = (iso, today) => {
  if (!iso) return "";
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const emptyDocument = () => ({
  projects: [{ id: INBOX_ID, name: "Inbox", color: "stone" }],
  labels: [],
  tasks: [],
});

const byCreated = (left, right) => left.createdAt - right.createdAt;

const nextColor = (items) => COLORS[items.length % COLORS.length];

export const childrenOf = (doc, parentId) =>
  doc.tasks.filter((task) => task.parentId === parentId).sort(byCreated);

export const taskById = (doc, id) =>
  doc.tasks.find((task) => task.id === id) ?? null;

export const projectById = (doc, id) =>
  doc.projects.find((project) => project.id === id) ?? null;

export const addProject = (doc, name) => {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return doc;
  return {
    ...doc,
    projects: [
      ...doc.projects,
      { id: createId(), name: trimmed, color: nextColor(doc.projects) },
    ],
  };
};

export const renameProject = (doc, id, name) => {
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return doc;
  return {
    ...doc,
    projects: doc.projects.map((project) =>
      project.id === id ? { ...project, name: trimmed } : project,
    ),
  };
};

export const deleteProject = (doc, id) => {
  if (id === INBOX_ID) return doc;
  return {
    ...doc,
    projects: doc.projects.filter((project) => project.id !== id),
    tasks: doc.tasks.map((task) =>
      task.projectId === id ? { ...task, projectId: INBOX_ID } : task,
    ),
  };
};

export const addLabel = (doc, name) => {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return doc;
  return {
    ...doc,
    labels: [
      ...doc.labels,
      { id: createId(), name: trimmed, color: nextColor(doc.labels) },
    ],
  };
};

export const renameLabel = (doc, id, name) => {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed) return doc;
  return {
    ...doc,
    labels: doc.labels.map((label) =>
      label.id === id ? { ...label, name: trimmed } : label,
    ),
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

const knownLabelIds = (doc, ids) =>
  (ids ?? []).filter((id) => doc.labels.some((label) => label.id === id));

export const addTask = (doc, input) => {
  const title = input.title.trim().slice(0, 500);
  if (!title) return doc;
  const parent = input.parentId ? taskById(doc, input.parentId) : null;
  const requestedProject = doc.projects.some(
    (project) => project.id === input.projectId,
  )
    ? input.projectId
    : INBOX_ID;
  const due =
    typeof input.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.due)
      ? input.due
      : null;
  const task = {
    id: createId(),
    projectId: parent ? parent.projectId : requestedProject,
    parentId: parent ? parent.id : null,
    title,
    due,
    completed: false,
    labelIds: knownLabelIds(doc, input.labelIds),
    createdAt: Date.now(),
  };
  return { ...doc, tasks: [...doc.tasks, task] };
};

export const updateTask = (doc, id, patch) => ({
  ...doc,
  tasks: doc.tasks.map((task) => {
    if (task.id !== id) return task;
    const next = { ...task };
    if (typeof patch.title === "string") {
      const title = patch.title.trim().slice(0, 500);
      if (title) next.title = title;
    }
    if (patch.due === null) next.due = null;
    if (typeof patch.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.due)) {
      next.due = patch.due;
    }
    if (typeof patch.completed === "boolean") next.completed = patch.completed;
    if (Array.isArray(patch.labelIds)) {
      next.labelIds = knownLabelIds(doc, patch.labelIds);
    }
    if (
      typeof patch.projectId === "string" &&
      doc.projects.some((project) => project.id === patch.projectId) &&
      !task.parentId
    ) {
      next.projectId = patch.projectId;
    }
    return next;
  }),
});

export const toggleTask = (doc, id) => {
  const task = taskById(doc, id);
  if (!task) return doc;
  return updateTask(doc, id, { completed: !task.completed });
};

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

export const deleteTask = (doc, id) => {
  const ids = descendantIds(doc, id);
  return { ...doc, tasks: doc.tasks.filter((task) => !ids.has(task.id)) };
};

export const selectView = (doc, view, today) => {
  const open = (predicate) =>
    doc.tasks.filter((task) => !task.completed && predicate(task)).sort(byCreated);
  const done = (predicate) =>
    doc.tasks.filter((task) => task.completed && predicate(task)).sort(byCreated);

  if (view.kind === "inbox") {
    const match = (task) => task.parentId === null && task.projectId === INBOX_ID;
    return { mode: "nested", open: open(match), done: done(match), groups: null };
  }
  if (view.kind === "project") {
    const match = (task) => task.parentId === null && task.projectId === view.id;
    return { mode: "nested", open: open(match), done: done(match), groups: null };
  }
  if (view.kind === "today") {
    const match = (task) => task.due !== null && task.due <= today;
    const tasks = open(match);
    return {
      mode: "flat",
      open: tasks,
      done: done(match),
      groups: [
        { id: "overdue", title: "Overdue", tasks: tasks.filter((task) => task.due < today) },
        { id: "today", title: "Today", tasks: tasks.filter((task) => task.due === today) },
      ].filter((group) => group.tasks.length > 0),
    };
  }
  if (view.kind === "upcoming") {
    const tasks = open((task) => task.due !== null && task.due > today);
    const dates = [...new Set(tasks.map((task) => task.due))].sort();
    return {
      mode: "flat",
      open: tasks,
      done: [],
      groups: dates.map((date) => ({
        id: date,
        title: formatDue(date, today),
        tasks: tasks.filter((task) => task.due === date),
      })),
    };
  }
  const match = (task) => task.labelIds.includes(view.id);
  return { mode: "flat", open: open(match), done: done(match), groups: null };
};
