import { useState } from "react";
import { Calendar, Check, ChevronDown, ChevronRight, GripVertical, ListTree, Plus, Trash2 } from "lucide-react";
import { COLOR_STYLES, PRIORITY_META } from "../constants.js";
import { addDays } from "../dates.js";
import { childrenOf, formatWhen } from "../model.js";

const countTree = (doc, id) => {
  const children = childrenOf(doc, id);
  return children.reduce(
    (sum, child) => {
      const nested = countTree(doc, child.id);
      return {
        total: sum.total + 1 + nested.total,
        done: sum.done + (child.completed ? 1 : 0) + nested.done,
      };
    },
    { total: 0, done: 0 },
  );
};

export function TaskList({
  doc,
  today,
  selection,
  empty,
  selectedId,
  showCompleted,
  onOpen,
  onToggle,
  onDelete,
  onReorder,
  onRenameSection,
  onDeleteSection,
  onAddTask,
}) {
  const groups =
    selection.groups && selection.groups.length > 0
      ? selection.groups
      : [{ id: "open", title: null, sectionId: null, add: {}, tasks: selection.open }];
  const bare = !selection.groups;
  const nothing = selection.open.length === 0 && selection.done.length === 0 && bare;

  return (
    <div>
      {nothing ? <p className="px-1 py-8 text-sm text-neutral-500">{empty}</p> : null}
      {groups.map((group) => (
        <SectionBlock
          key={group.id}
          group={group}
          doc={doc}
          today={today}
          nested={selection.mode === "nested"}
          selectedId={selectedId}
          onOpen={onOpen}
          onToggle={onToggle}
          onDelete={onDelete}
          onReorder={onReorder}
          onRenameSection={onRenameSection}
          onDeleteSection={onDeleteSection}
          onAddTask={onAddTask}
        />
      ))}
      {showCompleted && selection.done.length > 0 ? (
        <section className="mt-6">
          <h3 className="px-1 py-2 text-sm text-neutral-400">Completed</h3>
          <ul>
            {selection.done.map((task) => (
              <TaskRow
                key={task.id}
                doc={doc}
                task={task}
                today={today}
                depth={0}
                nested={false}
                selectedId={selectedId}
                onOpen={onOpen}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))}
          </ul>
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
  selectedId,
  onOpen,
  onToggle,
  onDelete,
  onReorder,
  onRenameSection,
  onDeleteSection,
  onAddTask,
}) {
  const tone = group.priority ? PRIORITY_META[group.priority] : null;
  const canEdit = group.editable && group.sectionId && onRenameSection;
  return (
    <section className="mb-2">
      {group.title ? (
        <div className="flex items-center gap-2 px-1 py-3">
          {tone ? <span className={`size-4 rounded-full border-2 ${tone.circle}`} /> : null}
          {canEdit ? (
            <input
              aria-label={`Rename section ${group.title}`}
              defaultValue={group.title}
              key={group.title}
              onBlur={(event) => onRenameSection(group.sectionId, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-neutral-300 outline-none"
            />
          ) : (
            <h3 className={`text-sm font-medium ${tone ? tone.text : "text-neutral-300"}`}>{group.title}</h3>
          )}
          {canEdit ? (
            <button
              type="button"
              aria-label={`Delete section ${group.title}`}
              onClick={() => onDeleteSection(group.sectionId)}
              className="rounded p-1 text-neutral-600 hover:text-neutral-300"
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
      <ul>
        {group.tasks.map((task) => (
          <TaskRow
            key={task.id}
            doc={doc}
            task={task}
            today={today}
            depth={0}
            nested={nested}
            selectedId={selectedId}
            onOpen={onOpen}
            onToggle={onToggle}
            onDelete={onDelete}
            onReorder={onReorder}
          />
        ))}
      </ul>
      {onAddTask ? <AddRow onAdd={(title) => onAddTask(title, group)} /> : null}
    </section>
  );
}

function AddRow({ onAdd }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="flex items-center gap-2 border-b border-white/5 px-1 py-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onAdd(value);
        setValue("");
      }}
    >
      <Plus className="size-4 text-[var(--accent)]" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add task"
        aria-label="Add task"
        className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-[var(--accent)]"
      />
    </form>
  );
}

function dueClass(task, today) {
  if (!task.due || task.completed) return "text-neutral-500";
  if (task.due < today) return "text-red-400";
  if (task.due === addDays(today, 1)) return "text-orange-400";
  if (task.dueTime) return "text-violet-300";
  return "text-emerald-400";
}

function TaskRow({ doc, task, today, depth, nested, selectedId, onOpen, onToggle, onDelete, onReorder }) {
  const [expanded, setExpanded] = useState(false);
  const children = nested ? childrenOf(doc, task.id).filter((child) => !child.completed) : [];
  const progress = countTree(doc, task.id);
  const labels = doc.labels.filter((label) => task.labelIds.includes(label.id));
  const tone = PRIORITY_META[task.priority] ?? PRIORITY_META[4];

  return (
    <li style={{ paddingLeft: depth ? 28 : 0 }}>
      <div
        className={`group flex items-center gap-2 border-b border-white/5 px-1 py-2 ${
          selectedId === task.id ? "bg-white/5" : "hover:bg-white/[0.03]"
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
            className="text-neutral-500"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : null}
        {onReorder && !task.parentId ? (
          <button
            type="button"
            draggable
            aria-label={`Drag ${task.title}`}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", task.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab text-neutral-700 opacity-0 group-hover:opacity-100"
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
          onClick={() => onToggle(task.id)}
          className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${tone.circle} ${
            task.completed ? "bg-white/20 text-white" : "text-transparent hover:text-white/70"
          }`}
        >
          <Check className="size-3" />
        </button>
        <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-sm ${task.completed ? "text-neutral-500 line-through" : "text-neutral-100"}`}>
            {task.title}
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-3">
          {labels.slice(0, 2).map((label) => {
            const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
            return (
              <span key={label.id} className={`rounded-full px-2 py-0.5 text-[11px] ${styles.chip}`}>
                {label.name}
              </span>
            );
          })}
          {task.due ? (
            <span className={`inline-flex items-center gap-1 text-xs ${dueClass(task, today)}`}>
              <Calendar className="size-3" />
              {formatWhen(task.due, task.dueTime, today)}
            </span>
          ) : null}
          {progress.total > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
              <ListTree className="size-3" />
              {progress.done}/{progress.total}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          onClick={() => onDelete(task.id)}
          className="rounded p-1 text-neutral-700 opacity-0 group-hover:opacity-100 hover:text-neutral-200"
        >
          <Trash2 className="size-3.5" />
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
