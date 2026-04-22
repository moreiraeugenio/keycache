import { ipcMain } from 'electron';

export function isDebugEnabled(): boolean {
  return Boolean(process.env.ELECTRON_RENDERER_URL);
}

function formatValue(value: unknown): string {
  const str = String(value);
  return /\s/.test(str) ? `"${str}"` : str;
}

function appendDetails(
  line: string,
  details: Record<string, unknown>,
  prefix: string,
): string {
  for (const [key, value] of Object.entries(details)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      line = appendDetails(line, value as Record<string, unknown>, fullKey);
    } else {
      line += ` ${fullKey}=${formatValue(value)}`;
    }
  }
  return line;
}

export function debugLog(
  scope: string,
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!isDebugEnabled()) return;
  let line = `[debug] ${scope} ${event}`;
  if (details) line = appendDetails(line, details, '');
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
