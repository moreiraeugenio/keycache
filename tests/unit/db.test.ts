import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createDatabase, type NotesDb } from '../../src/main/db';

let db: NotesDb;
let tmpDir: string;
let filePath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keycache-test-'));
  filePath = path.join(tmpDir, 'notes.json');
  db = createDatabase(filePath);
});

afterEach(() => {
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createDatabase', () => {
  it('returns an object with all CRUD methods', () => {
    expect(db).toHaveProperty('getNotes');
    expect(db).toHaveProperty('addNote');
    expect(db).toHaveProperty('updateNote');
    expect(db).toHaveProperty('deleteNote');
    expect(db).toHaveProperty('close');
  });

  it('creates JSON file on first write', () => {
    expect(fs.existsSync(filePath)).toBe(false);
    db.addNote('key', 'val');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('loads existing data from JSON file', () => {
    db.addNote('persist', 'data');
    const db2 = createDatabase(filePath);
    const notes = db2.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('persist');
  });

  it('handles missing file gracefully', () => {
    const missing = path.join(tmpDir, 'nonexistent.json');
    const db2 = createDatabase(missing);
    expect(db2.getNotes()).toEqual([]);
  });

  it('handles corrupted file gracefully', () => {
    fs.writeFileSync(filePath, 'not json', 'utf-8');
    const db2 = createDatabase(filePath);
    expect(db2.getNotes()).toEqual([]);
  });
});

describe('getNotes', () => {
  it('returns empty array when no notes exist', () => {
    expect(db.getNotes()).toEqual([]);
  });

  it('returns notes ordered by updated_at descending (most recent first)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    db.addNote('FIRST', 'v1');
    vi.setSystemTime(new Date('2026-01-01T10:00:01Z'));
    db.addNote('SECOND', 'v2');
    vi.setSystemTime(new Date('2026-01-01T10:00:02Z'));
    db.addNote('THIRD', 'v3');
    vi.useRealTimers();

    const result = db.getNotes();
    expect(result.map((n) => n.note_key)).toEqual(['THIRD', 'SECOND', 'FIRST']);
  });

  it('bumps a note to the top after it is updated', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    const firstId = db.addNote('FIRST', 'v1');
    vi.setSystemTime(new Date('2026-01-01T10:00:01Z'));
    db.addNote('SECOND', 'v2');
    vi.setSystemTime(new Date('2026-01-01T10:00:02Z'));
    db.updateNote(firstId, 'FIRST', 'v1-updated');
    vi.useRealTimers();

    const result = db.getNotes();
    expect(result[0].note_key).toBe('FIRST');
    expect(result[1].note_key).toBe('SECOND');
  });
});

describe('addNote', () => {
  it('inserts a note and returns its id', () => {
    const id = db.addNote('API_KEY', 'sk-123');
    expect(id).toBeGreaterThan(0);

    const notes = db.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('API_KEY');
    expect(notes[0].note_value).toBe('sk-123');
  });

  it('sets created_at and updated_at timestamps', () => {
    db.addNote('key', 'val');
    const note = db.getNotes()[0];
    expect(note.created_at).toBeTruthy();
    expect(note.updated_at).toBeTruthy();
  });

  it('auto-increments ids', () => {
    const id1 = db.addNote('a', '1');
    const id2 = db.addNote('b', '2');
    expect(id2).toBeGreaterThan(id1);
  });

  it('throws when the key already exists', () => {
    db.addNote('DUPE', 'first');
    expect(() => db.addNote('DUPE', 'second')).toThrow(/already exists/);
    expect(db.getNotes()).toHaveLength(1);
  });

  it('duplicate check is case-sensitive', () => {
    db.addNote('Key', 'v1');
    expect(() => db.addNote('key', 'v2')).not.toThrow();
    expect(db.getNotes()).toHaveLength(2);
  });
});

describe('updateNote', () => {
  it('updates key and value', () => {
    const id = db.addNote('old_key', 'old_val');
    db.updateNote(id, 'new_key', 'new_val');

    const notes = db.getNotes();
    expect(notes[0].note_key).toBe('new_key');
    expect(notes[0].note_value).toBe('new_val');
  });

  it('updates updated_at timestamp', () => {
    const id = db.addNote('key', 'val');
    const before = db.getNotes()[0].updated_at;

    // Small delay to ensure different timestamp
    const busyWait = Date.now() + 1100;
    while (Date.now() < busyWait) {
      /* wait */
    }

    db.updateNote(id, 'key', 'val2');
    const after = db.getNotes()[0].updated_at;
    expect(after).not.toBe(before);
  });

  it('no-ops for non-existent id', () => {
    db.addNote('key', 'val');
    db.updateNote(9999, 'x', 'y');
    const notes = db.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('key');
  });

  it('throws when renaming to an existing key', () => {
    const id = db.addNote('A', 'v1');
    db.addNote('B', 'v2');
    expect(() => db.updateNote(id, 'B', 'v1')).toThrow(/already exists/);
    const notes = db.getNotes();
    expect(notes.find((n) => n.id === id)?.note_key).toBe('A');
  });

  it('allows updating a note without changing its key', () => {
    const id = db.addNote('SAME', 'old');
    db.addNote('OTHER', 'v2');
    expect(() => db.updateNote(id, 'SAME', 'new')).not.toThrow();
    const notes = db.getNotes();
    expect(notes.find((n) => n.id === id)?.note_value).toBe('new');
  });
});

describe('deleteNote', () => {
  it('removes the note', () => {
    const id = db.addNote('key', 'val');
    expect(db.getNotes()).toHaveLength(1);

    db.deleteNote(id);
    expect(db.getNotes()).toHaveLength(0);
  });

  it('only deletes the specified note', () => {
    const id1 = db.addNote('a', '1');
    db.addNote('b', '2');

    db.deleteNote(id1);
    const notes = db.getNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].note_key).toBe('b');
  });
});
