import { useState } from "react";
import { Check, Plus } from "lucide-react";
import {
  COLOR_STYLES,
  PRIORITY_STYLES,
  childrenOf,
  formatWhen,
} from "../model.js";

export function Board({
  doc,
  today,
  selection,
  selectedId,
  onOpen,
  onToggle,
  onMoveSection,
  onAddInSection,
  onRenameSection,
  onDeleteSection,
}) {
  const columns =
    selection.groups && selection.groups.length > 0
      ? selection.groups
      : [{ id: "open", title: "Tasks", sectionId: null, tasks: selection.open }];

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
          onMoveSection={onMoveSection}
          onAddInSection={onAddInSection}
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
  onMoveSection,
  onAddInSection,
  onRenameSection,
  onDeleteSection,
}) {
  const [over, setOver] = useState(false);
  return (
    <section
      className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 ${
        over ? "border-indigo-300 bg-indigo-50/60" : "border-stone-200 bg-stone-50"
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
        if (id) onMoveSection(id, column.sectionId);
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        {column.sectionId ? (
          <input
            aria-label={`Rename section ${column.title}`}
            key={column.title}
            defaultValue={column.title}
            onBlur={(event) => onRenameSection(column.sectionId, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-700 outline-none"
          />
        ) : (
          <h3 className="flex-1 text-sm font-medium text-stone-700">{column.title}</h3>
        )}
        <span className="text-xs text-stone-400">{column.tasks.length}</span>
        {column.sectionId ? (
          <button
            type="button"
            onClick={() => onDeleteSection(column.sectionId)}
            className="text-xs text-stone-400 hover:text-stone-700"
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
      <button
        type="button"
        onClick={() => onAddInSection(column.sectionId)}
        className="mt-3 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
      >
        <Plus className="size-4" />
        Add task
      </button>
    </section>
  );
}

function Card({ doc, task, today, selected, onOpen, onToggle }) {
  const labels = doc.labels.filter((label) => task.labelIds.includes(label.id));
  const children = childrenOf(doc, task.id);
  const overdue = task.due && task.due < today && !task.completed;
  return (
    <article
      className={`rounded-xl border bg-white p-3 shadow-sm ${
        selected ? "border-indigo-300" : "border-stone-200"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          draggable
          aria-label={`Drag ${task.title}`}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", task.id);
            event.dataTransfer.effectAllowed = "move";
          }}
          className="mt-0.5 cursor-grab text-xs text-stone-300"
        >
          ::
        </button>
        <button
          type="button"
          aria-pressed={task.completed}
          aria-label={`Mark ${task.title} complete`}
          onClick={() => onToggle(task.id)}
          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-transparent hover:text-indigo-400 ${
            PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES[4]
          }`}
        >
          <Check className="size-3" />
        </button>
        <button type="button" onClick={() => onOpen(task)} className="min-w-0 flex-1 text-left">
          <span className="block text-sm text-stone-800">{task.title}</span>
          <span className="mt-1 flex flex-wrap gap-1">
            {task.priority < 4 ? (
              <span className="text-[11px] text-stone-500">P{task.priority}</span>
            ) : null}
            {task.due ? (
              <span className={`text-[11px] ${overdue ? "text-rose-600" : "text-stone-500"}`}>
                {formatWhen(task.due, task.dueTime, today)}
              </span>
            ) : null}
            {children.length > 0 ? (
              <span className="text-[11px] text-stone-400">{children.length} subtasks</span>
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
