import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDue } from "../dates.js";
import { tasksDueOn } from "../query.js";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

const gridStart = (year, month) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return new Date(year, month, 1 - offset);
};

const isoFromDate = (date) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
};

export function MonthBoard({ doc, today, onOpen, onToggle }) {
  const [anchor, setAnchor] = useState(() => {
    const [year, month] = today.split("-").map(Number);
    return { year, month: month - 1 };
  });
  const [selected, setSelected] = useState(today);

  const cells = useMemo(() => {
    const start = gridStart(anchor.year, anchor.month);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const iso = isoFromDate(date);
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === anchor.month,
        tasks: tasksDueOn(doc, iso),
      };
    });
  }, [anchor.month, anchor.year, doc]);

  const selectedTasks = tasksDueOn(doc, selected);

  const shift = (amount) => {
    const date = new Date(anchor.year, anchor.month + amount, 1);
    setAnchor({ year: date.getFullYear(), month: date.getMonth() });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => shift(-1)}
          className="rounded-md p-1 text-stone-500 hover:bg-stone-100"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-sm font-medium text-stone-800">
          {monthLabel(anchor.year, anchor.month)}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => shift(1)}
          className="rounded-md p-1 text-stone-500 hover:bg-stone-100"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone-400">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => (
          <button
            key={cell.iso}
            type="button"
            onClick={() => setSelected(cell.iso)}
            aria-pressed={selected === cell.iso}
            className={`min-h-16 rounded-lg border px-1.5 py-1 text-left ${
              selected === cell.iso
                ? "border-indigo-300 bg-indigo-50"
                : "border-transparent bg-stone-50 hover:bg-stone-100"
            } ${cell.iso === today ? "ring-1 ring-indigo-200" : ""}`}
          >
            <span className={`text-xs ${cell.inMonth ? "text-stone-700" : "text-stone-300"}`}>
              {cell.day}
            </span>
            <span className="mt-1 block space-y-0.5">
              {cell.tasks.slice(0, 3).map((task) => (
                <span
                  key={task.id}
                  className={`block truncate text-[10px] ${
                    task.completed ? "text-stone-300 line-through" : "text-stone-600"
                  }`}
                >
                  {task.title}
                </span>
              ))}
              {cell.tasks.length > 3 ? (
                <span className="block text-[10px] text-stone-400">+{cell.tasks.length - 3}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium text-stone-700">{formatDue(selected, today)}</h3>
        {selectedTasks.length === 0 ? (
          <p className="mt-2 text-sm text-stone-400">Nothing due this day.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {selectedTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  aria-pressed={task.completed}
                  aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                  onClick={() => onToggle(task.id)}
                  className={`size-4 rounded-full border ${
                    task.completed ? "border-indigo-600 bg-indigo-600" : "border-stone-300"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => onOpen(task)}
                  className={`truncate text-left text-sm ${
                    task.completed ? "text-stone-400 line-through" : "text-stone-800"
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
