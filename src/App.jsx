import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, Columns3, List, Menu, Plus } from "lucide-react";
import {
  fetchMe,
  findLegacyDocument,
  loadSnapshot,
  logoutAccount,
  saveSnapshot,
  watchRevisions,
} from "./api.js";
import { clearLegacyConnection, clearSession, getSession, saveSession } from "./auth.js";
import { clearTaskCache, readTaskCache, writeTaskCache } from "./cache.js";
import { AuthScreen } from "./components/AuthScreen.jsx";
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
  const [user, setUser] = useState(undefined);
  const [legacy, setLegacy] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const priorView = useRef({ kind: "today" });
  const firedReminders = useRef(new Set());
  const revisionRef = useRef(0);
  const savingRef = useRef(0);
  const docRef = useRef(null);
  const pendingRef = useRef(null);
  const pumpingRef = useRef(false);
  const userIdRef = useRef(null);
  const logoutRef = useRef(async () => {});
  const today = localISODate();

  const applySnapshot = useCallback((snapshot, userId) => {
    if (userIdRef.current !== userId) return;
    revisionRef.current = snapshot.revision;
    docRef.current = snapshot.document;
    setDoc(snapshot.document);
    writeTaskCache(userId, snapshot).catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    const userId = userIdRef.current;
    userIdRef.current = null;
    await logoutAccount().catch(() => undefined);
    clearSession();
    if (userId) await clearTaskCache(userId).catch(() => undefined);
    revisionRef.current = 0;
    docRef.current = null;
    pendingRef.current = null;
    setDoc(null);
    setLegacy(null);
    setSelectedId(null);
    setQuickAdd(null);
    setUser(null);
    setError("");
    setToast("");
  }, []);
  logoutRef.current = logout;

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    clearLegacyConnection();
    const session = getSession();
    if (!session) {
      setUser(null);
      return undefined;
    }
    userIdRef.current = session.user.id;
    setUser(session.user);
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled || userIdRef.current !== session.user.id) return;
        saveSession({ token: session.token, user: me });
        setUser(me);
      } catch (reason) {
        if (cancelled || userIdRef.current !== session.user.id) return;
        if (reason?.status === 401) await logoutRef.current();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    const userId = user.id;
    let cancelled = false;
    (async () => {
      const cached = await readTaskCache(userId);
      if (cancelled || userIdRef.current !== userId) return;
      if (cached && !docRef.current) {
        revisionRef.current = cached.revision;
        docRef.current = cached.document;
        setDoc(cached.document);
      }
      try {
        const snapshot = await loadSnapshot();
        if (cancelled || savingRef.current > 0 || pendingRef.current) return;
        applySnapshot(snapshot, userId);
        setError("");
        const previous = await findLegacyDocument(snapshot.document);
        if (!cancelled && userIdRef.current === userId) setLegacy(previous);
      } catch (reason) {
        if (cancelled || userIdRef.current !== userId) return;
        if (reason?.status === 401) {
          await logoutRef.current();
          return;
        }
        setError(
          docRef.current
            ? "Showing saved tasks. Could not refresh."
            : reason instanceof Error
              ? reason.message
              : "Could not load tasks",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applySnapshot, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const userId = user.id;
    const controller = new AbortController();
    const refresh = () => {
      if (savingRef.current > 0 || pendingRef.current) return;
      loadSnapshot()
        .then((snapshot) => {
          if (userIdRef.current !== userId || savingRef.current > 0 || pendingRef.current) return;
          if (snapshot.revision !== revisionRef.current) applySnapshot(snapshot, userId);
        })
        .catch((reason) => {
          if (reason?.status === 401) logoutRef.current();
        });
    };
    watchRevisions(controller.signal, (revision) => {
      if (revision === revisionRef.current || savingRef.current > 0) return;
      refresh();
    }, () => logoutRef.current());
    window.addEventListener("focus", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
    };
  }, [applySnapshot, user?.id]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== "taskman-session" || event.newValue) return;
      userIdRef.current = null;
      revisionRef.current = 0;
      docRef.current = null;
      pendingRef.current = null;
      setDoc(null);
      setLegacy(null);
      setSelectedId(null);
      setUser(null);
      setError("");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next) => {
    pendingRef.current = next;
    setDoc(next);
    if (pumpingRef.current) return;
    const pump = async () => {
      pumpingRef.current = true;
      while (pendingRef.current) {
        const toSave = pendingRef.current;
        pendingRef.current = null;
        savingRef.current += 1;
        try {
          const saved = await saveSnapshot(toSave, revisionRef.current);
          revisionRef.current = saved.revision;
          docRef.current = saved.document;
          if (userIdRef.current) writeTaskCache(userIdRef.current, saved).catch(() => undefined);
          if (!pendingRef.current) setDoc(saved.document);
          setError("");
        } catch (reason) {
          pendingRef.current = null;
          if (reason?.status === 401) {
            await logoutRef.current();
          } else if (reason?.status === 409 && reason.document) {
            revisionRef.current = reason.revision;
            docRef.current = reason.document;
            setDoc(reason.document);
            if (userIdRef.current) {
              writeTaskCache(userIdRef.current, {
                revision: reason.revision,
                document: reason.document,
              }).catch(() => undefined);
            }
            setToast("Updated on another device");
            setError("");
          } else {
            setDoc(docRef.current);
            setError(
              reason instanceof Error
                ? reason.message
                : "Could not reach TaskMan. This change was not saved.",
            );
          }
        } finally {
          savingRef.current -= 1;
        }
      }
      pumpingRef.current = false;
    };
    pump();
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
            new Notification("TaskMan", { body: task.title });
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

  const signIn = async (session) => {
    const cached = await readTaskCache(session.user.id);
    userIdRef.current = session.user.id;
    if (cached) {
      revisionRef.current = cached.revision;
      docRef.current = cached.document;
      setDoc(cached.document);
    } else {
      revisionRef.current = 0;
      docRef.current = null;
      setDoc(null);
    }
    setLegacy(null);
    setError("");
    setUser(session.user);
  };

  if (user === undefined) {
    return (
      <main className="grid h-full place-items-center text-sm text-stone-500">Loading tasks…</main>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={signIn} />;
  }

  if (!doc || !selection || !counts) {
    return (
      <main className="grid h-full place-items-center gap-3 px-6 text-center text-sm text-stone-500">
        <p>{error || "Loading tasks…"}</p>
        {error ? (
          <button type="button" onClick={logout} className="text-indigo-700">
            Log out
          </button>
        ) : null}
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
        mobileOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        accountName={user.username}
        onLogout={logout}
        onView={(next) => {
          changeView(next);
          setMenuOpen(false);
        }}
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
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-5 pb-4 md:px-8 md:pt-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-2 text-stone-600 hover:bg-stone-200/70 md:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-stone-900">
                {heading}
              </h1>
              <p className="text-sm text-stone-500">
                {selection.open.length} open
                {project?.archived ? " · Archived" : ""}
              </p>
            </div>
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
        {legacy ? (
          <div className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900 md:mx-8">
            <p>Tasks already on this computer can be copied to your account.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setLegacy(null)} className="px-2 py-1">
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  commit(legacy);
                  setLegacy(null);
                }}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-white"
              >
                Copy tasks
              </button>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="mx-4 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 md:mx-8">{error}</p>
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
