const { contextBridge, ipcRenderer } = require('electron');

// Exposer des APIs sécurisées au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Gestion des fichiers
  onFilesSelected: (callback) => {
    ipcRenderer.on('files-selected', (event, filePaths) => {
      callback(filePaths);
    });
  },
  
  // Informations système
  getAppVersion: () => {
    return process.env.npm_package_version || '1.0.0';
  },
  
  // Plateforme
  getPlatform: () => {
    return process.platform;
  },
  
  // Ouvrir un lien externe
  openExternal: (url) => {
    ipcRenderer.invoke('open-external', url);
  }
});

// Ajouter des logs pour le debugging
console.log('Preload script chargé');