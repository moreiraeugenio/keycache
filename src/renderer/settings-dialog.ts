import { updateKeyBindings } from './shortcuts';

const settingsDialog = document.getElementById('settings-dialog') as HTMLDialogElement;
const settingsCloseBtn = document.getElementById('settings-close') as HTMLButtonElement;
const settingsCancelBtn = document.getElementById('settings-cancel') as HTMLButtonElement;
const settingsSaveBtn = document.getElementById('settings-save') as HTMLButtonElement;
const settingsBrowseBtn = document.getElementById('settings-browse') as HTMLButtonElement;
const settingsOpenExistingBtn = document.getElementById(
  'settings-open-existing',
) as HTMLButtonElement;
const themeSelect = document.getElementById('settings-theme') as HTMLSelectElement;
const dataFilePathInput = document.getElementById(
  'settings-data-file-path',
) as HTMLInputElement;
const settingsError = document.getElementById('settings-error') as HTMLDivElement;
const dataFileWarning = document.getElementById(
  'settings-data-file-warning',
) as HTMLDivElement;

const shortcutInputs = {
  globalToggle: document.getElementById('shortcut-global-toggle') as HTMLInputElement,
  newNote: document.getElementById('shortcut-new-note') as HTMLInputElement,
  focusSearch: document.getElementById('shortcut-focus-search') as HTMLInputElement,
  openSettings: document.getElementById('shortcut-open-settings') as HTMLInputElement,
  toggleVisibility: document.getElementById('shortcut-toggle-visibility') as HTMLInputElement,
};

let currentThemeMode: AppSettings['theme'] = 'system';
let dataFileMode: 'new' | 'adopt' = 'new';
let initialNoteCount = 0;
let initialDataFilePath = '';
let currentValuesHidden = false;

const defaults: AppSettings['shortcuts'] = {
  globalToggle: 'CmdOrCtrl+Shift+K',
  newNote: 'CmdOrCtrl+N',
  focusSearch: 'CmdOrCtrl+F',
  openSettings: 'CmdOrCtrl+,',
  toggleVisibility: 'CmdOrCtrl+Shift+H',
};

const isMac = navigator.platform.startsWith('Mac');

function formatAccelerator(accel: string): string {
  return accel
    .replace(/CmdOrCtrl/gi, isMac ? '\u2318' : 'Ctrl')
    .replace(/Shift/gi, isMac ? '\u21E7' : 'Shift')
    .replace(/Alt/gi, isMac ? '\u2325' : 'Alt')
    .replace(/\+/g, isMac ? '' : '+');
}

function keyToAcceleratorPart(e: KeyboardEvent): string | null {
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) return null;

  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('CmdOrCtrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');

  if (parts.length === 0) return null;

  let key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  if (key === ' ') key = 'Space';
  parts.push(key);
  return parts.join('+');
}

function showError(msg: string): void {
  settingsError.textContent = msg;
  settingsError.hidden = false;
}

function clearError(): void {
  settingsError.textContent = '';
  settingsError.hidden = true;
}

function populateForm(settings: AppSettings): void {
  themeSelect.value = settings.theme;
  dataFilePathInput.value = settings.dataFilePath;
  currentValuesHidden = settings.valuesHidden;
  for (const [key, input] of Object.entries(shortcutInputs)) {
    const accel = settings.shortcuts[key as keyof AppSettings['shortcuts']];
    input.value = formatAccelerator(accel);
    input.dataset.accel = accel;
  }
}

function readForm(): AppSettings & { dataFileMode: 'new' | 'adopt' } {
  return {
    theme: themeSelect.value as AppSettings['theme'],
    dataFilePath: dataFilePathInput.value,
    valuesHidden: currentValuesHidden,
    shortcuts: {
      globalToggle: shortcutInputs.globalToggle.dataset.accel || defaults.globalToggle,
      newNote: shortcutInputs.newNote.dataset.accel || defaults.newNote,
      focusSearch: shortcutInputs.focusSearch.dataset.accel || defaults.focusSearch,
      openSettings: shortcutInputs.openSettings.dataset.accel || defaults.openSettings,
      toggleVisibility:
        shortcutInputs.toggleVisibility.dataset.accel || defaults.toggleVisibility,
    },
    dataFileMode,
  };
}

