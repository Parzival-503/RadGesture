// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import { contextBridge } from 'electron';

import { GALLERY_WINDOW_API } from './gallery-window-api';

contextBridge.exposeInMainWorld('galleryAPI', GALLERY_WINDOW_API);
