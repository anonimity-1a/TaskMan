import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Download, Menu, MoreHorizontal, Upload } from "lucide-react";
import {
  deleteAccount,
  fetchMe,
  findLegacyDocument,
  loadSnapshot,
  logoutAccount,
  saveSnapshot,
  updateAccount,
  watchRevisions,
} from "./api.js";
import { clearLegacyConnection, clearSession, getSession, saveSession } from "./auth.js";
import { clearTaskCache, readTaskCache, writeTaskCache } from "./cache.js";
import { AuthScreen } from "./components/AuthScreen.jsx";
import { Board } from "./components/Board.jsx";
import { BrowseView } from "./components/BrowseView.jsx";
import { DisplayMenu } from "./components/DisplayMenu.jsx";
import { HelpDialog } from "./components/HelpDialog.jsx";
import { MonthBoard } from "./components/MonthBoard.jsx";
import { QuickAdd } from "./components/QuickAdd.jsx";
import { SettingsDialog } from "./components/SettingsDialog.jsx";
import { ReportingView } from "./components/ReportingView.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { TaskDetail } from "./components/TaskDetail.jsx";
import { TaskList } from "./components/TaskList.jsx";
import { exportTodoistCsv, importTodoistCsv } from "./csv.js";
import { loadDisplay, saveDisplay } from "./display.js";
import { automaticReminder, localTime, setDatePrefs } from "./dates.js";
import { applyTheme, clearSettings, loadSettings, playCompleteSound, saveSettings } from "./settings.js";
import { applyPriorityShorthand, parseQuickAdd } from "./parse.js";
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
  projectById,
  renameLabel,
  renameProject,
  renameSection,
  reorderTask,
  setProjectArchived,
  setProjectColor,
  setProjectParent,
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
  browse: "Filters & Labels",
  reporting: "Reporting",
};

const eyebrows = {
  inbox: "Capture",
  upcoming: "Ahead",
  completed: "Done",
  search: "Search results",
  browse: "Library",
  reporting: "Overview",
  project: "Project",
  label: "Label",
  filter: "Saved filter",
};

