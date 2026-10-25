import { COLORS, INBOX_ID, isProjectColor, normalizePriority } from "./constants.js";
import { normalizeDate, normalizeRecurrence, normalizeTime } from "./dates.js";

const text = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const colorOf = (value, fallback) => (COLORS.includes(value) ? value : fallback);

const breakProjectCycles = (projects) => {
  const byId = new Map(projects.map((project) => [project.id, project]));
  for (const project of projects) {
    if (project.id === INBOX_ID) {
      project.parentId = null;
      continue;
    }
    const seen = new Set([project.id]);
    let parentId = project.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (parentId === INBOX_ID || seen.has(parentId) || !parent) {
        project.parentId = null;
        break;
      }
      seen.add(parentId);
      parentId = parent.parentId;
    }
  }
};

const breakParentCycles = (tasks) => {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const task of tasks) {
    const seen = new Set([task.id]);
    let parentId = task.parentId;
    while (parentId) {
      if (seen.has(parentId) || !byId.has(parentId)) {
        task.parentId = null;
        break;
      }
      seen.add(parentId);
      parentId = byId.get(parentId).parentId;
    }
  }
};

export const emptyDocument = () => ({
  projects: [
    {
      id: INBOX_ID,
      name: "Inbox",
      description: "",
      color: "charcoal",
      favorite: false,
      archived: false,
      view: "list",
      teamId: null,
      parentId: null,
    },
  ],
  sections: [],
  labels: [],
  filters: [],
  tasks: [],
  comments: [],
});

export const normalizeDocument = (input) => {
  const source = input && typeof input === "object" ? input : {};
  const projects = [];
  const projectIds = new Set();
  const projectList = Array.isArray(source.projects) ? source.projects : [];
  for (const project of projectList.slice(0, 200)) {
    if (!project || typeof project.id !== "string" || projectIds.has(project.id)) {
      continue;
    }
    const name = text(project.name, 120);
    if (!name) continue;
    const archived = project.id === INBOX_ID ? false : project.archived === true;
    const view = project.view === "board" || project.view === "calendar" ? project.view : "list";
    projects.push({
      id: project.id,
      name,
      description: text(project.description, 2000),
      color: isProjectColor(project.color) ? project.color : "charcoal",
      favorite: archived ? false : project.favorite === true,
      archived,
      view,
      teamId: project.id === INBOX_ID || typeof project.teamId !== "string" || !project.teamId ? null : project.teamId,
      parentId:
        project.id === INBOX_ID || typeof project.parentId !== "string" ? null : project.parentId,
    });
    projectIds.add(project.id);
  }
  if (!projectIds.has(INBOX_ID)) {
    projects.unshift({
      id: INBOX_ID,
      name: "Inbox",
      description: "",
      color: "charcoal",
      favorite: false,
      archived: false,
      view: "list",
      teamId: null,
      parentId: null,
    });
    projectIds.add(INBOX_ID);
  }
  breakProjectCycles(projects);

  const sections = [];
  const sectionIds = new Set();
  const sectionList = Array.isArray(source.sections) ? source.sections : [];
  for (const section of sectionList.slice(0, 500)) {
    if (!section || typeof section.id !== "string" || sectionIds.has(section.id)) {
      continue;
    }
    const name = text(section.name, 80);
    if (!name || !projectIds.has(section.projectId)) continue;
    sections.push({
      id: section.id,
      projectId: section.projectId,
      name,
      order: Number.isFinite(section.order) ? section.order : sections.length,
    });
    sectionIds.add(section.id);
  }

  const labels = [];
  const labelIds = new Set();
  const labelList = Array.isArray(source.labels) ? source.labels : [];
  for (const label of labelList.slice(0, 200)) {
    if (!label || typeof label.id !== "string" || labelIds.has(label.id)) continue;
    const name = text(label.name, 40);
    if (!name) continue;
    labels.push({
      id: label.id,
      name,
      color: colorOf(label.color, "indigo"),
      favorite: label.favorite === true,
    });
    labelIds.add(label.id);
  }

  const filters = [];
  const filterIds = new Set();
  const filterList = Array.isArray(source.filters) ? source.filters : [];
  for (const filter of filterList.slice(0, 100)) {
    if (!filter || typeof filter.id !== "string" || filterIds.has(filter.id)) continue;
    const name = text(filter.name, 40);
    const query = text(filter.query, 240);
    if (!name || !query) continue;
    filters.push({
      id: filter.id,
      name,
      query,
      color: colorOf(filter.color, "indigo"),
      favorite: filter.favorite === true,
    });
    filterIds.add(filter.id);
  }

  const tasks = [];
  const taskIds = new Set();
  const taskList = Array.isArray(source.tasks) ? source.tasks : [];
  for (const task of taskList.slice(0, 5000)) {
    if (!task || typeof task.id !== "string" || taskIds.has(task.id)) continue;
    const title = text(task.title, 500);
    if (!title) continue;
    const projectId = projectIds.has(task.projectId) ? task.projectId : INBOX_ID;
    const sectionId =
      typeof task.sectionId === "string" &&
      sections.some(
        (section) => section.id === task.sectionId && section.projectId === projectId,
      )
        ? task.sectionId
        : null;
    tasks.push({
      id: task.id,
      projectId,
      parentId: typeof task.parentId === "string" ? task.parentId : null,
      sectionId,
      title,
      description: text(task.description, 4000),
      due: normalizeDate(task.due),
      dueTime: normalizeTime(task.dueTime),
      deadline: normalizeDate(task.deadline),
      recurrence: normalizeRecurrence(task.recurrence),
      priority: normalizePriority(task.priority),
      reminder: normalizeTime(task.reminder),
      remindedAt: text(task.remindedAt, 40) || null,
      completed: task.completed === true,
      completedAt: Number.isFinite(task.completedAt) ? task.completedAt : null,
      location: text(task.location, 200),
      labelIds: Array.isArray(task.labelIds)
        ? [...new Set(task.labelIds.filter((id) => labelIds.has(id)))]
        : [],
      order: Number.isFinite(task.order) ? task.order : tasks.length + 1,
      createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
    });
    taskIds.add(task.id);
  }
  breakParentCycles(tasks);
  for (const task of tasks) {
    if (!task.parentId) continue;
    const parent = tasks.find((item) => item.id === task.parentId);
    if (!parent) {
      task.parentId = null;
      continue;
    }
    task.projectId = parent.projectId;
    task.sectionId = null;
  }
  for (const task of tasks) {
    if (task.completed && !Number.isFinite(task.completedAt)) {
      task.completedAt = task.createdAt;
    }
    if (!task.completed) task.completedAt = null;
  }

  const comments = [];
  const commentIds = new Set();
  const commentList = Array.isArray(source.comments) ? source.comments : [];
  for (const comment of commentList.slice(0, 5000)) {
    if (!comment || typeof comment.id !== "string" || commentIds.has(comment.id)) {
      continue;
    }
    const body = text(comment.body, 2000);
    if (!body || !taskIds.has(comment.taskId)) continue;
    comments.push({
      id: comment.id,
      taskId: comment.taskId,
      body,
      createdAt: Number.isFinite(comment.createdAt) ? comment.createdAt : Date.now(),
    });
    commentIds.add(comment.id);
  }

  return { projects, sections, labels, filters, tasks, comments };
};
