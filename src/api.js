import { clearConnection, getConnection, normalizeConnection, saveConnection } from "./connection.js";
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

const request = async (connection, path, options = {}) => {
  let response;
  try {
    response = await fetch(`${connection.url}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${connection.token}`,
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Could not reach TaskMan. This change was not saved.", 0);
  }
  return response;
};

export const loadSnapshot = async (connection = getConnection()) => {
  if (!connection) throw new ApiError("Connect to TaskMan first.", 401);
  const response = await request(connection, "/api/document");
  const body = await response.json().catch(() => ({}));
  if (response.status === 401) throw new ApiError("That passphrase was not accepted.", 401);
  if (!response.ok) throw new ApiError("Could not load tasks.", response.status);
  return snapshotFrom(body);
};

export const saveSnapshot = async (document, revision, connection = getConnection()) => {
  if (!connection) throw new ApiError("Connect to TaskMan first.", 401);
  const response = await request(connection, "/api/document", {
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
  if (response.status === 401) throw new ApiError("That passphrase was not accepted.", 401);
  if (!response.ok) throw new ApiError("Could not reach TaskMan. This change was not saved.", response.status);
  return snapshotFrom(body);
};

export const connectTaskMan = async (input) => {
  const connection = normalizeConnection(input);
  if (!connection) throw new ApiError("Enter a server address and passphrase.", 400);
  if (window.desktop?.setConnection) await window.desktop.setConnection(connection);
  const snapshot = await loadSnapshot(connection);
  saveConnection(connection);
  return snapshot;
};

export const disconnectTaskMan = async () => {
  clearConnection();
  if (window.desktop?.clearConnection) await window.desktop.clearConnection();
};

export const watchRevisions = async (connection, signal, onRevision) => {
  while (!signal.aborted) {
    try {
      const response = await request(connection, "/api/events", {
        headers: { Accept: "text/event-stream" },
        signal,
      });
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
