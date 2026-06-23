const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, dialog } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;

// Chromium flags for lower memory usage
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=256 --optimize-for-size');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'public/icon.svg')
  });

  mainWindow.loadURL('http://localhost:3000').catch(() => {
     mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Fechar', 'Cancelar'],
        defaultId: 1,
        title: 'Leitor Inteligente',
        message: 'O app continuará rodando na bandeja.',
        detail: 'Clique com botão direito no ícone da bandeja para sair completamente.'
      }).then(({ response }) => {
        if (response === 0) {
          mainWindow.destroy();
          mainWindow = null;
        }
      });
    }
  });
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
  // Start only in tray — no window created until user opens it

  const icon = nativeImage.createFromPath(path.join(__dirname, 'public/icon.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir Leitor Inteligente', click: showWindow },
    { type: 'separator' },
    { label: 'Sair e Encerrar', click: () => {
        app.isQuitting = true;
        app.quit();
    }}
  ]);

  tray.setToolTip('Leitor Inteligente');
  tray.setContextMenu(contextMenu);

  tray.on('click', showWindow);

  // Global shortcut: Ctrl+Shift+Space to open window
  globalShortcut.register('CommandOrControl+Shift+Space', showWindow);

  app.on('activate', showWindow);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
