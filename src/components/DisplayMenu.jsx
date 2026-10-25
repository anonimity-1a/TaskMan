import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, Columns3, Flag, List } from "lucide-react";
import { PRIORITY_META } from "../constants.js";
import { FACTORY_DISPLAY, displayDelta } from "../display.js";

const GROUPING = [
  ["none", "None"],
  ["date", "Date"],
  ["added", "Date added"],
  ["deadline", "Deadline"],
  ["priority", "Priority"],
  ["label", "Label"],
];

const SORTING = [
  ["default", "Default"],
  ["name", "Name"],
  ["date", "Date"],
  ["added", "Date added"],
  ["deadline", "Deadline"],
  ["priority", "Priority"],
];

const DIRECTION = [
  ["asc", "Ascending"],
  ["desc", "Descending"],
];

const DATES = [
  ["all", "All"],
  ["today", "Today"],
  ["week", "This week"],
  ["next7", "Next 7 days"],
  ["month", "This month"],
  ["next30", "Next 30 days"],
  ["nodate", "No date"],
];

const CREATED = [
  ["all", "All"],
  ["today", "Today"],
  ["last7", "Last 7 days"],
  ["last30", "Last 30 days"],
];

const labelOf = (options, value) => options.find(([id]) => id === value)?.[1] ?? value;

