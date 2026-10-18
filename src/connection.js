const KEY = "taskman-connection";

export const normalizeConnection = (value) => {
  if (!value || typeof value.token !== "string" || !value.token.trim()) return null;
  let url;
  try {
    url = new URL(value.url);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { url: url.origin, token: value.token.trim() };
};

export const getConnection = () => {
  try {
    return normalizeConnection(JSON.parse(localStorage.getItem(KEY) ?? ""));
  } catch {
    return null;
  }
};

export const saveConnection = (connection) => {
  localStorage.setItem(KEY, JSON.stringify(connection));
};

export const clearConnection = () => {
  localStorage.removeItem(KEY);
};

export const loadStoredConnection = async () => {
  const local = getConnection();
  if (local) {
    if (window.desktop?.setConnection) await window.desktop.setConnection(local);
    return local;
  }
  if (!window.desktop?.getConnection) return null;
  const saved = normalizeConnection(await window.desktop.getConnection());
  if (!saved) return null;
  saveConnection(saved);
  return saved;
};
