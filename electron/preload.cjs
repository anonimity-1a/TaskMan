const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  load: () => ipcRenderer.invoke("store:load"),
  save: (document) => ipcRenderer.invoke("store:save", document),
});
