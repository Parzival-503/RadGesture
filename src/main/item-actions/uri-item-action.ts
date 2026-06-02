//////////////////////////////////////////////////////////////////////////////////////////
//   _  _ ____ _  _ ___  ____                                                           //
//   |_/  |__| |\ | |  \ |  |    This file belongs to Kando, the cross-platform         //
//   | \_ |  | | \| |__/ |__|    pie menu. Read more on github.com/menu/kando           //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////

// SPDX-FileCopyrightText: Simon Schneegans <code@simonschneegans.de>
// SPDX-License-Identifier: MIT

import os from 'node:os';
import { shell, clipboard } from 'electron';

import { MenuItem } from '../../common/index';
import { ItemAction } from './item-action-registry';
import { DeepReadonly } from '../settings';
import { ItemData } from '../../common/item-types/uri-item-type';
import { WMInfo, KeySequence } from '../../common';
import { KandoApp } from '../app';

/**
 * This action opens URIs with the default application. This can be used to open for
 * example websites or files.
 */
export class URIItemAction implements ItemAction {
  /**
   * URIs are opened immediately.
   *
   * @returns False
   */
  delayedExecution(item: DeepReadonly<MenuItem>) {
    // URIs that use the {{clipboard}} placeholder run with a delay so that, after the menu
    // closes, the previously focused window is active again and we can copy its current
    // selection into the clipboard before building the URI.
    return (item.data as ItemData).uri.includes('{{clipboard}}');
  }

  /**
   * Replaces placeholders in the URI string with actual values.
   *
   * @param uri The URI string.
   * @param backend The backend which is currently in use.
   * @param wmInfo Information about the window manager state when the menu was opened.
   * @returns The URI string with placeholders replaced.
   */
  private replacePlaceholders(uri: string, wmInfo: WMInfo): string {
    return uri
      .replace(/\{{app_name}}/g, wmInfo.appName)
      .replace(/\{{window_name}}/g, wmInfo.windowName)
      .replace(/\{{pointer_x}}/g, wmInfo.pointerX.toString())
      .replace(/\{{pointer_y}}/g, wmInfo.pointerY.toString())
      .replace(/\{{clipboard}}/g, encodeURIComponent(clipboard.readText()));
  }

  /**
   * Opens the URI with the default application.
   *
   * @param item The item for which the action should be executed.
   * @param app The app which executed the action.
   * @returns A promise which resolves when the URI has been successfully opened.
   */
  /**
   * Copies the current selection (Ctrl/Cmd + C) so that {{clipboard}} reflects the text
   * the user had highlighted. Runs only for clipboard URIs, after the menu has closed.
   *
   * @param app The app which executed the action.
   */
  private async copySelection(app: KandoApp): Promise<void> {
    const modifier = os.platform() === 'darwin' ? 'MetaLeft' : 'ControlLeft';
    const keys: KeySequence = [
      { name: modifier, down: true, delay: 10 },
      { name: 'KeyC', down: true, delay: 10 },
      { name: 'KeyC', down: false, delay: 10 },
      { name: modifier, down: false, delay: 10 },
    ];
    try {
      await app.getBackend().simulateKeys(keys, false);
      // Give the focused application a moment to write the selection to the clipboard.
      await new Promise((resolve) => setTimeout(resolve, 150));
    } catch (error) {
      console.error('Failed to copy selection for {{clipboard}}:', error);
    }
  }

  async execute(item: DeepReadonly<MenuItem>, app: KandoApp) {
    let uri = (item.data as ItemData).uri;

    // If the URI uses {{clipboard}}, first copy whatever the user has selected so the
    // lookup uses the highlighted term.
    if (uri.includes('{{clipboard}}')) {
      await this.copySelection(app);
    }

    uri = this.replacePlaceholders(uri, app.getLastWMInfo());
    return shell.openExternal(uri);
  }
}
