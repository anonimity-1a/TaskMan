import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, Columns3, List, Plus } from "lucide-react";
import { loadDocument, saveDocument } from "./api.js";
import { Board } from "./components/Board.jsx";
import { HelpDialog } from "./components/HelpDialog.jsx";
import { MonthBoard } from "./components/MonthBoard.jsx";
import { QuickAdd } from "./components/QuickAdd.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { TaskDetail } from "./components/TaskDetail.jsx";
import { TaskList } from "./components/TaskList.jsx";
import { localTime } from "./dates.js";
import {
  addComment,
  addFilter,
  addLabel,
  addProject,
  addSection,
  addTask,
  addTaskFromResolved,
  completeForever,
  cycleColor,
  deleteComment,
  deleteFilter,
  deleteLabel,
  deleteProject,
  deleteSection,
  deleteTask,
  dueReminders,
  duplicateTask,
  formatDue,
  localISODate,
  moveTaskToSection,
  projectById,
  renameLabel,
  renameProject,
  renameSection,
  reorderTask,
  setFilterColor,
  setLabelColor,
  setProjectArchived,
  setProjectColor,
  setProjectView,
  stampReminder,
  taskById,
  toggleFavorite,
  toggleTask,
  updateFilter,
  updateTask,
} from "./model.js";
import { countsFor, selectView } from "./query.js";

const titles = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
  completed: "Completed",
  search: "Search",
};