function clearDataFileWarning(): void {
  dataFileWarning.textContent = '';
  dataFileWarning.hidden = true;
}

function showDataFileWarning(msg: string): void {
  dataFileWarning.textContent = msg;
  dataFileWarning.hidden = false;
}

export async function openSettingsDialog(): Promise<void> {
  clearError();
  clearDataFileWarning();
  dataFileMode = 'new';
  const [settings, notes] = await Promise.all([
    window.api.getSettings(),
    window.api.getNotes(),
  ]);
  populateForm(settings);
  initialNoteCount = notes.length;
  initialDataFilePath = settings.dataFilePath;
  settingsBrowseBtn.hidden = notes.length === 0;
  window.api.setDialogOpen(true);
  settingsDialog.showModal();
  (document.activeElement as HTMLElement | null)?.blur();
}

export function closeSettingsDialog(): void {
  settingsDialog.close();
}

settingsCloseBtn.addEventListener('click', closeSettingsDialog);
settingsCancelBtn.addEventListener('click', closeSettingsDialog);

settingsDialog.addEventListener('click', (e) => {
  if (e.target === settingsDialog) {
    window.api.debugLog('action', 'backdrop-close', { dialog: 'settings' });
    closeSettingsDialog();
  }
});

settingsBrowseBtn.addEventListener('click', async () => {
  const path = await window.api.browseDataFilePath();
  if (path) {
    dataFilePathInput.value = path;
    dataFileMode = 'new';
    clearDataFileWarning();
  }
});

settingsOpenExistingBtn.addEventListener('click', async () => {
  const path = await window.api.browseExistingDataFilePath();
  if (!path) return;
  dataFilePathInput.value = path;
  dataFileMode = 'adopt';
  if (initialNoteCount > 0 && path !== initialDataFilePath) {
    const noun = initialNoteCount === 1 ? 'note' : 'notes';
    showDataFileWarning(
      `Switching will leave your ${initialNoteCount} ${noun} in the old file at ${initialDataFilePath}.`,
    );
  } else {
    clearDataFileWarning();
  }
});

settingsSaveBtn.addEventListener('click', async () => {
  clearError();
  const updated = readForm();

  if (new Set(Object.values(updated.shortcuts)).size !== Object.values(updated.shortcuts).length) {
    showError('Two or more shortcuts use the same key combination.');
    return;
  }

  const result = await window.api.saveSettings(updated);
  if (!result.ok) {
    showError(result.error || 'Failed to save settings.');
    return;
  }

  closeSettingsDialog();
});

for (const input of Object.values(shortcutInputs)) {
  input.addEventListener('keydown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const accel = keyToAcceleratorPart(e);
    if (!accel) return;
    input.value = formatAccelerator(accel);
    input.dataset.accel = accel;
  });
}

for (const btn of settingsDialog.querySelectorAll<HTMLButtonElement>('[data-reset]')) {
  btn.addEventListener('click', () => {
    const key = btn.dataset.reset as keyof AppSettings['shortcuts'];
    const input = shortcutInputs[key];
    if (!input) return;
    input.value = formatAccelerator(defaults[key]);
    input.dataset.accel = defaults[key];
  });
}

export function applyThemeFromSettings(theme: AppSettings['theme']): void {
  currentThemeMode = theme;
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

export async function initSettingsListeners(): Promise<void> {
  const settings = await window.api.getSettings();
  applyThemeFromSettings(settings.theme);
  updateKeyBindings(settings.shortcuts);

  window.api.onThemeChanged((theme) => {
    applyThemeFromSettings(theme as AppSettings['theme']);
  });

  window.api.onShortcutsChanged((shortcuts) => {
    updateKeyBindings(shortcuts);
  });

  window.api.onSettingsOpen(() => {
    openSettingsDialog();
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (currentThemeMode === 'system') applyThemeFromSettings('system');
  });
}
