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
        id: 'ct-chest',
        label: 'CT Chest',
        icon: '🫁',
        color: '#38bdf8',
        cards: [
          {
            type: 'note',
            title: 'Lung-RADS v2022',
            text: 'ACR LDCT lung-cancer screening.\n\n• 0 incomplete · 1 negative · 2 benign (solid <6 mm)\n• 3 probably benign — solid 6–<8 mm; ~1–2% malignant → LDCT 6 mo\n• 4A suspicious — solid 8–<15 mm; ~5–15% → LDCT 3 mo ± PET\n• 4B/4X very suspicious — solid ≥15 mm, or new/growing/suspicious features; >15% → tissue diagnosis\n\nv2022 adds stepped down-grading of stable 3/4A nodules and atypical pulmonary-cyst categories.',
            source: 'JACR — ACR',
            url: 'https://www.jacr.org/article/S1546-1440(23)00761-5/fulltext',
          },
          {
            type: 'note',
            title: 'Fleischner Society 2017',
            text: 'Incidental solid nodules (not screening), age ≥35.\n\n• <6 mm — no routine follow-up (high-risk: optional CT 12 mo)\n• 6–8 mm — CT 6–12 mo, then consider 18–24 mo\n• >8 mm — CT 3 mo, PET/CT, or tissue sampling\n\nUse the most suspicious of multiple nodules. Subsolid nodules are followed longer (e.g. GGN ≥6 mm: CT 6–12 mo, then every 2 y to 5 y). Minimum size for routine follow-up was raised from 4 to 6 mm.',
            source: 'Radiology',
            url: 'https://pubs.rsna.org/doi/full/10.1148/radiol.2017161659',
          },
        ],
      },
      {
        id: 'abdomen-pelvis',
        label: 'CT/MRI Abdomen & Pelvis',
        icon: '🩻',
        color: '#f59e0b',
        cards: [
          {
            type: 'note',
            title: 'LI-RADS v2018 — liver (CT/MRI)',
            text: 'HCC risk in at-risk patients.\n\n• LR-1 definitely benign · LR-2 probably benign\n• LR-3 intermediate\n• LR-4 probably HCC\n• LR-5 definitely HCC\n• LR-M malignant, not HCC-specific · LR-TIV tumour in vein\n\nMajor features: nonrim APHE, nonperipheral washout, enhancing capsule, threshold growth, size. LR-5 = ≥10 mm + nonrim APHE + ≥1 of washout, capsule, or threshold growth (per size rules).',
            source: 'Radiology Assistant',
            url: 'https://radiologyassistant.nl/abdomen/liver/li-rads',
          },
          {
            type: 'note',
            title: 'Bosniak v2019 — cystic renal mass',
            text: 'Cystic renal mass (malignancy risk in parentheses).\n\n• I — simple benign cyst (~0%)\n• II — benign, minimal features (~0%)\n• IIF — few/minimally thick smooth septa or wall; surveillance (~5%)\n• III — ≥1 thick or irregular enhancing wall/septa (~50%)\n• IV — enhancing soft-tissue nodule(s) (~90%)\n\n2019 update incorporates MRI and precisely defines septa number, wall/septal thickness, irregularity and nodularity. I/II = "cyst"; IIF/III/IV = "cystic mass".',
            source: 'Radiopaedia',
            url: 'https://radiopaedia.org/articles/bosniak-classification-of-cystic-renal-masses-version-2019',
          },
          {
            type: 'note',
            title: 'PI-RADS v2.1 — prostate mpMRI',
            text: 'Assessment 1–5 = likelihood of clinically significant cancer (Gleason ≥7).\n\n• Peripheral zone: DWI is dominant (a PZ DWI 3 with positive DCE upgrades to 4)\n• Transition zone: T2 is dominant (a TZ T2 3 with DWI ≥4 upgrades to 4)\n• DCE is scored positive/negative only\n\nScore ≥3 generally prompts consideration of targeted biopsy.',
            source: 'Radiology Assistant',
            url: 'https://radiologyassistant.nl/abdomen/prostate/prostate-cancer-pi-rads-v2-1',
          },
          {
            type: 'note',
            title: 'O-RADS US v2022 — ovarian/adnexal',
            text: 'Risk of malignancy by ultrasound (v2022).\n\n• 0 incomplete · 1 normal (premenopausal)\n• 2 almost certainly benign (<1%)\n• 3 low (1–<10%)\n• 4 intermediate (10–<50%)\n• 5 high (≥50%)\n\nLesion descriptors (size, solid tissue, septa, vascularity) map to a category and to management — none → US follow-up → MRI/specialist → gyn-onc referral.',
            source: 'Radiology',
            url: 'https://pubs.rsna.org/doi/full/10.1148/radiol.230685',
          },
          {
            type: 'note',
            title: 'O-RADS MRI — ovarian/adnexal',
            text: 'MRI score 1–5 for sonographically indeterminate adnexal lesions, using solid-tissue T2 / DWI signal and the time–intensity enhancement curve.\n\n• 1 normal\n• 2 almost certainly benign\n• 3 low risk\n• 4 intermediate\n• 5 high risk\n\nHigher specificity than ultrasound for indeterminate masses; a score 4 still spans a wide malignancy range.',
            source: 'Radiopaedia',
            url: 'https://radiopaedia.org/articles/ovarian-adnexal-reporting-and-data-system-magnetic-resonance-imaging-o-rads-mri',
          },
          {
            type: 'note',
            title: 'ACR Incidental Findings',
            text: 'Adrenal: unenhanced ≤10 HU (or chemical-shift signal drop vs spleen) = lipid-rich adenoma — no follow-up regardless of size; otherwise characterise by size, HU and absolute/relative washout on a dedicated adrenal CT.\n\nThe IFC white papers give size-based algorithms for incidental findings in:\n• kidney, liver & adrenal\n• pancreas (cystic) & spleen\n• adnexa, vasculature & thyroid',
            source: 'JACR — ACR IFC',
            url: 'https://www.jacr.org/article/S1546-1440(17)30551-3/fulltext',
          },
        ],
      },
      {
        id: 'thyroid-us',
        label: 'Thyroid US',
        icon: '🦋',
        color: '#f472b6',
        cards: [
          {
            type: 'note',
            title: 'ACR TI-RADS (2017)',
            text: 'Point-based; sum the 5 categories:\n\n• Composition (0–2)\n• Echogenicity (0–3)\n• Shape — taller-than-wide (0 or 3)\n• Margin (0–3)\n• Echogenic foci (additive; punctate +3)\n\nLevels: TR1 0 (benign) · TR2 2 · TR3 3 · TR4 4–6 · TR5 ≥7.\nFNA: TR5 ≥1 cm · TR4 ≥1.5 cm · TR3 ≥2.5 cm (US-follow smaller TR3–5).',
            source: 'Radiology Assistant',
            url: 'https://radiologyassistant.nl/head-neck/ti-rads/ti-rads',
          },
        ],
      },
      {
        id: 'obstetric-us',
        label: 'Obstetric US',
        icon: '🤰',
        color: '#a78bfa',
        cards: [
          {
            type: 'note',
            title: 'First-Trimester US Lexicon (SRU 2024)',
            text: 'Standardises early-pregnancy US terms (Radiology / AJOG 2024).\n\n• "Early pregnancy loss (EPL)" replaces "pregnancy failure / nonviable"\n• Pregnancy of unknown location (PUL) = no definite/probable IUP or ectopic on TVUS\n• Definite EPL: CRL ≥7 mm with no heartbeat, or mean sac diameter ≥25 mm with no embryo\n\nDiscourages "pseudosac" and "pregnancy of unknown viability."',
            source: 'Radiology',
            url: 'https://pubs.rsna.org/doi/full/10.1148/radiol.240122',
          },
        ],
      },
      {
        id: 'pet-ct',
        label: 'PET/CT',
        icon: '☢️',
        color: '#34d399',
        cards: [
          {
            type: 'note',
            title: 'Deauville 5-point scale — lymphoma',
            text: 'FDG uptake at interim / end-of-treatment vs reference organs.\n\n• 1 no uptake\n• 2 ≤ mediastinum\n• 3 > mediastinum but ≤ liver\n• 4 moderately > liver\n• 5 markedly > liver and/or new lesions\n\n1–3 generally negative (complete metabolic response); 4–5 positive (residual disease). Interpretation of 3 depends on clinical context / trial.',
            source: 'Radiopaedia',
            url: 'https://radiopaedia.org/search?q=Deauville%20five-point%20scale',
          },
          {
            type: 'note',
            title: 'PSMA-RADS 2.0 — prostate PSMA PET',
            text: 'Certainty that a finding is prostate cancer, 1–5.\n\n• 1 benign · 2 likely benign\n• 3 equivocal (3A soft-tissue, 3B bone, 3C non-prostatic PSMA-avid, 3D anatomic lesion without uptake)\n• 4 high likelihood\n• 5 almost certainly cancer\n\nv2.0 adds 5T (treated metastasis). 3–5 positive for malignancy; 1–2 negative.',
            source: 'Eur Urol / PMC',
            url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11981304/',
          },
          {
            type: 'note',
            title: 'Modified Krenning score — SSTR PET',
            text: 'SSTR-ligand (⁶⁸Ga-DOTATATE / DOTATOC) uptake of the most avid lesion vs reference organs.\n\n• 0 none\n• 1 very low\n• 2 ≤ liver\n• 3 > liver\n• 4 > spleen\n\nSSTR-positive if uptake > liver; a score of 3–4 supports suitability for PRRT (e.g. ¹⁷⁷Lu-DOTATATE) in the appropriate clinical setting.',
            source: 'Radiopaedia',
            url: 'https://radiopaedia.org/articles/krenning-score-of-neuroendocrine-tumour-uptake',
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
 * Overwrites gallery.json with the built-in default seed (the latest bundled reference
 * content). Imported media in the gallery/ folder is left untouched. Returns the
 * refreshed gallery for the renderer. Used by the "Reset to default gallery" button so
 * the user can pick up updated defaults without hunting for the file on disk.
 */
export function resetGallery(): GalleryData {
  try {
    fs.writeFileSync(
      getGalleryFilePath(),
      JSON.stringify(defaultGallery(), null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to reset gallery to defaults:', error);
  }
  return loadGalleryForRenderer();
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
