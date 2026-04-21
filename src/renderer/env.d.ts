interface Note {
  id: number;
  note_key: string;
  note_value: string;
  created_at: string;
  updated_at: string;
}

interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  dataFilePath: string;
  valuesHidden: boolean;
  shortcuts: {
    globalToggle: string;
    newNote: string;
    focusSearch: string;
    openSettings: string;
    toggleVisibility: string;
  };
}

interface KeycacheApi {
  getNotes(): Promise<Note[]>;
  addNote(key: string, value: string): Promise<number>;
  updateNote(id: number, key: string, value: string): Promise<void>;
  deleteNote(id: number): Promise<void>;
  setDialogOpen(open: boolean): void;
  hideWindow(): void;

  getSettings(): Promise<AppSettings>;
  saveSettings(
    s: AppSettings & { dataFileMode?: 'new' | 'adopt' },
  ): Promise<{ ok: boolean; error?: string }>;
  browseDataFilePath(): Promise<string | null>;
  browseExistingDataFilePath(): Promise<string | null>;
  onThemeChanged(cb: (theme: string) => void): void;
  onShortcutsChanged(cb: (shortcuts: AppSettings['shortcuts']) => void): void;
  onSettingsOpen(cb: () => void): void;
}

interface Window {
  api: KeycacheApi;
}
