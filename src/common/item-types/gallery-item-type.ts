// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import { ItemType } from './item-type-registry';

/** This class provides meta information for the "Open Gallery" menu item. */
export class GalleryItemType implements ItemType {
  get hasChildren(): boolean {
    return false;
  }

  get isUserSelectable(): boolean {
    return true;
  }

  get defaultName(): string {
    return 'Open Gallery';
  }

  get defaultIcon(): string {
    return 'gallery-item.svg';
  }

  get defaultIconTheme(): string {
    return 'kando';
  }

  get defaultData(): null {
    return null;
  }

  get genericDescription(): string {
    return 'Opens the RadGesture reference gallery.';
  }
}
