const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true, // Native window frame
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'public/vite.svg')
  });

  // Load the web app
  mainWindow.loadURL('http://localhost:3000').catch(() => {
     mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Setup Tray
  const icon = nativeImage.createFromPath(path.join(__dirname, 'public/vite.svg'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir Leitor Inteligente', click: () => {
       if (mainWindow) {
         mainWindow.show();
         mainWindow.focus();
       }
    }},
    { type: 'separator' },
    { label: 'Tocar / Pausar Leitura', click: () => {
        if (mainWindow) {
          mainWindow.webContents.executeJavaScript(`
            if (window.togglePlayPause) window.togglePlayPause();
          `);
        }
    }},
    { type: 'separator' },
    { label: 'Sair e Encerrar', click: () => {
        app.isQuitting = true;
        app.quit();
    }}
  ]);

  tray.setToolTip('Leitor Inteligente - Otimizado');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
