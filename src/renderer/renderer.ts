import {
  registerShortcuts,
  setVisibleNotes,
  getSelectedIndex,
  getVisibleNotes,
  resetSelection,
  updateSelectionClasses,
} from './shortcuts';
import {
  openSettingsDialog,
  closeSettingsDialog,
  initSettingsListeners,
} from './settings-dialog';

// ---- DOM refs ----
const form = document.getElementById('note-form') as HTMLFormElement;
const formHeading = document.getElementById('form-heading') as HTMLHeadingElement;
const formDialog = document.getElementById('form-dialog') as HTMLDialogElement;
const formCloseBtn = document.getElementById('form-close') as HTMLButtonElement;
const editIdInput = document.getElementById('edit-id') as HTMLInputElement;
const keyInput = document.getElementById('key-input') as HTMLInputElement;
const valueInput = document.getElementById('value-input') as HTMLTextAreaElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const addBtn = document.getElementById('add-btn') as HTMLButtonElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const notesList = document.getElementById('notes-list') as HTMLUListElement;
const emptyState = document.getElementById('empty-state') as HTMLDivElement;
const formError = document.getElementById('form-error') as HTMLDivElement;

// Delete dialog
const confirmDialog = document.getElementById('confirm-dialog') as HTMLDialogElement;
const dialogCancel = document.getElementById('dialog-cancel') as HTMLButtonElement;
const dialogConfirm = document.getElementById('dialog-confirm') as HTMLButtonElement;
const deleteKeyName = document.getElementById('delete-key-name') as HTMLElement;

// Settings
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const settingsDialog = document.getElementById('settings-dialog') as HTMLDialogElement;

// Global visibility toggle
const visibilityBtn = document.getElementById('visibility-btn') as HTMLButtonElement;

// ---- State ----
let allNotes: Note[] = [];
let pendingDeleteId: number | null = null;
let editingOriginal: Note | null = null;

// ---- SVG icon helpers ----
const gearIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;

