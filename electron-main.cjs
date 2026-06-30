const { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile, spawn } = require('child_process');
const readline = require('readline');
const http = require('http');

let tray = null;
let mainWindow = null;
let staticServer = null;

app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('js-flags', '--max_old_space_size=256 --optimize-for-size');
app.commandLine.appendSwitch('enable-features', 'WebSpeech');

const MIME = {
  '.html': 'text/html;charset=utf-8',
  '.js': 'application/javascript;charset=utf-8',
  '.css': 'text/css;charset=utf-8',
  '.json': 'application/json;charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const DATA_DIR = app.isPackaged
  ? path.join(app.getPath('userData'), 'VoxReader-data')
  : path.join(__dirname, 'user-data');

const DIST_PORT = 51999;

function serveDist(cb) {
  const dist = path.join(__dirname, 'dist');
  const server = http.createServer((req, res) => {
    const uri = decodeURIComponent(req.url).split('?')[0];
    let filePath = path.join(dist, uri === '/' ? 'index.html' : uri);
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404); res.end('404'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  server.listen(DIST_PORT, '127.0.0.1', () => cb(server));
  server.on('error', (err1) => {
    console.warn('serveDist port', DIST_PORT, 'failed:', err1.code, 'trying random port');
    server.listen(0, '127.0.0.1', () => cb(server));
    server.on('error', (err2) => {
      console.error('serveDist random port also failed:', err2.code);
    });
  });
}

async function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1000, height: 700,
      minWidth: 800, minHeight: 600,
      show: false, frame: true, autoHideMenuBar: true,
      backgroundColor: '#0a0a0f',
      webPreferences: { nodeIntegration: true, contextIsolation: false },
      icon: path.join(__dirname, 'public/icon.svg')
    });

    const loadWithFallback = () => {
      if (!app.isPackaged) {
        mainWindow.loadURL('http://localhost:3000').catch(() => {
          serveDist((server) => {
            staticServer = server;
            mainWindow.loadURL(`http://127.0.0.1:${server.address().port}`).catch(() => {});
          });
        });
      } else {
        serveDist((server) => {
          staticServer = server;
          mainWindow.loadURL(`http://127.0.0.1:${server.address().port}`).catch(() => {});
        });
      }
    };

    loadWithFallback();

    mainWindow.on('ready-to-show', () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    });

    mainWindow.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        mainWindow.destroy();
        mainWindow = null;
      }
    });
  } catch (err) {
    console.error('Failed to create window:', err);
  }
}

// Start with Windows
ipcMain.on('set-auto-launch', (_, enable) => {
  app.setLoginItemSettings({ openAtLogin: enable, args: ['--hidden'] });
});

// List installed Windows speech & TTS packs from Registry (no admin needed)
ipcMain.handle('check-speech-packs', async () => {
  const psCmd = `$ProgressPreference='SilentlyContinue'; Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens' -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue; if ($p) { $n = $_.PSChildName; $d = [string]$p.'(Default)'; $m = [regex]::Match($n, 'V\\d+_(\\w{4})_'); $loc = if ($m.Success) { $v = $m.Groups[1].Value; $v.Substring(0,2).ToLower() + '-' + $v.Substring(2).ToUpper() } else { '' }; Write-Output ('TTS|' + $n + '|' + $d + '|' + $loc) } }; Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Recognizers\\Tokens' -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue; if ($p) { $n = $_.PSChildName; $d = [string]$p.'(Default)'; $lm = [regex]::Match($d, '([a-z]{2}-[A-Z]{2})'); $loc = if ($lm.Success) { $lm.Groups[1].Value } else { '' }; Write-Output ('SR|' + $n + '|' + $d + '|' + $loc) } }`;

  const buf = Buffer.from(psCmd, 'ucs2');
  const encoded = buf.toString('base64');

  try {
    const result = await new Promise((resolve) => {
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
        timeout: 15000, windowsHide: true
      }, (error, stdout) => {
        resolve({ error, stdout: stdout || '' });
      });
    });

    const packs = result.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => {
      const [registryType, , displayName, locale] = line.split('|');
      const type = registryType === 'SR' ? 'speech' : 'tts';
      let langName = locale;
      try { langName = new Intl.DisplayNames(['pt-BR'], { type: 'language' }).of(locale) || locale; } catch {}
      return {
        name: type === 'tts'
          ? `Language.TextToSpeech~~~${locale}~0.0.1.0`
          : `Language.Speech~~~${locale}~0.0.1.0`,
        displayName: displayName || locale,
        locale,
        langName: langName || locale,
        installed: true,
        type
      };
    }).filter(p => p.locale);

    return { packs };
  } catch {
    return { error: 'Erro ao ler pacotes de fala do Registro.' };
  }
});

