// What the reference viewer may ask the hub to do. Nothing else gets through.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rgv', {
  get: (id) => ipcRenderer.invoke('rgv:get', id),
  openLink: (url) => ipcRenderer.invoke('rgv:open-link', url),
  edit: (id) => ipcRenderer.invoke('rgv:edit', id),
  library: () => ipcRenderer.invoke('rgv:library'),
  openEntry: (e) => ipcRenderer.invoke('rgv:open-entry', e),
  save: (v) => ipcRenderer.invoke('rgv:save', v),
  newNote: (section) => ipcRenderer.invoke('rgv:new', section),
  close: () => ipcRenderer.invoke('rgv:close'),
  onShow: (cb) => ipcRenderer.on('rgv:show', (_e, id) => cb(id)),
});
