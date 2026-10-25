import { PRIORITY_META } from "../constants.js";

export function ReportingView({ doc, counts }) {
  const projectRows = doc.projects.filter((project) => !project.archived);
  const archivedIds = new Set(doc.projects.filter((project) => project.archived).map((project) => project.id));
  const totalOpen = doc.tasks.filter((task) => !task.completed && !archivedIds.has(task.projectId)).length;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section>
        <h2 className="text-sm font-medium text-neutral-300">Open tasks</h2>
        <p className="mt-2 text-3xl font-semibold text-white">{totalOpen}</p>
        <p className="mt-1 text-sm text-neutral-500">
          {counts.today} due today or overdue · {counts.upcoming} upcoming · {counts.completed} completed
        </p>
      </section>
      <section>
        <h2 className="text-sm font-medium text-neutral-300">By priority</h2>
        <ul className="mt-3 space-y-2">
          {[1, 2, 3, 4].map((level) => {
            const count = doc.tasks.filter(
              (task) => !task.completed && task.priority === level && !doc.projects.find((project) => project.id === task.projectId)?.archived,
            ).length;
            const tone = PRIORITY_META[level];
            return (
              <li key={level} className="flex items-center gap-3 text-sm">
                <span className={`size-3 rounded-full border-2 ${tone.circle}`} />
                <span className={tone.text}>Priority {level}</span>
                <span className="ml-auto text-neutral-400">{count}</span>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="md:col-span-2">
        <h2 className="text-sm font-medium text-neutral-300">By project</h2>
        <ul className="mt-3 divide-y divide-white/5">
          {projectRows.map((project) => (
            <li key={project.id} className="flex items-center justify-between py-2 text-sm">
              <span>{project.name}</span>
              <span className="text-neutral-500">{counts.projects[project.id] ?? 0}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
