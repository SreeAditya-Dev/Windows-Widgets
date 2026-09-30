import { Tray, Menu, nativeImage, app } from 'electron';

let tray: Tray | null = null;

export interface TrayActions {
  onAddWidgets: () => void;
  onEditWidgets: () => void;
  onOpenSettings: () => void;
  onToggleLock: (locked: boolean) => void;
  isLocked: () => boolean;
}

// 16x16 widget-grid icon
const ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAZ0lEQVR42mNkQAaMjIx/oXxmBiIBo2oGlAYGBgYWBgaG/0D8H4s4iDYC0c/wKWBmwKYAJgY2oBkMYGPYFdCEkR3AgM0gFEeQHYxLM4zN/wEZjmwANoMRDkZ10MAHQHEKikO4HE2sAAB9fQ4vjQ/5twAAAABJRU5ErkJggg==';

export function setupTray(actions: TrayActions, iconPath?: string): Tray {
  let icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  if (icon.isEmpty()) icon = nativeImage.createFromBuffer(Buffer.from(ICON_BASE64, 'base64'));
  else icon = icon.resize({ width: 16, height: 16, quality: 'best' });
  tray = new Tray(icon);
  tray.setToolTip('Desktop Widgets');
  refreshTray(actions);

  tray.on('click', () => tray?.popUpContextMenu());
  tray.on('double-click', () => actions.onOpenSettings());
  return tray;
}

export function refreshTray(actions: TrayActions): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'Desktop Widgets', enabled: false },
    { type: 'separator' },
    { label: 'Add Widgets…', click: () => actions.onAddWidgets() },
    { label: 'Edit Widgets', click: () => actions.onEditWidgets() },
    {
      label: 'Lock Widgets in Place',
      type: 'checkbox',
      checked: actions.isLocked(),
      click: item => actions.onToggleLock(item.checked)
    },
    { type: 'separator' },
    { label: 'Settings…', click: () => actions.onOpenSettings() },
    { type: 'separator' },
    { label: 'Quit Widgets', click: () => app.quit() }
  ]);
  tray.setContextMenu(menu);
}