export function App() {
  const [doc, setDoc] = useState(null);
  const [view, setView] = useState({ kind: "today" });
  const [quickAdd, setQuickAdd] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [sort, setSort] = useState("priority");
  const [upcomingLayout, setUpcomingLayout] = useState("agenda");
  const [search, setSearch] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [help, setHelp] = useState(false);
  const [alertsGranted, setAlertsGranted] = useState(
    () => typeof Notification !== "undefined" && Notification.permission === "granted",
  );
  const searchRef = useRef(null);
  const priorView = useRef({ kind: "today" });
  const firedReminders = useRef(new Set());
  const today = localISODate();

  useEffect(() => {
    loadDocument()
      .then(setDoc)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load tasks"));
  }, []);

  const commit = useCallback(async (next) => {
    setDoc(next);
    try {
      const saved = await saveDocument(next);
      setDoc(saved);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save tasks");
    }
  }, []);

  const changeView = useCallback((next) => {
    setView((current) => {
      if (current.kind !== "search") priorView.current = current;
      return next;
    });
    if (next.kind !== "search") setSearch("");
    setSelectedId(null);
  }, []);

  const openQuickAdd = useCallback(
    (extra = {}) => {
      if (!doc) return;
      const projectId = extra.projectId ?? (view.kind === "project" ? view.id : "inbox");
      const labelIds = extra.labelIds ?? (view.kind === "label" ? [view.id] : []);
      const due = extra.due ?? (view.kind === "today" ? today : null);
      setQuickAdd({
        projectId,
        parentId: extra.parentId ?? null,
        labelIds,
        due,
        sectionId: extra.sectionId ?? null,
      });
    },
    [doc, today, view],
  );

  useEffect(() => {
    setSort(view.kind === "today" ? "priority" : view.kind === "upcoming" ? "date" : "manual");
    setUpcomingLayout("agenda");
  }, [view.kind, view.id]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (selectedId && doc && !doc.tasks.some((task) => task.id === selectedId)) {
      setSelectedId(null);
    }
  }, [doc, selectedId]);

  useEffect(() => {
    const onKey = (event) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openQuickAdd();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (quickAdd || typing) return;
        setHelp(false);
        setSelectedId(null);
      }
      if (event.key === "?" && !typing && !quickAdd) setHelp(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openQuickAdd, quickAdd]);

  useEffect(() => {
    if (!doc) return undefined;
    const check = () => {
      const now = new Date();
      const due = dueReminders(doc, localISODate(now), localTime(now)).filter((task) => {
        const key = `${task.id}:${task.due}T${task.reminder}`;
        return !firedReminders.current.has(key);
      });
      if (due.length === 0) return;
      for (const task of due) {
        firedReminders.current.add(`${task.id}:${task.due}T${task.reminder}`);
      }
      let next = doc;
      for (const task of due) next = stampReminder(next, task);
      setToast(`Reminder: ${due.map((task) => task.title).join(", ")}`);
      for (const task of due) {
        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Local Tasks", { body: task.title });
          }
        } catch {
          /* The in-app reminder still shows. */
        }
      }
      commit(next);
    };
    check();
    const timer = setInterval(check, 20000);
    return () => clearInterval(timer);
  }, [commit, doc]);

  const selection = useMemo(
    () => (doc ? selectView(doc, view, today, sort) : null),
    [doc, sort, today, view],
  );
  const counts = useMemo(() => (doc ? countsFor(doc, today) : null), [doc, today]);

  const handleToggle = (id) => {
    const task = taskById(doc, id);
    const next = toggleTask(doc, id);
    commit(next);
    if (task && !task.completed && task.recurrence && task.due) {
      const updated = next.tasks.find((item) => item.id === id);
      if (updated?.due) setToast(`Next due ${formatDue(updated.due, today)}`);
    }
  };

  if (!doc || !selection || !counts) {
    return (
      <main className="grid h-full place-items-center text-sm text-stone-500">
        {error || "Loading tasks…"}
      </main>
    );
  }

  const project = view.kind === "project" ? projectById(doc, view.id) : null;
  const filter = view.kind === "filter" ? doc.filters.find((item) => item.id === view.id) : null;
  const label = view.kind === "label" ? doc.labels.find((item) => item.id === view.id) : null;
  const selected = selectedId ? taskById(doc, selectedId) : null;
  const heading =
    project?.name ?? label?.name ?? filter?.name ?? titles[view.kind] ?? "Tasks";
  const board = view.kind === "project" && project?.view === "board";
  const month = view.kind === "upcoming" && upcomingLayout === "month";
  const emptyCopy = {
    inbox: "Inbox is empty. Add a task to start.",
    today: "Nothing due today.",
    upcoming: "No upcoming due dates.",
    completed: "No completed tasks yet.",
    project: "This project has no tasks.",
    label: "No tasks use this label.",
    filter: "Nothing matches this filter.",
    search: search.trim() ? "No matching tasks." : "Type to search tasks.",
  };

  return (
    <div className="relative flex h-full overflow-hidden">
      <Sidebar
        doc={doc}
        view={view}
        counts={counts}
        onView={changeView}
        onAddProject={(name) => commit(addProject(doc, name))}
        onRenameProject={(id, name) => commit(renameProject(doc, id, name))}
        onDeleteProject={(id) => {
          commit(deleteProject(doc, id));
          if (view.kind === "project" && view.id === id) changeView({ kind: "inbox" });
        }}
        onCycleProject={(item) => commit(setProjectColor(doc, item.id, cycleColor(item.color)))}
        onFavoriteProject={(id) => commit(toggleFavorite(doc, "project", id))}
        onAddLabel={(name) => commit(addLabel(doc, name))}
        onRenameLabel={(id, name) => commit(renameLabel(doc, id, name))}
        onDeleteLabel={(id) => {
          commit(deleteLabel(doc, id));
          if (view.kind === "label" && view.id === id) changeView({ kind: "inbox" });
        }}
        onCycleLabel={(item) => commit(setLabelColor(doc, item.id, cycleColor(item.color)))}
        onFavoriteLabel={(id) => commit(toggleFavorite(doc, "label", id))}
        onAddFilter={(name, query) => commit(addFilter(doc, name, query))}
        onRenameFilter={(id, name) => commit(updateFilter(doc, id, { name }))}
        onDeleteFilter={(id) => {
          commit(deleteFilter(doc, id));
          if (view.kind === "filter" && view.id === id) changeView({ kind: "inbox" });
        }}
        onCycleFilter={(item) => commit(setFilterColor(doc, item.id, cycleColor(item.color)))}
        onFavoriteFilter={(id) => commit(toggleFavorite(doc, "filter", id))}
      />
      <main className="relative flex min-w-0 flex-1 flex-col bg-stone-50">
        <header className="flex flex-wrap items-center justify-between gap-3 px-8 pt-6 pb-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-stone-900">
              {heading}
            </h1>
            <p className="text-sm text-stone-500">
              {selection.open.length} open
              {project?.archived ? " · Archived" : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Search</span>
              <input
                ref={searchRef}
                value={search}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearch(value);
                  if (value.trim()) changeView({ kind: "search", query: value });
                  else changeView(priorView.current.kind === "search" ? { kind: "inbox" } : priorView.current);
                }}
                placeholder="Search"
                className="w-40 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
              />
            </label>
            {view.kind === "project" && project ? (
              <div className="flex rounded-lg bg-stone-200/70 p-0.5">
                <button
                  type="button"
                  aria-label="List"
                  aria-pressed={project.view !== "board"}
                  onClick={() => commit(setProjectView(doc, project.id, "list"))}
                  className={`rounded-md px-2 py-1.5 ${project.view !== "board" ? "bg-white text-stone-800" : "text-stone-500"}`}
                >
                  <List className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Board"
                  aria-pressed={project.view === "board"}
                  onClick={() => commit(setProjectView(doc, project.id, "board"))}
                  className={`rounded-md px-2 py-1.5 ${project.view === "board" ? "bg-white text-stone-800" : "text-stone-500"}`}
                >
                  <Columns3 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
            {view.kind === "upcoming" ? (
              <div className="flex rounded-lg bg-stone-200/70 p-0.5 text-sm">
                <button
                  type="button"
                  aria-pressed={upcomingLayout === "agenda"}
                  onClick={() => setUpcomingLayout("agenda")}
                  className={`rounded-md px-2 py-1 ${upcomingLayout === "agenda" ? "bg-white text-stone-800" : "text-stone-500"}`}
                >
                  Agenda
                </button>
                <button
                  type="button"
                  aria-pressed={upcomingLayout === "month"}
                  onClick={() => setUpcomingLayout("month")}
                  className={`rounded-md px-2 py-1 ${upcomingLayout === "month" ? "bg-white text-stone-800" : "text-stone-500"}`}
                >
                  Month
                </button>
              </div>
            ) : null}
            {project ? (
              <button
                type="button"
                onClick={() => commit(setProjectArchived(doc, project.id, !project.archived))}
                className="rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-200/70"
              >
                {project.archived ? "Unarchive" : "Archive"}
              </button>
            ) : null}
            {!month ? (
              <select
                aria-label="Sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm text-stone-700"
              >
                <option value="manual">Manual</option>
                <option value="priority">Priority</option>
                <option value="date">Date</option>
                <option value="name">Name</option>
              </select>
            ) : null}
            <button
              type="button"
              aria-label="Help"
              onClick={() => setHelp(true)}
              className="rounded-lg p-2 text-stone-500 hover:bg-stone-200/70"
            >
              <CircleHelp className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => openQuickAdd()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="size-4" aria-hidden="true" />
              Quick add
            </button>
          </div>
        </header>
        {filter ? (
          <form
            className="mx-8 mb-3"
            onSubmit={(event) => {
              event.preventDefault();
              const field = event.currentTarget.elements.namedItem("query");
              commit(updateFilter(doc, filter.id, { query: field.value }));
            }}
          >
            <input
              name="query"
              key={`${filter.id}:${filter.query}`}
              defaultValue={filter.query}
              aria-label="Filter query"
              onBlur={(event) => commit(updateFilter(doc, filter.id, { query: event.target.value }))}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </form>
        ) : null}
        {project ? (
          <form
            className="mx-8 mb-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              commit(addSection(doc, project.id, sectionName));
              setSectionName("");
            }}
          >
            <input
              value={sectionName}
              onChange={(event) => setSectionName(event.target.value)}
              placeholder="Add section"
              aria-label="Add section"
              className="w-56 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <button type="submit" className="rounded-lg px-2 text-sm text-indigo-700">
              Add section
            </button>
          </form>
        ) : null}
        {error ? (
          <p className="mx-8 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        <div
          className={`mx-8 mb-8 min-h-0 flex-1 rounded-2xl border border-stone-200 bg-white shadow-sm ${
            board || month ? "overflow-hidden p-3" : "overflow-y-auto px-4 py-3"
          }`}
        >
          {board ? (
            <Board
              doc={doc}
              today={today}
              selection={selection}
              selectedId={selectedId}
              onOpen={(task) => setSelectedId(task.id)}
              onToggle={handleToggle}
              onMoveSection={(id, sectionId) => commit(moveTaskToSection(doc, id, sectionId))}
              onAddInSection={(sectionId) => openQuickAdd({ sectionId, projectId: project.id })}
              onRenameSection={(id, name) => commit(renameSection(doc, id, name))}
              onDeleteSection={(id) => commit(deleteSection(doc, id))}
            />
          ) : month ? (
            <MonthBoard
              doc={doc}
              today={today}
              onOpen={(task) => setSelectedId(task.id)}
              onToggle={handleToggle}
            />
          ) : (
            <TaskList
              doc={doc}
              today={today}
              selection={selection}
              empty={emptyCopy[view.kind] ?? "Nothing here."}
              selectedId={selectedId}
              onOpen={(task) => setSelectedId(task.id)}
              onToggle={handleToggle}
              onDelete={(id) => {
                commit(deleteTask(doc, id));
                if (selectedId === id) setSelectedId(null);
              }}
              onMoveSection={
                view.kind === "project"
                  ? (id, sectionId) => commit(moveTaskToSection(doc, id, sectionId))
                  : undefined
              }
              onReorder={
                view.kind === "project" || view.kind === "inbox"
                  ? (draggedId, targetId) => commit(reorderTask(doc, draggedId, targetId))
                  : undefined
              }
              onRenameSection={
                view.kind === "project"
                  ? (id, name) => commit(renameSection(doc, id, name))
                  : undefined
              }
              onDeleteSection={
                view.kind === "project" ? (id) => commit(deleteSection(doc, id)) : undefined
              }
              onAddInSection={
                view.kind === "project"
                  ? (sectionId) => openQuickAdd({ sectionId, projectId: project.id })
                  : undefined
              }
            />
          )}
        </div>
        {selected ? (
          <TaskDetail
            key={selected.id}
            doc={doc}
            task={selected}
            alertsGranted={alertsGranted}
            onClose={() => setSelectedId(null)}
            onOpen={(task) => setSelectedId(task.id)}
            onPatch={(patch) => commit(updateTask(doc, selected.id, patch))}
            onToggle={handleToggle}
            onDelete={() => {
              commit(deleteTask(doc, selected.id));
              setSelectedId(null);
            }}
            onDuplicate={() => {
              const before = new Set(doc.tasks.map((item) => item.id));
              const next = duplicateTask(doc, selected.id);
              commit(next);
              const created = next.tasks.find((item) => !before.has(item.id) && !item.parentId);
              if (created) setSelectedId(created.id);
            }}
            onCompleteForever={() => commit(completeForever(doc, selected.id))}
            onAddSubtask={(title) =>
              commit(addTask(doc, { title, parentId: selected.id, projectId: selected.projectId }))
            }
            onAddComment={(body) => commit(addComment(doc, selected.id, body))}
            onDeleteComment={(id) => commit(deleteComment(doc, id))}
            onAllowAlerts={async () => {
              if (typeof Notification === "undefined") return;
              const result = await Notification.requestPermission();
              setAlertsGranted(result === "granted");
            }}
          />
        ) : null}
      </main>
      {quickAdd ? (
        <QuickAdd
          doc={doc}
          today={today}
          defaults={quickAdd}
          onClose={() => setQuickAdd(null)}
          onSubmit={(resolved) => {
            const next = addTaskFromResolved(doc, resolved);
            if (next !== doc) commit(next);
            setQuickAdd(null);
          }}
        />
      ) : null}
      {help ? <HelpDialog onClose={() => setHelp(false)} /> : null}
      {toast ? (
        <p
          role="status"
          className="fixed bottom-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
