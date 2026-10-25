import { useMemo, useState } from "react";
import {
  Bell,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Inbox,
  LogOut,
  PanelLeft,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Tags,
  X,
} from "lucide-react";
import { INBOX_ID, projectColorHex } from "../constants.js";
import { ProjectDialog } from "./ProjectDialog.jsx";
import { descendantProjectIds } from "../model.js";

const nav = [
  { kind: "inbox", label: "Inbox", icon: Inbox },
  { kind: "today", label: "Today", icon: CalendarDays },
  { kind: "upcoming", label: "Upcoming", icon: CalendarClock },
];

function projectRows(projects) {
  const visible = new Set(projects.map((project) => project.id));
  const byParent = new Map();
  for (const project of projects) {
    const key = project.parentId && visible.has(project.parentId) ? project.parentId : "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(project);
  }
  for (const list of byParent.values()) {
    list.sort((left, right) => left.name.localeCompare(right.name));
  }
  const walk = (parentId, depth) =>
    (byParent.get(parentId) ?? []).flatMap((project) => [
      { project, depth },
      ...walk(project.id, depth + 1),
    ]);
  return walk("", 0);
}

export function Sidebar({
  doc,
  view,
  counts,
  search,
  searchRef,
  onSearch,
  accountName = "",
  avatar = "",
  showCounts = true,
  sidebarItems = { inbox: true, today: true, upcoming: true, browse: true, reporting: true },
  onOpenSettings,
  onLogout,
  onClose,
  onView,
  onQuickAdd,
  onHelp,
  onAddProject,
  onRenameProject,
  onDeleteProject,
  onParentProject,
  onFavoriteProject,
  onCycleProject,
  teams = [],
}) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [projectDialog, setProjectDialog] = useState(undefined);
  const [movingId, setMovingId] = useState(null);
  const projects = doc.projects.filter((project) => project.id !== INBOX_ID && !project.archived);
  const archived = doc.projects.filter((project) => project.archived);
  const rows = projectRows(projects);
  const initial = (accountName || "T").slice(0, 1).toUpperCase();
  const reminders = doc.tasks.filter((task) => !task.completed && task.reminder).slice(0, 8);
  const favorites = useMemo(
    () => [
      ...doc.projects
        .filter((project) => project.favorite && !project.archived && project.id !== INBOX_ID)
        .map((item) => ({ kind: "project", item })),
      ...doc.labels.filter((label) => label.favorite).map((item) => ({ kind: "label", item })),
      ...doc.filters.filter((filter) => filter.favorite).map((item) => ({ kind: "filter", item })),
    ],
    [doc.filters, doc.labels, doc.projects],
  );

  return (
    <>
    <aside className="tm-sidebar tm-rule flex h-full w-[272px] shrink-0 flex-col border-r bg-[var(--sidebar)] text-neutral-200">
      <div className="flex items-center gap-1 px-3 pt-4 pb-1">
        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setAccountOpen((value) => !value)}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-white/5"
          >
            {avatar ? (
              <img src={avatar} alt="" className="tm-check size-8 shrink-0 object-cover" />
            ) : (
              <span className="tm-check grid size-8 shrink-0 place-items-center bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]">
                {initial}
              </span>
            )}
            <span className="min-w-0 text-left leading-tight">
              <span className="block truncate text-sm font-semibold text-white">{accountName || "TaskMan"}</span>
              <span className="tm-eyebrow block text-[9.5px]!">Workspace</span>
            </span>
            <ChevronDown className="ml-auto size-3.5 shrink-0 text-neutral-500" />
          </button>
          {accountOpen ? (
            <>
              <button
                type="button"
                aria-label="Close account menu"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setAccountOpen(false)}
              />
              <div className="absolute top-10 left-0 z-30 w-56 rounded-xl border border-white/10 bg-[var(--menu)] py-1 text-sm shadow-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    onOpenSettings?.();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
                >
                  <Settings className="size-4 text-neutral-400" />
                  Settings
                  <span className="ml-auto text-[11px] text-neutral-500">O then S</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/5"
                >
                  <LogOut className="size-4 text-neutral-400" />
                  Log out
                </button>
              </div>
            </>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Reminders"
          onClick={() => setBellOpen((value) => !value)}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <Bell className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Collapse sidebar"
          onClick={onClose}
          className="rounded-md p-1.5 text-neutral-400 hover:bg-white/5 hover:text-white"
        >
          <PanelLeft className="size-4" />
        </button>
      </div>
      {bellOpen ? (
        <div className="tm-rule mx-3 mt-2 rounded-md border bg-white/5 p-2.5 text-xs text-neutral-300">
          <p className="tm-eyebrow mb-1.5">Reminders</p>
          {reminders.length === 0 ? (
            <p>No reminders set.</p>
          ) : (
            reminders.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onView({ kind: "search", query: task.title })}
                className="block w-full truncate py-1 text-left hover:text-white"
              >
                {task.title}
                <span className="text-neutral-500"> · {task.reminder}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onQuickAdd}
        className="tm-btn mx-3 mt-4 flex items-center gap-2 bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        Add task
        <span className="tm-mono ml-auto text-[10px] font-medium opacity-70">Ctrl K</span>
      </button>
      <label className="tm-rule mx-3 mt-2 flex items-center gap-2 rounded-md border bg-white/[0.03] px-2.5 py-1.5 focus-within:border-[var(--accent)]">
        <Search className="size-4 text-neutral-500" />
        <input
          ref={searchRef}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search"
          aria-label="Search"
          className="w-full bg-transparent py-0.5 text-sm outline-none placeholder:text-neutral-500"
        />
        <span className="tm-kbd shrink-0">Ctrl F</span>
      </label>
      <nav className="mt-5 px-2" aria-label="Views">
        {nav.filter((item) => sidebarItems[item.kind] !== false).map((item) => {
          const Icon = item.icon;
          const active = view.kind === item.kind;
          const count = counts[item.kind];
          return (
            <button
              key={item.kind}
              type="button"
              data-active={active}
              onClick={() => onView({ kind: item.kind })}
              className={`tm-nav flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${active ? "text-white" : "text-neutral-300"}`}
            >
              <Icon className={`size-4 ${active ? "text-[var(--accent-text)]" : "text-neutral-500"}`} aria-hidden="true" />
              <span className={`flex-1 ${active ? "font-semibold" : ""}`}>{item.label}</span>
              {showCounts && (item.kind === "upcoming" ? count > 0 : true) ? (
                <span className={`tm-mono text-[11px] ${active ? "text-[var(--mark)]" : "text-neutral-500"}`}>{count}</span>
              ) : null}
            </button>
          );
        })}
        {sidebarItems.browse !== false ? (
          <button
            type="button"
            data-active={view.kind === "browse"}
            onClick={() => onView({ kind: "browse" })}
            className={`tm-nav flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${view.kind === "browse" ? "text-white" : "text-neutral-300"}`}
          >
            <Tags className={`size-4 ${view.kind === "browse" ? "text-[var(--accent-text)]" : "text-neutral-500"}`} />
            <span className={view.kind === "browse" ? "font-semibold" : ""}>Filters & Labels</span>
          </button>
        ) : null}
        {sidebarItems.reporting !== false ? (
          <button
            type="button"
            data-active={view.kind === "reporting"}
            onClick={() => onView({ kind: "reporting" })}
            className={`tm-nav flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-white/5 ${view.kind === "reporting" ? "text-white" : "text-neutral-300"}`}
          >
            <SlidersHorizontal className={`size-4 ${view.kind === "reporting" ? "text-[var(--accent-text)]" : "text-neutral-500"}`} />
            <span className={view.kind === "reporting" ? "font-semibold" : ""}>Reporting</span>
          </button>
        ) : null}
      </nav>
      <div className="mt-6 flex-1 overflow-y-auto px-2 pb-3">
        {favorites.length > 0 ? (
          <section className="mb-5">
            <h2 className="tm-eyebrow tm-ruled mb-1 px-2">Favorites</h2>
            {favorites.map(({ kind, item }) => (
              <button
                key={`${kind}-${item.id}`}
                type="button"
                onClick={() => onView({ kind, id: item.id })}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm text-neutral-300 hover:bg-white/5"
              >
                <Star className="size-3.5 fill-[var(--warn)] text-[var(--warn)]" />
                <span className="truncate">{item.name}</span>
              </button>
            ))}
          </section>
        ) : null}
        <div className="mb-1 flex items-center gap-1 px-2">
          <h2 className="tm-eyebrow tm-ruled flex-1">
            My Projects
          </h2>
          <button
            type="button"
            aria-label="Add project"
            onClick={() => setProjectDialog({ parentId: null, teamId: null })}
            className="rounded p-1 text-neutral-500 hover:bg-white/5 hover:text-white"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        <ul className="mt-1">
          {rows.filter(({ project }) => !project.teamId || !teams.some((team) => team.id === project.teamId)).map(({ project, depth }) => (
            <li key={project.id}>
              <ProjectRow
                project={project}
                depth={depth}
                active={view.kind === "project" && view.id === project.id}
                count={showCounts ? (counts.projects[project.id] ?? 0) : null}
                moving={movingId === project.id}
                parents={projects.filter((item) => {
                  if (item.id === project.id) return false;
                  return !descendantProjectIds(doc, project.id).has(item.id);
                })}
                onOpen={() => onView({ kind: "project", id: project.id })}
                onRename={(name) => onRenameProject(project.id, name)}
                onDelete={() => onDeleteProject(project.id)}
                onFavorite={() => onFavoriteProject(project.id)}
                onAddChild={() => setProjectDialog({ parentId: project.id, teamId: project.teamId ?? null })}
                onToggleMove={() => setMovingId((current) => (current === project.id ? null : project.id))}
                onParent={(parentId) => onParentProject(project.id, parentId)}
                onCycle={() => onCycleProject?.(project.id)}
              />
            </li>
          ))}
        </ul>
        {teams.map((team) => {
          const teamRows = rows.filter(({ project }) => project.teamId === team.id);
          return (
            <div key={team.id} className="mt-5">
              <div className="flex items-center gap-1 px-2">
                {team.logo ? (
                  <img src={team.logo} alt="" className="tm-check mr-1 size-4 object-cover" />
                ) : (
                  <span className="tm-check mr-1 grid size-4 place-items-center bg-[var(--accent)] text-[10px] font-bold text-[var(--on-accent)]">
                    {team.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <h2 className="tm-eyebrow tm-ruled min-w-0 flex-1 truncate">{team.name}</h2>
                <button
                  type="button"
                  aria-label={`Add project to ${team.name}`}
                  onClick={() => setProjectDialog({ parentId: null, teamId: team.id })}
                  className="rounded p-1 text-neutral-500 hover:bg-white/5 hover:text-white"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <ul className="mt-1">
                {teamRows.map(({ project, depth }) => (
                  <li key={project.id}>
                    <ProjectRow
                      project={project}
                      depth={depth}
                      active={view.kind === "project" && view.id === project.id}
                      count={showCounts ? (counts.projects[project.id] ?? 0) : null}
                      moving={movingId === project.id}
                      parents={projects.filter((item) => item.id !== project.id && !descendantProjectIds(doc, project.id).has(item.id))}
                      onOpen={() => onView({ kind: "project", id: project.id })}
                      onRename={(name) => onRenameProject(project.id, name)}
                      onDelete={() => onDeleteProject(project.id)}
                      onFavorite={() => onFavoriteProject(project.id)}
                      onAddChild={() => setProjectDialog({ parentId: project.id, teamId: team.id })}
                      onToggleMove={() => setMovingId((current) => (current === project.id ? null : project.id))}
                      onParent={(parentId) => onParentProject(project.id, parentId)}
                      onCycle={() => onCycleProject?.(project.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {archived.length > 0 ? (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="tm-eyebrow px-2 hover:text-neutral-300"
            >
              Archived · {archived.length}
            </button>
            {showArchived
              ? archived.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    depth={0}
                    active={view.kind === "project" && view.id === project.id}
                    count={showCounts ? (counts.projects[project.id] ?? 0) : null}
                    moving={false}
                    parents={[]}
                    onOpen={() => onView({ kind: "project", id: project.id })}
                    onRename={(name) => onRenameProject(project.id, name)}
                    onDelete={() => onDeleteProject(project.id)}
                  />
                ))
              : null}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onHelp}
        className="tm-rule flex items-center gap-2.5 border-t px-5 py-3.5 text-[13px] text-neutral-400 hover:text-white"
      >
        <CircleHelp className="size-4" />
        Help & resources
        <span className="tm-kbd ml-auto">?</span>
      </button>
    </aside>
    {projectDialog !== undefined ? (
      <ProjectDialog
        doc={doc}
        teams={teams}
        parentId={projectDialog.parentId}
        teamId={projectDialog.teamId}
        onClose={() => setProjectDialog(undefined)}
        onSubmit={(input) => {
          onAddProject(input);
          setProjectDialog(undefined);
        }}
      />
    ) : null}
    </>
  );
}

function ProjectRow({
  project,
  depth,
  active,
  count,
  moving,
  parents,
  onOpen,
  onRename,
  onDelete,
  onFavorite,
  onAddChild,
  onToggleMove,
  onParent,
  onCycle,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(project.name);
  return (
    <div data-active={active} className="tm-nav rounded-md hover:bg-white/5">
      {editing ? (
        <form
          className="px-2 py-1"
          style={{ paddingLeft: 8 + depth * 14 }}
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
            className="w-full rounded bg-white/10 px-2 py-1 text-sm outline-none"
          />
        </form>
      ) : (
        <div className="group flex items-center" style={{ paddingLeft: depth * 14 }}>
          <button
            type="button"
            onClick={onOpen}
            onDoubleClick={() => {
              setDraft(project.name);
              setEditing(true);
            }}
            className={`flex min-w-0 flex-1 items-center gap-2.5 py-1.5 pr-1 pl-3 text-left text-sm ${active ? "font-semibold text-white" : "text-neutral-300"}`}
          >
            <span
              role="presentation"
              onClick={(event) => {
                event.stopPropagation();
                onCycle?.();
              }}
              className="tm-check size-2.5 shrink-0"
              style={{ background: projectColorHex(project.color) }}
            />
            <span className="truncate">{project.name}</span>
            {count == null ? null : <span className="tm-mono ml-auto text-[11px] font-normal text-neutral-500">{count}</span>}
          </button>
          {onAddChild ? (
            <button
              type="button"
              aria-label={`Add subproject to ${project.name}`}
              onClick={onAddChild}
              className="rounded p-1 text-neutral-400 opacity-0 hover:text-white group-hover:opacity-100"
            >
              <Plus className="size-3.5" />
            </button>
          ) : null}
          {onFavorite ? (
            <button
              type="button"
              aria-label={project.favorite ? `Unfavorite ${project.name}` : `Favorite ${project.name}`}
              onClick={onFavorite}
              className={`rounded p-1 hover:text-[var(--warn)] ${
                project.favorite ? "text-[var(--warn)] opacity-100" : "text-neutral-400 opacity-0 group-hover:opacity-100"
              }`}
            >
              <Star className={`size-3.5 ${project.favorite ? "fill-[var(--warn)] text-[var(--warn)]" : ""}`} />
            </button>
          ) : null}
          {onToggleMove ? (
            <button
              type="button"
              aria-label={`Move ${project.name}`}
              onClick={onToggleMove}
              className="rounded px-1 text-[10px] text-neutral-400 opacity-0 hover:text-white group-hover:opacity-100"
            >
              Move
            </button>
          ) : null}
          <button
            type="button"
            aria-label={`Delete ${project.name}`}
            onClick={onDelete}
            className="rounded p-1 text-neutral-400 opacity-0 hover:text-white group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      {moving && onParent ? (
        <label className="block px-2 pb-2 text-[11px] text-neutral-500" style={{ paddingLeft: 12 + depth * 14 }}>
          Parent project
          <select
            aria-label={`Parent of ${project.name}`}
            value={project.parentId ?? ""}
            onChange={(event) => onParent(event.target.value || null)}
            className="mt-1 w-full rounded-md border border-white/10 bg-[var(--chip)] px-2 py-1 text-sm text-neutral-100"
          >
            <option value="">No parent</option>
            {parents.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
