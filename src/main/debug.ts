import { ipcMain } from 'electron';

export function isDebugEnabled(): boolean {
  return Boolean(process.env.ELECTRON_RENDERER_URL);
}

export function debugLog(
  scope: string,
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!isDebugEnabled()) return;
  const header = `[debug] ${scope} ${event}`;
  if (details && Object.keys(details).length > 0) {
    console.log(`${header}\n${JSON.stringify(details, null, 2)}`);
  } else {
    console.log(header);
  }
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
