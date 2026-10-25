export const FACTORY_DISPLAY = {
  layout: "list",
  showCompleted: false,
  grouping: "none",
  sorting: "default",
  direction: "asc",
  date: "all",
  created: "all",
  priorities: [],
};

export const INITIAL_DISPLAY = {
  ...FACTORY_DISPLAY,
  grouping: "priority",
  sorting: "date",
};

const STORAGE_KEY = "taskman-display";

const LISTS = {
  layout: ["list", "board", "calendar"],
  grouping: ["none", "date", "added", "deadline", "priority", "label"],
  sorting: ["default", "name", "date", "added", "deadline", "priority"],
  date: ["all", "today", "week", "next7", "month", "next30", "nodate"],
  created: ["all", "today", "last7", "last30"],
};

export const viewStorageKey = (view) => `${view.kind}:${view.id ?? ""}`;

const sanitize = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const priorities = Array.isArray(source.priorities)
    ? [...new Set(source.priorities.filter((level) => level === 1 || level === 2 || level === 3 || level === 4))]
    : [];
  return {
    layout: LISTS.layout.includes(source.layout) ? source.layout : INITIAL_DISPLAY.layout,
    showCompleted: source.showCompleted === true,
    grouping: LISTS.grouping.includes(source.grouping) ? source.grouping : INITIAL_DISPLAY.grouping,
    sorting: LISTS.sorting.includes(source.sorting) ? source.sorting : INITIAL_DISPLAY.sorting,
    direction: source.direction === "desc" ? "desc" : "asc",
    date: LISTS.date.includes(source.date) ? source.date : "all",
    created: LISTS.created.includes(source.created) ? source.created : "all",
    priorities,
  };
};

const readAll = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const loadDisplay = (view) => {
  const saved = readAll()[viewStorageKey(view)];
  if (!saved) return { ...INITIAL_DISPLAY, priorities: [] };
  return sanitize(saved);
};

export const saveDisplay = (view, display) => {
  try {
    const all = readAll();
    all[viewStorageKey(view)] = sanitize(display);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* Storage can be unavailable. The choice still applies for this visit. */
  }
};

export const displayDelta = (display) => {
  let sort = 0;
  let filter = 0;
  let layout = 0;
  if (display.grouping !== FACTORY_DISPLAY.grouping) sort += 1;
  if (display.sorting !== FACTORY_DISPLAY.sorting) sort += 1;
  if (display.direction !== FACTORY_DISPLAY.direction) sort += 1;
  if (display.date !== FACTORY_DISPLAY.date) filter += 1;
  if (display.created !== FACTORY_DISPLAY.created) filter += 1;
  if (display.priorities.length > 0) filter += 1;
  if (display.layout !== FACTORY_DISPLAY.layout) layout += 1;
  if (display.showCompleted !== FACTORY_DISPLAY.showCompleted) layout += 1;
  return { sort, filter, layout, total: sort + filter + layout };
};
