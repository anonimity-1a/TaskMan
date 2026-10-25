import { X } from "lucide-react";

export function HelpDialog({ onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/60" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-labelledby="help-title"
        className="mx-auto mt-20 w-[min(36rem,calc(100%-2rem))] rounded-2xl border border-white/10 bg-[var(--panel)] p-5 text-neutral-200 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="help-title" className="text-sm font-semibold text-white">
            Shortcuts and queries
          </h2>
          <button
            type="button"
            aria-label="Close help"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="space-y-1 text-sm text-neutral-300">
          <li>Ctrl+K opens quick add.</li>
          <li>Ctrl+F focuses search.</li>
          <li>Escape closes the open panel.</li>
        </ul>
        <p className="mt-4 text-sm text-neutral-300">
          Quick add reads the title. A task such as “Pay rent tomorrow !!1 every month #Home @bills
          at 9am” sets the date, priority, repeat, project, label, and time. !!1 through !!4 and
          p1 through p4 set priority. Priority 4 is the default.
        </p>
        <p className="mt-3 text-sm text-neutral-300">
          Saved filters match every word: today, overdue, tomorrow, upcoming, next week, no date,
          recurring, completed, p1, @label, #project, or any word in the name. Projects can contain
          subprojects from the sidebar. The view menu’s Manage data imports and exports a Todoist
          CSV. Open the project first, then import, and tasks, sections, priorities, dates, and
          labels land in that project.
        </p>
      </div>
    </div>
  );
}
