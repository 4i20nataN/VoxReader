const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');
const readline = require('readline');

let tray = null;
let mainWindow = null;

app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=256 --optimize-for-size');
app.commandLine.appendSwitch('enable-features', 'WebSpeech');

const DIST_PATH = path.join(__dirname, 'dist');

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000, height: 700,
    minWidth: 800, minHeight: 600,
    show: false, frame: true, autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    icon: path.join(__dirname, 'public/icon.svg')
  });

  mainWindow.loadFile(path.join(DIST_PATH, 'index.html'));

  mainWindow.on('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.destroy();
      mainWindow = null;
    }
  });
}

// Start with Windows
ipcMain.on('set-auto-launch', (_, enable) => {
  app.setLoginItemSettings({ openAtLogin: enable, args: ['--hidden'] });
});

// List available Windows speech recognition packs via DISM
ipcMain.handle('check-speech-packs', async () => {
  const ps = `Get-WindowsCapability -Online | Where-Object { $_.Name -like 'Language.Speech~~~*' } | ForEach-Object { Write-Output ($_.Name + '|' + $_.DisplayName + '|' + $_.State) }`;
  const buf = Buffer.from(ps, 'ucs2');
  const encoded = buf.toString('base64');

  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 60000, windowsHide: true
    }, (error, stdout) => {
      if (error) { resolve({ error: 'Erro ao verificar pacotes de fala.' }); return; }
      try {
        const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
        const list = lines.map(line => {
          const [name, , stateStr] = line.split('|');
          return {
            name: name || '',
            displayName: name ? name.replace(/Language\.Speech~~~(.+)~\d+\.\d+\.\d+\.\d+/, '$1') : '',
            installed: parseInt(stateStr, 10) === 4
          };
        });
        resolve({ packs: list });
      } catch {
        resolve({ packs: [] });
      }
    });
  });
});

// Install a speech pack via DISM (triggers UAC) with progress polling
ipcMain.handle('install-speech-pack', async (event, packName) => {
  const scriptPath = path.join(os.tmpdir(), `install-speech-${Date.now()}.ps1`);
  const scriptContent = `Add-WindowsCapability -Online -Name "${packName}"`;
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');

  const win = BrowserWindow.getAllWindows()[0];

  const launchCmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"' -Wait`;
  const buf = Buffer.from(launchCmd, 'ucs2');
  const encoded = buf.toString('base64');

  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 600000, windowsHide: true
    }, (launchError) => {
      if (launchError) {
        try { fs.unlinkSync(scriptPath); } catch {}
        resolve({ error: 'Erro ao iniciar instalação. Verifique se o Windows é compatível.' });
        return;
      }
      // Poll for completion
      let attempts = 0;
      const poll = () => {
        const checkCmd = `$s = (Get-WindowsCapability -Online -Name "${packName}").State; if ($s -eq 4) { 'OK' } elseif ($s -eq 0) { 'NO' } else { 'FAIL:' + $s }`;
        const checkBuf = Buffer.from(checkCmd, 'ucs2');
        const checkEncoded = checkBuf.toString('base64');
        execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', checkEncoded], {
          timeout: 15000, windowsHide: true
        }, (err, out) => {
          const result = (out || '').trim();
          if (result === 'OK') {
            try { fs.unlinkSync(scriptPath); } catch {}
            resolve({ success: true });
          } else if (result.startsWith('FAIL:')) {
            try { fs.unlinkSync(scriptPath); } catch {}
            resolve({ error: 'Falha na instalação. Tente executar o instalador como Administrador manualmente.' });
          } else if (attempts < 120) {
            attempts++;
            if (win && !win.isDestroyed()) {
              win.webContents.send('install-progress', { packName, progress: Math.min(attempts, 95) });
            }
            setTimeout(poll, 3000);
          } else {
            try { fs.unlinkSync(scriptPath); } catch {}
            resolve({ error: 'Tempo limite excedido (6 min). Verifique sua conexão e tente novamente.' });
          }
        });
      };
      setTimeout(poll, 3000);
    });
  });
});

