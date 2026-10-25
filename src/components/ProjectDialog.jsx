import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronDown, LayoutGrid, LayoutList, Lock, X } from "lucide-react";
import { INBOX_ID, PROJECT_COLORS, projectColorHex, projectColorName } from "../constants.js";

const LAYOUTS = [
  { id: "list", label: "List", icon: LayoutList },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
];

export function ProjectDialog({ doc, parentId = null, teamId = null, teams = [], onClose, onSubmit }) {
  const parents = doc.projects.filter((project) => project.id !== INBOX_ID && !project.archived);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("charcoal");
  const [parent, setParent] = useState(parentId && parents.some((project) => project.id === parentId) ? parentId : "");
  const [workspace, setWorkspace] = useState(teamId && teams.some((team) => team.id === teamId) ? teamId : "");
  const [view, setView] = useState("list");
  const [colorsOpen, setColorsOpen] = useState(false);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-labelledby="add-project-title"
        className="flex max-h-[min(640px,calc(100%-2rem))] w-[min(28rem,calc(100%-1rem))] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#1f1f1f] text-neutral-100 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onSubmit({
            name,
            description,
            color,
            parentId: parent || null,
            teamId: workspace || null,
            view,
          });
        }}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 id="add-project-title" className="text-base font-semibold">
            Add project
          </h2>
          <button type="button" aria-label="Close add project" onClick={onClose} className="rounded-md p-1 text-neutral-400 hover:bg-white/5">
            <X className="size-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <label className="block">
            <span className="text-sm font-medium">Name</span>
            <input
              autoFocus
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              aria-label="Project name"
              className="mt-2 w-full rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
            />
            <span className="mt-1 block text-right text-xs text-neutral-500">{name.length}/120</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add a description"
              aria-label="Project description"
              rows={3}
              className="mt-2 w-full resize-none rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-[var(--accent)]"
            />
          </label>
          <div className="relative">
            <span className="text-sm font-medium">Color</span>
            <button
              type="button"
              aria-expanded={colorsOpen}
              onClick={() => setColorsOpen((open) => !open)}
              className="mt-2 flex w-full items-center gap-2 rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 text-left text-sm"
            >
              <span className="size-3 rounded-full" style={{ background: projectColorHex(color) }} />
              <span className="flex-1">{projectColorName(color)}</span>
              <ChevronDown className="size-4 text-neutral-500" />
            </button>
            {colorsOpen ? (
              <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#2a2a2a] py-1 shadow-xl">
                {PROJECT_COLORS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setColor(item.id);
                      setColorsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10"
                  >
                    {color === item.id ? <Check className="size-3.5" /> : <span className="size-3.5" />}
                    <span className="size-2.5 rounded-full" style={{ background: item.hex }} />
                    {item.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label className="block">
            <span className="text-sm font-medium">Workspace</span>
            <select
              value={workspace}
              aria-label="Workspace"
              onChange={(event) => setWorkspace(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 text-sm text-neutral-100"
            >
              <option value="">My Projects</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Parent project</span>
            <select
              value={parent}
              aria-label="Parent project"
              onChange={(event) => setParent(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-[#2a2a2a] px-3 py-2 text-sm outline-none"
            >
              <option value="">No parent</option>
              {parents.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <div>
            <span className="text-sm font-medium">Access</span>
            <div className="mt-2 flex items-start gap-2 text-sm text-neutral-300">
              <Lock className="mt-0.5 size-4 text-neutral-500" />
              <span>
                <span className="block">Restricted</span>
                <span className="text-xs text-neutral-500">Only invited people can edit. Sharing is not available yet.</span>
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Layout</span>
            <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-white/5 p-1">
              {LAYOUTS.map((item) => {
                const Icon = item.icon;
                const selected = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setView(item.id)}
                    className={`flex items-center justify-center gap-2 rounded-md px-2 py-2 text-sm ${
                      selected ? "bg-[#3a3a3a] text-white" : "text-neutral-400"
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <footer className="flex justify-end gap-2 border-t border-white/10 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-md bg-white/10 px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-md bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Add
          </button>
        </footer>
      </form>
    </div>
  );
}
