const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  legacyLoad: () => ipcRenderer.invoke("store:legacy"),
});
