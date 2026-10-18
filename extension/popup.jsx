import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { localISODate } from "../src/dates.js";
import { addTaskFromResolved, formatDue, toggleTask } from "../src/model.js";
import { normalizeDocument } from "../src/normalize.js";
import { resolveQuickAdd } from "../src/parse.js";
import "./popup.css";

const storage = {
  async get() {
    const saved = await chrome.storage.local.get(["url", "token"]);
    if (!saved.url || !saved.token) return null;
    return { url: saved.url, token: saved.token };
  },
  async set(connection) {
    await chrome.storage.local.set(connection);
  },
  async clear() {
    await chrome.storage.local.remove(["url", "token"]);
  },
};

const request = async (connection, path, options = {}) => {
  const response = await fetch(`${connection.url}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${connection.token}`,
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? "That passphrase was not accepted."
        : "Could not reach TaskMan.",
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
};

const todayTasks = (document, today) =>
  document.tasks
    .filter((task) => !task.completed && task.due && task.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due) || a.priority - b.priority || a.order - b.order);

function Popup() {
  const [connection, setConnection] = useState(undefined);
  const [url, setUrl] = useState("http://192.168.1.9:5173");
  const [token, setToken] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const today = localISODate();

  const load = async (nextConnection) => {
    const body = await request(nextConnection, "/api/document");
    setSnapshot({ revision: body.revision, document: normalizeDocument(body.document) });
    setError("");
  };

  useEffect(() => {
    storage
      .get()
      .then(async (saved) => {
        if (!saved) {
          setConnection(null);
          return;
        }
        setUrl(saved.url);
        await load(saved);
        setConnection(saved);
      })
      .catch((reason) => {
        setConnection(null);
        setError(reason instanceof Error ? reason.message : "Could not reach TaskMan.");
      });
  }, []);

  const save = async (document) => {
    const body = await request(connection, "/api/document", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(snapshot.revision),
      },
      body: JSON.stringify(document),
    });
    setSnapshot({ revision: body.revision, document: normalizeDocument(body.document) });
  };

  if (connection === undefined) {
    return <p className="p-4 text-sm text-stone-500">Loading tasks…</p>;
  }

  if (!connection || !snapshot) {
    return (
      <form
        className="p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          try {
            const next = { url: new URL(url).origin, token: token.trim() };
            await load(next);
            await storage.set(next);
            setConnection(next);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not connect");
          } finally {
            setPending(false);
          }
        }}
      >
        <h1 className="text-lg font-semibold text-stone-900">TaskMan</h1>
        <p className="mt-1 text-sm text-stone-500">Use the same server as the website.</p>
        <label className="mt-3 block text-sm text-stone-600">
          Server address
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          />
        </label>
        <label className="mt-3 block text-sm text-stone-600">
          Passphrase
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Continue
        </button>
      </form>
    );
  }

  const tasks = todayTasks(snapshot.document, today);

  return (
    <main className="flex max-h-[520px] flex-col">
      <header className="flex items-center justify-between px-4 pt-3 pb-2">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Today</h1>
          <p className="text-xs text-stone-500">{tasks.length} open</p>
        </div>
        <a href={connection.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-700">
          Open TaskMan
        </a>
      </header>
      <form
        className="px-4 pb-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!raw.trim()) return;
          setPending(true);
          setError("");
          try {
            const resolved = resolveQuickAdd(
              snapshot.document,
              {
                raw,
                projectId: "inbox",
                projectTouched: false,
                due: today,
                dueTouched: false,
                dueTime: "",
                timeTouched: false,
                labelIds: [],
                labelsTouched: false,
                priority: 4,
                priorityTouched: false,
                recurrence: null,
                recurrenceTouched: false,
                parentId: null,
                sectionId: null,
              },
              today,
            );
            if (!resolved.title) return;
            await save(addTaskFromResolved(snapshot.document, resolved));
            setRaw("");
          } catch (reason) {
            if (reason?.status === 409) {
              setSnapshot({
                revision: reason.body.revision,
                document: normalizeDocument(reason.body.document),
              });
              setError("Updated on another device");
            } else {
              setError(reason instanceof Error ? reason.message : "Could not reach TaskMan.");
            }
          } finally {
            setPending(false);
          }
        }}
      >
        <input
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="Add a task"
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </form>
      {error ? <p className="px-4 pb-2 text-sm text-rose-700">{error}</p> : null}
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {tasks.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-stone-500">Nothing due today.</li>
        ) : (
          tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white">
              <button
                type="button"
                aria-label={`Complete ${task.title}`}
                onClick={async () => {
                  setError("");
                  try {
                    await save(toggleTask(snapshot.document, task.id));
                  } catch (reason) {
                    setError(reason instanceof Error ? reason.message : "Could not reach TaskMan.");
                  }
                }}
                className="mt-0.5 size-4 shrink-0 rounded-full border border-stone-300"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-stone-800">{task.title}</span>
                <span className="text-xs text-stone-400">{formatDue(task.due, today)}</span>
              </span>
            </li>
          ))
        )}
      </ul>
      <button
        type="button"
        onClick={async () => {
          await storage.clear();
          setConnection(null);
          setSnapshot(null);
        }}
        className="border-t border-stone-200 px-4 py-2 text-left text-xs text-stone-400"
      >
        Change server
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<Popup />);
