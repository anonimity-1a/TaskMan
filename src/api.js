import { apiBase } from "./apiBase.js";
import { clearSession, getSession, saveSession } from "./auth.js";
import { normalizeDocument } from "./normalize.js";

export class ApiError extends Error {
  constructor(message, status, extra = {}) {
    super(message);
    this.status = status;
    this.revision = extra.revision;
    this.document = extra.document;
  }
}

const snapshotFrom = (body) => ({
  revision: body.revision,
  document: normalizeDocument(body.document),
});

const request = async (path, options = {}) => {
  const session = getSession();
  let response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...options,
      headers: {
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Could not reach TaskMan. This change was not saved.", 0);
  }
  return response;
};

const errorFrom = async (response, fallback) => {
  const body = await response.json().catch(() => ({}));
  throw new ApiError(typeof body.error === "string" ? body.error : fallback, response.status);
};

export const registerAccount = async ({ email, username, password }) => {
  const response = await request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!response.ok) await errorFrom(response, "Could not create the account.");
  const session = await response.json();
  saveSession(session);
  return session;
};

export const loginAccount = async ({ identity, password }) => {
  const response = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity, password }),
  });
  if (!response.ok) await errorFrom(response, "Those sign-in details were not accepted.");
  const session = await response.json();
  saveSession(session);
  return session;
};

export const logoutAccount = async () => {
  const response = await request("/auth/logout", { method: "POST" }).catch(() => null);
  clearSession();
  if (response && !response.ok && response.status !== 204) {
    /* The local session is already gone. A later request will ask for sign-in. */
  }
};

export const fetchMe = async () => {
  const response = await request("/auth/me");
  if (response.status === 401) throw new ApiError("Sign in again.", 401);
  if (!response.ok) throw new ApiError("Could not confirm this account.", response.status);
  return response.json();
};

export const loadSnapshot = async () => {
  if (!getSession()) throw new ApiError("Sign in again.", 401);
  const response = await request("/tasks");
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) throw new ApiError("Sign in again.", 401);
  if (!response.ok) throw new ApiError("Could not load tasks.", response.status);
  return snapshotFrom(body);
};

export const saveSnapshot = async (document, revision) => {
  if (!getSession()) throw new ApiError("Sign in again.", 401);
  const response = await request("/tasks", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(revision),
    },
    body: JSON.stringify(normalizeDocument(document)),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 409) {
    throw new ApiError("Updated on another device", 409, snapshotFrom(body));
  }
  if (response.status === 401) throw new ApiError("Sign in again.", 401);
  if (!response.ok) throw new ApiError("Could not reach TaskMan. This change was not saved.", response.status);
  return snapshotFrom(body);
};

export const watchRevisions = async (signal, onRevision, onUnauthorized) => {
  while (!signal.aborted) {
    try {
      const response = await request("/events", {
        headers: { Accept: "text/event-stream" },
        signal,
      });
      if (response.status === 401) {
        onUnauthorized();
        return;
      }
      if (!response.ok || !response.body) throw new ApiError("Live updates stopped.", response.status);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((item) => item.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (Number.isInteger(payload.revision)) onRevision(payload.revision);
        }
      }
    } catch (error) {
      if (signal.aborted) return;
      if (error?.name === "AbortError") return;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

export const isBlankDocument = (document) =>
  document.tasks.length === 0 &&
  document.labels.length === 0 &&
  document.filters.length === 0 &&
  document.sections.length === 0 &&
  document.comments.length === 0;

const readLegacyBrowser = () => {
  const raw = localStorage.getItem("local-tasks-document");
  if (!raw) return null;
  try {
    return normalizeDocument(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const findLegacyDocument = async (current) => {
  if (!isBlankDocument(current)) return null;
  const browserCopy = readLegacyBrowser();
  if (browserCopy && !isBlankDocument(browserCopy)) return browserCopy;
  if (!window.desktop?.legacyLoad) return null;
  const file = await window.desktop.legacyLoad();
  if (!file) return null;
  const document = normalizeDocument(file);
  return isBlankDocument(document) ? null : document;
};