// Curated list of ALL known Windows speech locale codes
const SPEECH_LOCALES = [
  { locale: 'af-ZA', lang: 'Afrikaans' }, { locale: 'am-ET', lang: 'Amharic' },
  { locale: 'ar-SA', lang: 'Arabic' }, { locale: 'as-IN', lang: 'Assamese' },
  { locale: 'az-AZ', lang: 'Azerbaijani' }, { locale: 'bg-BG', lang: 'Bulgarian' },
  { locale: 'bn-BD', lang: 'Bengali' }, { locale: 'bs-BA', lang: 'Bosnian' },
  { locale: 'ca-ES', lang: 'Catalan' }, { locale: 'cs-CZ', lang: 'Czech' },
  { locale: 'cy-GB', lang: 'Welsh' }, { locale: 'da-DK', lang: 'Danish' },
  { locale: 'de-DE', lang: 'German' }, { locale: 'el-GR', lang: 'Greek' },
  { locale: 'en-AU', lang: 'English (Australia)' }, { locale: 'en-CA', lang: 'English (Canada)' },
  { locale: 'en-GB', lang: 'English (UK)' }, { locale: 'en-IE', lang: 'English (Ireland)' },
  { locale: 'en-IN', lang: 'English (India)' }, { locale: 'en-US', lang: 'English (US)' },
  { locale: 'es-ES', lang: 'Spanish' }, { locale: 'es-MX', lang: 'Spanish (Mexico)' },
  { locale: 'et-EE', lang: 'Estonian' }, { locale: 'eu-ES', lang: 'Basque' },
  { locale: 'fa-IR', lang: 'Persian' }, { locale: 'fi-FI', lang: 'Finnish' },
  { locale: 'fil-PH', lang: 'Filipino' }, { locale: 'fr-CA', lang: 'French (Canada)' },
  { locale: 'fr-FR', lang: 'French' }, { locale: 'ga-IE', lang: 'Irish' },
  { locale: 'gl-ES', lang: 'Galician' }, { locale: 'gu-IN', lang: 'Gujarati' },
  { locale: 'ha-NG', lang: 'Hausa' }, { locale: 'he-IL', lang: 'Hebrew' },
  { locale: 'hi-IN', lang: 'Hindi' }, { locale: 'hr-HR', lang: 'Croatian' },
  { locale: 'hu-HU', lang: 'Hungarian' }, { locale: 'hy-AM', lang: 'Armenian' },
  { locale: 'id-ID', lang: 'Indonesian' }, { locale: 'is-IS', lang: 'Icelandic' },
  { locale: 'it-IT', lang: 'Italian' }, { locale: 'ja-JP', lang: 'Japanese' },
  { locale: 'ka-GE', lang: 'Georgian' }, { locale: 'kk-KZ', lang: 'Kazakh' },
  { locale: 'km-KH', lang: 'Khmer' }, { locale: 'kn-IN', lang: 'Kannada' },
  { locale: 'ko-KR', lang: 'Korean' }, { locale: 'ku-TR', lang: 'Kurdish' },
  { locale: 'ky-KG', lang: 'Kyrgyz' }, { locale: 'lb-LU', lang: 'Luxembourgish' },
  { locale: 'lo-LA', lang: 'Lao' }, { locale: 'lt-LT', lang: 'Lithuanian' },
  { locale: 'lv-LV', lang: 'Latvian' }, { locale: 'mi-NZ', lang: 'Maori' },
  { locale: 'mk-MK', lang: 'Macedonian' }, { locale: 'ml-IN', lang: 'Malayalam' },
  { locale: 'mn-MN', lang: 'Mongolian' }, { locale: 'mr-IN', lang: 'Marathi' },
  { locale: 'ms-MY', lang: 'Malay' }, { locale: 'mt-MT', lang: 'Maltese' },
  { locale: 'my-MM', lang: 'Burmese' }, { locale: 'nb-NO', lang: 'Norwegian' },
  { locale: 'ne-NP', lang: 'Nepali' }, { locale: 'nl-NL', lang: 'Dutch' },
  { locale: 'or-IN', lang: 'Odia' }, { locale: 'pa-IN', lang: 'Punjabi' },
  { locale: 'pl-PL', lang: 'Polish' }, { locale: 'pt-BR', lang: 'Portuguese (Brazil)' },
  { locale: 'pt-PT', lang: 'Portuguese (Portugal)' }, { locale: 'ro-RO', lang: 'Romanian' },
  { locale: 'ru-RU', lang: 'Russian' }, { locale: 'sd-PK', lang: 'Sindhi' },
  { locale: 'si-LK', lang: 'Sinhala' }, { locale: 'sk-SK', lang: 'Slovak' },
  { locale: 'sl-SI', lang: 'Slovenian' }, { locale: 'sq-AL', lang: 'Albanian' },
  { locale: 'sr-RS', lang: 'Serbian' }, { locale: 'sv-SE', lang: 'Swedish' },
  { locale: 'sw-KE', lang: 'Swahili' }, { locale: 'ta-IN', lang: 'Tamil' },
  { locale: 'te-IN', lang: 'Telugu' }, { locale: 'th-TH', lang: 'Thai' },
  { locale: 'tk-TM', lang: 'Turkmen' }, { locale: 'tr-TR', lang: 'Turkish' },
  { locale: 'tt-RU', lang: 'Tatar' }, { locale: 'ug-CN', lang: 'Uyghur' },
  { locale: 'uk-UA', lang: 'Ukrainian' }, { locale: 'ur-PK', lang: 'Urdu' },
  { locale: 'uz-UZ', lang: 'Uzbek' }, { locale: 'vi-VN', lang: 'Vietnamese' },
  { locale: 'zh-CN', lang: 'Chinese (Simplified)' }, { locale: 'zh-HK', lang: 'Chinese (Hong Kong)' },
  { locale: 'zh-TW', lang: 'Chinese (Traditional)' }, { locale: 'zu-ZA', lang: 'Zulu' },
];

