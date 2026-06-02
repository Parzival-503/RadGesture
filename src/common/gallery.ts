// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

/**
 * Data model for the Reference Gallery — a standalone, carousel-style window of quick
 * radiology references (tables, notes, article links, and screenshots), grouped into
 * sections. The data is stored as `gallery.json` in RadGesture's config directory and can
 * be freely edited by the user.
 */

/** A single reference card shown in the carousel. */
export interface GalleryCard {
  /** Determines how the card is rendered. */
  type: 'table' | 'note' | 'link' | 'image';

  /** The card's heading. */
  title: string;

  /** For `table` cards: an array of [label, value] rows. */
  rows?: Array<[string, string]>;

  /** For `note` cards: a short body (a formula, cut-off, reminder…). */
  text?: string;

  /** For `link` cards: the URL to open and a short source label (e.g. "Radiopaedia"). */
  url?: string;
  source?: string;

  /**
   * For `image` cards: the path to the image. Either absolute, or relative to the
   * `gallery/` sub-folder of the config directory.
   */
  path?: string;

  /** Filled in by the main process for `image` cards — a data-URL of the image. */
  dataUrl?: string;

  /** Filled in by the main process for `image` cards — the resolved absolute path. */
  resolvedPath?: string;
}

/** A named group of cards (e.g. "Lung", "Liver", "Articles"). */
export interface GallerySection {
  /** Stable identifier. */
  id: string;

  /** Human-readable name shown in the sidebar. */
  label: string;

  /** An accent color (any CSS color). */
  color?: string;

  /** An emoji shown next to the label. */
  icon?: string;

  /** The cards in this section. */
  cards: GalleryCard[];
}

/** The whole gallery database. */
export interface GalleryData {
  sections: GallerySection[];
}
