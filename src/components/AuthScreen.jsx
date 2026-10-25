import { useState } from "react";
import { loginAccount, registerAccount } from "../api.js";

const fieldClass =
  "tm-rule mt-1.5 w-full rounded-md border bg-[var(--field)] px-3 py-2.5 text-sm text-neutral-100 outline-none focus:border-[var(--accent)]";

export function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const register = mode === "register";

  return (
    <main className="grid h-full bg-[var(--canvas)] text-neutral-100 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="tm-sidebar tm-rule hidden flex-col justify-between border-r bg-[var(--sidebar)] p-12 text-neutral-200 md:flex">
        <div className="flex items-center gap-3">
          <span className="tm-check grid size-9 place-items-center bg-[var(--accent)] text-base font-bold text-[var(--on-accent)]">T</span>
          <span className="font-display text-lg font-bold tracking-tight text-white">TaskMan</span>
        </div>
        <div>
          <p className="tm-eyebrow">Self-hosted</p>
          <p className="mt-3 max-w-sm font-display text-4xl leading-tight font-bold tracking-tight text-white">
            One server. Your own account. Every device.
          </p>
          <ul className="tm-rule mt-8 max-w-sm border-t">
            {["Website", "Desktop window", "Phone browser", "Browser extension"].map((item) => (
              <li key={item} className="tm-rule flex items-center gap-3 border-b py-2.5 text-sm text-neutral-300">
                <span className="tm-check size-1.5 bg-[var(--accent)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="tm-eyebrow">Press Ctrl K to add a task</p>
      </aside>
      <div className="grid place-items-center px-4 py-10">
        <form
          className="w-full max-w-sm"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            try {
              const session = register
                ? await registerAccount({ email, username, password })
                : await loginAccount({ identity, password });
              await onAuth(session);
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Could not sign in");
              setPending(false);
            }
          }}
        >
          <p className="tm-eyebrow">{register ? "New account" : "Welcome back"}</p>
          <h1 className="tm-title mt-2">TaskMan</h1>
          <p className="mt-2 text-sm text-neutral-400">
            {register ? "Create an account on this server." : "Sign in to your tasks."}
          </p>
          <div className="tm-rule mt-8 space-y-4 border-t pt-6">
            {register ? (
              <>
                <label className="block text-[13px] font-medium text-neutral-300">
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className={fieldClass}
                  />
                </label>
                <label className="block text-[13px] font-medium text-neutral-300">
                  Username
                  <input
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                    className={fieldClass}
                  />
                </label>
              </>
            ) : (
              <label className="block text-[13px] font-medium text-neutral-300">
                Email or username
                <input
                  autoComplete="username"
                  value={identity}
                  onChange={(event) => setIdentity(event.target.value)}
                  required
                  className={fieldClass}
                />
              </label>
            )}
            <label className="block text-[13px] font-medium text-neutral-300">
              Password
              <input
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className={fieldClass}
              />
            </label>
          </div>
          {error ? (
            <p className="mt-4 rounded-md border-l-[3px] border-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 text-sm text-neutral-100">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="tm-btn mt-6 w-full bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
          >
            {pending ? "Please wait…" : register ? "Create account" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(register ? "login" : "register");
              setError("");
            }}
            className="mt-4 w-full text-sm text-[var(--accent-text)] hover:underline"
          >
            {register ? "Already have an account? Sign in" : "Need an account? Register"}
          </button>
        </form>
      </div>
    </main>
  );
}
