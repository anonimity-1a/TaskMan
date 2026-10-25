import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDue } from "../dates.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

const gridStart = (year, month, weekStart) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  return new Date(year, month, 1 - offset);
};

const isoFromDate = (date) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
};

export function MonthBoard({ tasks = [], today, weekStart = 0, onOpen, onToggle }) {
  const [anchor, setAnchor] = useState(() => {
    const [year, month] = today.split("-").map(Number);
    return { year, month: month - 1 };
  });
  const [selected, setSelected] = useState(today);

  const cells = useMemo(() => {
    const start = gridStart(anchor.year, anchor.month, weekStart);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = isoFromDate(date);
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === anchor.month,
        tasks: tasks.filter((task) => task.due === iso),
      };
    });
  }, [anchor.month, anchor.year, tasks, weekStart]);

  const selectedTasks = tasks.filter((task) => task.due === selected);

  const shift = (amount) => {
    const date = new Date(anchor.year, anchor.month + amount, 1);
    setAnchor({ year: date.getFullYear(), month: date.getMonth() });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight text-neutral-100">
          {monthLabel(anchor.year, anchor.month)}
        </h2>
        <div className="tm-rule ml-auto flex items-center rounded-md border p-0.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shift(-1)}
            className="rounded p-1.5 text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="tm-rule h-4 border-l" aria-hidden="true" />
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shift(1)}
            className="rounded p-1.5 text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="tm-rule overflow-hidden rounded-lg border">
        <div className="tm-rule grid grid-cols-7 border-b bg-white/[0.02]">
          {[...WEEKDAYS.slice(weekStart), ...WEEKDAYS.slice(0, weekStart)].map((day) => (
            <div key={day} className="tm-eyebrow px-2 py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-[var(--rule)]">
          {cells.map((cell) => (
            <button
              key={cell.iso}
              type="button"
              onClick={() => setSelected(cell.iso)}
              aria-pressed={selected === cell.iso}
              className={`min-h-[4.5rem] px-2 py-1.5 text-left transition-colors ${
                selected === cell.iso
                  ? "bg-[var(--selected)] shadow-[inset_0_0_0_1px_var(--accent)]"
                  : cell.inMonth
                    ? "bg-[var(--canvas)] hover:bg-white/[0.04]"
                    : "bg-[var(--canvas)] opacity-60 hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`tm-mono tm-chip inline-grid min-w-5 place-items-center px-1 text-[11px] leading-5 ${
                  cell.iso === today
                    ? "bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
                    : cell.inMonth
                      ? "text-neutral-200"
                      : "text-neutral-600"
                }`}
              >
                {cell.day}
              </span>
              <span className="mt-1 block space-y-0.5">
                {cell.tasks.slice(0, 3).map((task) => (
                  <span
                    key={task.id}
                    className={`block truncate border-l-2 pl-1.5 text-[10.5px] leading-4 ${
                      task.completed
                        ? "border-transparent text-neutral-600 line-through"
                        : "border-[var(--accent)] text-neutral-300"
                    }`}
                  >
                    {task.title}
                  </span>
                ))}
                {cell.tasks.length > 3 ? (
                  <span className="tm-mono block text-[10px] text-neutral-500">+{cell.tasks.length - 3}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h3 className="tm-eyebrow tm-ruled">{formatDue(selected, today)}</h3>
        {selectedTasks.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Nothing due this day.</p>
        ) : (
          <ul className="mt-2">
            {selectedTasks.map((task) => (
              <li key={task.id} className="tm-rule flex items-center gap-3 border-b py-2.5 pl-1">
                <button
                  type="button"
                  aria-pressed={task.completed}
                  aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                  onClick={() => onToggle(task.id)}
                  className={`tm-check size-4 border-[1.5px] ${
                    task.completed ? "border-[var(--success)] bg-[var(--success)]" : "border-neutral-500 hover:bg-white/5"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => onOpen(task)}
                  className={`truncate text-left text-sm ${
                    task.completed ? "text-neutral-500 line-through" : "text-neutral-100"
                  }`}
                >
                  {task.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
