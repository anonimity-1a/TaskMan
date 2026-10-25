import { X } from "lucide-react";

const SHORTCUTS = [
  [["Ctrl", "K"], "Open quick add"],
  [["Ctrl", "F"], "Focus search"],
  [["Esc"], "Close the open panel"],
];

export function HelpDialog({ onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-labelledby="help-title"
        className="tm-surface mx-auto mt-[12vh] w-[min(38rem,calc(100%-2rem))] overflow-hidden rounded-xl text-neutral-200"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="tm-rule flex items-center justify-between border-b px-6 pt-5 pb-4">
          <div>
            <p className="tm-eyebrow">Help</p>
            <h2 id="help-title" className="mt-1 font-display text-xl font-bold tracking-tight text-[var(--title-ink)]">
              Shortcuts and queries
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close help"
            onClick={onClose}
            className="tm-rule rounded-md border p-1.5 text-neutral-400 hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <ul className="tm-rule overflow-hidden rounded-lg border text-sm text-neutral-300">
            {SHORTCUTS.map(([keys, label]) => (
              <li key={label} className="tm-rule flex items-center justify-between border-b px-4 py-2.5 last:border-b-0">
                <span>{label}</span>
                <span className="flex items-center gap-1">
                  {keys.map((key) => (
                    <kbd key={key} className="tm-kbd">
                      {key}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <h3 className="tm-eyebrow tm-ruled mt-6">Quick add</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            Quick add reads the title. A task such as “Pay rent tomorrow !!1 every month #Home @bills
            at 9am” sets the date, priority, repeat, project, label, and time. !!1 through !!4 and
            p1 through p4 set priority. Priority 4 is the default.
          </p>
          <h3 className="tm-eyebrow tm-ruled mt-6">Filters & data</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            Saved filters match every word: today, overdue, tomorrow, upcoming, next week, no date,
            recurring, completed, p1, @label, #project, or any word in the name. Projects can contain
            subprojects from the sidebar. The view menu’s Manage data imports and exports a Todoist
            CSV. Open the project first, then import, and tasks, sections, priorities, dates, and
            labels land in that project.
          </p>
        </div>
      </div>
    </div>
  );
}
