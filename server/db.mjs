import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { emptyDocument, normalizeDocument } from "../src/normalize.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

const snapshotOf = (row) => ({
  revision: row.revision,
  document: clone(row.document),
});

export const openDatabase = async ({ file, legacyFile }) => {
  const state = {
    users: [],
    tasks: [],
    sessions: [],
    legacyClaimed: false,
    legacyDocument: null,
  };
  let writeLock = Promise.resolve();

  const enqueue = (job) => {
    const run = writeLock.then(job, job);
    writeLock = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const persist = async () => {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    const stored = {
      users: state.users,
      tasks: state.tasks,
      sessions: state.sessions,
      legacyClaimed: state.legacyClaimed,
    };
    await writeFile(temporary, JSON.stringify(stored), "utf8");
    try {
      await rename(temporary, file);
    } catch (error) {
      if (error?.code !== "EPERM" && error?.code !== "EEXIST") throw error;
      await unlink(file);
      await rename(temporary, file);
    }
  };

  try {
    const raw = JSON.parse(await readFile(file, "utf8"));
    state.users = Array.isArray(raw.users) ? raw.users : [];
    state.tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    state.sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
    state.legacyClaimed = raw.legacyClaimed === true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  if (!state.legacyClaimed && legacyFile) {
    try {
      const raw = JSON.parse(await readFile(legacyFile, "utf8"));
      const document = normalizeDocument(raw?.document ?? raw);
      const revision = raw && Number.isInteger(raw.revision) && raw.document ? raw.revision : 0;
      state.legacyDocument = { revision, document };
    } catch (error) {
      if (error?.code !== "ENOENT") console.error("Could not read the previous task file", error);
    }
  }

  const requireUserId = (userId) => {
    if (typeof userId !== "string" || !userId) throw new Error("user_id is required");
    return userId;
  };

  const userById = (id) => state.users.find((user) => user.id === id) ?? null;

  const userByEmail = (email) =>
    state.users.find((user) => user.email === String(email).toLowerCase()) ?? null;

  const userByUsername = (username) =>
    state.users.find((user) => user.username.toLowerCase() === String(username).toLowerCase()) ?? null;

  // tasks WHERE user_id = ?
  const tasksFor = (userId) => {
    const id = requireUserId(userId);
    return state.tasks.find((row) => row.user_id === id) ?? null;
  };

  return {
    enqueue,
    getUserById: (id) => userById(id),
    getUserByEmail: (email) => userByEmail(email),
    getUserByUsername: (username) => userByUsername(username),
    createUser: (input) =>
      enqueue(async () => {
        const email = input.email.toLowerCase();
        if (userByEmail(email)) return { error: "email" };
        if (userByUsername(input.username)) return { error: "username" };
        const user = {
          id: randomUUID(),
          email,
          username: input.username,
          password_hash: input.passwordHash,
          created_at: new Date().toISOString(),
        };
        const seeded = !state.legacyClaimed && state.legacyDocument;
        const row = {
          user_id: user.id,
          revision: seeded ? state.legacyDocument.revision : 0,
          document: seeded ? state.legacyDocument.document : emptyDocument(),
          updated_at: new Date().toISOString(),
        };
        state.users.push(user);
        state.tasks.push(row);
        if (seeded) {
          state.legacyClaimed = true;
          state.legacyDocument = null;
        }
        await persist();
        return { user, snapshot: snapshotOf(row) };
      }),
    getTasks: (userId) => {
      const row = tasksFor(userId);
      return row ? snapshotOf(row) : null;
    },
    saveTasks: (userId, expectedRevision, document) =>
      enqueue(async () => {
        const row = tasksFor(userId);
        if (!row) return { missing: true };
        if (row.revision !== expectedRevision) {
          return { conflict: true, snapshot: snapshotOf(row) };
        }
        row.revision += 1;
        row.document = document;
        row.updated_at = new Date().toISOString();
        const snapshot = snapshotOf(row);
        await persist();
        return { snapshot };
      }),
    createSession: (session) =>
      enqueue(async () => {
        state.sessions = state.sessions.filter(
          (item) => item.user_id !== session.user_id || Date.parse(item.expires_at) > Date.now(),
        );
        state.sessions.push(session);
        await persist();
        return session;
      }),
    getSession: (id) => state.sessions.find((session) => session.id === id) ?? null,
    revokeSession: (id) =>
      enqueue(async () => {
        const session = state.sessions.find((item) => item.id === id);
        if (!session || session.revoked_at) return;
        session.revoked_at = new Date().toISOString();
        await persist();
      }),
  };
};