// Cache for online pack list (5 min TTL)
let onlinePacksCache = null;
let onlinePacksCacheTime = 0;
const ONLINE_CACHE_TTL = 300000; // 5 min

// Search all known speech/TTS locales (online curated list + Registry cross-reference)
ipcMain.handle('check-speech-packs-online', async () => {
  if (onlinePacksCache && Date.now() - onlinePacksCacheTime < ONLINE_CACHE_TTL) {
    return onlinePacksCache;
  }

  let installedSpeech = new Set();
  let installedTTS = new Set();
  try {
    const cmd = `$ProgressPreference='SilentlyContinue'; Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens' -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue; if ($p) { $n = $_.PSChildName; $m = [regex]::Match($n, 'V\\d+_(\\w{4})_'); if ($m.Success) { $v = $m.Groups[1].Value; Write-Output ('TTS|' + $v.Substring(0,2).ToLower() + '-' + $v.Substring(2).ToUpper()) } } }; Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Recognizers\\Tokens' -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue; if ($p) { $d = [string]$p.'(Default)'; $lm = [regex]::Match($d, '([a-z]{2}-[A-Z]{2})'); if ($lm.Success) { Write-Output ('SR|' + $lm.Groups[1].Value) } } }`;
    const buf = Buffer.from(cmd, 'ucs2');
    const encoded = buf.toString('base64');
    const result = await new Promise((resolve) => {
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
        timeout: 15000, windowsHide: true
      }, (error, stdout) => {
        resolve({ error, stdout: stdout || '' });
      });
    });
    if (!result.error) {
      result.stdout.trim().split(/\r?\n/).filter(Boolean).forEach(line => {
        const parts = line.split('|');
        if (parts.length === 2) {
          if (parts[0] === 'TTS') installedTTS.add(parts[1]);
          else if (parts[0] === 'SR') installedSpeech.add(parts[1]);
        }
      });
    }
  } catch {}

  const packs = [];
  for (const { locale, lang } of SPEECH_LOCALES) {
    packs.push({
      name: `Language.Speech~~~${locale}~0.0.1.0`,
      displayName: lang,
      locale,
      langName: lang,
      installed: installedSpeech.has(locale),
      type: 'speech'
    });
    packs.push({
      name: `Language.TextToSpeech~~~${locale}~0.0.1.0`,
      displayName: lang,
      locale,
      langName: lang,
      installed: installedTTS.has(locale),
      type: 'tts'
    });
  }
  onlinePacksCache = { packs };
  onlinePacksCacheTime = Date.now();
  return onlinePacksCache;
});

