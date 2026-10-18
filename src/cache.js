import { normalizeDocument } from "./normalize.js";

const DB_NAME = "taskman";
const STORE = "snapshots";

const cacheKey = (userId) => {
  if (typeof userId !== "string" || !userId) throw new Error("user id is required");
  return `tasks_cache_${userId}`;
};

const snapshotOf = (value) => {
  if (!value || !Number.isInteger(value.revision) || !value.document) return null;
  return {
    revision: value.revision,
    document: normalizeDocument(value.document),
  };
};

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const memoryGet = (key) => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw);
};

const memorySet = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const memoryDelete = (key) => {
  localStorage.removeItem(key);
};

const withStore = async (mode, run) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      let result;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? request.error);
      tx.onabort = () => reject(tx.error ?? new Error("Could not update the saved tasks."));
    });
  } finally {
    db.close();
  }
};

export const readTaskCache = async (userId) => {
  const key = cacheKey(userId);
  try {
    return snapshotOf(await withStore("readonly", (store) => store.get(key)));
  } catch {
    try {
      return snapshotOf(memoryGet(key));
    } catch {
      return null;
    }
  }
};

export const writeTaskCache = async (userId, snapshot) => {
  const key = cacheKey(userId);
  const value = {
    revision: snapshot.revision,
    document: snapshot.document,
    savedAt: Date.now(),
  };
  try {
    await withStore("readwrite", (store) => store.put(value, key));
  } catch {
    memorySet(key, value);
  }
};

export const clearTaskCache = async (userId) => {
  const key = cacheKey(userId);
  try {
    await withStore("readwrite", (store) => store.delete(key));
  } catch {
    /* IndexedDB may be unavailable. The local copy is removed below. */
  }
  memoryDelete(key);
};
