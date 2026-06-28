const electron = (() => {
  try {
    if (typeof window !== 'undefined' && navigator.userAgent.includes('Electron'))
      return (window as any).require('electron');
  } catch {}
  return null;
})();

export function saveData(key: string, value: string): void {
  localStorage.setItem(key, value);
  if (electron) {
    try { electron.ipcRenderer.sendSync('file:save', key, value); } catch {}
  }
}

export function loadData(key: string): string | null {
  if (electron) {
    try {
      const result = electron.ipcRenderer.sendSync('file:load', key);
      if (result?.data != null) {
        localStorage.setItem(key, result.data);
        return result.data;
      }
    } catch {}
  }
  return localStorage.getItem(key);
}

export function removeData(key: string): void {
  localStorage.removeItem(key);
}
