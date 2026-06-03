// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import { BrowserWindow, shell, ipcMain, dialog } from 'electron';

import {
  loadGalleryForRenderer,
  saveGallery,
  resetGallery,
  importImages,
  importImageData,
  getStoragePath,
  setStoragePath,
} from './gallery-data';
import { GalleryData } from '../common/gallery';

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
      width: 980,
      height: 640,
      minWidth: 680,
      minHeight: 480,
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

  ipcMain.handle('gallery-window.save', (_event, data: GalleryData) => {
    saveGallery(data);
    return loadGalleryForRenderer();
  });

  ipcMain.handle(
    'gallery-window.pick-and-add-images',
    async (_event, sectionId: string) => {
      const result = await dialog.showOpenDialog({
        title: 'Add files to the gallery',
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Images & PDFs',
            extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'pdf'],
          },
        ],
      });
      if (result.canceled || result.filePaths.length === 0) {
        return loadGalleryForRenderer();
      }
      return importImages(sectionId, result.filePaths);
    }
  );

  ipcMain.handle(
    'gallery-window.add-image-data',
    (
      _event,
      payload: { sectionId: string; images: Array<{ name: string; base64: string }> }
    ) => {
      return importImageData(payload.sectionId, payload.images);
    }
  );

  ipcMain.handle('gallery-window.reset', () => resetGallery());

  ipcMain.handle('gallery-window.get-storage-path', () => getStoragePath());

  ipcMain.handle('gallery-window.set-storage-path', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Choose a folder for the gallery (e.g. a OneDrive folder)',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { path: getStoragePath(), data: loadGalleryForRenderer() };
    }
    const data = setStoragePath(result.filePaths[0]);
    return { path: getStoragePath(), data };
  });

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
