import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { apiBase } from "../src/apiBase.js";
import { loginAccount, logoutAccount, registerAccount, loadSnapshot, saveSnapshot } from "../src/api.js";
import { clearLegacyConnection, getSession } from "../src/auth.js";
import { clearTaskCache, readTaskCache, writeTaskCache } from "../src/cache.js";
import { localISODate } from "../src/dates.js";
import { addTaskFromResolved, formatDue, toggleTask } from "../src/model.js";
import { resolveQuickAdd } from "../src/parse.js";
import "./popup.css";

const todayTasks = (document, today) =>
  document.tasks
    .filter((task) => !task.completed && task.due && task.due <= today)
    .sort((a, b) => a.due.localeCompare(b.due) || a.priority - b.priority || a.order - b.order);

const siteUrl = () => {
  const base = apiBase();
  if (base.startsWith("/")) return window.location.origin;
  const url = new URL(base, "http://127.0.0.1");
  if (url.port === "8787") url.port = "5173";
  return url.origin;
};

function Popup() {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const today = localISODate();
  const register = mode === "register";

  const showSnapshot = async (userId, next) => {
    setSnapshot(next);
    await writeTaskCache(userId, next);
  };

  useEffect(() => {
    let cancelled = false;
    clearLegacyConnection();
    const saved = getSession();
    if (!saved) {
      setSession(null);
      return undefined;
    }
    setSession(saved);
    (async () => {
      const cached = await readTaskCache(saved.user.id);
      if (!cancelled && cached) setSnapshot(cached);
      try {
        const fresh = await loadSnapshot();
        if (!cancelled) await showSnapshot(saved.user.id, fresh);
      } catch (reason) {
        if (cancelled) return;
        if (reason?.status === 401) {
          await clearTaskCache(saved.user.id).catch(() => undefined);
          await logoutAccount().catch(() => undefined);
          setSnapshot(null);
          setSession(null);
          return;
        }
        if (!cached) setError(reason instanceof Error ? reason.message : "Could not reach TaskMan.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (event) => {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const next = register
        ? await registerAccount({ email, username, password })
        : await loginAccount({ identity, password });
      const cached = await readTaskCache(next.user.id);
      if (cached) setSnapshot(cached);
      setSession(next);
      const fresh = await loadSnapshot();
      await showSnapshot(next.user.id, fresh);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  };

  const save = async (document) => {
    const body = await saveSnapshot(document, snapshot.revision);
    await showSnapshot(session.user.id, body);
  };

  if (session === undefined || (session && !snapshot && !error)) {
    return <p className="p-4 text-sm text-stone-500">Loading tasks…</p>;
  }

  if (!session || !snapshot) {
    return (
      <form className="p-4" onSubmit={signIn}>
        <h1 className="text-lg font-semibold text-stone-900">TaskMan</h1>
        <p className="mt-1 text-sm text-stone-500">
          {register ? "Create an account on this server." : "Sign in to your tasks."}
        </p>
        {register ? (
          <>
            <label className="mt-3 block text-sm text-stone-600">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm text-stone-600">
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
              />
            </label>
          </>
        ) : (
          <label className="mt-3 block text-sm text-stone-600">
            Email or username
            <input
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
            />
          </label>
        )}
        <label className="mt-3 block text-sm text-stone-600">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Please wait…" : register ? "Create account" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode(register ? "login" : "register");
            setError("");
          }}
          className="mt-3 w-full text-sm text-indigo-700"
        >
          {register ? "Already have an account? Sign in" : "Need an account? Register"}
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
          <p className="text-xs text-stone-500">
            {tasks.length} open · {session.user.username}
          </p>
        </div>
        <a href={siteUrl()} target="_blank" rel="noreferrer" className="text-xs text-indigo-700">
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
              setSnapshot({ revision: reason.revision, document: reason.document });
              await writeTaskCache(session.user.id, {
                revision: reason.revision,
                document: reason.document,
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
          const userId = session.user.id;
          await logoutAccount().catch(() => undefined);
          await clearTaskCache(userId).catch(() => undefined);
          setSession(null);
          setSnapshot(null);
          setPassword("");
        }}
        className="border-t border-stone-200 px-4 py-2 text-left text-xs text-stone-400"
      >
        Log out
      </button>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<Popup />);