export function App() {
  const [doc, setDoc] = useState(null);
  const [settings, setSettings] = useState(() => {
    const initial = loadSettings(getSession()?.user?.id);
    applyTheme(initial);
    return initial;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState(() => ({ kind: loadSettings(getSession()?.user?.id).homeView }));
  const [quickAdd, setQuickAdd] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [display, setDisplay] = useState(() => loadDisplay({ kind: "inbox" }));
  const [search, setSearch] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [dataMenu, setDataMenu] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [help, setHelp] = useState(false);
  const [alertsGranted, setAlertsGranted] = useState(
    () => typeof Notification !== "undefined" && Notification.permission === "granted",
  );
  const [user, setUser] = useState(undefined);
  const [legacy, setLegacy] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.matchMedia("(min-width: 768px)").matches);
  const searchRef = useRef(null);
  const importRef = useRef(null);
  const priorView = useRef({ kind: "inbox" });
  const firedReminders = useRef(new Set());
  const revisionRef = useRef(0);
  const savingRef = useRef(0);
  const docRef = useRef(null);
  const pendingRef = useRef(null);
  const pumpingRef = useRef(false);
  const userIdRef = useRef(null);
  const logoutRef = useRef(async () => {});
  const chordRef = useRef("");
  setDatePrefs(settings);
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
    if (!user?.id) return;
    const next = loadSettings(user.id);
    setSettings(next);
    applyTheme(next);
  }, [user?.id]);

  useEffect(() => {
    applyTheme(settings);
    if (settings.appearance !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(settings);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings]);

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
    setDisplay(loadDisplay(view));
    setMoreOpen(false);
    setDataMenu(false);
  }, [view.kind, view.id]);

  const updateDisplay = (next) => {
    setDisplay(next);
    saveDisplay(view, next);
  };

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
        setSidebarOpen(true);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        if (quickAdd || typing) return;
        setHelp(false);
        setSettingsOpen(false);
        setSelectedId(null);
      }
      if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const key = event.key.toLowerCase();
        if (chordRef.current === "o" && key === "s") {
          event.preventDefault();
          setSettingsOpen(true);
          chordRef.current = "";
          return;
        }
        chordRef.current = key === "o" ? "o" : "";
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
          if (
            settings.reminders.desktop &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
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
  }, [commit, doc, settings.reminders.desktop]);

  const selection = useMemo(
    () => (doc ? selectView(doc, view, today, display) : null),
    [doc, display, today, view],
  );
  const counts = useMemo(() => (doc ? countsFor(doc, today) : null), [doc, today]);

  const handleToggle = (id) => {
    const task = taskById(doc, id);
    if (task && !task.completed && settings.soundDesktop) playCompleteSound();
    const next = toggleTask(doc, id, { resetSubtasks: settings.resetSubtasks });
    commit(next);
    if (task && !task.completed && task.recurrence && task.due) {
      const updated = next.tasks.find((item) => item.id === id);
      if (updated?.due) setToast(`Next due ${formatDue(updated.due, today)}`);
    }
  };

  const addFromTitle = (title, group) => {
    const parsed = parseQuickAdd(title, doc, today);
    if (!parsed.title) return;
    const add = group?.add ?? {};
    const projectId =
      add.projectId ?? (view.kind === "project" ? view.id : (parsed.projectId ?? "inbox"));
    const labelIds = [
      ...new Set([
        ...(parsed.labelIds ?? []),
        ...(add.labelIds ?? []),
        ...(view.kind === "label" ? [view.id] : []),
      ]),
    ];
    const next = addTaskFromResolved(doc, {
      title: parsed.title,
      projectId,
      due: parsed.due ?? ("due" in add ? add.due : view.kind === "today" ? today : null),
      dueTime: parsed.dueTime ?? null,
      priority: parsed.priority ?? add.priority ?? 4,
      recurrence: parsed.recurrence ?? null,
      labelIds,
      newLabels: parsed.newLabels ?? [],
      parentId: null,
      sectionId: "sectionId" in add ? add.sectionId : null,
      description: "",
      deadline: "deadline" in add ? add.deadline : null,
      reminder: automaticReminder(parsed.dueTime, settings.reminders.automatic),
    });
    if (next !== doc) commit(next);
  };

  const moveToGroup = (id, group) => {
    const task = taskById(doc, id);
    if (!task || !group?.add) return;
    const add = group.add;
    const patch = {};
    if ("priority" in add) patch.priority = add.priority;
    if ("sectionId" in add) patch.sectionId = add.sectionId;
    if ("due" in add) patch.due = add.due;
    if ("deadline" in add) patch.deadline = add.deadline;
    if (add.projectId && add.projectId !== task.projectId) patch.projectId = add.projectId;
    if (add.labelIds?.length) {
      patch.labelIds = [...new Set([...task.labelIds, ...add.labelIds])];
    }
    if (Object.keys(patch).length === 0) return;
    commit(updateTask(doc, id, patch));
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
      <main className="grid h-full place-items-center text-sm text-neutral-400">Loading tasks…</main>
    );
  }

  if (!user) {
    return <AuthScreen onAuth={signIn} />;
  }

  if (!doc || !selection || !counts) {
    return (
      <main className="grid h-full place-items-center gap-3 px-6 text-center text-sm text-neutral-400">
        <p>{error || "Loading tasks…"}</p>
        {error ? (
          <button type="button" onClick={logout} className="text-[var(--accent-text)]">
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
  const eyebrow =
    view.kind === "today"
      ? new Date(`${today}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
      : eyebrows[view.kind] ?? "View";
  const openCount = view.kind === "browse" || view.kind === "reporting" ? null : selection.open.length;
  const board = display.layout === "board" && view.kind !== "browse" && view.kind !== "reporting";
  const month = display.layout === "calendar" && view.kind !== "browse" && view.kind !== "reporting";
  const sequence = selection.visible ?? [];
  const selectedIndex = sequence.findIndex((task) => task.id === selectedId);
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

  const runSearch = (value) => {
    setSearch(value);
    if (value.trim()) changeView({ kind: "search", query: value });
    else changeView(priorView.current.kind === "search" ? { kind: "inbox" } : priorView.current);
  };

  return (
    <div className="relative flex h-full overflow-hidden bg-[var(--canvas)] text-neutral-100">
      {sidebarOpen ? (
        <div className="fixed inset-y-0 left-0 z-40 flex md:static">
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">
            <Sidebar
              doc={doc}
              view={view}
              counts={counts}
              search={search}
              searchRef={searchRef}
              onSearch={runSearch}
              accountName={user.username}
              avatar={settings.avatar}
              showCounts={settings.showCounts}
              sidebarItems={settings.sidebar}
              onOpenSettings={() => setSettingsOpen(true)}
              onLogout={logout}
              onClose={() => setSidebarOpen(false)}
              onQuickAdd={() => openQuickAdd()}
              onHelp={() => setHelp(true)}
              onView={(next) => changeView(next)}
              onAddProject={(input) => {
                const next = addProject(doc, input);
                if (next === doc) return;
                const created = next.projects.find((item) => !doc.projects.some((project) => project.id === item.id));
                commit(next);
                if (!created) return;
                const nextView = { kind: "project", id: created.id };
                saveDisplay(nextView, { ...loadDisplay(nextView), layout: created.view === "calendar" ? "calendar" : created.view === "board" ? "board" : "list" });
                changeView(nextView);
              }}
              onRenameProject={(id, name) => commit(renameProject(doc, id, name))}
              onDeleteProject={(id) => {
                commit(deleteProject(doc, id));
                if (view.kind === "project" && view.id === id) changeView({ kind: "inbox" });
              }}
              onParentProject={(id, parentId) => commit(setProjectParent(doc, id, parentId))}
              onCycleProject={(id) => {
                const item = projectById(doc, id);
                if (item) commit(setProjectColor(doc, id, cycleColor(item.color)));
              }}
              onFavoriteProject={(id) => commit(toggleFavorite(doc, "project", id))}
              teams={settings.teams ?? []}
            />
          </div>
        </div>
      ) : null}
      <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--canvas)]">
        <header className="tm-rule mx-4 flex items-end justify-between gap-4 border-b pt-8 pb-5 md:mx-10">
          <div className="flex min-w-0 items-end gap-3">
            {sidebarOpen ? null : (
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setSidebarOpen(true)}
                className="tm-rule mb-0.5 rounded-md border p-2 text-neutral-300 hover:bg-white/5"
              >
                <Menu className="size-5" />
              </button>
            )}
            <div className="min-w-0">
              <p className="tm-eyebrow mb-2 flex items-center gap-2">
                <span>{eyebrow}</span>
                {openCount != null ? (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="text-[var(--mark)]">{openCount} open</span>
                  </>
                ) : null}
                {project?.archived ? (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="text-[var(--warn)]">Archived</span>
                  </>
                ) : null}
              </p>
              <h1 className="tm-title truncate">{heading}</h1>
              {project?.description ? <p className="mt-1.5 truncate text-sm text-neutral-400">{project.description}</p> : null}
            </div>
          </div>
          {view.kind === "browse" || view.kind === "reporting" ? null : (
            <div className="tm-rule flex shrink-0 items-center gap-0.5 rounded-lg border bg-white/[0.02] p-0.5">
              <DisplayMenu display={display} onChange={updateDisplay} />
              <span className="tm-rule h-5 border-l" aria-hidden="true" />
              <div className="relative">
                <button
                  type="button"
                  aria-label="More view options"
                  onClick={() => setMoreOpen((value) => !value)}
                  className="rounded-md p-2 text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {moreOpen ? (
                  <div className="tm-surface absolute top-full right-0 z-20 mt-2 w-56 rounded-lg py-1 text-sm">
                    {project ? (
                      <button
                        type="button"
                        onClick={() => {
                          commit(setProjectArchived(doc, project.id, !project.archived));
                          setMoreOpen(false);
                        }}
                        className="block w-full px-3 py-1.5 text-left hover:bg-white/5"
                      >
                        {project.archived ? "Unarchive project" : "Archive project"}
                      </button>
                    ) : null}
                    {project ? (
                      <form
                        className="mx-2 my-1 flex gap-1"
                        onSubmit={(event) => {
                          event.preventDefault();
                          commit(addSection(doc, project.id, sectionName));
                          setSectionName("");
                          setMoreOpen(false);
                        }}
                      >
                        <input
                          value={sectionName}
                          onChange={(event) => setSectionName(event.target.value)}
                          placeholder="Add section"
                          aria-label="Add section"
                          className="tm-rule w-full rounded-md border bg-[var(--field)] px-2 py-1.5 outline-none focus:border-[var(--accent)]"
                        />
                      </form>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setHelp(true);
                        setMoreOpen(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left hover:bg-white/5"
                    >
                      Help
                    </button>
                    <div
                      className="relative"
                      onMouseEnter={() => setDataMenu(true)}
                      onMouseLeave={() => setDataMenu(false)}
                    >
                      <button
                        type="button"
                        aria-expanded={dataMenu}
                        onClick={() => setDataMenu(true)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5"
                      >
                        Manage data
                        <ChevronRight className="ml-auto size-4 text-neutral-500" />
                      </button>
                      {dataMenu ? (
                        <div className="tm-surface absolute top-0 right-[calc(100%-8px)] z-30 w-52 rounded-lg py-1">
                          <button
                            type="button"
                            onClick={() => importRef.current?.click()}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5"
                          >
                            <Download className="size-4 text-neutral-400" />
                            Import from CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const projectId = view.kind === "project" ? view.id : "inbox";
                              const csv = exportTodoistCsv(doc, projectId);
                              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement("a");
                              const safeName = (project?.name ?? heading).replace(/[^\w.-]+/g, "-");
                              link.href = url;
                              link.download = `${safeName || "tasks"}.csv`;
                              link.click();
                              URL.revokeObjectURL(url);
                              setMoreOpen(false);
                              setDataMenu(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5"
                          >
                            <Upload className="size-4 text-neutral-400" />
                            Export to CSV
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <input
                  ref={importRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    setMoreOpen(false);
                    setDataMenu(false);
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const projectId = view.kind === "project" ? view.id : "inbox";
                      const result = importTodoistCsv(doc, text, { projectId, today });
                      if (result.error) {
                        setToast(result.error);
                        return;
                      }
                      commit(result.doc);
                      const destination = doc.projects.find((item) => item.id === projectId)?.name ?? "Inbox";
                      const sectionText = result.sections ? ` and ${result.sections} section${result.sections === 1 ? "" : "s"}` : "";
                      setToast(`Imported ${result.count} task${result.count === 1 ? "" : "s"}${sectionText} into ${destination}.`);
                    } catch {
                      setToast("That file could not be read.");
                    }
                  }}
                />
              </div>
            </div>
          )}
        </header>
        {filter ? (
          <form
            className="mx-4 mt-4 md:mx-10"
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
              className="tm-mono tm-rule w-full rounded-md border bg-[var(--field)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
            />
          </form>
        ) : null}
        {legacy ? (
          <div className="tm-toast mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/5 px-4 py-2.5 text-sm md:mx-10">
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
                className="tm-btn bg-[var(--accent)] px-3 py-1 font-medium text-[var(--on-accent)]"
              >
                Copy tasks
              </button>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="mx-4 mt-4 rounded-md border-l-[3px] border-[var(--danger)] bg-[var(--danger)]/10 px-4 py-2.5 text-sm text-neutral-100 md:mx-10">{error}</p>
        ) : null}
        <div className={`min-h-0 flex-1 px-4 pt-5 pb-8 md:px-10 ${board || month ? "overflow-hidden" : "overflow-y-auto"}`}>
          {view.kind === "browse" ? (
            <BrowseView
              doc={doc}
              counts={counts}
              onOpenLabel={(id) => changeView({ kind: "label", id })}
              onOpenFilter={(id) => changeView({ kind: "filter", id })}
              onOpenCompleted={() => changeView({ kind: "completed" })}
              onAddLabel={(name) => commit(addLabel(doc, name))}
              onDeleteLabel={(id) => {
                commit(deleteLabel(doc, id));
                if (view.kind === "label" && view.id === id) changeView({ kind: "browse" });
              }}
              onAddFilter={(name, query) => commit(addFilter(doc, name, query))}
              onDeleteFilter={(id) => {
                commit(deleteFilter(doc, id));
                if (view.kind === "filter" && view.id === id) changeView({ kind: "browse" });
              }}
              onRenameLabel={(id, name) => commit(renameLabel(doc, id, name))}
              onRenameFilter={(id, name) => commit(updateFilter(doc, id, { name }))}
            />
          ) : view.kind === "reporting" ? (
            <ReportingView doc={doc} counts={counts} />
          ) : board ? (
            <Board
              doc={doc}
              today={today}
              selection={selection}
              selectedId={selectedId}
              onOpen={(task) => setSelectedId(task.id)}
              onToggle={handleToggle}
              onMoveToGroup={moveToGroup}
              onAddTask={addFromTitle}
              onRenameSection={(id, name) => commit(renameSection(doc, id, name))}
              onDeleteSection={(id) => commit(deleteSection(doc, id))}
            />
          ) : month ? (
            <MonthBoard
              tasks={selection.visible}
              today={today}
              weekStart={settings.weekStart}
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
              showCompleted={display.showCompleted}
              onOpen={(task) => setSelectedId(task.id)}
              onToggle={handleToggle}
              onDelete={(id) => {
                commit(deleteTask(doc, id));
                if (selectedId === id) setSelectedId(null);
              }}
              onReorder={
                (view.kind === "project" || view.kind === "inbox") && display.sorting === "default"
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
              onAddTask={addFromTitle}
            />
          )}
        </div>
        {selected ? (
          <TaskDetail
            key={selected.id}
            doc={doc}
            task={selected}
            accountName={user.username}
            alertsGranted={alertsGranted}
            hasPrev={selectedIndex > 0}
            hasNext={selectedIndex >= 0 && selectedIndex < sequence.length - 1}
            onPrev={() => {
              if (selectedIndex > 0) setSelectedId(sequence[selectedIndex - 1].id);
            }}
            onNext={() => {
              if (selectedIndex >= 0 && selectedIndex < sequence.length - 1) {
                setSelectedId(sequence[selectedIndex + 1].id);
              }
            }}
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
            onAddSubtask={(title) => {
              const applied = applyPriorityShorthand(title);
              if (!applied.title) return;
              commit(
                addTask(doc, {
                  title: applied.title,
                  priority: applied.priority ?? 4,
                  parentId: selected.id,
                  projectId: selected.projectId,
                }),
              );
            }}
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
          settings={settings}
          defaults={quickAdd}
          onClose={() => setQuickAdd(null)}
          onSubmit={(resolved) => {
            const next = addTaskFromResolved(doc, resolved);
            if (next !== doc) commit(next);
            setQuickAdd(null);
          }}
        />
      ) : null}
      {settingsOpen ? (
        <SettingsDialog
          user={user}
          settings={settings}
          doc={doc}
          onChange={(next) => setSettings(saveSettings(user.id, next))}
          onClose={() => setSettingsOpen(false)}
          onUpdateAccount={async (patch) => {
            const nextUser = await updateAccount(patch);
            setUser(nextUser);
            return nextUser;
          }}
          onDeleteAccount={async (password) => {
            await deleteAccount(password);
            clearSettings(user.id);
            await logout();
          }}
          onReload={async () => {
            const snapshot = await loadSnapshot();
            applySnapshot(snapshot, user.id);
            setToast("Reloaded the latest tasks.");
          }}
          onHelp={() => {
            setSettingsOpen(false);
            setHelp(true);
          }}
          onTestReminder={(kind) => {
            const body = kind === "mobile" ? "Mobile test reminder" : "Web test reminder";
            setToast(body);
            if (settings.reminders.desktop && typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification("TaskMan", { body: "Get groceries" });
              } catch {
                /* The in-app reminder still shows. */
              }
            }
          }}
          alertsGranted={alertsGranted}
          onAllowAlerts={async () => {
            if (typeof Notification === "undefined") return;
            const result = await Notification.requestPermission();
            setAlertsGranted(result === "granted");
          }}
          onDetachTeam={(teamId) => {
            commit({
              ...doc,
              projects: doc.projects.map((project) =>
                project.teamId === teamId ? { ...project, teamId: null } : project,
              ),
            });
          }}
        />
      ) : null}
      {help ? <HelpDialog onClose={() => setHelp(false)} /> : null}
      {toast ? (
        <p
          role="status"
          className="tm-surface tm-toast fixed right-5 bottom-5 z-50 max-w-sm rounded-md px-4 py-3 text-sm text-neutral-100"
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
