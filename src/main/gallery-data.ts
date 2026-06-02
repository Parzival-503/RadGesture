// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { getConfigDirectory } from './settings';
import { GalleryData, GalleryCard } from '../common/gallery';

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
            type: 'note',
            title: 'Fleischner — Incidental Solid Nodules',
            text: '< 6 mm: no routine follow-up · 6–8 mm: CT at 6–12 months · > 8 mm: consider CT / PET-CT at 3 months.',
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
            type: 'note',
            title: 'LI-RADS v2018 categories',
            text: 'LR-3: intermediate · LR-4: probably HCC · LR-5: definitely HCC · LR-M: probably malignant, non-HCC.',
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
            text: 'Click the ✏️ button then ＋ Image to add screenshots — or just drag image files straight onto this window. They are saved automatically.',
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

/** Persists the gallery to disk, stripping runtime-only fields (resolved data-URLs/paths). */
export function saveGallery(data: GalleryData): void {
  const clean: GalleryData = {
    sections: data.sections.map((section) => ({
      ...section,
      cards: section.cards.map((card) => {
        const copy: GalleryCard = { type: card.type, title: card.title };
        if (card.id) {
          copy.id = card.id;
        }
        if (card.rows) {
          copy.rows = card.rows;
        }
        if (card.text) {
          copy.text = card.text;
        }
        if (card.url) {
          copy.url = card.url;
        }
        if (card.source) {
          copy.source = card.source;
        }
        if (card.path) {
          copy.path = card.path;
        }
        return copy;
      }),
    })),
  };
  fs.writeFileSync(getGalleryFilePath(), JSON.stringify(clean, null, 2), 'utf-8');
}

/**
 * Copies the given image files into the gallery folder and appends an image card for each
 * to the section with the given id. Returns the refreshed (renderer-ready) gallery.
 */
export function importImages(sectionId: string, sourcePaths: string[]): GalleryData {
  const data = loadGallery();
  const section = data.sections.find((s) => s.id === sectionId);
  if (section) {
    const dir = galleryImageDir();
    fs.mkdirSync(dir, { recursive: true });
    for (const src of sourcePaths) {
      try {
        const base = path.basename(src);
        const ext = path.extname(base);
        const stem = path.basename(base, ext);
        let target = base;
        let n = 1;
        while (fs.existsSync(path.join(dir, target))) {
          target = `${stem}-${n}${ext}`;
          n++;
        }
        fs.copyFileSync(src, path.join(dir, target));
        section.cards.push({
          id: randomUUID(),
          type: 'image',
          title: stem,
          path: target,
        });
      } catch (error) {
        console.error(`Failed to import image "${src}":`, error);
      }
    }
    saveGallery(data);
  }
  return loadGalleryForRenderer();
}

/**
 * Saves dropped image files (provided as base64) into the gallery folder and appends an
 * image card for each to the given section. Returns the refreshed gallery.
 */
export function importImageData(
  sectionId: string,
  images: Array<{ name: string; base64: string }>
): GalleryData {
  const data = loadGallery();
  const section = data.sections.find((s) => s.id === sectionId);
  if (section) {
    const dir = galleryImageDir();
    fs.mkdirSync(dir, { recursive: true });
    for (const img of images) {
      try {
        const base = path.basename(img.name) || 'image.png';
        const ext = path.extname(base) || '.png';
        const stem = path.basename(base, ext);
        let target = base;
        let n = 1;
        while (fs.existsSync(path.join(dir, target))) {
          target = `${stem}-${n}${ext}`;
          n++;
        }
        fs.writeFileSync(path.join(dir, target), Buffer.from(img.base64, 'base64'));
        section.cards.push({
          id: randomUUID(),
          type: 'image',
          title: stem,
          path: target,
        });
      } catch (error) {
        console.error(`Failed to save dropped image "${img.name}":`, error);
      }
    }
    saveGallery(data);
  }
  return loadGalleryForRenderer();
}
