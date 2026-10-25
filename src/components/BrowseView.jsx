import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { COLOR_STYLES } from "../constants.js";

function NameField({ placeholder, onSubmit, extra }) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  return (
    <form
      className="tm-rule mt-4 flex flex-wrap items-center gap-2 border-t pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value, query);
        setValue("");
        setQuery("");
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="tm-rule w-40 rounded-md border bg-[var(--field)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)]"
      />
      {extra ? (
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="today p1, @label, #project"
          aria-label="Filter query"
          className="tm-mono tm-rule w-56 rounded-md border bg-[var(--field)] px-2.5 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
        />
      ) : null}
      <button
        type="submit"
        className="tm-btn bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
      >
        Add
      </button>
    </form>
  );
}

export function BrowseView({
  doc,
  counts,
  onOpenLabel,
  onOpenFilter,
  onOpenCompleted,
  onAddLabel,
  onDeleteLabel,
  onAddFilter,
  onDeleteFilter,
  onRenameLabel,
  onRenameFilter,
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="tm-rule rounded-lg border bg-[var(--panel)] p-6">
        <h2 className="tm-eyebrow">Labels</h2>
        <ul className="mt-3 divide-y divide-[var(--rule)]">
          {doc.labels.length === 0 ? (
            <li className="py-3 text-sm text-neutral-500">No labels yet.</li>
          ) : (
            doc.labels.map((label) => {
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <li key={label.id} className="group flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenLabel(label.id)}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-left text-sm text-neutral-200 hover:text-white"
                  >
                    <span className={`tm-check size-2.5 shrink-0 ${styles.dot}`} />
                    <span className="truncate">{label.name}</span>
                    <span className="tm-mono ml-auto text-[11px] text-neutral-500">{counts.labels[label.id] ?? 0}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt("Rename label", label.name);
                      if (name) onRenameLabel(label.id, name);
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-200"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteLabel(label.id)}
                    className="text-xs text-neutral-500 hover:text-[var(--danger)]"
                  >
                    Delete
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <NameField placeholder="Add label" onSubmit={(name) => onAddLabel(name)} />
      </section>
      <section className="tm-rule rounded-lg border bg-[var(--panel)] p-6">
        <h2 className="tm-eyebrow">Filters</h2>
        <ul className="mt-3 divide-y divide-[var(--rule)]">
          {doc.filters.length === 0 ? (
            <li className="py-3 text-sm text-neutral-500">No saved filters yet.</li>
          ) : (
            doc.filters.map((filter) => (
              <li key={filter.id} className="flex items-center gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => onOpenFilter(filter.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm text-neutral-200">{filter.name}</span>
                  <span className="tm-mono block truncate text-[11px] text-neutral-500">{filter.query}</span>
                </button>
                <span className="tm-mono text-[11px] text-neutral-500">{counts.filters[filter.id] ?? 0}</span>
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt("Rename filter", filter.name);
                    if (name) onRenameFilter(filter.id, name);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-200"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFilter(filter.id)}
                  className="text-xs text-neutral-500 hover:text-[var(--danger)]"
                >
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
        <NameField placeholder="Filter name" extra onSubmit={onAddFilter} />
        <button
          type="button"
          onClick={onOpenCompleted}
          className="tm-rule mt-6 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white"
        >
          <CheckCircle2 className="size-4 text-[var(--success)]" />
          Completed tasks
          <span className="tm-mono text-[11px] text-neutral-500">{counts.completed}</span>
        </button>
      </section>
    </div>
  );
}
