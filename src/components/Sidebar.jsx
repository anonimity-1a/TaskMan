import { useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Inbox,
  Plus,
  Star,
  X,
} from "lucide-react";
import { COLOR_STYLES, INBOX_ID } from "../model.js";

const nav = [
  { kind: "inbox", label: "Inbox", icon: Inbox },
  { kind: "today", label: "Today", icon: CalendarDays },
  { kind: "upcoming", label: "Upcoming", icon: CalendarClock },
  { kind: "completed", label: "Completed", icon: CheckCircle2 },
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

function FilterField({ onSubmit }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  return (
    <form
      className="mt-2 space-y-1 px-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name, query);
        setName("");
        setQuery("");
      }}
    >
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Filter name"
        aria-label="Filter name"
        className="w-full bg-transparent py-1 text-sm text-stone-700 outline-none placeholder:text-stone-400"
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="today p1, @label, #project"
        aria-label="Filter query"
        className="w-full bg-transparent py-1 text-sm text-stone-700 outline-none placeholder:text-stone-400"
      />
      <button type="submit" className="text-xs text-indigo-700 hover:underline">
        Add filter
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
  mobileOpen = false,
  onClose,
  onDisconnect,
  onView,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onCycleProject,
  onFavoriteProject,
  onAddLabel,
  onRenameLabel,
  onDeleteLabel,
  onCycleLabel,
  onFavoriteLabel,
  onAddFilter,
  onRenameFilter,
  onDeleteFilter,
  onCycleFilter,
  onFavoriteFilter,
}) {
  const [showArchived, setShowArchived] = useState(false);
  const projects = doc.projects.filter((project) => project.id !== INBOX_ID && !project.archived);
  const archived = doc.projects.filter((project) => project.archived);
  const favorites = [
    ...doc.projects
      .filter((project) => project.favorite && !project.archived)
      .map((item) => ({ kind: "project", item })),
    ...doc.labels
      .filter((label) => label.favorite)
      .map((item) => ({ kind: "label", item })),
    ...doc.filters
      .filter((filter) => filter.favorite)
      .map((item) => ({ kind: "filter", item })),
  ];

  return (
    <>
    {mobileOpen ? (
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-30 bg-stone-900/30 md:hidden"
        onClick={onClose}
      />
    ) : null}
    <aside
      className={`${mobileOpen ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-72 shrink-0 flex-col border-r border-stone-200 bg-white md:static md:flex`}
    >
      <div className="px-5 pt-5 pb-3">
        <p className="text-sm font-semibold tracking-tight text-stone-900">TaskMan</p>
        <p className="text-xs text-stone-500">Shared with your other devices</p>
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
      <div className="flex-1 overflow-y-auto px-2 pb-6">
        {favorites.length > 0 ? (
          <Collection title="Favorites">
            {favorites.map(({ kind, item }) => (
              <ItemButton
                key={`${kind}-${item.id}`}
                active={view.kind === kind && view.id === item.id}
                label={item.name}
                color={item.color}
                favorite
                count={
                  kind === "project"
                    ? counts.projects[item.id]
                    : kind === "label"
                      ? counts.labels[item.id]
                      : counts.filters[item.id]
                }
                onOpen={() => onView({ kind, id: item.id })}
                onRename={(name) =>
                  kind === "project"
                    ? onRenameProject(item.id, name)
                    : kind === "label"
                      ? onRenameLabel(item.id, name)
                      : onRenameFilter(item.id, name)
                }
                onDelete={() =>
                  kind === "project"
                    ? onDeleteProject(item.id)
                    : kind === "label"
                      ? onDeleteLabel(item.id)
                      : onDeleteFilter(item.id)
                }
                onCycle={() =>
                  kind === "project"
                    ? onCycleProject(item)
                    : kind === "label"
                      ? onCycleLabel(item)
                      : onCycleFilter(item)
                }
                onFavorite={() =>
                  kind === "project"
                    ? onFavoriteProject(item.id)
                    : kind === "label"
                      ? onFavoriteLabel(item.id)
                      : onFavoriteFilter(item.id)
                }
              />
            ))}
          </Collection>
        ) : null}
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
              favorite={project.favorite}
              count={counts.projects[project.id] ?? 0}
              onOpen={() => onView({ kind: "project", id: project.id })}
              onRename={(name) => onRenameProject(project.id, name)}
              onDelete={() => onDeleteProject(project.id)}
              onCycle={() => onCycleProject(project)}
              onFavorite={() => onFavoriteProject(project.id)}
            />
          ))}
          {archived.length > 0 ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowArchived((value) => !value)}
                className="px-3 py-1 text-xs text-stone-500 hover:text-stone-700"
              >
                Archived ({archived.length})
              </button>
              {showArchived
                ? archived.map((project) => (
                    <ItemButton
                      key={project.id}
                      active={view.kind === "project" && view.id === project.id}
                      label={project.name}
                      color={project.color}
                      count={counts.projects[project.id] ?? 0}
                      onOpen={() => onView({ kind: "project", id: project.id })}
                      onRename={(name) => onRenameProject(project.id, name)}
                      onDelete={() => onDeleteProject(project.id)}
                      onCycle={() => onCycleProject(project)}
                    />
                  ))
                : null}
            </div>
          ) : null}
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
                favorite={label.favorite}
                count={counts.labels[label.id] ?? 0}
                onOpen={() => onView({ kind: "label", id: label.id })}
                onRename={(name) => onRenameLabel(label.id, name)}
                onDelete={() => onDeleteLabel(label.id)}
                onCycle={() => onCycleLabel(label)}
                onFavorite={() => onFavoriteLabel(label.id)}
              />
            ))
          )}
        </Collection>
        <Collection title="Filters" field={<FilterField onSubmit={onAddFilter} />}>
          {doc.filters.length === 0 ? (
            <p className="px-3 py-1 text-sm text-stone-400">
              Try today, overdue, p1, or no date
            </p>
          ) : (
            doc.filters.map((filter) => (
              <ItemButton
                key={filter.id}
                active={view.kind === "filter" && view.id === filter.id}
                label={filter.name}
                color={filter.color}
                favorite={filter.favorite}
                count={counts.filters[filter.id] ?? 0}
                onOpen={() => onView({ kind: "filter", id: filter.id })}
                onRename={(name) => onRenameFilter(filter.id, name)}
                onDelete={() => onDeleteFilter(filter.id)}
                onCycle={() => onCycleFilter(filter)}
                onFavorite={() => onFavoriteFilter(filter.id)}
              />
            ))
          )}
        </Collection>
        {onDisconnect ? (
          <button
            type="button"
            onClick={onDisconnect}
            className="mt-6 px-3 text-left text-xs text-stone-400 hover:text-stone-700"
          >
            Change server
          </button>
        ) : null}
      </div>
    </aside>
    </>
  );
}

function ItemButton({
  active,
  label,
  color,
  count,
  favorite = false,
  onOpen,
  onRename,
  onDelete,
  onCycle,
  onFavorite,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const styles = COLOR_STYLES[color] ?? COLOR_STYLES.indigo;
  return (
    <div
      className={`group flex items-center gap-1 rounded-lg pr-1 ${
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
          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm text-stone-700"
        >
          <span
            role="presentation"
            onClick={(event) => {
              event.stopPropagation();
              onCycle?.();
            }}
            className={`size-2.5 shrink-0 rounded-full ${styles.dot}`}
          />
          <span className="truncate">{label}</span>
          <span className="ml-auto text-xs text-stone-400">{count}</span>
        </button>
      )}
      {onFavorite ? (
        <button
          type="button"
          aria-label={favorite ? `Unfavorite ${label}` : `Favorite ${label}`}
          aria-pressed={favorite}
          onClick={onFavorite}
          className="rounded p-1 text-stone-300 hover:text-amber-500"
        >
          <Star className={`size-3.5 ${favorite ? "fill-amber-400 text-amber-500" : ""}`} />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={`Delete ${label}`}
        onClick={onDelete}
        className="rounded p-1 text-stone-300 hover:bg-stone-100 hover:text-stone-700"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
