import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import {
  COLOR_STYLES,
  childrenOf,
  formatDue,
  projectById,
} from "../model.js";

export function TaskList({
  doc,
  today,
  selection,
  empty,
  onToggle,
  onRename,
  onDue,
  onDelete,
  onAddSubtask,
}) {
  const [showDone, setShowDone] = useState(false);
  const groups =
    selection.groups && selection.groups.length > 0
      ? selection.groups
      : [{ id: "open", title: null, tasks: selection.open }];

  return (
    <div>
      {selection.open.length === 0 ? (
        <p className="px-1 py-8 text-sm text-stone-400">{empty}</p>
      ) : (
        groups.map((group) => (
          <section key={group.id} className="mb-6">
            {group.title ? (
              <h3 className="mb-2 px-1 text-xs font-semibold tracking-wide text-stone-400 uppercase">
                {group.title}
              </h3>
            ) : null}
            <ul className="divide-y divide-stone-100">
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  doc={doc}
                  task={task}
                  today={today}
                  depth={0}
                  nested={selection.mode === "nested"}
                  onToggle={onToggle}
                  onRename={onRename}
                  onDue={onDue}
                  onDelete={onDelete}
                  onAddSubtask={onAddSubtask}
                />
              ))}
            </ul>
          </section>
        ))
      )}
      {selection.done.length > 0 ? (
        <section className="mt-4 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            className="flex items-center gap-2 px-1 text-sm text-stone-500"
          >
            {showDone ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
            Completed
            <span className="text-xs text-stone-400">{selection.done.length}</span>
          </button>
          {showDone ? (
            <ul className="mt-2 divide-y divide-stone-100">
              {selection.done.map((task) => (
                <TaskRow
                  key={task.id}
                  doc={doc}
                  task={task}
                  today={today}
                  depth={0}
                  nested={false}
                  onToggle={onToggle}
                  onRename={onRename}
                  onDue={onDue}
                  onDelete={onDelete}
                  onAddSubtask={onAddSubtask}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function TaskRow({
  doc,
  task,
  today,
  depth,
  nested,
  onToggle,
  onRename,
  onDue,
  onDelete,
  onAddSubtask,
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const children = nested ? childrenOf(doc, task.id) : [];
  const project = projectById(doc, task.projectId);
  const overdue = task.due && task.due < today && !task.completed;
  const labels = doc.labels.filter((label) => task.labelIds.includes(label.id));

  const saveTitle = () => {
    onRename(task.id, draft);
    setEditing(false);
  };

  return (
    <li className="py-1" style={{ paddingLeft: depth ? 28 : 0 }}>
      <div className="group flex items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-stone-50">
        {nested && children.length > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
            onClick={() => setExpanded((value) => !value)}
            className="mt-1 text-stone-400"
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
            task.completed
              ? "border-indigo-600 bg-indigo-600 text-white"
              : "border-stone-300 text-transparent hover:border-indigo-400"
          }`}
        >
          <Check className="size-3" />
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveTitle();
                if (event.key === "Escape") {
                  setDraft(task.title);
                  setEditing(false);
                }
              }}
              className="w-full rounded border border-indigo-300 px-2 py-0.5 text-sm outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(task.title);
                setEditing(true);
              }}
              className={`block max-w-full truncate text-left text-sm ${
                task.completed ? "text-stone-400 line-through" : "text-stone-800"
              }`}
            >
              {task.title}
            </button>
          )}
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            {project && depth === 0 ? (
              <span className="text-xs text-stone-400">{project.name}</span>
            ) : null}
            <label className={`text-xs ${overdue ? "text-rose-600" : "text-stone-500"}`}>
              <span className="sr-only">Due date</span>
              <input
                type="date"
                value={task.due ?? ""}
                onChange={(event) => onDue(task.id, event.target.value || null)}
                className="w-28 bg-transparent text-xs outline-none"
              />
              {task.due ? (
                <span className="ml-1">{formatDue(task.due, today)}</span>
              ) : (
                <span className="ml-1">No date</span>
              )}
            </label>
            {labels.map((label) => {
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <span
                  key={label.id}
                  className={`rounded-full px-2 py-0.5 text-[11px] ${styles.chip}`}
                >
                  {label.name}
                </span>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          aria-label="Add subtask"
          onClick={() => onAddSubtask(task)}
          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          onClick={() => onDelete(task.id)}
          className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {nested && expanded && children.length > 0 ? (
        <ul>
          {children.map((child) => (
            <TaskRow
              key={child.id}
              doc={doc}
              task={child}
              today={today}
              depth={depth + 1}
              nested
              onToggle={onToggle}
              onRename={onRename}
              onDue={onDue}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