function ChoiceMenu({ options, value, onPick }) {
  return (
    <div className="absolute top-full right-0 z-20 mt-1 max-h-72 w-44 overflow-y-auto rounded-lg border border-white/10 bg-[var(--menu)] py-1 shadow-xl">
      {options.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onPick(id)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 ${
            value === id ? "bg-white/10 text-white" : "text-neutral-200"
          }`}
        >
          <Check className={`size-3.5 ${value === id ? "opacity-100" : "opacity-0"}`} />
          {label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, dirty, value, open, onToggle, children }) {
  return (
    <div className="relative flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-sm text-neutral-200">
        <span className={`size-1.5 rounded-full ${dirty ? "bg-orange-400" : "bg-transparent"}`} />
        {label}
      </span>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="inline-flex min-w-28 items-center justify-between gap-2 rounded-md border border-white/10 bg-[var(--field)] px-2.5 py-1.5 text-sm text-neutral-100"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className="size-3.5 text-neutral-400" />
      </button>
      {open ? children : null}
    </div>
  );
}

export function DisplayMenu({ display, onChange }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [sortOpen, setSortOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(true);
  const rootRef = useRef(null);
  const delta = displayDelta(display);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setMenu(null);
      }
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setMenu(null);
      }
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const set = (patch) => onChange({ ...display, ...patch });
  const toggleMenu = (name) => setMenu((current) => (current === name ? null : name));
  const priorityLabel =
    display.priorities.length === 0
      ? "All"
      : display.priorities.length === 1
        ? `Priority ${display.priorities[0]}`
        : `${display.priorities.length} selected`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((value) => !value);
          setMenu(null);
        }}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-neutral-100 hover:bg-white/10"
      >
        <List className="size-4" aria-hidden="true" />
        Display{delta.total > 0 ? `: ${delta.total}` : ""}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Display"
          className="absolute top-full right-0 z-30 mt-2 w-[22rem] rounded-xl border border-white/10 bg-[var(--panel)] p-3 text-neutral-100 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Layout</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["list", "List", List],
              ["board", "Board", Columns3],
              ["calendar", "Calendar", CalendarDays],
            ].map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                aria-pressed={display.layout === id}
                onClick={() => set({ layout: id })}
                className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs ${
                  display.layout === id
                    ? "border-white/20 bg-[var(--menu)] text-white"
                    : "border-transparent bg-[var(--chip)] text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Completed tasks</span>
            <button
              type="button"
              role="switch"
              aria-checked={display.showCompleted}
              onClick={() => set({ showCompleted: !display.showCompleted })}
              className={`relative h-6 w-11 rounded-full ${display.showCompleted ? "bg-neutral-200" : "bg-[var(--chip)]"}`}
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow ${
                  display.showCompleted ? "right-0.5" : "left-0.5 bg-neutral-400"
                }`}
              />
            </button>
          </div>
          <section className="mt-3 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => setSortOpen((value) => !value)}
              className="flex w-full items-center gap-2 py-1 text-sm font-medium"
            >
              Sort
              {delta.sort > 0 ? (
                <span className="grid size-4 place-items-center rounded-full bg-neutral-600 text-[10px]">
                  {delta.sort}
                </span>
              ) : null}
              <ChevronDown className={`ml-auto size-4 text-neutral-500 ${sortOpen ? "" : "-rotate-90"}`} />
            </button>
            {sortOpen ? (
              <div className="mt-1">
                <Field
                  label="Grouping"
                  dirty={display.grouping !== "none"}
                  value={labelOf(GROUPING, display.grouping)}
                  open={menu === "grouping"}
                  onToggle={() => toggleMenu("grouping")}
                >
                  <ChoiceMenu
                    options={GROUPING}
                    value={display.grouping}
                    onPick={(grouping) => {
                      set({ grouping });
                      setMenu(null);
                    }}
                  />
                </Field>
                <Field
                  label="Sorting"
                  dirty={display.sorting !== "default"}
                  value={labelOf(SORTING, display.sorting)}
                  open={menu === "sorting"}
                  onToggle={() => toggleMenu("sorting")}
                >
                  <ChoiceMenu
                    options={SORTING}
                    value={display.sorting}
                    onPick={(sorting) => {
                      set({ sorting });
                      setMenu(null);
                    }}
                  />
                </Field>
                <Field
                  label="Direction"
                  dirty={display.direction !== "asc"}
                  value={labelOf(DIRECTION, display.direction)}
                  open={menu === "direction"}
                  onToggle={() => toggleMenu("direction")}
                >
                  <ChoiceMenu
                    options={DIRECTION}
                    value={display.direction}
                    onPick={(direction) => {
                      set({ direction });
                      setMenu(null);
                    }}
                  />
                </Field>
              </div>
            ) : null}
          </section>
          <section className="mt-2 border-t border-white/10 pt-2">
            <button
              type="button"
              onClick={() => setFilterOpen((value) => !value)}
              className="flex w-full items-center gap-2 py-1 text-sm font-medium"
            >
              Filter
              {delta.filter > 0 ? (
                <span className="grid size-4 place-items-center rounded-full bg-neutral-600 text-[10px]">
                  {delta.filter}
                </span>
              ) : null}
              <ChevronDown className={`ml-auto size-4 text-neutral-500 ${filterOpen ? "" : "-rotate-90"}`} />
            </button>
            {filterOpen ? (
              <div className="mt-1">
                <Field
                  label="Date"
                  dirty={display.date !== "all"}
                  value={labelOf(DATES, display.date)}
                  open={menu === "date"}
                  onToggle={() => toggleMenu("date")}
                >
                  <ChoiceMenu
                    options={DATES}
                    value={display.date}
                    onPick={(date) => {
                      set({ date });
                      setMenu(null);
                    }}
                  />
                </Field>
                <Field
                  label="Created"
                  dirty={display.created !== "all"}
                  value={labelOf(CREATED, display.created)}
                  open={menu === "created"}
                  onToggle={() => toggleMenu("created")}
                >
                  <ChoiceMenu
                    options={CREATED}
                    value={display.created}
                    onPick={(created) => {
                      set({ created });
                      setMenu(null);
                    }}
                  />
                </Field>
                <div className="relative flex items-center justify-between gap-3 py-1.5">
                  <span className="flex items-center gap-2 text-sm text-neutral-200">
                    <span
                      className={`size-1.5 rounded-full ${
                        display.priorities.length ? "bg-orange-400" : "bg-transparent"
                      }`}
                    />
                    Priority
                  </span>
                  <button
                    type="button"
                    aria-expanded={menu === "priority"}
                    onClick={() => toggleMenu("priority")}
                    className="inline-flex min-w-28 items-center justify-between gap-2 rounded-md border border-white/10 bg-[var(--field)] px-2.5 py-1.5 text-sm"
                  >
                    {priorityLabel}
                    <ChevronDown className="size-3.5 text-neutral-400" />
                  </button>
                  {menu === "priority" ? (
                    <div className="absolute bottom-full right-0 z-20 mb-1 w-44 rounded-lg border border-white/10 bg-[var(--menu)] py-1 shadow-xl">
                      {[1, 2, 3, 4].map((level) => {
                        const checked = display.priorities.includes(level);
                        const tone = PRIORITY_META[level];
                        return (
                          <label
                            key={level}
                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const priorities = checked
                                  ? display.priorities.filter((item) => item !== level)
                                  : [...display.priorities, level].sort();
                                set({ priorities });
                              }}
                              className="accent-[var(--accent)]"
                            />
                            <Flag className={`size-3.5 ${tone.flag}`} fill="currentColor" />
                            Priority {level}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
          <button
            type="button"
            onClick={() => {
              onChange({ ...FACTORY_DISPLAY, priorities: [] });
              setMenu(null);
            }}
            className="mt-3 w-full py-2 text-center text-sm text-[var(--accent)] hover:text-[var(--accent)]"
          >
            Reset all
          </button>
        </div>
      ) : null}
    </div>
  );
}
