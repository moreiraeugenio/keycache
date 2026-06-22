import { Tray, Menu, app, nativeImage } from 'electron';
import path from 'path';
import { debugLog } from './debug';

export function getTrayIconPath(): string {
  const isPackaged = app.isPackaged;
  const resourceBase = isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../../resources');

  if (process.platform === 'darwin') {
    const suffix = !isPackaged
      ? '-dev'
      : app.getName() === 'Keycache Dev'
        ? '-devbuild'
        : '';
    return path.join(resourceBase, `trayIconTemplate${suffix}.png`);
  }
  if (process.platform === 'win32') {
    return path.join(resourceBase, 'tray-icon.ico');
  }
  return path.join(resourceBase, 'tray-icon.png');
}

export function createTray(
  onToggle: (bounds: Electron.Rectangle) => void,
  onSettings: () => void,
  onAbout: () => void,
  onQuit: () => void,
): Tray {
  const icon = nativeImage.createFromPath(getTrayIconPath());
  if (process.platform === 'darwin') {
    icon.setTemplateImage(true);
  }

  const tray = new Tray(icon);
  tray.setToolTip('Keycache');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Settings',
      click: () => {
        debugLog('tray', 'menu', { item: 'Settings' });
        onSettings();
      },
    },
    { type: 'separator' },
    {
      label: 'About Keycache',
      click: () => {
        debugLog('tray', 'menu', { item: 'About' });
        onAbout();
      },
    },
    {
      label: 'Quit Keycache',
      click: () => {
        debugLog('tray', 'menu', { item: 'Quit' });
        onQuit();
      },
    },
  ]);

  tray.on('click', (_event, bounds) => {
    debugLog('tray', 'click');
    onToggle(bounds);
  });

  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu);
  });

  return tray;
}
