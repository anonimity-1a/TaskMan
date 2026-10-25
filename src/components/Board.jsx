import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { COLOR_STYLES, PRIORITY_META, PRIORITY_STYLES, childrenOf, formatWhen } from "../model.js";

export function Board({
  doc,
  today,
  selection,
  selectedId,
  onOpen,
  onToggle,
  onMoveToGroup,
  onAddTask,
  onRenameSection,
  onDeleteSection,
}) {
  const columns =
    selection.groups && selection.groups.length > 0
      ? selection.groups
      : [{ id: "open", title: "Tasks", sectionId: null, add: {}, tasks: selection.open }];

  return (
    <div className="flex h-full gap-3 overflow-x-auto pb-2">
      {columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          doc={doc}
          today={today}
          selectedId={selectedId}
          onOpen={onOpen}
          onToggle={onToggle}
          onMoveToGroup={onMoveToGroup}
          onAddTask={onAddTask}
          onRenameSection={onRenameSection}
          onDeleteSection={onDeleteSection}
        />
      ))}
    </div>
  );
}

function Column({
  column,
  doc,
  today,
  selectedId,
  onOpen,
  onToggle,
  onMoveToGroup,
  onAddTask,
  onRenameSection,
  onDeleteSection,
}) {
  const [over, setOver] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <section
      className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 ${
        over ? "border-white/20 bg-white/10" : "border-white/10 bg-[var(--chip)]"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const id = event.dataTransfer.getData("text/plain");
        if (id && onMoveToGroup) onMoveToGroup(id, column);
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        {column.editable && column.sectionId ? (
          <input
            aria-label={`Rename section ${column.title}`}
            key={column.title}
            defaultValue={column.title}
            onBlur={(event) => onRenameSection(column.sectionId, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-neutral-100 outline-none"
          />
        ) : (
          <h3 className="flex-1 text-sm font-medium text-neutral-100">{column.title}</h3>
        )}
        <span className="text-xs text-neutral-500">{column.tasks.length}</span>
        {column.editable && column.sectionId ? (
          <button
            type="button"
            onClick={() => onDeleteSection(column.sectionId)}
            className="text-xs text-neutral-500 hover:text-neutral-200"
          >
            Delete
          </button>
        ) : null}
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2">
        {column.tasks.map((task) => (
          <Card
            key={task.id}
            doc={doc}
            task={task}
            today={today}
            selected={selectedId === task.id}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        ))}
      </div>
      <form
        className="mt-3 flex items-center gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim() || !onAddTask) return;
          onAddTask(draft, column);
          setDraft("");
        }}
      >
        <Plus className="size-4 text-[var(--accent)]" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add task"
          aria-label={`Add task to ${column.title}`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--accent)]"
        />
      </form>
    </section>
  );
}

function Card({ doc, task, today, selected, onOpen, onToggle }) {
  const labels = doc.labels.filter((label) => task.labelIds.includes(label.id));
  const children = childrenOf(doc, task.id);
  const done = children.filter((child) => child.completed).length;
  const overdue = task.due && task.due < today && !task.completed;
  const tone = PRIORITY_META[task.priority] ?? PRIORITY_META[4];
  return (
    <article className={`rounded-xl border bg-[var(--panel)] p-3 ${selected ? "border-white/30" : "border-white/10"}`}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          draggable
          aria-label={`Drag ${task.title}`}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", task.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          className="mt-0.5 cursor-grab text-xs text-neutral-600"
        >
          ::
        </button>
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={`Mark ${task.title} complete`}
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 text-transparent hover:text-white/70 ${
            PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[4]
          }`}
        >
          <Check className="size-3" />
        </button>
        <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <span className={`block text-sm ${tone.text}`}>{task.title}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            {task.due ? (
              <span className={`text-[11px] ${overdue ? "text-red-400" : "text-neutral-400"}`}>
                {formatWhen(task.due, task.dueTime, today)}
              </span>
            ) : null}
            {children.length > 0 ? (
              <span className="text-[11px] text-neutral-500">
                {done}/{children.length}
              </span>
            ) : null}
            {labels.map((label) => {
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <span key={label.id} className={`rounded-full px-2 py-0.5 text-[11px] ${styles.chip}`}>
                  {label.name}
                </span>
              );
            })}
          </span>
        </button>
      </div>
    </article>
  );
}
