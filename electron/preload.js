const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aki', {
  getSave: () => ipcRenderer.invoke('store:get'),
  setSave: (data) => ipcRenderer.invoke('store:set', data),
  patchSave: (patch) => ipcRenderer.invoke('store:patch', patch),
  checkout: (productId) => ipcRenderer.invoke('shop:checkout', productId),
  verifySession: (sessionId) => ipcRenderer.invoke('shop:verify', sessionId),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url)
});
