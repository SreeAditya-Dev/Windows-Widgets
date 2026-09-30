# Desktop Widgets for Windows (macOS / Widget+ style)

macOS-style desktop widgets for Windows 10 & 11. Widgets live **on your desktop behind your apps**, like on a Mac, and stay visible when you use Show Desktop (Win + D or the three-finger swipe down).

## Widgets

| Category | Widgets |
|---|---|
| Clocks | Analog Clock (S/M), Flip Clock (M/L), World Clock (M/L) |
| Productivity | Calendar (S/M/L), Notes (S/M/L), Reminders / To-do (S/M/L) |
| Utilities | Weather (S/M/L, Open-Meteo, no API key), Timer (S/M), Stopwatch with laps (S/M), Calculator (L) |
| System | System Monitor with CPU, memory and disk rings (S/M/L), Batteries (S/M) |
| Photos | Photos from any folder (S/M/L/XL) |
| Featured | Smart Stack: several widgets in one slot; scroll over it to flip between them |

Sizes follow macOS: Small 170×170, Medium 360×170, Large 360×360, Extra Large 740×360.

## Using it

- **Move:** drag any widget. When you drop it, it snaps to the grid and moves aside if it would overlap another widget.
- **Resize:** drag the bottom-right corner. It snaps to the nearest size the widget supports. You can also right-click and pick a size.
- **Right-click a widget** to change its size or colour, edit it, make a Smart Stack, lock its position, or remove it.
- **Edit Widgets mode** is like "Edit Widgets" on macOS. Open it from the tray, the right-click menu, or the `+` button. It shows a remove badge and a resize handle on every widget, plus **Add Widgets** and **Done** buttons.
- **Widget gallery:** browse widgets by category, see live previews at every size, and click a size to add that widget.
- **Settings** (tray → Settings…, or right-click the `+` button) is laid out like macOS System Settings:
  - **General:** launch at sign-in, keep widgets visible on Show Desktop, always on top, lock all widgets.
  - **Appearance:** Light, Dark or Auto theme; **Glass / Solid / Colourful** widget style; background opacity; corner radius; accent colour.
  - **Desktop & Layout:** snap to grid, grid size, spacing between widgets, Arrange Widgets.
  - **Widgets:** settings for each widget, such as time zones, weather city and units, photo folder, first day of the week, timer sound, and Smart Stack contents.

## How Show Desktop is handled

The widget layer is one transparent, click-through window marked `WS_EX_TOOLWINDOW` (hidden from Alt+Tab and the taskbar) and `WS_EX_NOACTIVATE`. A small guard in `electron/win32.ts` does the following:

- Normally it keeps the window at `HWND_BOTTOM`, so apps cover the widgets.
- When the desktop becomes the foreground window (`WorkerW` / `Progman`), it raises the window to `HWND_TOPMOST` so the widgets appear above the Show Desktop layer. This happens with Win + D, the taskbar corner button, the three-finger swipe down, or a click on the desktop.
- As soon as an app is activated again, it drops the window back to the bottom.
- If the window is ever minimized, it restores it straight away.

Rainmeter uses the same technique for its "On Desktop" setting.

## Run

```bash
npm install
npm run build   # type-check + build renderer and main process
npm start       # or double-click start-widgets.vbs for a silent start
```

For development, run `npm run dev`. Settings are stored in `%APPDATA%\mac-widgets-windows\widgets-config.json`.
