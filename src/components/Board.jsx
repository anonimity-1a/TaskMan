import { useState } from "react";
import { Check, GripVertical, Plus } from "lucide-react";
import { COLOR_STYLES, PRIORITY_STYLES, childrenOf, formatWhen } from "../model.js";

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
    <div className="flex h-full gap-5 overflow-x-auto pb-2">
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
      className={`flex w-[18.5rem] shrink-0 flex-col rounded-b-lg border-t-2 px-1 pt-3 pb-2 transition-colors ${
        over ? "border-[var(--accent)] bg-[var(--selected)]" : "border-[var(--color-neutral-700)] bg-transparent"
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
      <div className="group/col mb-3 flex items-center gap-2 px-1">
        {column.editable && column.sectionId ? (
          <input
            aria-label={`Rename section ${column.title}`}
            key={column.title}
            defaultValue={column.title}
            onBlur={(event) => onRenameSection(column.sectionId, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="min-w-0 flex-1 bg-transparent text-[13px] font-bold tracking-wide text-neutral-100 uppercase outline-none"
          />
        ) : (
          <h3 className="flex-1 truncate text-[13px] font-bold tracking-wide text-neutral-100 uppercase">{column.title}</h3>
        )}
        <span className="tm-mono tm-chip bg-white/5 px-2 text-[11px] leading-5 text-neutral-400">{column.tasks.length}</span>
        {column.editable && column.sectionId ? (
          <button
            type="button"
            onClick={() => onDeleteSection(column.sectionId)}
            className="text-[11px] text-neutral-500 opacity-0 group-hover/col:opacity-100 hover:text-[var(--danger)]"
          >
            Delete
          </button>
        ) : null}
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-1">
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
        className="tm-rule mx-1 mt-2 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 focus-within:border-solid focus-within:border-[var(--accent)]"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim() || !onAddTask) return;
          onAddTask(draft, column);
          setDraft("");
        }}
      >
        <Plus className="size-4 text-[var(--accent-text)]" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add task"
          aria-label={`Add task to ${column.title}`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-500"
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
  return (
    <article data-priority={task.completed ? undefined : task.priority} data-selected={selected} className="tm-card group p-3 pl-3.5">
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          draggable
          aria-label={`Drag ${task.title}`}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", task.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          className="-mr-1 mt-0.5 cursor-grab text-neutral-600 opacity-40 group-hover:opacity-100"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={`Mark ${task.title} complete`}
          onClick={() => onToggle(task.id)}
          className={`tm-check mt-px flex size-[18px] shrink-0 items-center justify-center border-[1.5px] text-transparent hover:bg-white/5 hover:text-neutral-400 ${
            PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[4]
          }`}
        >
          <Check className="size-3" strokeWidth={3} />
        </button>
        <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <span className="block text-sm leading-snug font-medium text-neutral-100">{task.title}</span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            {task.due ? (
              <span className={`tm-mono text-[11px] ${overdue ? "text-[var(--danger)]" : "text-neutral-400"}`}>
                {formatWhen(task.due, task.dueTime, today)}
              </span>
            ) : null}
            {children.length > 0 ? (
              <span className="tm-mono text-[11px] text-neutral-500">
                {done}/{children.length}
              </span>
            ) : null}
            {labels.map((label) => {
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <span key={label.id} className={`px-2 py-0.5 text-[11px] font-medium ${styles.chip}`}>
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
