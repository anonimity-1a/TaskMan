import { PRIORITY_META } from "../constants.js";

const BARS = { 1: "bg-[var(--p1)]", 2: "bg-[var(--p2)]", 3: "bg-[var(--p3)]", 4: "bg-[var(--p4)]" };

export function ReportingView({ doc, counts }) {
  const projectRows = doc.projects.filter((project) => !project.archived);
  const archivedIds = new Set(doc.projects.filter((project) => project.archived).map((project) => project.id));
  const totalOpen = doc.tasks.filter((task) => !task.completed && !archivedIds.has(task.projectId)).length;
  const scale = Math.max(totalOpen, 1);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="tm-rule rounded-lg border bg-[var(--panel)] p-6">
        <h2 className="tm-eyebrow">Open tasks</h2>
        <p className="mt-3 font-display text-6xl leading-none font-bold tracking-tight text-[var(--title-ink)] tabular-nums">{totalOpen}</p>
        <dl className="tm-rule mt-6 grid grid-cols-3 border-t pt-4">
          {[
            ["Due today or overdue", counts.today],
            ["Upcoming", counts.upcoming],
            ["Completed", counts.completed],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-neutral-500">{label}</dt>
              <dd className="tm-mono mt-1 text-lg font-semibold text-neutral-100">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="tm-rule rounded-lg border bg-[var(--panel)] p-6">
        <h2 className="tm-eyebrow">By priority</h2>
        <ul className="mt-4 space-y-4">
          {[1, 2, 3, 4].map((level) => {
            const count = doc.tasks.filter(
              (task) => !task.completed && task.priority === level && !doc.projects.find((project) => project.id === task.projectId)?.archived,
            ).length;
            const tone = PRIORITY_META[level];
            return (
              <li key={level} className="text-sm">
                <div className="flex items-center gap-3">
                  <span className={`tm-check size-3 border-2 ${tone.circle}`} />
                  <span className={`font-medium ${tone.text}`}>Priority {level}</span>
                  <span className="tm-mono ml-auto text-neutral-400">{count}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${BARS[level]}`} style={{ width: `${(count / scale) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="tm-rule rounded-lg border bg-[var(--panel)] p-6 md:col-span-2">
        <h2 className="tm-eyebrow">By project</h2>
        <ul className="mt-3">
          {projectRows.map((project) => (
            <li key={project.id} className="tm-rule flex items-center justify-between border-b py-2.5 text-sm last:border-b-0">
              <span className="text-neutral-200">{project.name}</span>
              <span className="tm-mono text-neutral-500">{counts.projects[project.id] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
