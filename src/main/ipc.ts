import { ipcMain } from 'electron';
import type { NotesDb } from './db';

export interface DbHolder {
  current: NotesDb;
}

export function registerIpcHandlers(db: DbHolder): void {
  ipcMain.handle('notes:getAll', () => db.current.getNotes());
  ipcMain.handle('notes:add', (_e, key: string, value: string) => db.current.addNote(key, value));
  ipcMain.handle('notes:update', (_e, id: number, key: string, value: string) =>
    db.current.updateNote(id, key, value),
  );
  ipcMain.handle('notes:delete', (_e, id: number) => db.current.deleteNote(id));
}
