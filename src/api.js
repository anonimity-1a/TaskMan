import { emptyDocument } from "./model.js";

const STORAGE_KEY = "local-tasks-document";

export const loadDocument = async () => {
  if (window.desktop) return window.desktop.load();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyDocument();
  try {
    return JSON.parse(raw);
  } catch {
    return emptyDocument();
  }
};

export const saveDocument = async (document) => {
  if (window.desktop) return window.desktop.save(document);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  return document;
};
