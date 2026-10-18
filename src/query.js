import { INBOX_ID } from "./constants.js";
import { addDays, formatDue, timestampDate } from "./dates.js";

const archived = (doc, projectId) =>
  Boolean(doc.projects.find((project) => project.id === projectId)?.archived);

const projectName = (doc, projectId) =>
  doc.projects.find((project) => project.id === projectId)?.name ?? "";

const sortTasks = (tasks, sort) => {
  const copy = [...tasks];
  if (sort === "priority") {
    copy.sort(
      (left, right) =>
        left.priority - right.priority ||
        (left.due ?? "9999-99-99").localeCompare(right.due ?? "9999-99-99") ||
        left.order - right.order,
    );
  } else if (sort === "name") {
    copy.sort(
      (left, right) =>
        left.title.localeCompare(right.title) || left.order - right.order,
    );
  } else if (sort === "date") {
    copy.sort(
      (left, right) =>
        (left.due ?? "9999-99-99").localeCompare(right.due ?? "9999-99-99") ||
        left.priority - right.priority ||
        left.order - right.order,
    );
  } else {
    copy.sort(
      (left, right) => left.order - right.order || left.createdAt - right.createdAt,
    );
  }
  return copy;
};

const byCompleted = (left, right) =>
  (right.completedAt ?? 0) - (left.completedAt ?? 0);

const wordToken = (word) => {
  if (
    ["overdue", "today", "tomorrow", "upcoming", "nodate", "nextweek", "recurring", "completed"].includes(
      word,
    )
  ) {
    return { kind: word };
  }
  if (/^p[1-4]$/.test(word)) return { kind: "priority", priority: Number(word[1]) };
  return { kind: "text", text: word };
};

