import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const COLORS = new Set([
  "stone",
  "indigo",
  "emerald",
  "amber",
  "rose",
  "sky",
  "violet",
]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INBOX_ID = "inbox";

const emptyDocument = () => ({
  projects: [{ id: INBOX_ID, name: "Inbox", color: "stone" }],
  labels: [],
  tasks: [],
});

const text = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export const normalizeDocument = (input) => {
  const source = input && typeof input === "object" ? input : {};
  const projects = [];
  const projectIds = new Set();
  const projectList = Array.isArray(source.projects) ? source.projects : [];
  for (const project of projectList.slice(0, 200)) {
    if (!project || typeof project.id !== "string" || projectIds.has(project.id)) {
      continue;
    }
    const name = text(project.name, 80);
    if (!name) continue;
    projects.push({
      id: project.id,
      name,
      color: COLORS.has(project.color) ? project.color : "indigo",
    });
    projectIds.add(project.id);
  }
  if (!projectIds.has(INBOX_ID)) {
    projects.unshift({ id: INBOX_ID, name: "Inbox", color: "stone" });
    projectIds.add(INBOX_ID);
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
      color: COLORS.has(label.color) ? label.color : "indigo",
    });
    labelIds.add(label.id);
  }

  const tasks = [];
  const taskIds = new Set();
  const taskList = Array.isArray(source.tasks) ? source.tasks : [];
  for (const task of taskList.slice(0, 5000)) {
    if (!task || typeof task.id !== "string" || taskIds.has(task.id)) continue;
    const title = text(task.title, 500);
    if (!title) continue;
    tasks.push({
      id: task.id,
      projectId: projectIds.has(task.projectId) ? task.projectId : INBOX_ID,
      parentId: typeof task.parentId === "string" ? task.parentId : null,
      title,
      due: typeof task.due === "string" && DATE.test(task.due) ? task.due : null,
      completed: task.completed === true,
      labelIds: Array.isArray(task.labelIds)
        ? [...new Set(task.labelIds.filter((id) => labelIds.has(id)))]
        : [],
      createdAt: Number.isFinite(task.createdAt) ? task.createdAt : Date.now(),
    });
    taskIds.add(task.id);
  }
  for (const task of tasks) {
    if (!task.parentId || !taskIds.has(task.parentId) || task.parentId === task.id) {
      task.parentId = null;
      continue;
    }
    const parent = tasks.find((item) => item.id === task.parentId);
    if (parent) task.projectId = parent.projectId;
  }

  return { projects, labels, tasks };
};

const filePath = (userData) => path.join(userData, "data.json");

export const loadDocument = async (userData) => {
  await mkdir(userData, { recursive: true });
  try {
    const raw = await readFile(filePath(userData), "utf8");
    return normalizeDocument(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === "ENOENT") return emptyDocument();
    if (error instanceof SyntaxError) return emptyDocument();
    throw error;
  }
};

export const saveDocument = async (userData, input) => {
  const document = normalizeDocument(input);
  await mkdir(userData, { recursive: true });
  const target = filePath(userData);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, JSON.stringify(document, null, 2), "utf8");
  await rename(temporary, target);
  return document;
};
