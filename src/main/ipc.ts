import { ipcMain } from 'electron';
import type { NotesStore } from './store';

export interface NotesStoreHolder {
  current: NotesStore;
}

export function registerIpcHandlers(store: NotesStoreHolder): void {
  ipcMain.handle('notes:getAll', () => store.current.getNotes());
  ipcMain.handle('notes:add', (_e, key: string, value: string) =>
    store.current.addNote(key, value),
  );
  ipcMain.handle('notes:update', (_e, id: number, key: string, value: string) =>
    store.current.updateNote(id, key, value),
  );
  ipcMain.handle('notes:delete', (_e, id: number) => store.current.deleteNote(id));
}
