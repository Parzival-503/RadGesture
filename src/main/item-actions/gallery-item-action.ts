// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import { MenuItem } from '../../common/index';
import { ItemAction } from './item-action-registry';
import { DeepReadonly } from '../settings';
import { KandoApp } from '../app';
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
   * @param _item Unused.
   * @param _app Unused.
   * @returns Void
   */
  async execute(_item: DeepReadonly<MenuItem>, _app: KandoApp) {
    showGallery();
  }
}
