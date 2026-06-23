const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;

app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=256 --optimize-for-size');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000, height: 700,
    minWidth: 800, minHeight: 600,
    show: false, frame: true, autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    icon: path.join(__dirname, 'public/icon.svg')
  });

  mainWindow.loadURL('http://localhost:3000').catch(() => {
     mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  });

  mainWindow.on('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.destroy();
      mainWindow = null;
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
  // Build icon programmatically: blue circle with white play triangle
  const size = 16;
  const buf = Buffer.alloc(size * size * 4);
  const cx = 7.5, cy = 7.5;
  const radius = 7;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const insideCircle = (dx * dx + dy * dy) < (radius * radius);
      if (insideCircle) {
        // Blue circle (BGRA format on Windows)
        buf[i] = 235; buf[i+1] = 99; buf[i+2] = 37; buf[i+3] = 255;
        // White play triangle on top
        const inTriangle = x >= 5 && x <= 12 && y >= 3 && y <= 12 &&
          (x - 5) <= (12 - 5) * ((y - 3) / (12 - 3)) &&
          (x - 5) <= (12 - 5) * ((12 - y) / (12 - 3));
        if (inTriangle) {
          buf[i] = 255; buf[i+1] = 255; buf[i+2] = 255; buf[i+3] = 255;
        }
      } else {
        buf[i] = 0; buf[i+1] = 0; buf[i+2] = 0; buf[i+3] = 0;
      }
    }
  }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size });
  tray = new Tray(icon);

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

  globalShortcut.register('CommandOrControl+Shift+Space', showWindow);

  app.on('activate', showWindow);
});

app.on('will-quit', () => globalShortcut.unregisterAll());

// Keep app alive in tray even when window is closed
app.on('window-all-closed', () => {});
