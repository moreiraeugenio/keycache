import { globalShortcut } from 'electron';

export function registerShortcuts(accelerator: string, onToggle: () => void): void {
  const registered = globalShortcut.register(accelerator, onToggle);
  if (!registered) {
    console.warn(`Failed to register global shortcut: ${accelerator}`);
  }
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
