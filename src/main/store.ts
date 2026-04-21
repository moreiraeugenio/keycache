import fs from 'fs';
import path from 'path';
import { debugLog } from './debug';

export interface Note {
  id: number;
  note_key: string;
  note_value: string;
  created_at: string;
  updated_at: string;
}

interface StoreData {
  nextId: number;
  notes: Note[];
}

export interface NotesStore {
  getNotes(): Note[];
  addNote(key: string, value: string): number;
  updateNote(id: number, key: string, value: string): void;
  deleteNote(id: number): void;
  close(): void;
}

function load(filePath: string, filename: string): StoreData {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as StoreData;
    debugLog('file', 'read', { file: filename, notes: data.notes.length });
    return data;
  } catch {
    debugLog('file', 'read', { file: filename, fallback: true });
    return { nextId: 1, notes: [] };
  }
}

function save(filePath: string, filename: string, data: StoreData): void {
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  debugLog('file', 'write', { file: filename, notes: data.notes.length });
}

function nowISO(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

export function createNotesStore(filePath: string): NotesStore {
  const filename = path.basename(filePath);
  const data = load(filePath, filename);

  return {
    getNotes() {
      return [...data.notes].sort((a, b) =>
        a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0,
      );
    },

    addNote(key, value) {
      if (data.notes.some((n) => n.note_key === key)) {
        throw new Error(`A note with key "${key}" already exists`);
      }
      const now = nowISO();
      const note: Note = {
        id: data.nextId++,
        note_key: key,
        note_value: value,
        created_at: now,
        updated_at: now,
      };
      data.notes.push(note);
      save(filePath, filename, data);
      return note.id;
    },

    updateNote(id, key, value) {
      const note = data.notes.find((n) => n.id === id);
      if (!note) return;
      if (data.notes.some((n) => n.id !== id && n.note_key === key)) {
        throw new Error(`A note with key "${key}" already exists`);
      }
      note.note_key = key;
      note.note_value = value;
      note.updated_at = nowISO();
      save(filePath, filename, data);
    },

    deleteNote(id) {
      data.notes = data.notes.filter((n) => n.id !== id);
      save(filePath, filename, data);
    },

    close() {
      // no-op for JSON storage
    },
  };
}
