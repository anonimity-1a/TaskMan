const KEY = "taskman-session";
const LEGACY_KEYS = ["taskman-connection"];

export const clearLegacyConnection = () => {
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
};

export const getSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem(KEY) ?? "");
    if (!session || typeof session.token !== "string" || !session.token) return null;
    if (!session.user || typeof session.user.id !== "string" || !session.user.id) return null;
    return session;
  } catch {
    return null;
  }
};

export const saveSession = (session) => {
  clearLegacyConnection();
  localStorage.setItem(
    KEY,
    JSON.stringify({
      token: session.token,
      user: {
        id: session.user.id,
        email: session.user.email,
        username: session.user.username,
      },
    }),
  );
};

export const clearSession = () => {
  localStorage.removeItem(KEY);
  clearLegacyConnection();
};
