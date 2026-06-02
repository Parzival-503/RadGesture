// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import fs from 'node:fs';
import path from 'node:path';

import { getConfigDirectory } from './settings';
import { GalleryData } from '../common/gallery';

/** The gallery database file, stored next to menus.json / config.json. */
const GALLERY_FILE = 'gallery.json';

/** Where image cards with relative paths are resolved from. */
function galleryImageDir(): string {
  return path.join(getConfigDirectory(), 'gallery');
}

/** @returns The absolute path to gallery.json. */
export function getGalleryFilePath(): string {
  return path.join(getConfigDirectory(), GALLERY_FILE);
}

/**
 * A small starter gallery so the window is not empty on first launch. The user can edit
 * gallery.json (or, later, the in-app editor) to make it their own.
 */
function defaultGallery(): GalleryData {
  return {
    sections: [
      {
        id: 'lung',
        label: 'Lung',
        icon: '🫁',
        color: '#38bdf8',
        cards: [
          {
            type: 'table',
            title: 'Fleischner — Incidental Solid Nodules',
            rows: [
              ['< 6 mm', 'No routine follow-up'],
              ['6–8 mm', 'CT at 6–12 months'],
              ['> 8 mm', 'Consider CT / PET-CT at 3 months'],
            ],
          },
          {
            type: 'note',
            title: 'UIP pattern (key features)',
            text: 'Basal & subpleural honeycombing + traction bronchiectasis, with no features suggesting an alternative diagnosis.',
          },
        ],
      },
      {
        id: 'liver',
        label: 'Liver',
        icon: '🟧',
        color: '#f59e0b',
        cards: [
          {
            type: 'table',
            title: 'LI-RADS v2018 categories',
            rows: [
              ['LR-3', 'Intermediate probability'],
              ['LR-4', 'Probably HCC'],
              ['LR-5', 'Definitely HCC'],
              ['LR-M', 'Probably malignant, non-HCC'],
            ],
          },
        ],
      },
      {
        id: 'articles',
        label: 'Articles',
        icon: '📄',
        color: '#a78bfa',
        cards: [
          {
            type: 'link',
            title: 'Pulmonary embolism',
            source: 'Radiopaedia',
            url: 'https://radiopaedia.org/articles/pulmonary-embolism',
          },
          {
            type: 'link',
            title: 'LI-RADS',
            source: 'Radiopaedia',
            url: 'https://radiopaedia.org/articles/li-rads',
          },
        ],
      },
      {
        id: 'screenshots',
        label: 'Screenshots',
        icon: '🖼️',
        color: '#34d399',
        cards: [
          {
            type: 'note',
            title: 'Add your screenshots',
            text: 'Drop measurement tables or value charts into the gallery/ folder and reference them as image cards in gallery.json. In-app drag-and-drop is coming next.',
          },
        ],
      },
    ],
  };
}

/**
 * Loads gallery.json from the config directory. If it does not exist yet, a small default
 * gallery is written and returned. Never throws — returns the default on any error.
 */
export function loadGallery(): GalleryData {
  const file = getGalleryFilePath();
  try {
    if (!fs.existsSync(file)) {
      const def = defaultGallery();
      fs.writeFileSync(file, JSON.stringify(def, null, 2), 'utf-8');
      return def;
    }
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as GalleryData;
  } catch (error) {
    console.error('Failed to load gallery.json, using defaults:', error);
    return defaultGallery();
  }
}

/**
 * Like loadGallery(), but additionally resolves `image` cards into data-URLs so the
 * renderer can display them without running into file:// / CSP restrictions.
 */
export function loadGalleryForRenderer(): GalleryData {
  const data = loadGallery();
  for (const section of data.sections) {
    for (const card of section.cards) {
      if (card.type === 'image' && card.path) {
        try {
          const abs = path.isAbsolute(card.path)
            ? card.path
            : path.join(galleryImageDir(), card.path);
          if (fs.existsSync(abs)) {
            const ext = (path.extname(abs).slice(1) || 'png').toLowerCase();
            const mime = ext === 'jpg' ? 'jpeg' : ext;
            card.resolvedPath = abs;
            card.dataUrl =
              `data:image/${mime};base64,` + fs.readFileSync(abs).toString('base64');
          }
        } catch (error) {
          console.error(`Failed to read gallery image "${card.path}":`, error);
        }
      }
    }
  }
  return data;
}
