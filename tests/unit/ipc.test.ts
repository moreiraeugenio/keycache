import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NotesDb } from '../../src/main/db';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

import { ipcMain } from 'electron';
import { registerIpcHandlers, type DbHolder } from '../../src/main/ipc';

function getHandler(channel: string): (...args: unknown[]) => unknown {
  const call = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
    (c) => c[0] === channel,
  );
  return call![1];
}

describe('registerIpcHandlers', () => {
  const mockDb: NotesDb = {
    getNotes: vi.fn().mockReturnValue([{ id: 1, note_key: 'k' }]),
    addNote: vi.fn().mockReturnValue(42),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    close: vi.fn(),
  };

  const db: DbHolder = { current: mockDb };

  beforeEach(() => {
    vi.clearAllMocks();
    registerIpcHandlers(db);
  });

  it('registers all four IPC channels', () => {
    expect(ipcMain.handle).toHaveBeenCalledTimes(4);
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:getAll', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:add', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:update', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:delete', expect.any(Function));
  });

  it('notes:getAll returns db.current.getNotes()', () => {
    const result = getHandler('notes:getAll')();
    expect(mockDb.getNotes).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, note_key: 'k' }]);
  });

  it('notes:add passes key, value to db.current.addNote', () => {
    const event = {};
    const result = getHandler('notes:add')(event, 'API_KEY', 'secret');
    expect(mockDb.addNote).toHaveBeenCalledWith('API_KEY', 'secret');
    expect(result).toBe(42);
  });

  it('notes:update passes id, key, value to db.current.updateNote', () => {
    const event = {};
    getHandler('notes:update')(event, 7, 'new_key', 'new_val');
    expect(mockDb.updateNote).toHaveBeenCalledWith(7, 'new_key', 'new_val');
  });

  it('notes:delete passes id to db.current.deleteNote', () => {
    const event = {};
    getHandler('notes:delete')(event, 3);
    expect(mockDb.deleteNote).toHaveBeenCalledWith(3);
  });

  it('uses current db reference (supports swapping)', () => {
    const newDb: NotesDb = {
      getNotes: vi.fn().mockReturnValue([]),
      addNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      close: vi.fn(),
    };
    db.current = newDb;
    getHandler('notes:getAll')();
    expect(newDb.getNotes).toHaveBeenCalled();
    expect(mockDb.getNotes).not.toHaveBeenCalled();
    db.current = mockDb;
  });
});
