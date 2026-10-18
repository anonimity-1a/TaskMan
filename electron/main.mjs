import { app, BrowserWindow, ipcMain, session } from "electron";
import { readFile, unlink } from "node:fs/promises";
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

const legacyFile = () => path.join(app.getPath("appData"), "local-tasks", "data.json");
const oldConnectionFile = () => path.join(app.getPath("userData"), "connection.json");

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
  await unlink(oldConnectionFile()).catch(() => undefined);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ["*://*/*"] }, (details, callback) => {
    callback({ cancel: !isAllowedUrl(details.url) });
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
