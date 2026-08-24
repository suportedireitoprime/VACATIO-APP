const { contextBridge } = require('electron');

// Sinaliza pro app que está rodando dentro do Electron desktop.
// A UI usa isso pra habilitar modo 100% offline (bundle nativo).
contextBridge.exposeInMainWorld('desktopApp', {
  isElectron: true,
  platform: process.platform,
});
