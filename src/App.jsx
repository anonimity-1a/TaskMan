import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { loadDocument, saveDocument } from "./api.js";
import { QuickAdd } from "./components/QuickAdd.jsx";
import { Sidebar } from "./components/Sidebar.jsx";
import { TaskList } from "./components/TaskList.jsx";
import {
  INBOX_ID,
  addLabel,
  addProject,
  addTask,
  deleteLabel,
  deleteProject,
  deleteTask,
  localISODate,
  renameLabel,
  renameProject,
  selectView,
  toggleTask,
  updateTask,
} from "./model.js";

const titles = {
  inbox: "Inbox",
  today: "Today",
  upcoming: "Upcoming",
};

const emptyCopy = {
  inbox: "Inbox is empty. Add a task to start.",
  today: "Nothing due today.",
  upcoming: "No upcoming due dates.",
  project: "This project has no tasks.",
  label: "No tasks use this label.",
};

export function App() {
  const [doc, setDoc] = useState(null);
  const [view, setView] = useState({ kind: "today" });
  const [quickAdd, setQuickAdd] = useState(null);
  const [error, setError] = useState("");
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

  const openQuickAdd = useCallback(
    (extra = {}) => {
      if (!doc) return;
      const projectId =
        extra.projectId ??
        (view.kind === "project" ? view.id : INBOX_ID);
      const labelIds =
        extra.labelIds ?? (view.kind === "label" ? [view.id] : []);
      const due = extra.due ?? (view.kind === "today" ? today : null);
      setQuickAdd({
        projectId,
        parentId: extra.parentId ?? null,
        labelIds,
        due,
      });
    },
    [doc, today, view],
  );

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openQuickAdd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openQuickAdd]);

  const selection = useMemo(
    () => (doc ? selectView(doc, view, today) : null),
    [doc, today, view],
  );

  if (!doc || !selection) {
    return (
      <main className="grid h-full place-items-center text-sm text-stone-500">
        {error || "Loading tasks…"}
      </main>
    );
  }

  const counts = {
    inbox: doc.tasks.filter(
      (task) => !task.completed && task.parentId === null && task.projectId === INBOX_ID,
    ).length,
    today: doc.tasks.filter(
      (task) => !task.completed && task.due && task.due <= today,
    ).length,
    upcoming: doc.tasks.filter(
      (task) => !task.completed && task.due && task.due > today,
    ).length,
    projects: Object.fromEntries(
      doc.projects.map((project) => [
        project.id,
        doc.tasks.filter(
          (task) =>
            !task.completed && task.parentId === null && task.projectId === project.id,
        ).length,
      ]),
    ),
    labels: Object.fromEntries(
      doc.labels.map((label) => [
        label.id,
        doc.tasks.filter(
          (task) => !task.completed && task.labelIds.includes(label.id),
        ).length,
      ]),
    ),
  };

  const heading =
    view.kind === "project"
      ? doc.projects.find((project) => project.id === view.id)?.name ?? "Project"
      : view.kind === "label"
        ? doc.labels.find((label) => label.id === view.id)?.name ?? "Label"
        : titles[view.kind];

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar
        doc={doc}
        view={view}
        counts={counts}
        onView={setView}
        onAddProject={(name) => commit(addProject(doc, name))}
        onRenameProject={(id, name) => commit(renameProject(doc, id, name))}
        onDeleteProject={(id) => {
          commit(deleteProject(doc, id));
          if (view.kind === "project" && view.id === id) setView({ kind: "inbox" });
        }}
        onAddLabel={(name) => commit(addLabel(doc, name))}
        onRenameLabel={(id, name) => commit(renameLabel(doc, id, name))}
        onDeleteLabel={(id) => {
          commit(deleteLabel(doc, id));
          if (view.kind === "label" && view.id === id) setView({ kind: "inbox" });
        }}
      />
      <main className="flex min-w-0 flex-1 flex-col bg-stone-50">
        <header className="flex items-center justify-between px-8 pt-6 pb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              {heading}
            </h1>
            <p className="text-sm text-stone-500">
              {selection.open.length} open
            </p>
          </div>
          <button
            type="button"
            onClick={() => openQuickAdd()}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            Quick add
          </button>
        </header>
        {error ? (
          <p className="mx-8 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <div className="mx-8 mb-8 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <TaskList
            doc={doc}
            today={today}
            selection={selection}
            empty={emptyCopy[view.kind]}
            onToggle={(id) => commit(toggleTask(doc, id))}
            onRename={(id, title) => commit(updateTask(doc, id, { title }))}
            onDue={(id, due) => commit(updateTask(doc, id, { due }))}
            onDelete={(id) => commit(deleteTask(doc, id))}
            onAddSubtask={(task) =>
              openQuickAdd({
                parentId: task.id,
                projectId: task.projectId,
                labelIds: task.labelIds,
              })
            }
          />
        </div>
      </main>
      {quickAdd ? (
        <QuickAdd
          doc={doc}
          defaults={quickAdd}
          onClose={() => setQuickAdd(null)}
          onSubmit={(input) => {
            const next = addTask(doc, input);
            if (next !== doc) commit(next);
            setQuickAdd(null);
          }}
        />
      ) : null}
    </div>
  );
}
