const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  getConnection: () => ipcRenderer.invoke("connection:get"),
  setConnection: (connection) => ipcRenderer.invoke("connection:set", connection),
  clearConnection: () => ipcRenderer.invoke("connection:clear"),
  legacyLoad: () => ipcRenderer.invoke("store:legacy"),
});
