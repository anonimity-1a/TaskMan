import { INBOX_ID } from "./constants.js";
import { addDays, formatDue, startOfWeek, timestampDate } from "./dates.js";
import { descendantProjectIds } from "./model.js";

const archived = (doc, projectId) =>
  Boolean(doc.projects.find((project) => project.id === projectId)?.archived);

const projectName = (doc, projectId) =>
  doc.projects.find((project) => project.id === projectId)?.name ?? "";

const compareNullable = (left, right, direction, compare) => {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return compare(left, right) * (direction === "desc" ? -1 : 1);
};

const sortTasks = (tasks, display) => {
  const sorting = display?.sorting ?? "default";
  const direction = display?.direction === "desc" ? "desc" : "asc";
  const dir = direction === "desc" ? -1 : 1;
  const copy = [...tasks];
  copy.sort((left, right) => {
    let result = 0;
    if (sorting === "name") result = left.title.localeCompare(right.title) * dir;
    else if (sorting === "date") {
      result = compareNullable(left.due, right.due, direction, (a, b) => a.localeCompare(b));
    } else if (sorting === "added") result = (left.createdAt - right.createdAt) * dir;
    else if (sorting === "deadline") {
      result = compareNullable(left.deadline, right.deadline, direction, (a, b) => a.localeCompare(b));
    } else if (sorting === "priority") result = (left.priority - right.priority) * dir;
    else result = left.order - right.order || left.createdAt - right.createdAt;
    return result || left.order - right.order || left.createdAt - right.createdAt;
  });
  return copy;
};

const passesDate = (task, filter, today) => {
  if (!filter || filter === "all") return true;
  if (filter === "nodate") return !task.due;
  if (!task.due) return false;
  if (filter === "today") return task.due === today;
  if (filter === "next7") return task.due >= today && task.due <= addDays(today, 7);
  if (filter === "next30") return task.due >= today && task.due <= addDays(today, 30);
  if (filter === "week") {
    const start = startOfWeek(today);
    return task.due >= start && task.due <= addDays(start, 6);
  }
  if (filter === "month") return task.due.slice(0, 7) === today.slice(0, 7);
  return true;
};

const passesCreated = (task, filter, today) => {
  if (!filter || filter === "all") return true;
  const created = timestampDate(task.createdAt);
  if (!created) return false;
  if (filter === "today") return created === today;
  if (filter === "last7") return created >= addDays(today, -7) && created <= today;
  if (filter === "last30") return created >= addDays(today, -30) && created <= today;
  return true;
};

const passesFilters = (task, display, today) => {
  if (display.priorities?.length && !display.priorities.includes(task.priority)) return false;
  if (!passesDate(task, display.date, today)) return false;
  if (!passesCreated(task, display.created, today)) return false;
  return true;
};

const groupBy = (doc, tasks, display, today) => {
  const direction = display.direction === "desc" ? "desc" : "asc";
  if (display.grouping === "priority") {
    const levels = display.priorities?.length
      ? [...display.priorities].sort((left, right) => left - right)
      : [1, 2, 3, 4];
    if (direction === "desc") levels.reverse();
    return levels.map((level) => ({
      id: `priority-${level}`,
      title: `Priority ${level}`,
      priority: level,
      sectionId: null,
      add: { priority: level },
      tasks: tasks.filter((task) => task.priority === level),
    }));
  }
  if (display.grouping === "label") {
    const labels = [...doc.labels].sort((left, right) => left.name.localeCompare(right.name));
    if (direction === "desc") labels.reverse();
    const groups = labels.map((label) => ({
      id: `label-${label.id}`,
      title: label.name,
      sectionId: null,
      add: { labelIds: [label.id] },
      tasks: tasks.filter((task) => task.labelIds.includes(label.id)),
    }));
    const unlabeled = tasks.filter((task) => task.labelIds.length === 0);
    if (unlabeled.length > 0 || groups.length === 0) {
      groups.push({
        id: "nolabel",
        title: "No label",
        sectionId: null,
        add: {},
        tasks: unlabeled,
      });
    }
    return groups;
  }
  const valueOf =
    display.grouping === "deadline"
      ? (task) => task.deadline
      : display.grouping === "added"
        ? (task) => timestampDate(task.createdAt)
        : (task) => task.due;
  const emptyTitle =
    display.grouping === "deadline" ? "No deadline" : display.grouping === "added" ? "Unknown" : "No date";
  const buckets = new Map();
  for (const task of tasks) {
    const value = valueOf(task);
    const key = value ?? "none";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(task);
  }
  const keys = [...buckets.keys()].sort((left, right) => {
    if (left === "none") return 1;
    if (right === "none") return -1;
    return direction === "desc" ? right.localeCompare(left) : left.localeCompare(right);
  });
  return keys.map((key) => ({
    id: `${display.grouping}-${key}`,
    title: key === "none" ? emptyTitle : formatDue(key, today),
    sectionId: null,
    add:
      key === "none"
        ? display.grouping === "date"
          ? { due: null }
          : display.grouping === "deadline"
            ? { deadline: null }
            : {}
        : display.grouping === "date"
          ? { due: key }
          : display.grouping === "deadline"
            ? { deadline: key }
            : {},
    tasks: buckets.get(key),
  }));
};

