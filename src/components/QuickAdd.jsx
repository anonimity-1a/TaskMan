import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  CalendarDays,
  Flag,
  Hash,
  MapPin,
  Paperclip,
  Tag,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { automaticReminder } from "../dates.js";
import {
  COLOR_STYLES,
  PRIORITY_META,
  describeRecurrence,
  formatWhen,
  projectById,
  recurrenceFromKey,
  recurrenceKey,
  taskById,
} from "../model.js";
import { resolveQuickAdd } from "../parse.js";
import { QUICK_ACTIONS } from "../settings.js";

const ICONS = {
  project: Hash,
  date: CalendarDays,
  assignee: UserRound,
  attachment: Paperclip,
  priority: Flag,
  reminders: AlarmClock,
  labels: Tag,
  deadline: Target,
  location: MapPin,
};

const PRIORITIES = [1, 2, 3, 4];

export function QuickAdd({ doc, defaults, today, settings, onClose, onSubmit }) {
  const [raw, setRaw] = useState("");
  const [projectId, setProjectId] = useState(defaults.projectId);
  const [projectTouched, setProjectTouched] = useState(false);
  const [due, setDue] = useState(defaults.due ?? "");
  const [dueTouched, setDueTouched] = useState(false);
  const [dueTime, setDueTime] = useState("");
  const [timeTouched, setTimeTouched] = useState(false);
  const [labelIds, setLabelIds] = useState(defaults.labelIds ?? []);
  const [labelsTouched, setLabelsTouched] = useState(false);
  const [priority, setPriority] = useState(4);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [recurrence, setRecurrence] = useState(null);
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);
  const [deadline, setDeadline] = useState(defaults.deadline ?? "");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [reminder, setReminder] = useState(null);
  const [reminderTouched, setReminderTouched] = useState(false);
  const [openAction, setOpenAction] = useState("");
  const parent = defaults.parentId ? taskById(doc, defaults.parentId) : null;

  const resolved = useMemo(
    () =>
      resolveQuickAdd(
        doc,
        {
          raw,
          projectId,
          projectTouched,
          due,
          dueTouched,
          dueTime,
          timeTouched,
          labelIds,
          labelsTouched,
          priority,
          priorityTouched,
          recurrence,
          recurrenceTouched,
          parentId: defaults.parentId ?? null,
          sectionId: defaults.sectionId ?? null,
          description,
          deadline,
          location,
          reminder,
          reminderTouched,
        },
        today,
        { smartDates: settings?.smartDates !== false },
      ),
    [
      defaults.parentId,
      defaults.sectionId,
      doc,
      due,
      dueTime,
      dueTouched,
      labelIds,
      labelsTouched,
      priority,
      priorityTouched,
      projectId,
      projectTouched,
      raw,
      recurrence,
      recurrenceTouched,
      description,
      deadline,
      location,
      reminder,
      reminderTouched,
      settings?.smartDates,
      timeTouched,
      today,
    ],
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const projects = doc.projects.filter(
    (project) => !project.archived || project.id === defaults.projectId,
  );
  const project = projectById(doc, resolved.projectId);
  const labels = doc.labels.filter((label) => resolved.labelIds.includes(label.id));
  const repeatValue = recurrenceTouched ? recurrenceKey(recurrence) : recurrenceKey(resolved.recurrence);

  return (
    <div className="fixed inset-0 z-40 bg-black/60" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-labelledby="quick-add-title"
        className="mx-auto mt-20 w-[min(40rem,calc(100%-2rem))] rounded-2xl border border-white/10 bg-[var(--panel)] p-4 text-neutral-100 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!resolved.title) return;
          onSubmit({
            ...resolved,
            reminder: reminderTouched ? reminder : automaticReminder(resolved.dueTime, settings?.reminders?.automatic),
          });
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quick-add-title" className="text-sm font-semibold text-white">
            Quick add
          </h2>
          <button
            type="button"
            aria-label="Close quick add"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
        </div>
        {parent ? (
          <p className="mb-2 text-xs text-stone-500">Subtask of {parent.title}</p>
        ) : null}
        <input
          autoFocus
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Pay rent tomorrow !!1 every month #Home"
          className="w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-base outline-none focus:border-[var(--accent)]"
        />
        <p className="mt-2 text-xs text-stone-500">
          {resolved.title || "Task name"}
          {project ? ` · ${project.name}` : ""}
          {resolved.due ? ` · ${formatWhen(resolved.due, resolved.dueTime, today)}` : ""}
          {resolved.recurrence ? ` · ${describeRecurrence(resolved.recurrence)}` : ""}
          {resolved.priority < 4 ? ` · P${resolved.priority}` : ""}
          {labels.map((label) => ` · @${label.name}`).join("")}
          {resolved.newLabels.map((name) => ` · @${name}`).join("")}
        </p>
        {settings?.quickAdd?.showDescription ? (
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            aria-label="Description"
            rows={2}
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        ) : null}
        <p className="mt-1 text-xs text-stone-400">
          {settings?.smartDates === false
            ? "Dates in the title are left as text. Use the date action to set one."
            : "Dates, !!1–!!4, p1–p4, #project, @label, every week, and at 9am are read from the title."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(settings?.quickAdd?.shown ?? ["project", "date", "priority"]).map((id) => {
            const action = QUICK_ACTIONS.find((item) => item.id === id);
            const Icon = ICONS[id] ?? Hash;
            const active = openAction === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => setOpenAction(active ? "" : id)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
                  active ? "border-[var(--accent)] text-white" : "border-white/10 text-neutral-300"
                }`}
              >
                <Icon className="size-3.5" />
                {settings?.quickAdd?.showLabels !== false ? action?.label : null}
              </button>
            );
          })}
        </div>
        {openAction === "project" ? (
          <label className="mt-3 block text-xs text-neutral-400">
            Project
            <select
              value={projectTouched ? projectId : resolved.projectId}
              disabled={Boolean(parent)}
              onChange={(event) => {
                setProjectTouched(true);
                setProjectId(event.target.value);
              }}
              className="mt-1 w-full rounded-md border border-white/10 bg-[var(--field)] px-2 py-1 text-sm text-neutral-100"
            >
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {openAction === "date" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="date"
              aria-label="Due date"
              value={dueTouched ? due : (resolved.due ?? "")}
              onChange={(event) => {
                setDueTouched(true);
                setDue(event.target.value);
              }}
              className="rounded-md border border-white/10 bg-[var(--field)] px-2 py-1 text-sm"
            />
            <input
              type="time"
              aria-label="Due time"
              value={timeTouched ? dueTime : (resolved.dueTime ?? "")}
              onChange={(event) => {
                setTimeTouched(true);
                setDueTime(event.target.value);
              }}
              className="rounded-md border border-white/10 bg-[var(--field)] px-2 py-1 text-sm"
            />
            <select
              aria-label="Repeat"
              value={repeatValue === "custom" ? "custom" : repeatValue}
              onChange={(event) => {
                setRecurrenceTouched(true);
                setRecurrence(recurrenceFromKey(event.target.value));
              }}
              className="rounded-md border border-white/10 bg-[var(--field)] px-2 py-1 text-sm"
            >
              <option value="none">No repeat</option>
              <option value="day">Every day</option>
              <option value="weekday">Every weekday</option>
              <option value="week">Every week</option>
              <option value="month">Every month</option>
              <option value="year">Every year</option>
              {repeatValue === "custom" ? <option value="custom">{describeRecurrence(resolved.recurrence)}</option> : null}
            </select>
          </div>
        ) : null}
        {openAction === "assignee" ? (
          <p className="mt-3 text-xs text-neutral-500">Assignees are not in TaskMan.</p>
        ) : null}
        {openAction === "attachment" ? (
          <p className="mt-3 text-xs text-neutral-500">Attachments are not in TaskMan.</p>
        ) : null}
        {openAction === "priority" ? (
          <div className="mt-3 flex gap-1" role="group" aria-label="Priority">
            {PRIORITIES.map((level) => {
              const active = (priorityTouched ? priority : resolved.priority) === level;
              const tone = PRIORITY_META[level];
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setPriorityTouched(true);
                    setPriority(level);
                  }}
                  className={`rounded-md px-2 py-1 text-xs ${active ? `${tone?.text ?? ""} bg-white/10` : "text-neutral-400"}`}
                >
                  P{level}
                </button>
              );
            })}
          </div>
        ) : null}
        {openAction === "reminders" ? (
          <label className="mt-3 block text-xs text-neutral-400">
            Reminder
            <input
              type="time"
              aria-label="Reminder"
              value={reminder ?? ""}
              onChange={(event) => {
                setReminderTouched(true);
                setReminder(event.target.value || null);
              }}
              className="mt-1 rounded-md border border-white/10 bg-[var(--field)] px-2 py-1 text-sm"
            />
          </label>
        ) : null}
        {openAction === "labels" && doc.labels.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.labels.map((label) => {
              const selected = (labelsTouched ? labelIds : resolved.labelIds).includes(label.id);
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setLabelsTouched(true);
                    setLabelIds((current) => {
                      const base = labelsTouched ? current : resolved.labelIds;
                      return base.includes(label.id) ? base.filter((item) => item !== label.id) : [...base, label.id];
                    });
                  }}
                  className={`rounded-full px-2.5 py-1 text-xs ${selected ? styles.chip : "bg-white/5 text-neutral-400"}`}
                >
                  {label.name}
                </button>
              );
            })}
          </div>
        ) : null}
        {openAction === "deadline" ? (
          <input
            type="date"
            aria-label="Deadline"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className="mt-3 rounded-md border border-white/10 bg-[var(--field)] px-2 py-1 text-sm"
          />
        ) : null}
        {openAction === "location" ? (
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            aria-label="Location"
            className="mt-3 w-full rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm outline-none"
          />
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!resolved.title}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            Add task
          </button>
        </div>
      </form>
    </div>
  );
}
