import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NotesStore } from '../../src/main/store';

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}));

import { ipcMain } from 'electron';
import { registerIpcHandlers, type NotesStoreHolder } from '../../src/main/ipc';

function getHandler(channel: string): (...args: unknown[]) => unknown {
  const call = (ipcMain.handle as ReturnType<typeof vi.fn>).mock.calls.find(
    (c) => c[0] === channel,
  );
  return call![1];
}

describe('registerIpcHandlers', () => {
  const mockStore: NotesStore = {
    getNotes: vi.fn().mockReturnValue([{ id: 1, note_key: 'k' }]),
    addNote: vi.fn().mockReturnValue(42),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    close: vi.fn(),
  };

  const store: NotesStoreHolder = { current: mockStore };

  beforeEach(() => {
    vi.clearAllMocks();
    registerIpcHandlers(store);
  });

  it('registers all four IPC channels', () => {
    expect(ipcMain.handle).toHaveBeenCalledTimes(4);
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:getAll', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:add', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:update', expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith('notes:delete', expect.any(Function));
  });

  it('notes:getAll returns store.current.getNotes()', () => {
    const result = getHandler('notes:getAll')();
    expect(mockStore.getNotes).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1, note_key: 'k' }]);
  });

  it('notes:add passes key, value to store.current.addNote', () => {
    const event = {};
    const result = getHandler('notes:add')(event, 'API_KEY', 'secret');
    expect(mockStore.addNote).toHaveBeenCalledWith('API_KEY', 'secret');
    expect(result).toBe(42);
  });

  it('notes:update passes id, key, value to store.current.updateNote', () => {
    const event = {};
    getHandler('notes:update')(event, 7, 'new_key', 'new_val');
    expect(mockStore.updateNote).toHaveBeenCalledWith(7, 'new_key', 'new_val');
  });

  it('notes:delete passes id to store.current.deleteNote', () => {
    const event = {};
    getHandler('notes:delete')(event, 3);
    expect(mockStore.deleteNote).toHaveBeenCalledWith(3);
  });

  it('uses current store reference (supports swapping)', () => {
    const newStore: NotesStore = {
      getNotes: vi.fn().mockReturnValue([]),
      addNote: vi.fn(),
      updateNote: vi.fn(),
      deleteNote: vi.fn(),
      close: vi.fn(),
    };
    store.current = newStore;
    getHandler('notes:getAll')();
    expect(newStore.getNotes).toHaveBeenCalled();
    expect(mockStore.getNotes).not.toHaveBeenCalled();
    store.current = mockStore;
  });
});
