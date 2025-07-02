const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Variables globales
let mainWindow;
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Créer la fenêtre du navigateur
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false, // Ne pas afficher immédiatement
    titleBarStyle: 'default',
    autoHideMenuBar: false,
    title: 'CMS PGM Generator' // MODIFIÉ: Nouveau titre
  });

  // Charger l'application
  const startUrl = isDev 
    ? 'http://localhost:9000' 
    : `file://${path.join(__dirname, '../dist/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Afficher la fenêtre quand elle est prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Gérer la fermeture de la fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Créer le menu de l'application
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        {
          label: 'Nouveau',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Réinitialiser l'application
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'Ouvrir fichiers NC2...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile', 'multiSelections'],
              filters: [
                { name: 'Fichiers NC', extensions: ['nc1', 'nc2'] },
                { name: 'Archives ZIP', extensions: ['zip'] },
                { name: 'Tous les fichiers', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
              // Envoyer les fichiers à l'application web
              mainWindow.webContents.send('files-selected', result.filePaths);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quitter',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Rétablir', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copier', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Coller', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forcer le rechargement', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Outils de développement', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom avant', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom arrière', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Zoom réel', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Plein écran', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos de CMS PGM Generator', // MODIFIÉ
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'À propos',
              message: 'CMS PGM Generator', // MODIFIÉ
              detail: 'Optimisation intelligente des découpes de profilés\nVersion 1.0.0',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Ouvrir le dossier de logs',
          click: () => {
            const logsPath = path.join(app.getPath('userData'), 'logs');
            shell.openPath(logsPath);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Événements de l'application
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Sécurité : empêcher la navigation vers des sites externes
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:9000' && !navigationUrl.startsWith('file://')) {
      navigationEvent.preventDefault();
    }
  });
});