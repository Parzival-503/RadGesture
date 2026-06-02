// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import { BrowserWindow, shell, ipcMain } from 'electron';

import { loadGalleryForRenderer } from './gallery-data';

// These constants are injected by Electron Forge's webpack plugin based on the
// `gallery_window` entry point defined in forge.config.ts.
declare const GALLERY_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const GALLERY_WINDOW_WEBPACK_ENTRY: string;

/** The single gallery window instance (created lazily, destroyed on close). */
let galleryWindow: GalleryWindow | null = null;

/** IPC handlers are global, so we only register them once. */
let ipcRegistered = false;

/**
 * A frameless, dark "HUD"-style pop-up window that shows the Reference Gallery — a
 * carousel of radiology references grouped into sections. Modelled on the app's
 * SettingsWindow.
 */
class GalleryWindow extends BrowserWindow {
  /** Resolves once the renderer signals it has loaded. */
  public onWindowLoaded = new Promise<void>((resolve) => {
    ipcMain.once('gallery-window.ready', () => resolve());
  });

  constructor() {
    super({
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        // Local resources can only be loaded from a file:// app. In development the app is
        // served from the webpack dev server, so web security has to be disabled there.
        webSecurity: process.env.NODE_ENV !== 'development',
        preload: GALLERY_WINDOW_PRELOAD_WEBPACK_ENTRY,
        spellcheck: false,
      },
      backgroundColor: '#0b1220',
      frame: false,
      width: 940,
      height: 580,
      minWidth: 640,
      minHeight: 420,
      fullscreenable: false,
      resizable: true,
      show: false,
      autoHideMenuBar: true,
    });

    // Open any external links in the user's default browser instead of a new window.
    this.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.loadURL(GALLERY_WINDOW_WEBPACK_ENTRY);

    this.onWindowLoaded.then(() => {
      this.show();
      this.focus();
    });

    this.on('closed', () => {
      galleryWindow = null;
    });
  }
}

/** Registers the gallery IPC handlers exactly once. */
function registerGalleryIPC() {
  if (ipcRegistered) {
    return;
  }
  ipcRegistered = true;

  ipcMain.handle('gallery-window.get-data', () => loadGalleryForRenderer());

  ipcMain.on('gallery-window.open-uri', (_event, uri: string) => {
    if (uri) {
      shell.openExternal(uri);
    }
  });

  ipcMain.on('gallery-window.open-path', (_event, filePath: string) => {
    if (filePath) {
      shell.openPath(filePath);
    }
  });

  ipcMain.on('gallery-window.close', () => {
    galleryWindow?.close();
  });
}

/**
 * Opens the Reference Gallery window, creating it if necessary or focusing it if it is
 * already open. This is the entry point used by the `kando://gallery` deep link.
 */
export function showGallery() {
  registerGalleryIPC();

  if (galleryWindow && !galleryWindow.isDestroyed()) {
    if (galleryWindow.isMinimized()) {
      galleryWindow.restore();
    }
    galleryWindow.show();
    galleryWindow.focus();
    return;
  }

  galleryWindow = new GalleryWindow();
  galleryWindow.center();
}