// Invalidate cache when packs are installed/removed
function invalidateOnlineCache() {
  onlinePacksCache = null;
  onlinePacksCacheTime = 0;
}

// Validate pack name format before install/remove
function isValidPackName(name) {
  return /^Language\.(Speech|TextToSpeech)~~~[a-z]{2}-[A-Z]{2}~[\d.]+$/.test(name);
}

// Shared polling: check DISM state until installed (4) or timeout (120 attempts = 6 min)
function pollCapabilityState(packName, win, desiredState, label) {
  return new Promise((resolve) => {
    const isDesiredState = desiredState === 4
      ? (s) => s === 4
      : (s) => s === 0 || s === 1; // NotPresent or resolved for removal
    let attempts = 0;
    const poll = () => {
      const checkCmd = `$s = (Get-WindowsCapability -Online -Name "${packName}").State; if ($s -eq ${desiredState}) { 'OK' } elseif ($s -eq 0) { 'NO' } else { 'FAIL:' + $s }`;
      const checkBuf = Buffer.from(checkCmd, 'ucs2');
      const checkEncoded = checkBuf.toString('base64');
      execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', checkEncoded], {
        timeout: 15000, windowsHide: true
      }, (err, out) => {
        const result = (out || '').trim();
        if (result === 'OK') {
          resolve({ success: true });
        } else if (result.startsWith('FAIL:')) {
          resolve({ error: `${label} falhou (código ${result.slice(5)}).` });
        } else if (attempts < 120) {
          attempts++;
          if (win && !win.isDestroyed()) {
            win.webContents.send('install-progress', { packName, progress: Math.min(Math.round(attempts / 120 * 100), 100) });
          }
          setTimeout(poll, 3000);
        } else {
          resolve({ error: `Tempo limite excedido (6 min) para ${label}.` });
        }
      });
    };
    setTimeout(poll, 2000);
  });
}

// Install a speech/TTS pack via DISM (triggers UAC) with real polling
ipcMain.handle('install-speech-pack', async (event, packName) => {
  if (!isValidPackName(packName)) {
    return { error: 'Nome de pacote inválido.' };
  }

  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send('install-progress', { packName, progress: 1 });
  }

  // Fire-and-forget elevated install (no -Wait so polling starts immediately)
  const scriptPath = path.join(os.tmpdir(), `install-speech-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, `Add-WindowsCapability -Online -Name "${packName}"`, 'utf8');
  const launchCmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"'`;
  const buf = Buffer.from(launchCmd, 'ucs2');
  const encoded = buf.toString('base64');

  execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
    timeout: 10000, windowsHide: true
  }, (launchError) => {
    if (launchError) {
      try { fs.unlinkSync(scriptPath); } catch {}
    }
  });

  // Start polling while install runs in background
  const result = await pollCapabilityState(packName, win, 4, 'Instalação');
  try { fs.unlinkSync(scriptPath); } catch {}
  invalidateOnlineCache();
  return result;
});

