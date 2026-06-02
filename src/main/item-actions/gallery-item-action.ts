// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import { ItemAction } from './item-action-registry';
import { showGallery } from '../gallery-window';

/** This action opens the RadGesture reference gallery window. */
export class GalleryItemAction implements ItemAction {
  /**
   * Opening the gallery is never delayed.
   *
   * @returns False
   */
  delayedExecution() {
    return false;
  }

  /**
   * Opens the reference gallery window.
   *
   * @returns Void
   */
  async execute() {
    showGallery();
  }
}
