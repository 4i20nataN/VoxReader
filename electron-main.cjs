const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, session, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');

let tray = null;
let mainWindow = null;

app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=256 --optimize-for-size');
app.commandLine.appendSwitch('enable-features', 'WebSpeech');
app.commandLine.appendSwitch('disable-features', 'NetworkService');
// Pass Google Speech API key from env to Chromium if set
if (process.env.GOOGLE_API_KEY) {
  app.commandLine.appendSwitch('speech-api-key', process.env.GOOGLE_API_KEY);
}

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

// Start with Windows IPC handler
ipcMain.on('set-auto-launch', (_, enable) => {
  app.setLoginItemSettings({ openAtLogin: enable, args: ['--hidden'] });
});

// Windows built-in speech recognition (offline, via PowerShell + .NET System.Speech)
ipcMain.handle('start-speech-recognition', async () => {
  const psScript = `
Add-Type -AssemblyName System.Speech
try {
  $culture = [System.Globalization.CultureInfo]::GetCultureInfo('pt-BR')
  $rec = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
  $rec.SetInputToDefaultAudioDevice()
  $grammar = New-Object System.Speech.Recognition.DictationGrammar
  $rec.LoadGrammar($grammar)
  $result = $rec.Recognize()
  if ($result) {
    Write-Output $result.Text
  } else {
    Write-Output '__NO_SPEECH__'
  }
} catch {
  Write-Output "__ERROR__: $_"
}
`;
  const buf = Buffer.from(psScript, 'ucs2');
  const encoded = buf.toString('base64');

  return new Promise((resolve) => {
    const child = execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 30000,
      windowsHide: true
    }, (error, stdout, stderr) => {
      const output = (stdout || '').trim();
      if (output.startsWith('__ERROR__')) {
        const errMsg = output.replace('__ERROR__', '').trim();
        if (errMsg.includes('System.Speech')) {
          resolve({ error: 'Reconhecimento de voz do Windows não disponível. Instale o pacote de idioma de Fala no Windows: Configurações > Hora e Idioma > Fala.' });
        } else if (errMsg.includes('CultureNotFound') || errMsg.includes('pt-BR') || errMsg.includes('No recognizer')) {
          resolve({ error: 'Pacote de reconhecimento de fala para Português não encontrado. Instale em: Configurações > Hora e Idioma > Fala > Baixar pacote de reconhecimento de fala.' });
        } else {
          resolve({ error: errMsg });
        }
      } else if (output === '__NO_SPEECH__' || !output) {
        resolve({ error: 'Nenhuma fala detectada. Tente novamente.' });
      } else {
        resolve({ text: output });
      }
    });
    child.on('error', () => resolve({ error: 'Erro ao iniciar reconhecimento de voz do Windows.' }));
  });
});

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
  // Auto-grant microphone permission for speech recognition
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback) => {
    if (permission === 'media') { callback(true); } else { callback(false); }
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission) => {
    if (permission === 'media') return true;
    return false;
  });

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
