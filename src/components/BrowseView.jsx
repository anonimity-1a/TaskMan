import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { COLOR_STYLES } from "../constants.js";

function NameField({ placeholder, onSubmit, extra }) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap items-center gap-2"
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
        className="w-40 rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-sm outline-none"
      />
      {extra ? (
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="today p1, @label, #project"
          aria-label="Filter query"
          className="w-56 rounded-md border border-white/10 bg-transparent px-2 py-1.5 text-sm outline-none"
        />
      ) : null}
      <button type="submit" className="text-sm text-[var(--accent)]">
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
    <div className="grid gap-10 md:grid-cols-2">
      <section>
        <h2 className="text-sm font-medium text-neutral-200">Labels</h2>
        <ul className="mt-3 divide-y divide-white/5">
          {doc.labels.length === 0 ? (
            <li className="py-3 text-sm text-neutral-500">No labels yet.</li>
          ) : (
            doc.labels.map((label) => {
              const styles = COLOR_STYLES[label.color] ?? COLOR_STYLES.indigo;
              return (
                <li key={label.id} className="flex items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => onOpenLabel(label.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  >
                    <span className={`size-2.5 rounded-full ${styles.dot}`} />
                    <span className="truncate">{label.name}</span>
                    <span className="ml-auto text-xs text-neutral-500">{counts.labels[label.id] ?? 0}</span>
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
                    className="text-xs text-neutral-500 hover:text-[var(--accent)]"
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
      <section>
        <h2 className="text-sm font-medium text-neutral-200">Filters</h2>
        <ul className="mt-3 divide-y divide-white/5">
          {doc.filters.length === 0 ? (
            <li className="py-3 text-sm text-neutral-500">No saved filters yet.</li>
          ) : (
            doc.filters.map((filter) => (
              <li key={filter.id} className="flex items-center gap-2 py-2">
                <button
                  type="button"
                  onClick={() => onOpenFilter(filter.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm">{filter.name}</span>
                  <span className="block truncate text-xs text-neutral-500">{filter.query}</span>
                </button>
                <span className="text-xs text-neutral-500">{counts.filters[filter.id] ?? 0}</span>
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
                  className="text-xs text-neutral-500 hover:text-[var(--accent)]"
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
          className="mt-6 inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white"
        >
          <CheckCircle2 className="size-4" />
          Completed tasks
          <span className="text-xs text-neutral-500">{counts.completed}</span>
        </button>
      </section>
    </div>
  );
}
