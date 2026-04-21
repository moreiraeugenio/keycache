import { ipcMain } from 'electron';

export function isDebugEnabled(): boolean {
  return Boolean(process.env.ELECTRON_RENDERER_URL);
}

function formatValue(value: unknown): string {
  const str = String(value);
  return /\s/.test(str) ? `"${str}"` : str;
}

export function debugLog(
  scope: string,
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!isDebugEnabled()) return;
  let line = `[debug] ${scope} ${event}`;
  if (details) {
    for (const [key, value] of Object.entries(details)) {
      line += ` ${key}=${formatValue(value)}`;
    }
  }
  console.log(line);
}

export function registerDebugIpc(): void {
  if (!isDebugEnabled()) return;
  ipcMain.on(
    'debug:log',
    (_e, scope: string, event: string, details?: Record<string, unknown>) => {
      debugLog(scope, event, details);
    },
  );
}