const projectStructure = (doc, projectId, roots) => {
  const project = doc.projects.find((item) => item.id === projectId);
  const children = doc.projects
    .filter((item) => item.parentId === projectId && !item.archived)
    .sort((left, right) => left.name.localeCompare(right.name));
  const sections = doc.sections
    .filter((section) => section.projectId === projectId)
    .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
  const own = roots.filter((task) => task.projectId === projectId);
  const groups = [];
  if (sections.length > 0) {
    for (const section of sections) {
      groups.push({
        id: section.id,
        title: section.name,
        sectionId: section.id,
        editable: true,
        add: { sectionId: section.id, projectId },
        tasks: own.filter((task) => task.sectionId === section.id),
      });
    }
    groups.push({
      id: "none",
      title: "No section",
      sectionId: null,
      add: { sectionId: null, projectId },
      tasks: own.filter((task) => !task.sectionId),
    });
  } else if (children.length > 0) {
    groups.push({
      id: "own",
      title: project?.name ?? "Tasks",
      sectionId: null,
      add: { projectId },
      tasks: own,
    });
  }
  for (const child of children) {
    const ids = descendantProjectIds(doc, child.id);
    groups.push({
      id: `project-${child.id}`,
      title: child.name,
      sectionId: null,
      add: { projectId: child.id },
      tasks: roots.filter((task) => ids.has(task.projectId)),
    });
  }
  return groups.length > 0 ? groups : null;
};

const uniqueTasks = (tasks) => {
  const seen = new Set();
  return tasks.filter((task) => {
    if (seen.has(task.id)) return false;
    seen.add(task.id);
    return true;
  });
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

const present = (display, mode, openTasks, doneTasks, structural, today, doc) => {
  const includeDone = display.showCompleted;
  const combined = includeDone ? sortTasks([...openTasks, ...doneTasks], display) : openTasks;
  if (display.grouping !== "none") {
    const groups = groupBy(doc, combined, display, today);
    return { mode, open: openTasks, done: [], groups, visible: uniqueTasks(combined) };
  }
  if (structural) {
    return {
      mode,
      open: openTasks,
      done: [],
      groups: structural,
      visible: uniqueTasks(structural.flatMap((group) => group.tasks)),
    };
  }
  return {
    mode,
    open: openTasks,
    done: includeDone ? doneTasks : [],
    groups: null,
    visible: includeDone ? uniqueTasks(combined) : openTasks,
  };
};

export const selectView = (doc, view, today, display = { sorting: "default", direction: "asc", grouping: "none", showCompleted: false, priorities: [], date: "all", created: "all" }) => {
  if (view.kind === "browse" || view.kind === "reporting") {
    return { mode: "flat", open: [], done: [], groups: null, visible: [] };
  }
  const tasks = pool(doc, view);
  const open = (predicate) =>
    sortTasks(
      tasks.filter((task) => !task.completed && predicate(task) && passesFilters(task, display, today)),
      display,
    );
  const done = (predicate) => {
    const list = tasks.filter(
      (task) => task.completed && predicate(task) && passesFilters(task, display, today),
    );
    if (display.sorting === "default") {
      list.sort(byCompleted);
      if (display.direction === "desc") list.reverse();
      return list;
    }
    return sortTasks(list, display);
  };

  if (view.kind === "inbox") {
    const match = (task) => task.parentId === null && task.projectId === INBOX_ID;
    return present(display, "nested", open(match), done(match), null, today, doc);
  }

  if (view.kind === "project") {
    const ids = descendantProjectIds(doc, view.id);
    const match = (task) => task.parentId === null && ids.has(task.projectId);
    const openTasks = open(match);
    const doneTasks = done(match);
    const includeDone = display.showCompleted;
    const combined = includeDone ? sortTasks([...openTasks, ...doneTasks], display) : openTasks;
    if (display.grouping !== "none") {
      return {
        mode: "nested",
        open: openTasks,
        done: [],
        groups: groupBy(doc, combined, display, today),
        visible: uniqueTasks(combined),
      };
    }
    const structural = projectStructure(doc, view.id, combined);
    return present(display, "nested", openTasks, doneTasks, structural, today, doc);
  }

  if (view.kind === "today") {
    const match = (task) => task.due !== null && task.due <= today;
    const finished = tasks
      .filter(
        (task) =>
          task.completed &&
          passesFilters(task, display, today) &&
          (timestampDate(task.completedAt) === today || (task.due && task.due <= today)),
      );
    const doneToday = display.sorting === "default"
      ? finished.sort(byCompleted)
      : sortTasks(finished, display);
    return present(display, "flat", open(match), doneToday, null, today, doc);
  }

  if (view.kind === "upcoming") {
    const match = (task) => task.due !== null && task.due > today;
    return present(display, "flat", open(match), [], null, today, doc);
  }

  if (view.kind === "completed") {
    const finished = done(() => true);
    if (display.grouping !== "none") {
      return {
        mode: "flat",
        open: finished,
        done: [],
        groups: groupBy(doc, finished, display, today),
        visible: uniqueTasks(finished),
      };
    }
    return { mode: "flat", open: finished, done: [], groups: null, visible: finished };
  }

  if (view.kind === "label") {
    const match = (task) => task.labelIds.includes(view.id);
    return present(display, "flat", open(match), done(match), null, today, doc);
  }

  if (view.kind === "filter") {
    const filter = doc.filters.find((item) => item.id === view.id);
    const matched = filter
      ? tasks.filter((task) => taskMatchesQuery(doc, task, filter.query, today) && passesFilters(task, display, today))
      : [];
    const openTasks = sortTasks(matched.filter((task) => !task.completed), display);
    const doneTasks = sortTasks(matched.filter((task) => task.completed), display);
    return present(display, "flat", openTasks, doneTasks, null, today, doc);
  }

  const query = view.query?.trim().toLowerCase() ?? "";
  if (!query) return { mode: "flat", open: [], done: [], groups: null, visible: [] };
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
  return present(display, "flat", open(match), done(match), null, today, doc);
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
      doc.projects.map((project) => {
        const ids = descendantProjectIds(doc, project.id);
        return [
          project.id,
          tasks.filter((task) => task.parentId === null && ids.has(task.projectId)).length,
        ];
      }),
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
