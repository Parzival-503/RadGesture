// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { getConfigDirectory } from './settings';
import { GalleryData, GalleryCard } from '../common/gallery';

/** The gallery database file. */
const GALLERY_FILE = 'gallery.json';

/** Tiny pointer file (always kept locally) recording where the gallery is stored. */
const LOCATION_FILE = 'gallery-location.json';

/**
 * The directory holding gallery.json and the gallery/ media folder. Defaults to the local
 * config directory, but the user can point it at a synced folder (e.g. OneDrive) so the
 * whole gallery syncs across machines and can be shared.
 */
export function getGalleryDir(): string {
  try {
    const locFile = path.join(getConfigDirectory(), LOCATION_FILE);
    if (fs.existsSync(locFile)) {
      const loc = JSON.parse(fs.readFileSync(locFile, 'utf-8')) as { path?: string };
      if (loc.path) {
        fs.mkdirSync(loc.path, { recursive: true });
        return loc.path;
      }
    }
  } catch (error) {
    console.error('Failed to read gallery location, using default:', error);
  }
  return getConfigDirectory();
}

/** @returns The current gallery storage directory. */
export function getStoragePath(): string {
  return getGalleryDir();
}

/** Where image/pdf cards with relative paths are resolved from / copied into. */
function galleryMediaDir(): string {
  return path.join(getGalleryDir(), 'gallery');
}

/** @returns The absolute path to gallery.json. */
export function getGalleryFilePath(): string {
  return path.join(getGalleryDir(), GALLERY_FILE);
}

/** The card type to use for a given filename (PDF vs image). */
function cardTypeForFile(filename: string): GalleryCard['type'] {
  return path.extname(filename).toLowerCase() === '.pdf' ? 'pdf' : 'image';
}

/**
 * A small starter gallery so the window is not empty on first launch. The user can edit
 * it with the in-app editor (or gallery.json) to make it their own.
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
            type: 'note',
            title: 'Drop a PDF here',
            text: 'In edit mode, drag a PDF onto the window (or use ＋ File) to add it as an article. It opens the whole document.',
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
            text: 'Click the ✏️ button then ＋ File to add screenshots/PDFs — or just drag them onto this window. They are saved automatically.',
          },
        ],
      },
    ],
  };
}

/**
 * Loads gallery.json from the storage directory. If it does not exist yet, a small
 * default gallery is written and returned. Never throws — returns the default on any
 * error.
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
 * Like loadGallery(), but resolves `image`/`pdf` cards: image cards get a data-URL (so
 * the renderer can show them without file:// / CSP issues) and both get a resolved
 * absolute path (so the renderer can open them).
 */
export function loadGalleryForRenderer(): GalleryData {
  const data = loadGallery();
  for (const section of data.sections) {
    for (const card of section.cards) {
      if ((card.type === 'image' || card.type === 'pdf') && card.path) {
        try {
          const abs = path.isAbsolute(card.path)
            ? card.path
            : path.join(galleryMediaDir(), card.path);
          if (fs.existsSync(abs)) {
            card.resolvedPath = abs;
            if (card.type === 'image') {
              const ext = (path.extname(abs).slice(1) || 'png').toLowerCase();
              const mime = ext === 'jpg' ? 'jpeg' : ext;
              card.dataUrl =
                `data:image/${mime};base64,` + fs.readFileSync(abs).toString('base64');
            }
          }
        } catch (error) {
          console.error(`Failed to read gallery file "${card.path}":`, error);
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
 * Points the gallery storage at a new directory, migrating the existing gallery.json +
 * media into it if the destination has none yet. Returns the refreshed gallery.
 */
export function setStoragePath(newDir: string): GalleryData {
  const oldDir = getGalleryDir();
  try {
    fs.mkdirSync(newDir, { recursive: true });
    if (path.resolve(newDir) !== path.resolve(oldDir)) {
      const oldJson = path.join(oldDir, GALLERY_FILE);
      const newJson = path.join(newDir, GALLERY_FILE);
      if (fs.existsSync(oldJson) && !fs.existsSync(newJson)) {
        fs.copyFileSync(oldJson, newJson);
      }
      const oldMedia = path.join(oldDir, 'gallery');
      const newMedia = path.join(newDir, 'gallery');
      if (fs.existsSync(oldMedia) && !fs.existsSync(newMedia)) {
        fs.cpSync(oldMedia, newMedia, { recursive: true });
      }
    }
    fs.writeFileSync(
      path.join(getConfigDirectory(), LOCATION_FILE),
      JSON.stringify({ path: newDir }, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to set gallery storage path:', error);
  }
  return loadGalleryForRenderer();
}

/**
 * Copies the given files (images or PDFs) into the media folder and appends a card for
 * each to the section with the given id. Returns the refreshed gallery.
 */
export function importImages(sectionId: string, sourcePaths: string[]): GalleryData {
  const data = loadGallery();
  const section = data.sections.find((s) => s.id === sectionId);
  if (section) {
    const dir = galleryMediaDir();
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
          type: cardTypeForFile(base),
          title: stem,
          path: target,
        });
      } catch (error) {
        console.error(`Failed to import file "${src}":`, error);
      }
    }
    saveGallery(data);
  }
  return loadGalleryForRenderer();
}

/**
 * Saves dropped files (images or PDFs, provided as base64) into the media folder and
 * appends a card for each to the given section. Returns the refreshed gallery.
 */
export function importImageData(
  sectionId: string,
  files: Array<{ name: string; base64: string }>
): GalleryData {
  const data = loadGallery();
  const section = data.sections.find((s) => s.id === sectionId);
  if (section) {
    const dir = galleryMediaDir();
    fs.mkdirSync(dir, { recursive: true });
    for (const file of files) {
      try {
        const base = path.basename(file.name) || 'file';
        const ext = path.extname(base);
        const stem = path.basename(base, ext);
        let target = base;
        let n = 1;
        while (fs.existsSync(path.join(dir, target))) {
          target = `${stem}-${n}${ext}`;
          n++;
        }
        fs.writeFileSync(path.join(dir, target), Buffer.from(file.base64, 'base64'));
        section.cards.push({
          id: randomUUID(),
          type: cardTypeForFile(base),
          title: stem,
          path: target,
        });
      } catch (error) {
        console.error(`Failed to save dropped file "${file.name}":`, error);
      }
    }
    saveGallery(data);
  }
  return loadGalleryForRenderer();
}
