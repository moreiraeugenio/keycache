import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createNotesStore, type NotesStore } from '../../src/main/store';

let store: NotesStore;
let tmpDir: string;
let filePath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keycache-test-'));
  filePath = path.join(tmpDir, 'notes.json');
  store = createNotesStore(filePath);
});

afterEach(() => {
  store.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createNotesStore', () => {
  it('returns an object with all CRUD methods', () => {
    expect(store).toHaveProperty('getNotes');
    expect(store).toHaveProperty('addNote');
    expect(store).toHaveProperty('updateNote');
    expect(store).toHaveProperty('deleteNote');
    expect(store).toHaveProperty('close');
  });

  it('creates JSON file on first write', () => {
    expect(fs.existsSync(filePath)).toBe(false);
    store.addNote('key', 'val');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('loads existing data from JSON file', () => {
    store.addNote('persist', 'data');
    const reopened = createNotesStore(filePath);
    const notes = reopened.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('persist');
  });

  it('handles missing file gracefully', () => {
    const missing = path.join(tmpDir, 'nonexistent.json');
    const empty = createNotesStore(missing);
    expect(empty.getNotes()).toEqual([]);
  });

  it('handles corrupted file gracefully', () => {
    fs.writeFileSync(filePath, 'not json', 'utf-8');
    const reopened = createNotesStore(filePath);
    expect(reopened.getNotes()).toEqual([]);
  });
});

describe('getNotes', () => {
  it('returns empty array when no notes exist', () => {
    expect(store.getNotes()).toEqual([]);
  });

  it('returns notes ordered by updated_at descending (most recent first)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    store.addNote('FIRST', 'v1');
    vi.setSystemTime(new Date('2026-01-01T10:00:01Z'));
    store.addNote('SECOND', 'v2');
    vi.setSystemTime(new Date('2026-01-01T10:00:02Z'));
    store.addNote('THIRD', 'v3');
    vi.useRealTimers();

    const result = store.getNotes();
    expect(result.map((n) => n.note_key)).toEqual(['THIRD', 'SECOND', 'FIRST']);
  });

  it('bumps a note to the top after it is updated', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const firstId = store.addNote('FIRST', 'v1');
    vi.setSystemTime(new Date('2026-01-01T10:00:01Z'));
    store.addNote('SECOND', 'v2');
    vi.setSystemTime(new Date('2026-01-01T10:00:02Z'));
    store.updateNote(firstId, 'FIRST', 'v1-updated');
    vi.useRealTimers();

    const result = store.getNotes();
    expect(result[0].note_key).toBe('FIRST');
    expect(result[1].note_key).toBe('SECOND');
  });
});

describe('addNote', () => {
  it('inserts a note and returns its id', () => {
    const id = store.addNote('API_KEY', 'sk-123');
    expect(id).toBeGreaterThan(0);

    const notes = store.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('API_KEY');
    expect(notes[0].note_value).toBe('sk-123');
  });

  it('sets created_at and updated_at timestamps', () => {
    store.addNote('key', 'val');
    const note = store.getNotes()[0];
    expect(note.created_at).toBeTruthy();
    expect(note.updated_at).toBeTruthy();
  });

  it('auto-increments ids', () => {
    const id1 = store.addNote('a', '1');
    const id2 = store.addNote('b', '2');
    expect(id2).toBeGreaterThan(id1);
  });

  it('throws when the key already exists', () => {
    store.addNote('DUPE', 'first');
    expect(() => store.addNote('DUPE', 'second')).toThrow(/already exists/);
    expect(store.getNotes()).toHaveLength(1);
  });

  it('duplicate check is case-sensitive', () => {
    store.addNote('Key', 'v1');
    expect(() => store.addNote('key', 'v2')).not.toThrow();
    expect(store.getNotes()).toHaveLength(2);
  });
});

describe('updateNote', () => {
  it('updates key and value', () => {
    const id = store.addNote('old_key', 'old_val');
    store.updateNote(id, 'new_key', 'new_val');

    const notes = store.getNotes();
    expect(notes[0].note_key).toBe('new_key');
    expect(notes[0].note_value).toBe('new_val');
  });

  it('updates updated_at timestamp', () => {
    const id = store.addNote('key', 'val');
    const before = store.getNotes()[0].updated_at;

    // Small delay to ensure different timestamp
    const busyWait = Date.now() + 1100;
    while (Date.now() < busyWait) {
      /* wait */
    }

    store.updateNote(id, 'key', 'val2');
    const after = store.getNotes()[0].updated_at;
    expect(after).not.toBe(before);
  });

  it('no-ops for non-existent id', () => {
    store.addNote('key', 'val');
    store.updateNote(9999, 'x', 'y');
    const notes = store.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('key');
  });

  it('throws when renaming to an existing key', () => {
    const id = store.addNote('A', 'v1');
    store.addNote('B', 'v2');
    expect(() => store.updateNote(id, 'B', 'v1')).toThrow(/already exists/);
    const notes = store.getNotes();
    expect(notes.find((n) => n.id === id)?.note_key).toBe('A');
  });

  it('allows updating a note without changing its key', () => {
    const id = store.addNote('SAME', 'old');
    store.addNote('OTHER', 'v2');
    expect(() => store.updateNote(id, 'SAME', 'new')).not.toThrow();
    const notes = store.getNotes();
    expect(notes.find((n) => n.id === id)?.note_value).toBe('new');
  });
});

describe('deleteNote', () => {
  it('removes the note', () => {
    const id = store.addNote('key', 'val');
    expect(store.getNotes()).toHaveLength(1);

    store.deleteNote(id);
    expect(store.getNotes()).toHaveLength(0);
  });

  it('only deletes the specified note', () => {
    const id1 = store.addNote('a', '1');
    store.addNote('b', '2');

    store.deleteNote(id1);
    const notes = store.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('b');
  });
});
