import { useState } from "react";
import { CalendarClock, CalendarDays, Inbox, Plus, Tag, X } from "lucide-react";
import { COLOR_STYLES, INBOX_ID } from "../model.js";

const nav = [
  { kind: "inbox", label: "Inbox", icon: Inbox },
  { kind: "today", label: "Today", icon: CalendarDays },
  { kind: "upcoming", label: "Upcoming", icon: CalendarClock },
];

function NameField({ placeholder, onSubmit }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="mt-1 flex items-center gap-2 px-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
        setValue("");
      }}
    >
      <Plus className="size-4 shrink-0 text-stone-400" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-transparent py-1 text-sm text-stone-700 outline-none placeholder:text-stone-400"
      />
      <button type="submit" className="rounded px-1 text-xs text-indigo-700 hover:bg-indigo-50">
        Add
      </button>
    </form>
  );
}

function Collection({ title, children, field }) {
  return (
    <section className="mt-6">
      <h2 className="px-3 text-xs font-semibold tracking-wide text-stone-400 uppercase">
        {title}
      </h2>
      <div className="mt-1">{children}</div>
      {field}
    </section>
  );
}

export function Sidebar({
  doc,
  view,
  counts,
  onView,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onAddLabel,
  onRenameLabel,
  onDeleteLabel,
}) {
  const projects = doc.projects.filter((project) => project.id !== INBOX_ID);
  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-stone-200 bg-white">
      <div className="px-5 pt-5 pb-3">
        <p className="text-sm font-semibold tracking-tight text-stone-900">
          Local Tasks
        </p>
        <p className="text-xs text-stone-500">Stored on this computer</p>
      </div>
      <nav className="px-2" aria-label="Views">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = view.kind === item.kind;
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => onView({ kind: item.kind })}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                active
                  ? "bg-indigo-50 font-medium text-indigo-800"
                  : "text-stone-700 hover:bg-stone-50"
              }`}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              <span className="text-xs text-stone-400">{counts[item.kind]}</span>
            </button>
          );
        })}
      </nav>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <Collection
          title="Projects"
          field={<NameField placeholder="Add project" onSubmit={onAddProject} />}
        >
          {projects.map((project) => (
            <ItemButton
              key={project.id}
              active={view.kind === "project" && view.id === project.id}
              label={project.name}
              color={project.color}
              count={counts.projects[project.id] ?? 0}
              onOpen={() => onView({ kind: "project", id: project.id })}
              onRename={(name) => onRenameProject(project.id, name)}
              onDelete={() => onDeleteProject(project.id)}
            />
          ))}
        </Collection>
        <Collection
          title="Labels"
          field={<NameField placeholder="Add label" onSubmit={onAddLabel} />}
        >
          {doc.labels.length === 0 ? (
            <p className="px-3 py-1 text-sm text-stone-400">No labels yet</p>
          ) : (
            doc.labels.map((label) => (
              <ItemButton
                key={label.id}
                active={view.kind === "label" && view.id === label.id}
                label={label.name}
                color={label.color}
                icon={Tag}
                count={counts.labels[label.id] ?? 0}
                onOpen={() => onView({ kind: "label", id: label.id })}
                onRename={(name) => onRenameLabel(label.id, name)}
                onDelete={() => onDeleteLabel(label.id)}
              />
            ))
          )}
        </Collection>
      </div>
    </aside>
  );
}

function ItemButton({
  active,
  label,
  color,
  count,
  icon: Icon,
  onOpen,
  onRename,
  onDelete,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const styles = COLOR_STYLES[color] ?? COLOR_STYLES.indigo;
  return (
    <div
      className={`group flex items-center gap-2 rounded-lg pr-2 ${
        active ? "bg-indigo-50" : "hover:bg-stone-50"
      }`}
    >
      {editing ? (
        <form
          className="min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            onRename(draft);
            setEditing(false);
          }}
        >
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              onRename(draft);
              setEditing(false);
            }}
            className="w-full rounded-lg bg-white px-3 py-1.5 text-sm outline-none ring-1 ring-indigo-300"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          onDoubleClick={() => {
            setDraft(label);
            setEditing(true);
          }}
          className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-sm text-stone-700"
        >
          {Icon ? (
            <Icon className="size-3.5 text-stone-400" aria-hidden="true" />
          ) : (
            <span className={`size-2.5 rounded-full ${styles.dot}`} />
          )}
          <span className="truncate">{label}</span>
          <span className="ml-auto text-xs text-stone-400">{count}</span>
        </button>
      )}
      <button
        type="button"
        aria-label={`Delete ${label}`}
        onClick={onDelete}
        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
