import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { COLOR_STYLES, taskById } from "../model.js";

export function QuickAdd({ doc, defaults, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaults.projectId);
  const [due, setDue] = useState(defaults.due ?? "");
  const [labelIds, setLabelIds] = useState(defaults.labelIds ?? []);
  const parent = defaults.parentId ? taskById(doc, defaults.parentId) : null;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggleLabel = (id) => {
    setLabelIds((current) =>
      current.includes(id)
        ? current.filter((labelId) => labelId !== id)
        : [...current, id],
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-stone-900/30" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-labelledby="quick-add-title"
        className="mx-auto mt-24 w-[min(36rem,calc(100%-2rem))] rounded-2xl bg-white p-4 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            title,
            projectId,
            parentId: defaults.parentId ?? null,
            due: due || null,
            labelIds,
          });
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quick-add-title" className="text-sm font-semibold text-stone-800">
            Quick add
          </h2>
          <button
            type="button"
            aria-label="Close quick add"
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100"
          >
            <X className="size-4" />
          </button>
        </div>
        {parent ? (
          <p className="mb-2 text-xs text-stone-500">Subtask of {parent.title}</p>
        ) : null}
        <input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task name"
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-base outline-none focus:border-indigo-400"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs text-stone-500">
            Project
            <select
              value={projectId}
              disabled={Boolean(parent)}
              onChange={(event) => setProjectId(event.target.value)}
              className="ml-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-sm text-stone-800"
            >
              {doc.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Due
            <input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              className="ml-2 rounded-md border border-stone-200 px-2 py-1 text-sm text-stone-800"
            />
          </label>
        </div>
        {doc.labels.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.labels.map((label) => {
              const selected = labelIds.includes(label.id);
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleLabel(label.id)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    selected ? styles.chip : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add task
          </button>
        </div>
      </form>
    </div>
  );
}
