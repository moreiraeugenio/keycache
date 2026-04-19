import fs from 'fs';

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

export interface NotesDb {
  getNotes(): Note[];
  addNote(key: string, value: string): number;
  updateNote(id: number, key: string, value: string): void;
  deleteNote(id: number): void;
  close(): void;
}

function load(filePath: string): StoreData {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as StoreData;
  } catch {
    return { nextId: 1, notes: [] };
  }
}

function save(filePath: string, data: StoreData): void {
  fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
}

function nowISO(): string {
  return new Date().toISOString().replace('T', ' ').replace('Z', '').slice(0, 19);
}

export function createDatabase(filePath: string): NotesDb {
  const data = load(filePath);

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
      save(filePath, data);
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
      save(filePath, data);
    },

    deleteNote(id) {
      data.notes = data.notes.filter((n) => n.id !== id);
      save(filePath, data);
    },

    close() {
      // no-op for JSON storage
    },
  };
}