export const tokenizeQuery = (query) => {
  const source = String(query ?? "")
    .replace(/\bno date\b/gi, "nodate")
    .replace(/\bnext week\b/gi, "nextweek");
  const tokens = [];
  const pattern =
    /@"([^"]+)"|#"([^"]+)"|@([^\s@#]+)|#([^\s@#]+)|"([^"]+)"|(\S+)/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) tokens.push({ kind: "label", name: match[1] });
    else if (match[2]) tokens.push({ kind: "project", name: match[2] });
    else if (match[3]) tokens.push({ kind: "label", name: match[3] });
    else if (match[4]) tokens.push({ kind: "project", name: match[4] });
    else if (match[5]) tokens.push({ kind: "text", text: match[5].toLowerCase() });
    else if (match[6]) tokens.push(wordToken(match[6].toLowerCase()));
  }
  return tokens;
};

const matchesToken = (doc, task, token, today) => {
  if (token.kind === "overdue") return Boolean(task.due && task.due < today);
  if (token.kind === "today") return task.due === today;
  if (token.kind === "tomorrow") return task.due === addDays(today, 1);
  if (token.kind === "upcoming") return Boolean(task.due && task.due > today);
  if (token.kind === "nextweek") {
    return Boolean(task.due && task.due > today && task.due <= addDays(today, 7));
  }
  if (token.kind === "nodate") return !task.due;
  if (token.kind === "recurring") return Boolean(task.recurrence);
  if (token.kind === "priority") return task.priority === token.priority;
  if (token.kind === "label") {
    return doc.labels.some(
      (label) =>
        label.name.toLowerCase() === token.name.toLowerCase() &&
        task.labelIds.includes(label.id),
    );
  }
  if (token.kind === "project") {
    return projectName(doc, task.projectId).toLowerCase() === token.name.toLowerCase();
  }
  const haystack = `${task.title} ${task.description}`.toLowerCase();
  return haystack.includes(token.text);
};

export const taskMatchesQuery = (doc, task, query, today) => {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return false;
  const wantsCompleted = tokens.some((token) => token.kind === "completed");
  if (task.completed !== wantsCompleted) return false;
  return tokens
    .filter((token) => token.kind !== "completed")
    .every((token) => matchesToken(doc, task, token, today));
};

const pool = (doc, view) =>
  doc.tasks.filter(
    (task) => view.kind === "project" || !archived(doc, task.projectId),
  );

export const selectView = (doc, view, today, sort = "manual") => {
  const tasks = pool(doc, view);
  const open = (predicate) =>
    sortTasks(
      tasks.filter((task) => !task.completed && predicate(task)),
      sort,
    );
  const done = (predicate) =>
    tasks.filter((task) => task.completed && predicate(task)).sort(byCompleted);

  if (view.kind === "inbox") {
    const match = (task) => task.parentId === null && task.projectId === INBOX_ID;
    return { mode: "nested", open: open(match), done: done(match), groups: null };
  }

  if (view.kind === "project") {
    const project = doc.projects.find((item) => item.id === view.id);
    const match = (task) => task.parentId === null && task.projectId === view.id;
    const roots = open(match);
    const sections = doc.sections
      .filter((section) => section.projectId === view.id)
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
    const groups =
      sections.length === 0
        ? null
        : [
            ...sections.map((section) => ({
              id: section.id,
              title: section.name,
              sectionId: section.id,
              tasks: roots.filter((task) => task.sectionId === section.id),
            })),
            {
              id: "none",
              title: "No section",
              sectionId: null,
              tasks: roots.filter((task) => !task.sectionId),
            },
          ];
    return {
      mode: project?.view === "board" ? "board" : "nested",
      open: roots,
      done: done(match),
      groups,
    };
  }

  if (view.kind === "today") {
    const match = (task) => task.due !== null && task.due <= today;
    const dueToday = open(match);
    const finished = tasks
      .filter(
        (task) =>
          task.completed &&
          (timestampDate(task.completedAt) === today || task.due === today),
      )
      .sort(byCompleted);
    const groups = [
      { id: "overdue", title: "Overdue", sectionId: null, tasks: dueToday.filter((task) => task.due < today) },
      { id: "today", title: "Today", sectionId: null, tasks: dueToday.filter((task) => task.due === today) },
    ].filter((group) => group.tasks.length > 0);
    return {
      mode: "flat",
      open: dueToday,
      done: finished,
      groups: groups.length > 0 ? groups : null,
    };
  }

  if (view.kind === "upcoming") {
    const upcoming = open((task) => task.due !== null && task.due > today);
    if (sort === "priority" || sort === "name") {
      return { mode: "flat", open: upcoming, done: [], groups: null };
    }
    const dates = [...new Set(upcoming.map((task) => task.due))].sort();
    const groups = dates.map((date) => ({
      id: date,
      title: formatDue(date, today),
      sectionId: null,
      tasks: upcoming.filter((task) => task.due === date),
    }));
    return {
      mode: "flat",
      open: upcoming,
      done: [],
      groups: groups.length > 0 ? groups : null,
    };
  }

  if (view.kind === "completed") {
    return {
      mode: "flat",
      open: tasks.filter((task) => task.completed).sort(byCompleted),
      done: [],
      groups: null,
    };
  }

  if (view.kind === "label") {
    const match = (task) => task.labelIds.includes(view.id);
    return { mode: "flat", open: open(match), done: done(match), groups: null };
  }

  if (view.kind === "filter") {
    const filter = doc.filters.find((item) => item.id === view.id);
    const matched = filter
      ? sortTasks(
          tasks.filter((task) => taskMatchesQuery(doc, task, filter.query, today)),
          sort,
        )
      : [];
    return { mode: "flat", open: matched, done: [], groups: null };
  }

  const query = view.query?.trim().toLowerCase() ?? "";
  if (!query) return { mode: "flat", open: [], done: [], groups: null };
  const match = (task) => {
    const labels = doc.labels
      .filter((label) => task.labelIds.includes(label.id))
      .map((label) => label.name)
      .join(" ");
    const comments = doc.comments
      .filter((comment) => comment.taskId === task.id)
      .map((comment) => comment.body)
      .join(" ");
    const haystack = `${task.title} ${task.description} ${projectName(doc, task.projectId)} ${labels} ${comments}`.toLowerCase();
    return haystack.includes(query);
  };
  return { mode: "flat", open: open(match), done: done(match), groups: null };
};

export const countsFor = (doc, today) => {
  const tasks = doc.tasks.filter((task) => !task.completed && !archived(doc, task.projectId));
  return {
    inbox: tasks.filter((task) => task.parentId === null && task.projectId === INBOX_ID)
      .length,
    today: tasks.filter((task) => task.due && task.due <= today).length,
    upcoming: tasks.filter((task) => task.due && task.due > today).length,
    completed: doc.tasks.filter((task) => task.completed && !archived(doc, task.projectId))
      .length,
    projects: Object.fromEntries(
      doc.projects.map((project) => [
        project.id,
        tasks.filter((task) => task.parentId === null && task.projectId === project.id)
          .length,
      ]),
    ),
    labels: Object.fromEntries(
      doc.labels.map((label) => [
        label.id,
        tasks.filter((task) => task.labelIds.includes(label.id)).length,
      ]),
    ),
    filters: Object.fromEntries(
      doc.filters.map((filter) => [
        filter.id,
        doc.tasks.filter(
          (task) =>
            !archived(doc, task.projectId) &&
            taskMatchesQuery(doc, task, filter.query, today),
        ).length,
      ]),
    ),
  };
};

export const tasksDueOn = (doc, iso) =>
  doc.tasks.filter((task) => task.due === iso && !archived(doc, task.projectId));
