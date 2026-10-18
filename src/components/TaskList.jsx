import { useState } from "react";
import { Check, ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  COLOR_STYLES,
  PRIORITY_STYLES,
  childrenOf,
  commentsFor,
  describeRecurrence,
  formatDue,
  formatWhen,
  projectById,
} from "../model.js";

export function TaskList({
  doc,
  today,
  selection,
  empty,
  selectedId,
  onOpen,
  onToggle,
  onDelete,
  onMoveSection,
  onReorder,
  onRenameSection,
  onDeleteSection,
  onAddInSection,
}) {
  const [showDone, setShowDone] = useState(false);
  const groups =
    selection.groups && selection.groups.length > 0
      ? selection.groups
      : [{ id: "open", title: null, sectionId: null, tasks: selection.open }];

  return (
    <div>
      {!selection.groups && selection.open.length === 0 ? (
        <p className="px-1 py-8 text-sm text-stone-400">{empty}</p>
      ) : null}
      {selection.groups || selection.open.length > 0
        ? groups.map((group) => (
          <SectionBlock
            key={group.id}
            group={group}
            doc={doc}
            today={today}
            nested={selection.mode === "nested"}
            showProject={selection.mode === "flat"}
            selectedId={selectedId}
            onOpen={onOpen}
            onToggle={onToggle}
            onDelete={onDelete}
            onMoveSection={onMoveSection}
            onReorder={onReorder}
            onRenameSection={onRenameSection}
            onDeleteSection={onDeleteSection}
            onAddInSection={onAddInSection}
          />
        ))
        : null}
      {selection.done.length > 0 ? (
        <section className="mt-4 border-t border-stone-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            className="flex items-center gap-2 px-1 text-sm text-stone-500"
          >
            {showDone ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
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
                  showProject={selection.mode !== "nested"}
                  selectedId={selectedId}
                  onOpen={onOpen}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function SectionBlock({
  group,
  doc,
  today,
  nested,
  showProject,
  selectedId,
  onOpen,
  onToggle,
  onDelete,
  onMoveSection,
  onReorder,
  onRenameSection,
  onDeleteSection,
  onAddInSection,
}) {
  const [over, setOver] = useState(false);
  const canEdit = group.sectionId && onRenameSection;
  return (
    <section
      className={`mb-6 rounded-xl ${over ? "bg-indigo-50/70" : ""}`}
      onDragOver={
        onMoveSection
          ? (event) => {
              event.preventDefault();
              setOver(true);
            }
          : undefined
      }
      onDragLeave={() => setOver(false)}
      onDrop={
        onMoveSection
          ? (event) => {
              event.preventDefault();
              setOver(false);
              const id = event.dataTransfer.getData("text/plain");
              if (id) onMoveSection(id, group.sectionId);
            }
          : undefined
      }
    >
      {group.title ? (
        <div className="mb-2 flex items-center gap-2 px-1">
          {canEdit ? (
            <input
              aria-label={`Rename section ${group.title}`}
              defaultValue={group.title}
              key={group.title}
              onBlur={(event) => onRenameSection(group.sectionId, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold tracking-wide text-stone-400 uppercase outline-none"
            />
          ) : (
            <h3 className="px-1 text-xs font-semibold tracking-wide text-stone-400 uppercase">
              {group.title}
            </h3>
          )}
          {canEdit ? (
            <button
              type="button"
              aria-label={`Delete section ${group.title}`}
              onClick={() => onDeleteSection(group.sectionId)}
              className="rounded p-1 text-stone-300 hover:text-stone-600"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
          {onAddInSection ? (
            <button
              type="button"
              aria-label={`Add task to ${group.title}`}
              onClick={() => onAddInSection(group.sectionId)}
              className="rounded p-1 text-stone-400 hover:bg-white hover:text-stone-700"
            >
              <Plus className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
      <ul className="divide-y divide-stone-100">
        {group.tasks.map((task) => (
          <TaskRow
            key={task.id}
            doc={doc}
            task={task}
            today={today}
            depth={0}
            nested={nested}
            showProject={showProject}
            selectedId={selectedId}
            onOpen={onOpen}
            onToggle={onToggle}
            onDelete={onDelete}
            onReorder={onReorder}
          />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({
  doc,
  task,
  today,
  depth,
  nested,
  showProject,
  selectedId,
  onOpen,
  onToggle,
  onDelete,
  onReorder,
}) {
  const [expanded, setExpanded] = useState(true);
  const children = nested ? childrenOf(doc, task.id) : [];
  const project = projectById(doc, task.projectId);
  const overdue = task.due && task.due < today && !task.completed;
  const deadlineSoon = task.deadline && task.deadline <= today && !task.completed;
  const labels = doc.labels.filter((label) => task.labelIds.includes(label.id));
  const comments = commentsFor(doc, task.id);
  const childTotal = childrenOf(doc, task.id);
  const childDone = childTotal.filter((child) => child.completed).length;

  return (
    <li className="py-1" style={{ paddingLeft: depth ? 28 : 0 }}>
      <div
        className={`group flex items-start gap-2 rounded-lg px-1 py-1.5 ${
          selectedId === task.id ? "bg-indigo-50" : "hover:bg-stone-50"
        }`}
        onDragOver={
          onReorder
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
              }
            : undefined
        }
        onDrop={
          onReorder
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                const id = event.dataTransfer.getData("text/plain");
                if (id) onReorder(id, task.id);
              }
            : undefined
        }
      >
        {nested && children.length > 0 ? (
          <button
            type="button"
            aria-label={expanded ? "Collapse subtasks" : "Expand subtasks"}
            onClick={() => setExpanded((value) => !value)}
            className="mt-1 text-stone-400"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        {onReorder && !task.parentId ? (
          <button
            type="button"
            draggable
            aria-label={`Drag ${task.title}`}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", task.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            className="mt-1 cursor-grab text-stone-300 hover:text-stone-500"
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
            PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[4]
          } ${task.completed ? "border-indigo-600 bg-indigo-600 text-white" : "text-transparent hover:text-indigo-400"}`}
        >
          <Check className="size-3" />
        </button>
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-w-0 flex-1 text-left"
        >
          <span
            className={`block truncate text-sm ${
              task.completed ? "text-stone-400 line-through" : "text-stone-800"
            }`}
          >
            {task.title}
          </span>
          {task.description ? (
            <span className="mt-0.5 block truncate text-xs text-stone-400">{task.description}</span>
          ) : null}
          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
            {task.priority < 4 ? (
              <span className="text-[11px] font-medium text-stone-500">P{task.priority}</span>
            ) : null}
            {showProject && project ? (
              <span className="text-xs text-stone-400">{project.name}</span>
            ) : null}
            {task.due ? (
              <span className={`text-xs ${overdue ? "text-rose-600" : "text-stone-500"}`}>
                {formatWhen(task.due, task.dueTime, today)}
              </span>
            ) : null}
            {task.recurrence ? (
              <span className="text-xs text-stone-400">{describeRecurrence(task.recurrence)}</span>
            ) : null}
            {task.deadline ? (
              <span className={`text-xs ${deadlineSoon ? "text-rose-600" : "text-stone-400"}`}>
                Deadline {formatDue(task.deadline, today)}
              </span>
            ) : null}
            {childTotal.length > 0 ? (
              <span className="text-xs text-stone-400">
                {childDone}/{childTotal.length}
              </span>
            ) : null}
            {comments.length > 0 ? (
              <span className="text-xs text-stone-400">{comments.length} notes</span>
            ) : null}
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
          </span>
        </button>
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          onClick={() => onDelete(task.id)}
          className="rounded p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-700"
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
              showProject={false}
              selectedId={selectedId}
              onOpen={onOpen}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
