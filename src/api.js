import { normalizeDocument } from "./normalize.js";

const STORAGE_KEY = "local-tasks-document";

export const loadDocument = async () => {
  if (window.desktop) return window.desktop.load();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return normalizeDocument(null);
  try {
    return normalizeDocument(JSON.parse(raw));
  } catch {
    return normalizeDocument(null);
  }
};

export const saveDocument = async (document) => {
  const clean = normalizeDocument(document);
  if (window.desktop) return window.desktop.save(clean);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
};
