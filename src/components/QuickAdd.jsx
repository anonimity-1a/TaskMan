import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  COLOR_STYLES,
  describeRecurrence,
  formatWhen,
  projectById,
  recurrenceFromKey,
  recurrenceKey,
  taskById,
} from "../model.js";
import { resolveQuickAdd } from "../parse.js";

const PRIORITIES = [1, 2, 3, 4];

export function QuickAdd({ doc, defaults, today, onClose, onSubmit }) {
  const [raw, setRaw] = useState("");
  const [projectId, setProjectId] = useState(defaults.projectId);
  const [projectTouched, setProjectTouched] = useState(false);
  const [due, setDue] = useState(defaults.due ?? "");
  const [dueTouched, setDueTouched] = useState(false);
  const [dueTime, setDueTime] = useState("");
  const [timeTouched, setTimeTouched] = useState(false);
  const [labelIds, setLabelIds] = useState(defaults.labelIds ?? []);
  const [labelsTouched, setLabelsTouched] = useState(false);
  const [priority, setPriority] = useState(4);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [recurrence, setRecurrence] = useState(null);
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);
  const parent = defaults.parentId ? taskById(doc, defaults.parentId) : null;

  const resolved = useMemo(
    () =>
      resolveQuickAdd(
        doc,
        {
          raw,
          projectId,
          projectTouched,
          due,
          dueTouched,
          dueTime,
          timeTouched,
          labelIds,
          labelsTouched,
          priority,
          priorityTouched,
          recurrence,
          recurrenceTouched,
          parentId: defaults.parentId ?? null,
          sectionId: defaults.sectionId ?? null,
        },
        today,
      ),
    [
      defaults.parentId,
      defaults.sectionId,
      doc,
      due,
      dueTime,
      dueTouched,
      labelIds,
      labelsTouched,
      priority,
      priorityTouched,
      projectId,
      projectTouched,
      raw,
      recurrence,
      recurrenceTouched,
      timeTouched,
      today,
    ],
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const projects = doc.projects.filter(
    (project) => !project.archived || project.id === defaults.projectId,
  );
  const project = projectById(doc, resolved.projectId);
  const labels = doc.labels.filter((label) => resolved.labelIds.includes(label.id));
  const repeatValue = recurrenceTouched ? recurrenceKey(recurrence) : recurrenceKey(resolved.recurrence);

  return (
    <div className="fixed inset-0 z-40 bg-stone-900/30" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-labelledby="quick-add-title"
        className="mx-auto mt-20 w-[min(40rem,calc(100%-2rem))] rounded-2xl bg-white p-4 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!resolved.title) return;
          onSubmit(resolved);
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
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Pay rent tomorrow p1 every month #Home"
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-base outline-none focus:border-indigo-400"
        />
        <p className="mt-2 text-xs text-stone-500">
          {resolved.title || "Task name"}
          {project ? ` · ${project.name}` : ""}
          {resolved.due ? ` · ${formatWhen(resolved.due, resolved.dueTime, today)}` : ""}
          {resolved.recurrence ? ` · ${describeRecurrence(resolved.recurrence)}` : ""}
          {resolved.priority < 4 ? ` · P${resolved.priority}` : ""}
          {labels.map((label) => ` · @${label.name}`).join("")}
          {resolved.newLabels.map((name) => ` · @${name}`).join("")}
        </p>
        <p className="mt-1 text-xs text-stone-400">
          Dates, p1–p4, #project, @label, every week, and at 9am are read from the title.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs text-stone-500">
            Project
            <select
              value={projectTouched ? projectId : resolved.projectId}
              disabled={Boolean(parent)}
              onChange={(event) => {
                setProjectTouched(true);
                setProjectId(event.target.value);
              }}
              className="ml-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-sm text-stone-800"
            >
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Due
            <input
              type="date"
              value={dueTouched ? due : (resolved.due ?? "")}
              onChange={(event) => {
                setDueTouched(true);
                setDue(event.target.value);
              }}
              className="ml-2 rounded-md border border-stone-200 px-2 py-1 text-sm text-stone-800"
            />
          </label>
          <label className="text-xs text-stone-500">
            Time
            <input
              type="time"
              value={timeTouched ? dueTime : (resolved.dueTime ?? "")}
              onChange={(event) => {
                setTimeTouched(true);
                setDueTime(event.target.value);
              }}
              className="ml-2 rounded-md border border-stone-200 px-2 py-1 text-sm text-stone-800"
            />
          </label>
          <label className="text-xs text-stone-500">
            Repeat
            <select
              value={repeatValue === "custom" ? "custom" : repeatValue}
              onChange={(event) => {
                setRecurrenceTouched(true);
                setRecurrence(recurrenceFromKey(event.target.value));
              }}
              className="ml-2 rounded-md border border-stone-200 bg-white px-2 py-1 text-sm text-stone-800"
            >
              <option value="none">No repeat</option>
              <option value="day">Every day</option>
              <option value="weekday">Every weekday</option>
              <option value="week">Every week</option>
              <option value="month">Every month</option>
              <option value="year">Every year</option>
              {repeatValue === "custom" ? (
                <option value="custom">{describeRecurrence(resolved.recurrence)}</option>
              ) : null}
            </select>
          </label>
          <div className="flex items-center gap-1" role="group" aria-label="Priority">
            {PRIORITIES.map((level) => {
              const active = (priorityTouched ? priority : resolved.priority) === level;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setPriorityTouched(true);
                    setPriority(level);
                  }}
                  className={`rounded-md px-2 py-1 text-xs ${
                    active ? "bg-indigo-600 text-white" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  P{level}
                </button>
              );
            })}
          </div>
        </div>
        {doc.labels.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.labels.map((label) => {
              const selected = (labelsTouched ? labelIds : resolved.labelIds).includes(label.id);
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setLabelsTouched(true);
                    setLabelIds((current) => {
                      const base = labelsTouched ? current : resolved.labelIds;
                      return base.includes(label.id)
                        ? base.filter((id) => id !== label.id)
                        : [...base, label.id];
                    });
                  }}
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
            disabled={!resolved.title}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            Add task
          </button>
        </div>
      </form>
    </div>
  );
}
