import { app, BrowserWindow, ipcMain, session } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

app.setPath("userData", path.join(app.getPath("appData"), "TaskMan"));

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
]);

const connectionFile = () => path.join(app.getPath("userData"), "connection.json");
const legacyFile = () => path.join(app.getPath("appData"), "local-tasks", "data.json");

const normalizeConnection = (value) => {
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

const remember = (connection) => {
  if (connection) allowedOrigins.add(connection.url);
};

const readConnection = async () => {
  try {
    const connection = normalizeConnection(JSON.parse(await readFile(connectionFile(), "utf8")));
    remember(connection);
    return connection;
  } catch {
    return null;
  }
};

const isAllowedUrl = (url) => {
  if (url.startsWith("file://") || url.startsWith("devtools://")) return true;
  try {
    return allowedOrigins.has(new URL(url).origin);
  } catch {
    return false;
  }
};

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "TaskMan",
    backgroundColor: "#fafaf9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(root, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedUrl(url)) event.preventDefault();
  });

  if (isDev) {
    window.loadURL("http://localhost:5173/");
  } else {
    window.loadFile(path.join(root, "../dist/index.html"));
  }
};

app.whenReady().then(async () => {
  await readConnection();
  session.defaultSession.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, callback) => {
    callback({ cancel: !isAllowedUrl(details.url) });
  });
  ipcMain.handle("connection:get", () => readConnection());
  ipcMain.handle("connection:set", async (_event, input) => {
    const connection = normalizeConnection(input);
    if (!connection) throw new Error("Enter a server address and passphrase.");
    await mkdir(app.getPath("userData"), { recursive: true });
    await writeFile(connectionFile(), JSON.stringify(connection), "utf8");
    remember(connection);
    return connection;
  });
  ipcMain.handle("connection:clear", async () => {
    await writeFile(connectionFile(), "{}", "utf8").catch(() => undefined);
    return null;
  });
  ipcMain.handle("store:legacy", async () => {
    try {
      return JSON.parse(await readFile(legacyFile(), "utf8"));
    } catch {
      return null;
    }
  });
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