const icons = {
  edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

// ---- Settings button ----
settingsBtn.innerHTML = gearIcon;
settingsBtn.addEventListener('click', () => openSettingsDialog());

// ---- Form modal ----
function showFormError(message: string): void {
  formError.hidden = false;
  formError.innerHTML = `${icons.alert} ${message}`;
}

function clearFormError(): void {
  formError.hidden = true;
  formError.innerHTML = '';
}

keyInput.addEventListener('input', clearFormError);

function openFormModal(): void {
  clearFormError();
  window.api.setDialogOpen(true);
  formDialog.showModal();
  keyInput.focus();
}

function closeFormModal(): void {
  formDialog.close();
  resetForm();
}

function openNewNoteModal(): void {
  resetForm();
  openFormModal();
}

addBtn.addEventListener('click', openNewNoteModal);

formCloseBtn.addEventListener('click', closeFormModal);
cancelBtn.addEventListener('click', closeFormModal);

formDialog.addEventListener('click', (e) => {
  if (e.target === formDialog) closeFormModal();
});

formDialog.addEventListener('close', () => {
  window.api.setDialogOpen(false);
  searchInput.focus();
});

// ---- Toast ----
function showToast(message: string, variant: 'success' | 'error' = 'success'): void {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = variant === 'error' ? 'toast error' : 'toast';
  toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', variant === 'error' ? 'assertive' : 'polite');
  const icon = variant === 'error' ? icons.alert : icons.check;
  toast.innerHTML = `${icon} ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ---- Render ----
function renderNotes(notes: Note[]): void {
  setVisibleNotes(notes);
  notesList.innerHTML = '';

  const visible = notes.length > 0;
  notesList.hidden = !visible;
  emptyState.hidden = visible;

  notes.forEach((note, i) => {
    const li = document.createElement('li');
    li.className = 'note-row';
    if (i === getSelectedIndex()) li.classList.add('selected');
    li.style.animationDelay = `${i * 30}ms`;

    const keySpan = document.createElement('span');
    keySpan.className = 'note-key';
    keySpan.textContent = note.note_key;

    const divider = document.createElement('span');
    divider.className = 'note-divider';
    divider.setAttribute('aria-hidden', 'true');

    const valueSpan = document.createElement('span');
    valueSpan.className = 'note-value';

    if (valuesHidden) {
      valueSpan.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
      valueSpan.classList.add('masked');
    } else {
      valueSpan.textContent = note.note_value;
    }

    const actions = document.createElement('div');
    actions.className = 'note-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.innerHTML = icons.edit;
    editBtn.title = 'Edit note';
    editBtn.setAttribute('aria-label', `Edit ${note.note_key}`);
    editBtn.addEventListener('click', () => startEdit(note));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn danger';
    deleteBtn.innerHTML = icons.trash;
    deleteBtn.title = 'Delete note';
    deleteBtn.setAttribute('aria-label', `Delete ${note.note_key}`);
    deleteBtn.addEventListener('click', () => confirmDelete(note));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('.note-actions')) return;
      await navigator.clipboard.writeText(note.note_value);
      showToast(`Copied "${note.note_key}" to clipboard`);
    });

    li.appendChild(keySpan);
    li.appendChild(divider);
    li.appendChild(valueSpan);
    li.appendChild(actions);
    notesList.appendChild(li);
  });
}

// ---- Data loading ----
async function refreshNotes(): Promise<void> {
  allNotes = await window.api.getNotes();
  applyFilter();
}

function applyFilter(): void {
  const query = searchInput.value.toLowerCase().trim();
  const filtered = query
    ? allNotes.filter((n) => n.note_key.toLowerCase().includes(query))
    : allNotes;
  resetSelection();
  renderNotes(filtered);
}

valueInput.addEventListener('paste', (e) => {
  const text = e.clipboardData?.getData('text') ?? '';
  if (!/[\r\n]/.test(text)) return;
  e.preventDefault();
  const sanitized = text.replace(/[\r\n]+/g, ' ');
  const start = valueInput.selectionStart ?? 0;
  const end = valueInput.selectionEnd ?? 0;
  valueInput.setRangeText(sanitized, start, end, 'end');
});

// ---- Form: Add / Edit ----
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const key = keyInput.value.trim();
  const value = valueInput.value.trim();

  if (!key || !value) return;

  const editId = editIdInput.value;
  const editIdNum = editId ? Number(editId) : null;
  const duplicate = allNotes.some((n) => n.note_key === key && n.id !== editIdNum);
  if (duplicate) {
    showFormError(`A note with key "${key}" already exists`);
    keyInput.focus();
    keyInput.select();
    return;
  }

  if (editId) {
    const noChange =
      editingOriginal &&
      key === editingOriginal.note_key &&
      value === editingOriginal.note_value;
    if (noChange) {
      closeFormModal();
      return;
    }
    await window.api.updateNote(editIdNum!, key, value);
    showToast('Note updated');
  } else {
    await window.api.addNote(key, value);
    showToast('Note added');
  }

  closeFormModal();
  await refreshNotes();
});

function startEdit(note: Note): void {
  editingOriginal = note;
  editIdInput.value = String(note.id);
  keyInput.value = note.note_key;
  valueInput.value = note.note_value;

  formHeading.textContent = 'Edit Note';
  submitBtn.textContent = 'Save Changes';
  openFormModal();
}

function resetForm(): void {
  editingOriginal = null;
  editIdInput.value = '';
  keyInput.value = '';
  valueInput.value = '';

  formHeading.textContent = 'New Note';
  submitBtn.textContent = 'Add Note';
}

// ---- Delete confirmation ----
function confirmDelete(note: Note): void {
  pendingDeleteId = note.id;
  deleteKeyName.textContent = note.note_key;
  window.api.setDialogOpen(true);
  confirmDialog.showModal();
}

function closeConfirmDialog(): void {
  pendingDeleteId = null;
  confirmDialog.close();
}

dialogCancel.addEventListener('click', closeConfirmDialog);

dialogConfirm.addEventListener('click', async () => {
  if (pendingDeleteId != null) {
    await window.api.deleteNote(pendingDeleteId);
    pendingDeleteId = null;
    confirmDialog.close();
    showToast('Note deleted');
    await refreshNotes();
  }
});

confirmDialog.addEventListener('click', (e) => {
  if (e.target === confirmDialog) closeConfirmDialog();
});

confirmDialog.addEventListener('close', () => {
  window.api.setDialogOpen(false);
  searchInput.focus();
});
settingsDialog.addEventListener('close', () => {
  window.api.setDialogOpen(false);
  searchInput.focus();
});

// ---- Search (debounced) ----
let filterTimer: ReturnType<typeof setTimeout> | null = null;
searchInput.addEventListener('input', () => {
  if (filterTimer) clearTimeout(filterTimer);
  filterTimer = setTimeout(applyFilter, 150);
});

// ---- Refocus & reset selection whenever the window is shown ----
window.addEventListener('focus', () => {
  if (formDialog.open || confirmDialog.open || settingsDialog.open) return;
  searchInput.focus();
  if (searchInput.value !== '') {
    searchInput.value = '';
    applyFilter();
  } else {
    resetSelection();
    updateSelectionClasses();
  }
});

document.querySelector('.main')!.addEventListener('mousedown', (e) => {
  if (e.target === e.currentTarget) {
    e.preventDefault();
    searchInput.focus();
  }
});

notesList.addEventListener('mousedown', (e) => {
  if (e.target === notesList) {
    e.preventDefault();
    searchInput.focus();
  }
});

// ---- Global visibility ----
const visibilityIcons = {
  eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
};

let valuesHidden = false;

function applyVisibility(): void {
  visibilityBtn.innerHTML = valuesHidden ? visibilityIcons.eyeOff : visibilityIcons.eye;
  visibilityBtn.setAttribute('aria-pressed', String(valuesHidden));
  const label = valuesHidden ? 'Show all values' : 'Hide all values';
  visibilityBtn.title = label;
  visibilityBtn.setAttribute('aria-label', label);
}

function applyMaskToRows(): void {
  const notes = getVisibleNotes();
  notesList.querySelectorAll<HTMLSpanElement>('.note-value').forEach((el, i) => {
    const note = notes[i];
    if (valuesHidden) {
      el.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
      el.classList.add('masked');
    } else {
      el.textContent = note.note_value;
      el.classList.remove('masked');
    }
  });
}

applyVisibility();

async function toggleValuesVisibility(): Promise<void> {
  valuesHidden = !valuesHidden;
  applyVisibility();
  applyMaskToRows();
  searchInput.focus();

  const settings = await window.api.getSettings();
  await window.api.saveSettings({ ...settings, valuesHidden });
}

visibilityBtn.addEventListener('click', toggleValuesVisibility);

// ---- Init ----
registerShortcuts({
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
  closeSettingsDialog,
  toggleValuesVisibility,
});

initSettingsListeners();

(async () => {
  const settings = await window.api.getSettings();
  valuesHidden = settings.valuesHidden;
  applyVisibility();
  await refreshNotes();
})();