// Remove a speech pack via DISM (triggers UAC)
ipcMain.handle('remove-speech-pack', async (event, packName) => {
  const scriptPath = path.join(os.tmpdir(), `remove-speech-${Date.now()}.ps1`);
  const scriptContent = `Remove-WindowsCapability -Online -Name "${packName}"`;
  fs.writeFileSync(scriptPath, scriptContent, 'utf8');
  const launchCmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"' -Wait`;
  const buf = Buffer.from(launchCmd, 'ucs2');
  const encoded = buf.toString('base64');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 600000, windowsHide: true
    }, (launchError) => {
      try { fs.unlinkSync(scriptPath); } catch {}
      if (launchError) {
        resolve({ error: 'Erro ao desinstalar pacote.' });
      } else {
        resolve({ success: true });
      }
    });
  });
});

// Check if Windows speech privacy policy has been accepted
ipcMain.handle('check-speech-privacy', async () => {
  const ps = `
    $hkcu = (Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy" -Name HasAccepted -ErrorAction 0).HasAccepted;
    $hklm = 0;
    try { $p = Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\InputPersonalization" -Name AllowInputPersonalization -ErrorAction Stop; $hklm = $p.AllowInputPersonalization } catch {}
    if ($hkcu -eq 1 -or $hklm -eq 1) { '1' } else { '0' }
  `.trim();
  const buf = Buffer.from(ps, 'ucs2');
  const encoded = buf.toString('base64');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 10000, windowsHide: true
    }, (error, stdout) => {
      const out = (stdout || '').trim();
      resolve({ accepted: out === '1' });
    });
  });
});

// Activate Windows speech recognition
ipcMain.handle('accept-speech-privacy', async () => {
  const ps = `
    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy" -Name "HasAccepted" -Value 1 -Force;
    Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\InputPersonalization" -Name "AllowInputPersonalization" -Value 1 -Force;
    Restart-Service -Name "Audiosrv" -Force
  `;
  const buf = Buffer.from(ps.trim(), 'ucs2');
  const encoded = buf.toString('base64');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 30000, windowsHide: true
    }, (error) => {
      if (error) resolve({ success: false, error: error.message });
      else resolve({ success: true });
    });
  });
});

// Deactivate Windows speech recognition
ipcMain.handle('deactivate-speech-privacy', async () => {
  const ps = `
    Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Speech_OneCore\\Settings\\OnlineSpeechPrivacy" -Name "HasAccepted" -Value 0 -Force;
    Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\InputPersonalization" -Name "AllowInputPersonalization" -Value 0 -Force;
    Restart-Service -Name "Audiosrv" -Force
  `;
  const buf = Buffer.from(ps.trim(), 'ucs2');
  const encoded = buf.toString('base64');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 30000, windowsHide: true
    }, (error) => {
      if (error) resolve({ success: false, error: error.message });
      else resolve({ success: true });
    });
  });
});

// Windows built-in speech recognition using user-chosen culture
function getWorkerPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'speech-worker.exe');
  return path.join(__dirname, 'resources', 'SpeechWorker.exe');
}

let activeWorker = null;
let activeWorkerWin = null;

ipcMain.handle('start-speech-recognition', async (event, culture) => {
  if (activeWorker) { activeWorker.kill(); activeWorker = null; }
  const workerPath = getWorkerPath();
  if (!fs.existsSync(workerPath))
    return { success: false, error: 'Worker não encontrado. Execute dotnet publish em speech-worker/' };

  activeWorker = spawn(workerPath, ['--culture', culture || 'pt-BR'], { windowsHide: true });
  activeWorkerWin = event.sender;

  const rl = readline.createInterface({ input: activeWorker.stdout });
  rl.on('line', (line) => {
    try {
      const result = JSON.parse(line);
      if (event.sender && !event.sender.isDestroyed())
        event.sender.send('recognition-result', result);
    } catch {}
  });

  activeWorker.on('error', () => { activeWorker = null; activeWorkerWin = null; });
  activeWorker.on('exit', () => { activeWorker = null; activeWorkerWin = null; });

  return { success: true };
});

ipcMain.handle('stop-speech-recognition', async () => {
  if (activeWorker) { activeWorker.kill(); activeWorker = null; activeWorkerWin = null; }
  return { success: true };
});

async function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    await createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
  session.defaultSession.clearCache().catch(() => {});
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
        buf[i] = 235; buf[i+1] = 99; buf[i+2] = 37; buf[i+3] = 255;
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
app.on('window-all-closed', () => {});
