// What the calculator window may ask the hub to do. Nothing else gets through.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rgc', {
  get: () => ipcRenderer.invoke('rgc:get'),
  insert: (text) => ipcRenderer.invoke('rgc:insert', text),
  copy: (text) => ipcRenderer.invoke('rgc:copy', text),
  edit: (id) => ipcRenderer.invoke('rgc:edit', id),
  close: () => ipcRenderer.invoke('rgc:close'),
  onShow: (cb) => ipcRenderer.on('rgc:show', (_e, d) => cb(d)),
});