// Remove a speech/TTS pack via DISM (triggers UAC) with polling
ipcMain.handle('remove-speech-pack', async (event, packName) => {
  if (!isValidPackName(packName)) {
    return { error: 'Nome de pacote inválido.' };
  }

  const win = BrowserWindow.getAllWindows()[0];

  const scriptPath = path.join(os.tmpdir(), `remove-speech-${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, `Remove-WindowsCapability -Online -Name "${packName}"`, 'utf8');
  const launchCmd = `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"'`;
  const buf = Buffer.from(launchCmd, 'ucs2');
  const encoded = buf.toString('base64');

  execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
    timeout: 10000, windowsHide: true
  }, (launchError) => {
    if (launchError) {
      try { fs.unlinkSync(scriptPath); } catch {}
    }
  });

  const result = await pollCapabilityState(packName, win, 0, 'Remoção');
  try { fs.unlinkSync(scriptPath); } catch {}
  invalidateOnlineCache();
  return result;
});

// Restart the app as Administrator
ipcMain.handle('request-admin', async () => {
  const appPath = process.execPath;
  const projectDir = __dirname;
  // Pass absolute project path + set working directory so the elevated process
  // finds package.json even when spawned from System32 (default for -Verb RunAs)
  const ps = `Start-Process -FilePath "${appPath}" -ArgumentList '"${projectDir}"' -Verb RunAs -WorkingDirectory "${projectDir}"`;
  const buf = Buffer.from(ps, 'ucs2');
  const encoded = buf.toString('base64');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      timeout: 10000, windowsHide: true
    }, () => {
      app.isQuitting = true;
      app.quit();
      resolve({ success: true });
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
  if (app.isPackaged) return path.join(process.resourcesPath, 'SpeechWorker.exe');
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

// File persistence IPC (save/load data as .txt files in DATA_DIR)
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

ipcMain.on('file:save', (event, key, data) => {
  try {
    fs.writeFileSync(path.join(DATA_DIR, `${key}.txt`), data, 'utf8');
    event.returnValue = { success: true };
  } catch (e) {
    event.returnValue = { success: false, error: String(e) };
  }
});

ipcMain.on('file:load', (event, key) => {
  try {
    const filePath = path.join(DATA_DIR, `${key}.txt`);
    if (!fs.existsSync(filePath)) {
      event.returnValue = { success: true, data: null };
      return;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    event.returnValue = { success: true, data };
  } catch (e) {
    event.returnValue = { success: false, error: String(e) };
  }
});

async function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    try {
      await createWindow();
    } catch (err) {
      console.error('showWindow: createWindow failed', err);
    }
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
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
    { label: 'Abrir VoxReader', click: showWindow },
    { type: 'separator' },
    { label: 'Sair e Encerrar', click: () => {
        app.isQuitting = true;
        app.quit();
    }}
  ]);

  tray.setToolTip('VoxReader');
  tray.setContextMenu(contextMenu);
  tray.on('click', showWindow);

  globalShortcut.register('CommandOrControl+Shift+Space', showWindow);

  app.on('activate', showWindow);

  // Create window on startup (not just tray)
  showWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (staticServer) { staticServer.close(); staticServer = null; }
});
app.on('window-all-closed', () => {});
// Prevent app from quitting when the spawning terminal is closed — stay in tray
app.on('before-quit', (event) => {
  if (tray && !app.isQuitting) {
    event.preventDefault();
  }
});
