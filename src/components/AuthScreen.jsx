import { useState } from "react";
import { loginAccount, registerAccount } from "../api.js";

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
    <main className="grid h-full place-items-center bg-stone-50 px-4">
      <form
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
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
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">TaskMan</h1>
        <p className="mt-1 text-sm text-stone-500">
          {register ? "Create an account on this server." : "Sign in to your tasks."}
        </p>
        {register ? (
          <>
            <label className="mt-5 block text-sm text-stone-600">
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 outline-none focus:border-indigo-400"
              />
            </label>
            <label className="mt-3 block text-sm text-stone-600">
              Username
              <input
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 outline-none focus:border-indigo-400"
              />
            </label>
          </>
        ) : (
          <label className="mt-5 block text-sm text-stone-600">
            Email or username
            <input
              autoComplete="username"
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 outline-none focus:border-indigo-400"
            />
          </label>
        )}
        <label className="mt-3 block text-sm text-stone-600">
          Password
          <input
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 outline-none focus:border-indigo-400"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
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
    </main>
  );
}
