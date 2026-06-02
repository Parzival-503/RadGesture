// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import { ipcRenderer } from 'electron';

import { GalleryData } from '../common/gallery';

/**
 * Functions available in the gallery window's renderer as `window.galleryAPI.<method>`.
 * Each is a thin wrapper around an IPC channel handled in main/gallery-window.ts.
 */
export const GALLERY_WINDOW_API = {
  /** Tell the host process the renderer has finished loading (so it can show the window). */
  galleryWindowReady: () => ipcRenderer.send('gallery-window.ready'),

  /** Fetch the gallery contents (image cards arrive as data-URLs). */
  getData: (): Promise<GalleryData> => ipcRenderer.invoke('gallery-window.get-data'),

  /** Persist the gallery; resolves with the refreshed data. */
  save: (data: GalleryData): Promise<GalleryData> =>
    ipcRenderer.invoke('gallery-window.save', data),

  /** Open a file picker to add image cards to a section; resolves with refreshed data. */
  pickAndAddImages: (sectionId: string): Promise<GalleryData> =>
    ipcRenderer.invoke('gallery-window.pick-and-add-images', sectionId),

  /** Save dropped files (images or PDFs, as base64) into a section; resolves with data. */
  addImageData: (
    sectionId: string,
    images: Array<{ name: string; base64: string }>
  ): Promise<GalleryData> =>
    ipcRenderer.invoke('gallery-window.add-image-data', { sectionId, images }),

  /** Get the current gallery storage folder path. */
  getStoragePath: (): Promise<string> =>
    ipcRenderer.invoke('gallery-window.get-storage-path'),

  /** Pick a new gallery storage folder; resolves with the new path + refreshed data. */
  setStorageFolder: (): Promise<{ path: string; data: GalleryData }> =>
    ipcRenderer.invoke('gallery-window.set-storage-path'),

  /** Open a URL (article link) in the default browser. */
  openURI: (uri: string) => ipcRenderer.send('gallery-window.open-uri', uri),

  /** Open a local file/folder with the OS default handler. */
  openPath: (filePath: string) => ipcRenderer.send('gallery-window.open-path', filePath),

  /** Close the gallery window. */
  close: () => ipcRenderer.send('gallery-window.close'),
};

/** The gallery renderer's global window, extended with its API. */
export type GalleryWindowWithAPI = {
  readonly galleryAPI: typeof GALLERY_WINDOW_API;
} & Window;
