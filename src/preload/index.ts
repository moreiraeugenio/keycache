import { contextBridge, ipcRenderer } from 'electron';

const debugEnabled = Boolean(process.env.ELECTRON_RENDERER_URL);

contextBridge.exposeInMainWorld('api', {
  getNotes: () => ipcRenderer.invoke('notes:getAll'),
  addNote: (key: string, value: string) => ipcRenderer.invoke('notes:add', key, value),
  updateNote: (id: number, key: string, value: string) =>
    ipcRenderer.invoke('notes:update', id, key, value),
  deleteNote: (id: number) => ipcRenderer.invoke('notes:delete', id),
  setDialogOpen: (open: boolean) => ipcRenderer.send('window:dialog-open', open),
  hideWindow: () => ipcRenderer.send('window:hide'),

  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s: unknown) => ipcRenderer.invoke('settings:save', s),
  browseDataFilePath: () => ipcRenderer.invoke('settings:browse-data-file-path'),
  browseExistingDataFilePath: () => ipcRenderer.invoke('settings:browse-existing-data-file'),
  onThemeChanged: (cb: (theme: string) => void) =>
    ipcRenderer.on('settings:theme-changed', (_e, theme) => cb(theme)),
  onShortcutsChanged: (cb: (shortcuts: unknown) => void) =>
    ipcRenderer.on('settings:shortcuts-changed', (_e, shortcuts) => cb(shortcuts)),
  onDataFileChanged: (cb: () => void) =>
    ipcRenderer.on('settings:data-file-changed', () => cb()),
  onSettingsOpen: (cb: () => void) => ipcRenderer.on('settings:open', () => cb()),

  debugLog: debugEnabled
    ? (scope: string, event: string, details?: Record<string, unknown>) =>
        ipcRenderer.send('debug:log', scope, event, details)
    : () => {},
});
