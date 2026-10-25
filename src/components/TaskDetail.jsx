import { useState } from "react";
import { ChevronDown, ChevronUp, Flag, MapPin, MoreHorizontal, Plus, X } from "lucide-react";
import { COLOR_STYLES, PRIORITY_META } from "../constants.js";
import { applyPriorityShorthand } from "../parse.js";
import {
  childrenOf,
  commentsFor,
  describeRecurrence,
  formatWhen,
  projectById,
  recurrenceFromKey,
  recurrenceKey,
} from "../model.js";

export function TaskDetail({
  doc,
  task,
  accountName = "",
  hasPrev,
  hasNext,
  alertsGranted,
  onClose,
  onPrev,
  onNext,
  onPatch,
  onToggle,
  onDelete,
  onDuplicate,
  onCompleteForever,
  onOpen,
  onAddSubtask,
  onAddComment,
  onDeleteComment,
  onAllowAlerts,
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [subtask, setSubtask] = useState("");
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState("");
  const [more, setMore] = useState(false);
  const [location, setLocation] = useState(task.location ?? "");
  const children = childrenOf(doc, task.id);
  const comments = commentsFor(doc, task.id);
  const project = projectById(doc, task.projectId);
  const sections = doc.sections.filter((section) => section.projectId === task.projectId);
  const tone = PRIORITY_META[task.priority] ?? PRIORITY_META[4];
  const initial = (accountName || "T").slice(0, 1).toUpperCase();
  const repeatValue = recurrenceKey(task.recurrence);
  const reminderLabel =
    task.reminder && task.dueTime && task.reminder === task.dueTime
      ? "At time of task"
      : task.reminder || "None";

  const saveTitle = () => {
    const applied = applyPriorityShorthand(title);
    if (!applied.title && applied.priority == null) {
      setTitle(task.title);
      return;
    }
    const nextTitle = applied.title || task.title;
    setTitle(nextTitle);
    onPatch({
      ...(nextTitle !== task.title ? { title: nextTitle } : {}),
      ...(applied.priority != null ? { priority: applied.priority } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/55 p-4 pt-10 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-labelledby="task-title"
        className="tm-surface flex max-h-[min(720px,calc(100%-2rem))] w-[min(920px,calc(100%-1rem))] flex-col overflow-hidden rounded-xl text-neutral-100"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="tm-rule flex items-center gap-2 border-b bg-white/[0.02] px-5 py-2.5 text-sm text-neutral-400">
          <span className="tm-eyebrow">Task</span>
          <span className="tm-eyebrow" aria-hidden="true">/</span>
          <span className="tm-eyebrow truncate text-neutral-300!">{project?.name ?? "Inbox"}</span>
          <span className="ml-auto flex items-center gap-1">
            <button type="button" aria-label="Previous task" disabled={!hasPrev} onClick={onPrev} className="rounded p-1 hover:bg-white/5 disabled:opacity-30">
              <ChevronUp className="size-4" />
            </button>
            <button type="button" aria-label="Next task" disabled={!hasNext} onClick={onNext} className="rounded p-1 hover:bg-white/5 disabled:opacity-30">
              <ChevronDown className="size-4" />
            </button>
            <button type="button" aria-label="More task actions" onClick={() => setMore((value) => !value)} className="rounded p-1 hover:bg-white/5">
              <MoreHorizontal className="size-4" />
            </button>
            <button type="button" aria-label="Close task" onClick={onClose} className="rounded p-1 hover:bg-white/5">
              <X className="size-4" />
            </button>
          </span>
        </header>
        {more ? (
          <div className="tm-rule flex flex-wrap gap-1 border-b px-4 py-2 text-sm">
            <button type="button" onClick={onDuplicate} className="rounded px-2 py-1 hover:bg-white/5">Duplicate</button>
            {task.recurrence ? (
              <button type="button" onClick={onCompleteForever} className="rounded px-2 py-1 hover:bg-white/5">
                Complete and stop repeating
              </button>
            ) : null}
            {task.reminder && !alertsGranted ? (
              <button type="button" onClick={onAllowAlerts} className="rounded px-2 py-1 hover:bg-white/5">
                Allow desktop alerts
              </button>
            ) : null}
            <button type="button" onClick={onDelete} className="ml-auto rounded px-2 py-1 text-[var(--danger)] hover:bg-[var(--danger)]/10">
              Delete
            </button>
          </div>
        ) : null}
        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_304px]">
          <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                onClick={() => onToggle(task.id)}
                className={`tm-check mt-1.5 size-5 shrink-0 border-[1.5px] ${tone.circle} ${
                  task.completed ? "border-transparent! bg-[var(--success)]" : "hover:bg-white/5"
                }`}
              />
              <input
                id="task-title"
                aria-label="Task name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
                className="w-full bg-transparent font-display text-2xl font-semibold tracking-tight outline-none"
              />
            </div>
            <textarea
              aria-label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => onPatch({ description })}
              rows={3}
              placeholder="Description"
              className="tm-rule w-full resize-y rounded-md border border-transparent bg-transparent px-3 py-2 text-sm leading-relaxed text-neutral-300 outline-none placeholder:text-neutral-600 hover:border-[var(--rule)] focus:border-[var(--accent)]"
            />
            <div>
              <h3 className="tm-eyebrow tm-ruled mb-2">
                <span>Sub-tasks</span>
                {children.length > 0 ? (
                  <span className="tm-mono">
                    {children.filter((child) => child.completed).length}/{children.length}
                  </span>
                ) : null}
              </h3>
              <ul>
                {children.map((child) => {
                  const childTone = PRIORITY_META[child.priority] ?? PRIORITY_META[4];
                  return (
                    <li key={child.id} className="tm-rule flex items-center gap-3 border-b py-2">
                      <button
                        type="button"
                        aria-label={child.completed ? `Mark ${child.title} incomplete` : `Mark ${child.title} complete`}
                        onClick={() => onToggle(child.id)}
                        className={`tm-check size-4 shrink-0 border-[1.5px] ${childTone.circle} ${child.completed ? "border-transparent! bg-[var(--success)]" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => onOpen(child)}
                        className={`truncate text-left text-sm ${child.completed ? "text-neutral-500 line-through" : "text-neutral-200"}`}
                      >
                        {child.title}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {adding ? (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!subtask.trim()) return;
                    onAddSubtask(subtask);
                    setSubtask("");
                  }}
                >
                  <input
                    autoFocus
                    value={subtask}
                    onChange={(event) => setSubtask(event.target.value)}
                    placeholder="Sub-task name"
                    aria-label="Sub-task name"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-[var(--accent-text)]"
                >
                  <Plus className="size-4" />
                  Add sub-task
                </button>
              )}
            </div>
            {comments.length > 0 ? (
              <ul className="space-y-2">
                {comments.map((comment) => (
                  <li key={comment.id} className="tm-rule rounded-md border-l-2 border-l-[var(--accent)]! bg-white/[0.03] px-3 py-2">
                    <p className="text-sm text-neutral-200">{comment.body}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <time className="tm-mono text-[10.5px] text-neutral-500">{new Date(comment.createdAt).toLocaleString()}</time>
                      <button type="button" onClick={() => onDeleteComment(comment.id)} className="text-[11px] text-neutral-500 hover:text-[var(--danger)]">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              className="tm-rule flex items-center gap-3 rounded-lg border bg-[var(--field)] px-2 py-1.5 focus-within:border-[var(--accent)]"
              onSubmit={(event) => {
                event.preventDefault();
                if (!note.trim()) return;
                onAddComment(note);
                setNote("");
              }}
            >
              <span className="tm-check grid size-7 shrink-0 place-items-center bg-[var(--accent)] text-xs font-bold text-[var(--on-accent)]">
                {initial}
              </span>
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Comment"
                aria-label="Comment"
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
              />
            </form>
          </div>
          <aside className="tm-rule min-h-0 overflow-y-auto border-t bg-[var(--panel-2)] px-5 py-3 md:border-t-0 md:border-l">
            <p className="tm-eyebrow pt-1 pb-2">Properties</p>
            <Meta label="Project">
              <select
                aria-label="Project"
                disabled={Boolean(task.parentId)}
                value={task.projectId}
                onChange={(event) => onPatch({ projectId: event.target.value })}
                className="max-w-[150px] bg-transparent text-right text-sm outline-none"
              >
                {doc.projects
                  .filter((item) => !item.archived || item.id === task.projectId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </Meta>
            {sections.length > 0 ? (
              <Meta label="Section">
                <select
                  aria-label="Section"
                  disabled={Boolean(task.parentId)}
                  value={task.sectionId ?? ""}
                  onChange={(event) => onPatch({ sectionId: event.target.value || null })}
                  className="max-w-[150px] bg-transparent text-right text-sm outline-none"
                >
                  <option value="">No section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </Meta>
            ) : null}
            <Meta label="Date" valueClass={task.dueTime ? "text-[var(--info)]" : "text-neutral-200"}>
              <span className="sr-only">{task.due ? formatWhen(task.due, task.dueTime, new Date().toISOString().slice(0, 10)) : "No date"}</span>
              <input
                type="date"
                aria-label="Date"
                value={task.due ?? ""}
                onChange={(event) => onPatch({ due: event.target.value || null })}
                className="bg-transparent text-right text-sm outline-none"
              />
              <input
                type="time"
                aria-label="Time"
                value={task.dueTime ?? ""}
                onChange={(event) => onPatch({ dueTime: event.target.value || null })}
                className="bg-transparent text-right text-sm outline-none"
              />
            </Meta>
            <Meta label="Repeat">
              <select
                aria-label="Repeat"
                value={repeatValue}
                onChange={(event) => onPatch({ recurrence: recurrenceFromKey(event.target.value) })}
                className="max-w-[160px] bg-transparent text-right text-sm outline-none"
              >
                <option value="none">No repeat</option>
                <option value="day">Every day</option>
                <option value="weekday">Every weekday</option>
                <option value="week">Every week</option>
                <option value="month">Every month</option>
                <option value="year">Every year</option>
                {repeatValue === "custom" ? <option value="custom">{describeRecurrence(task.recurrence)}</option> : null}
              </select>
            </Meta>
            <Meta label="Deadline">
              <input
                type="date"
                aria-label="Deadline"
                value={task.deadline ?? ""}
                onChange={(event) => onPatch({ deadline: event.target.value || null })}
                className="bg-transparent text-right text-sm outline-none"
              />
            </Meta>
            <Meta label="Priority">
              <span className={`inline-flex items-center gap-1 text-sm ${tone.flag}`}>
                <Flag className="size-3.5" fill="currentColor" />
                <select
                  aria-label="Priority"
                  value={task.priority}
                  onChange={(event) => onPatch({ priority: Number(event.target.value) })}
                  className="bg-transparent outline-none"
                >
                  {[1, 2, 3, 4].map((level) => (
                    <option key={level} value={level}>
                      P{level}
                    </option>
                  ))}
                </select>
              </span>
            </Meta>
            <div className="tm-rule border-b py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[13px] text-neutral-400">Labels</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {doc.labels.length === 0 ? <span className="text-xs text-neutral-500">None yet</span> : null}
                {doc.labels.map((label) => {
                  const selected = task.labelIds.includes(label.id);
                  const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
                  return (
                    <button
                      key={label.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        onPatch({
                          labelIds: selected
                            ? task.labelIds.filter((id) => id !== label.id)
                            : [...task.labelIds, label.id],
                        })
                      }
                      className={`tm-chip px-2 py-0.5 text-xs font-medium ${selected ? styles.chip : "bg-white/5 text-neutral-500 hover:text-neutral-300"}`}
                    >
                      {selected ? label.name : `+ ${label.name}`}
                    </button>
                  );
                })}
              </div>
            </div>
            <Meta label="Reminders">
              <select
                aria-label="Reminders"
                value={task.reminder && task.dueTime && task.reminder === task.dueTime ? "due" : task.reminder ? "custom" : "none"}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "none") onPatch({ reminder: null });
                  else if (value === "due") onPatch({ reminder: task.dueTime || "09:00" });
                }}
                className="max-w-[150px] bg-transparent text-right text-sm outline-none"
              >
                <option value="none">None</option>
                <option value="due">At time of task</option>
                <option value="custom">{reminderLabel === "At time of task" || reminderLabel === "None" ? "Custom" : reminderLabel}</option>
              </select>
              <input
                type="time"
                aria-label="Reminder time"
                value={task.reminder ?? ""}
                onChange={(event) => onPatch({ reminder: event.target.value || null })}
                className="bg-transparent text-right text-sm outline-none"
              />
            </Meta>
            <Meta label="Location">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5 text-neutral-500" />
                <input
                  aria-label="Location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  onBlur={() => onPatch({ location })}
                  placeholder="Add"
                  className="w-28 bg-transparent text-right text-sm outline-none placeholder:text-neutral-500"
                />
              </span>
            </Meta>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, children }) {
  return (
    <div className="tm-rule flex items-center justify-between gap-3 border-b py-2.5 text-sm">
      <span className="shrink-0 text-[13px] text-neutral-400">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-2 text-neutral-100">{children}</span>
    </div>
  );
}
