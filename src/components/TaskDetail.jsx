import { useState } from "react";
import { X } from "lucide-react";
import {
  COLOR_STYLES,
  childrenOf,
  commentsFor,
  describeRecurrence,
  recurrenceFromKey,
  recurrenceKey,
} from "../model.js";

export function TaskDetail({
  doc,
  task,
  onClose,
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
  alertsGranted,
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [subtask, setSubtask] = useState("");
  const [note, setNote] = useState("");
  const children = childrenOf(doc, task.id);
  const comments = commentsFor(doc, task.id);
  const sections = doc.sections.filter((section) => section.projectId === task.projectId);
  const repeatValue = recurrenceKey(task.recurrence);

  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-[24rem] max-w-full flex-col border-l border-stone-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-800">Task</h2>
        <button
          type="button"
          aria-label="Close task"
          onClick={onClose}
          className="rounded-md p-1 text-stone-400 hover:bg-stone-100"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <input
          aria-label="Task name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => onPatch({ title })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="w-full rounded-lg border border-stone-200 px-3 py-2 text-base outline-none focus:border-indigo-400"
        />
        <textarea
          aria-label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => onPatch({ description })}
          rows={4}
          placeholder="Description"
          className="w-full resize-y rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-stone-500">
            Project
            <select
              aria-label="Project"
              disabled={Boolean(task.parentId)}
              value={task.projectId}
              onChange={(event) => onPatch({ projectId: event.target.value })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800"
            >
              {doc.projects
                .filter((project) => !project.archived || project.id === task.projectId)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Section
            <select
              aria-label="Section"
              disabled={Boolean(task.parentId)}
              value={task.sectionId ?? ""}
              onChange={(event) => onPatch({ sectionId: event.target.value || null })}
              className="mt-1 w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800"
            >
              <option value="">No section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-500">
            Due date
            <input
              type="date"
              value={task.due ?? ""}
              onChange={(event) => onPatch({ due: event.target.value || null })}
              className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-stone-500">
            Due time
            <input
              type="time"
              value={task.dueTime ?? ""}
              onChange={(event) => onPatch({ dueTime: event.target.value || null })}
              className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-stone-500">
            Deadline
            <input
              type="date"
              value={task.deadline ?? ""}
              onChange={(event) => onPatch({ deadline: event.target.value || null })}
              className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-stone-500">
            Reminder
            <input
              type="time"
              value={task.reminder ?? ""}
              onChange={(event) => onPatch({ reminder: event.target.value || null })}
              className="mt-1 w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
        <label className="block text-xs text-stone-500">
          Repeat
          <select
            aria-label="Repeat"
            value={repeatValue}
            onChange={(event) =>
              onPatch({ recurrence: recurrenceFromKey(event.target.value) })
            }
            className="mt-1 w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-800"
          >
            <option value="none">No repeat</option>
            <option value="day">Every day</option>
            <option value="weekday">Every weekday</option>
            <option value="week">Every week</option>
            <option value="month">Every month</option>
            <option value="year">Every year</option>
            {repeatValue === "custom" ? (
              <option value="custom">{describeRecurrence(task.recurrence)}</option>
            ) : null}
          </select>
        </label>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Priority">
          {[1, 2, 3, 4].map((level) => (
            <button
              key={level}
              type="button"
              aria-pressed={task.priority === level}
              onClick={() => onPatch({ priority: level })}
              className={`rounded-md px-2 py-1 text-xs ${
                task.priority === level
                  ? "bg-indigo-600 text-white"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              P{level}
            </button>
          ))}
        </div>
        {task.reminder && !alertsGranted ? (
          <button
            type="button"
            onClick={onAllowAlerts}
            className="text-xs text-indigo-700 hover:underline"
          >
            Allow desktop alerts for reminders
          </button>
        ) : null}
        <div>
          <p className="text-xs font-medium text-stone-500">Labels</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {doc.labels.length === 0 ? (
              <p className="text-xs text-stone-400">Add a label in the sidebar first.</p>
            ) : (
              doc.labels.map((label) => {
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
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      selected ? styles.chip : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {label.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500">Subtasks</p>
          <ul className="mt-2 space-y-1">
            {children.map((child) => (
              <li key={child.id} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={child.completed}
                  aria-label={child.completed ? `Mark ${child.title} incomplete` : `Mark ${child.title} complete`}
                  onClick={() => onToggle(child.id)}
                  className={`size-4 rounded-full border ${
                    child.completed ? "border-indigo-600 bg-indigo-600" : "border-stone-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => onOpen(child)}
                  className={`truncate text-left text-sm ${
                    child.completed ? "text-stone-400 line-through" : "text-stone-700"
                  }`}
                >
                  {child.title}
                </button>
              </li>
            ))}
          </ul>
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
              value={subtask}
              onChange={(event) => setSubtask(event.target.value)}
              placeholder="Add subtask"
              aria-label="Add subtask"
              className="w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <button type="submit" className="rounded-md px-2 text-sm text-indigo-700">
              Add
            </button>
          </form>
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500">Notes</p>
          <ul className="mt-2 space-y-2">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-lg bg-stone-50 px-3 py-2">
                <p className="text-sm text-stone-700">{comment.body}</p>
                <div className="mt-1 flex items-center justify-between">
                  <time className="text-[11px] text-stone-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </time>
                  <button
                    type="button"
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-[11px] text-stone-400 hover:text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!note.trim()) return;
              onAddComment(note);
              setNote("");
            }}
          >
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note"
              aria-label="Add a note"
              className="w-full rounded-md border border-stone-200 px-2 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <button type="submit" className="rounded-md px-2 text-sm text-indigo-700">
              Add
            </button>
          </form>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-stone-100 px-4 py-3">
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
        >
          Duplicate
        </button>
        {task.recurrence ? (
          <button
            type="button"
            onClick={onCompleteForever}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            Complete and stop repeating
          </button>
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          className="ml-auto rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
        >
          Delete
        </button>
      </div>
    </aside>
  );
}
