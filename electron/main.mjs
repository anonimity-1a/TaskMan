import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDocument, saveDocument } from "./store.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

app.setPath("userData", path.join(app.getPath("appData"), "local-tasks"));

const isAllowedUrl = (url) =>
  url.startsWith("file://") ||
  url.startsWith("http://localhost:5173") ||
  url.startsWith("http://127.0.0.1:5173") ||
  url.startsWith("devtools://");

const createWindow = () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: "Local Tasks",
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

app.whenReady().then(() => {
  const userData = app.getPath("userData");
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ["*://*/*"] },
    (details, callback) => {
      callback({ cancel: !isAllowedUrl(details.url) });
    },
  );
  ipcMain.handle("store:load", () => loadDocument(userData));
  ipcMain.handle("store:save", (_event, document) =>
    saveDocument(userData, document),
  );
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
