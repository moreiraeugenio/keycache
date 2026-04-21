interface ShortcutDeps {
  form: HTMLFormElement;
  valueInput: HTMLTextAreaElement;
  searchInput: HTMLInputElement;
  notesList: HTMLUListElement;
  formDialog: HTMLDialogElement;
  confirmDialog: HTMLDialogElement;
  settingsDialog: HTMLDialogElement;
  openNewNoteModal: () => void;
  closeFormModal: () => void;
  closeConfirmDialog: () => void;
  openSettingsDialog: () => void;
  toggleValuesVisibility: () => void;
}

interface ParsedBinding {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  key: string;
}

export function parseAccelerator(accel: string): ParsedBinding {
  const parts = accel.split('+');
  const binding: ParsedBinding = { ctrl: false, shift: false, alt: false, key: '' };
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === 'cmdorctrl' || lower === 'ctrl' || lower === 'cmd' || lower === 'command') {
      binding.ctrl = true;
    } else if (lower === 'shift') {
      binding.shift = true;
    } else if (lower === 'alt' || lower === 'option') {
      binding.alt = true;
    } else {
      binding.key = part.toLowerCase();
    }
  }
  return binding;
}

function matchesBinding(e: KeyboardEvent, binding: ParsedBinding): boolean {
  const ctrlMatch = (e.metaKey || e.ctrlKey) === binding.ctrl;
  const shiftMatch = e.shiftKey === binding.shift;
  const altMatch = e.altKey === binding.alt;
  return ctrlMatch && shiftMatch && altMatch && e.key.toLowerCase() === binding.key;
}

let selectedIndex = 0;
let visibleNotes: Note[] = [];
let notesListEl: HTMLUListElement | null = null;

let newNoteBinding = parseAccelerator('CmdOrCtrl+N');
let focusSearchBinding = parseAccelerator('CmdOrCtrl+F');
let openSettingsBinding = parseAccelerator('CmdOrCtrl+,');
let toggleVisibilityBinding = parseAccelerator('CmdOrCtrl+Shift+H');

export function getSelectedIndex(): number {
  return selectedIndex;
}

export function getVisibleNotes(): Note[] {
  return visibleNotes;
}

export function setVisibleNotes(notes: Note[]): void {
  visibleNotes = notes;
  if (selectedIndex >= notes.length) selectedIndex = Math.max(0, notes.length - 1);
}

export function resetSelection(): void {
  selectedIndex = 0;
}

export function updateSelectionClasses(): void {
  if (!notesListEl) return;
  const rows = notesListEl.querySelectorAll<HTMLElement>('.note-row');
  rows.forEach((row, i) => {
    if (i === selectedIndex) {
      row.classList.add('selected');
      row.scrollIntoView({ block: 'nearest' });
    } else {
      row.classList.remove('selected');
    }
  });
}

export function updateKeyBindings(shortcuts: AppSettings['shortcuts']): void {
  newNoteBinding = parseAccelerator(shortcuts.newNote);
  focusSearchBinding = parseAccelerator(shortcuts.focusSearch);
  openSettingsBinding = parseAccelerator(shortcuts.openSettings);
  toggleVisibilityBinding = parseAccelerator(shortcuts.toggleVisibility);
}

async function activateSelected(): Promise<void> {
  const note = visibleNotes[selectedIndex];
  if (!note) return;
  await navigator.clipboard.writeText(note.note_value);
  window.api.hideWindow();
}

export function registerShortcuts(deps: ShortcutDeps): void {
  const {
    form,
    valueInput,
    searchInput,
    notesList,
    formDialog,
    confirmDialog,
    settingsDialog,
    openNewNoteModal,
    closeFormModal,
    closeConfirmDialog,
    openSettingsDialog,
    toggleValuesVisibility,
  } = deps;

  notesListEl = notesList;

  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!e.shiftKey) form.requestSubmit();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      if (visibleNotes.length === 0) return;
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % visibleNotes.length;
      updateSelectionClasses();
    } else if (e.key === 'ArrowUp') {
      if (visibleNotes.length === 0) return;
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + visibleNotes.length) % visibleNotes.length;
      updateSelectionClasses();
    } else if (e.key === 'Enter') {
      if (visibleNotes.length === 0) return;
      e.preventDefault();
      activateSelected();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !formDialog.open && !confirmDialog.open && !settingsDialog.open) {
      e.preventDefault();
      return;
    }
    if (e.key === 'Escape') {
      if (confirmDialog.open) {
        closeConfirmDialog();
      } else if (formDialog.open) {
        closeFormModal();
      }
    } else if (matchesBinding(e, newNoteBinding)) {
      if (formDialog.open || confirmDialog.open || settingsDialog.open) return;
      e.preventDefault();
      openNewNoteModal();
    } else if (matchesBinding(e, focusSearchBinding)) {
      if (formDialog.open || confirmDialog.open || settingsDialog.open) return;
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (matchesBinding(e, openSettingsBinding)) {
      if (formDialog.open || confirmDialog.open || settingsDialog.open) return;
      e.preventDefault();
      openSettingsDialog();
    } else if (matchesBinding(e, toggleVisibilityBinding)) {
      if (formDialog.open || confirmDialog.open || settingsDialog.open) return;
      e.preventDefault();
      toggleValuesVisibility();
    }
  });
}
