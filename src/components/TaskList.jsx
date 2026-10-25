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
      {nothing ? (
        <p className="tm-rule mb-4 rounded-lg border border-dashed px-5 py-10 text-center text-sm text-neutral-500">{empty}</p>
      ) : null}
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
        <section className="mt-8">
          <h3 className="tm-eyebrow tm-ruled py-2">
            <span>Completed</span>
            <span className="tm-mono">{selection.done.length}</span>
          </h3>
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
    <section className="mb-6">
      {group.title ? (
        <div className="group/section flex items-center gap-3 pt-2 pb-1">
          {tone ? <span className={`tm-check size-2.5 shrink-0 border-2 ${tone.circle}`} /> : null}
          {canEdit ? (
            <input
              aria-label={`Rename section ${group.title}`}
              defaultValue={group.title}
              key={group.title}
              onBlur={(event) => onRenameSection(group.sectionId, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="w-auto max-w-[60%] min-w-0 [field-sizing:content] bg-transparent text-[13px] font-bold tracking-wide text-neutral-200 uppercase outline-none"
            />
          ) : (
            <h3 className={`text-[13px] font-bold tracking-wide uppercase ${tone ? tone.text : "text-neutral-200"}`}>{group.title}</h3>
          )}
          <span className="tm-mono text-[11px] text-neutral-500">{group.tasks.length}</span>
          <span className="tm-rule h-px flex-1 border-t" aria-hidden="true" />
          {canEdit ? (
            <button
              type="button"
              aria-label={`Delete section ${group.title}`}
              onClick={() => onDeleteSection(group.sectionId)}
              className="rounded p-1 text-neutral-600 opacity-60 group-hover/section:opacity-100 hover:text-[var(--danger)]"
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
      className="group flex items-center gap-3 rounded-md py-2.5 pr-2 pl-4 hover:bg-white/[0.03] focus-within:bg-white/[0.03]"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onAdd(value);
        setValue("");
      }}
    >
      <span className="tm-check grid size-[18px] shrink-0 place-items-center border border-dashed border-[var(--accent-text)] text-[var(--accent-text)] group-focus-within:border-solid">
        <Plus className="size-3" strokeWidth={2.5} />
      </span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add task"
        aria-label="Add task"
        className="w-full bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-500 group-hover:placeholder:text-[var(--accent-text)]"
      />
      {value ? <span className="tm-kbd shrink-0">Enter</span> : null}
    </form>
  );
}

function dueClass(task, today) {
  if (!task.due || task.completed) return "text-neutral-500";
  if (task.due < today) return "text-[var(--danger)]";
  if (task.due === addDays(today, 1)) return "text-[var(--warn)]";
  if (task.dueTime) return "text-[var(--info)]";
  return "text-[var(--success)]";
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
        data-priority={task.completed ? undefined : task.priority}
        data-selected={selectedId === task.id}
        className="tm-row tm-rule group flex items-center gap-3 border-b py-2.5 pr-2 pl-4 hover:bg-white/[0.03]"
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
            className="-ml-2 cursor-grab text-neutral-600 opacity-0 group-hover:opacity-100"
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
          onClick={() => onToggle(task.id)}
          className={`tm-check flex size-[18px] shrink-0 items-center justify-center border-[1.5px] ${tone.circle} ${
            task.completed
              ? "border-transparent! bg-[var(--success)] text-[var(--on-accent)]"
              : "text-transparent hover:bg-white/5 hover:text-neutral-400"
          }`}
        >
          <Check className="size-3" strokeWidth={3} />
        </button>
        <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <span className={`block truncate text-sm ${task.completed ? "text-neutral-500 line-through" : "text-neutral-100"}`}>
            {task.title}
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-2.5">
          {labels.slice(0, 2).map((label) => {
            const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
            return (
              <span key={label.id} className={`px-2 py-0.5 text-[11px] font-medium ${styles.chip}`}>
                {label.name}
              </span>
            );
          })}
          {task.due ? (
            <span className={`tm-mono inline-flex items-center gap-1.5 text-[11px] ${dueClass(task, today)}`}>
              <Calendar className="size-3" />
              {formatWhen(task.due, task.dueTime, today)}
            </span>
          ) : null}
          {progress.total > 0 ? (
            <span className="tm-mono inline-flex items-center gap-1 text-[11px] text-neutral-500">
              <ListTree className="size-3" />
              {progress.done}/{progress.total}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          onClick={() => onDelete(task.id)}
          className="rounded p-1 text-neutral-600 opacity-0 group-hover:opacity-100 hover:text-[var(--danger)]"
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
