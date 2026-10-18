import { X } from "lucide-react";

export function HelpDialog({ onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-stone-900/30" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-labelledby="help-title"
        className="mx-auto mt-20 w-[min(36rem,calc(100%-2rem))] rounded-2xl bg-white p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="help-title" className="text-sm font-semibold text-stone-800">
            Shortcuts and queries
          </h2>
          <button
            type="button"
            aria-label="Close help"
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100"
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="space-y-1 text-sm text-stone-600">
          <li>Ctrl+K opens quick add.</li>
          <li>Ctrl+F focuses search.</li>
          <li>Escape closes the open panel.</li>
        </ul>
        <p className="mt-4 text-sm text-stone-700">
          Quick add reads the title. A task such as “Pay rent tomorrow p1 every month #Home @bills
          at 9am” sets the date, priority, repeat, project, label, and time.
        </p>
        <p className="mt-3 text-sm text-stone-700">
          Saved filters match every word: today, overdue, tomorrow, upcoming, next week, no date,
          recurring, completed, p1, @label, #project, or any word in the name.
        </p>
      </div>
    </div>
  );
}
