import { useState } from "react";

export function ConnectScreen({ onConnect }) {
  const [url, setUrl] = useState(() => {
    const origin = window.location.origin;
    return origin.startsWith("http") ? origin : "http://192.168.1.9:5173";
  });
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  return (
    <main className="grid h-full place-items-center bg-stone-50 px-4">
      <form
        className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          try {
            await onConnect({ url, token });
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not connect");
            setPending(false);
          }
        }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">TaskMan</h1>
        <p className="mt-1 text-sm text-stone-500">
          Connect this device to the shared task server.
        </p>
        <label className="mt-5 block text-sm text-stone-600">
          Server address
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 outline-none focus:border-indigo-400"
          />
        </label>
        <label className="mt-3 block text-sm text-stone-600">
          Passphrase
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-900 outline-none focus:border-indigo-400"
          />
        </label>
        {local ? (
          <p className="mt-3 text-xs text-stone-400">
            This dev server uses the passphrase taskman-dev.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Connecting…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
