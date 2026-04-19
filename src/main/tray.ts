import { Tray, Menu, app, nativeImage } from 'electron';
import path from 'path';

export function getTrayIconPath(): string {
  const resourceBase = app.isPackaged
    ? process.resourcesPath
    : path.join(__dirname, '../../resources');

  if (process.platform === 'darwin') {
    return path.join(resourceBase, 'trayIconTemplate.png');
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
    { label: 'Settings', click: onSettings },
    { type: 'separator' },
    { label: 'About Keycache', click: onAbout },
    { label: 'Quit Keycache', click: onQuit },
  ]);

  tray.on('click', (_event, bounds) => {
    onToggle(bounds);
  });

  tray.on('right-click', () => {
    tray.popUpContextMenu(contextMenu);
  });

  return tray;
}
