// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import './index.scss';
import 'swiper/css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Keyboard, Mousewheel } from 'swiper/modules';

import { GalleryWindowWithAPI } from './gallery-window-api';
import { GalleryData, GalleryCard, GallerySection } from '../common/gallery';

declare const window: GalleryWindowWithAPI;

const EMOJI_CHOICES = [
  '🫁',
  '🧠',
  '🦴',
  '❤️',
  '🩻',
  '🩺',
  '🟧',
  '🔵',
  '🧪',
  '🧬',
  '📄',
  '🖼️',
  '⭐',
  '📁',
];

const COLOR_CHOICES = [
  '#38bdf8',
  '#f59e0b',
  '#a78bfa',
  '#34d399',
  '#f472b6',
  '#facc15',
  '#60a5fa',
  '#fb7185',
];

/** Ensures every card has a stable id (used as a React key). */
function withIds(data: GalleryData): GalleryData {
  return {
    sections: data.sections.map((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id ? c : { ...c, id: crypto.randomUUID() })),
    })),
  };
}

/** A single reference card. In edit mode its fields become editable in place. */
function CardView({
  card,
  isEditing,
  onChange,
  onCommit,
  onDelete,
  onOpenImage,
}: {
  readonly card: GalleryCard;
  readonly isEditing: boolean;
  readonly onChange: (patch: Partial<GalleryCard>) => void;
  readonly onCommit: () => void;
  readonly onDelete: () => void;
  readonly onOpenImage: () => void;
}) {
  let body: React.ReactNode = null;

  if (card.type === 'table' && card.rows) {
    body = (
      <table>
        <tbody>
          {card.rows.map((row) => (
            <tr key={row[0]}>
              <td className="k">{row[0]}</td>
              <td>{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  } else if (card.type === 'note') {
    body = isEditing ? (
      <textarea
        className="edit-note"
        placeholder="Write a note, value, or formula…"
        value={card.text ?? ''}
        onBlur={onCommit}
        onChange={(e) => onChange({ text: e.target.value })}
      />
    ) : (
      <div className="note">{card.text}</div>
    );
  } else if (card.type === 'link') {
    body = isEditing ? (
      <div className="edit-fields">
        <input
          placeholder="https://…"
          value={card.url ?? ''}
          onBlur={onCommit}
          onChange={(e) => onChange({ url: e.target.value })}
        />
        <input
          placeholder="Source (e.g. Radiopaedia)"
          value={card.source ?? ''}
          onBlur={onCommit}
          onChange={(e) => onChange({ source: e.target.value })}
        />
      </div>
    ) : (
      <>
        {card.source ? <span className="src">◈ {card.source}</span> : null}
        <button
          className="openbtn"
          type="button"
          onClick={() => card.url && window.galleryAPI.openURI(card.url)}>
          Open ↗
        </button>
      </>
    );
  } else if (card.type === 'image') {
    body = card.dataUrl ? (
      <img
        className="shot-img"
        src={card.dataUrl}
        title="Click to enlarge"
        onClick={onOpenImage}
      />
    ) : (
      <div className="shot">image not found</div>
    );
  }

  return (
    <div className="card">
      <div className="head">
        {isEditing ? (
          <input
            className="edit-title"
            value={card.title}
            onBlur={onCommit}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        ) : (
          <span className="ttl">{card.title}</span>
        )}
        {isEditing ? (
          <button className="del" title="Delete card" type="button" onClick={onDelete}>
            ✕
          </button>
        ) : (
          <span className="tag">{card.type}</span>
        )}
      </div>
      <div className="content">{body}</div>
    </div>
  );
}

/** The whole gallery: editable sections + a side-by-side carousel + an image lightbox. */
function App({ initial }: { readonly initial: GalleryData }) {
  const [data, setData] = React.useState<GalleryData>(initial);
  const [active, setActive] = React.useState(0);
  const [index, setIndex] = React.useState(0);
  const [editing, setEditing] = React.useState(false);
  const [addType, setAddType] = React.useState<'note' | 'link' | null>(null);
  const [fTitle, setFTitle] = React.useState('');
  const [fText, setFText] = React.useState('');
  const [fUrl, setFUrl] = React.useState('');
  const [fSource, setFSource] = React.useState('');
  const [newSection, setNewSection] = React.useState('');
  const [dragOver, setDragOver] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<{
    dataUrl: string;
    path?: string;
  } | null>(null);

  const sections = data.sections || [];
  const safeActive = Math.min(active, Math.max(0, sections.length - 1));
  const section = sections[safeActive];
  const cards = section?.cards || [];
  const accent = section?.color || '#38bdf8';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const stageStyle = { '--accent': accent } as React.CSSProperties;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox) {
          setLightbox(null);
        } else {
          window.galleryAPI.close();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  // Persist `next` to disk and adopt the canonical (image-resolved) result.
  const persist = (next: GalleryData) => {
    setData(next);
    window.galleryAPI
      .save(next)
      .then((fresh) => setData(withIds(fresh)))
      .catch(console.error);
  };

  // Save the current in-memory state (used on blur after typing in a field).
  const commit = () => {
    window.galleryAPI
      .save(data)
      .then((fresh) => setData(withIds(fresh)))
      .catch(console.error);
  };

  const resetForm = () => {
    setAddType(null);
    setFTitle('');
    setFText('');
    setFUrl('');
    setFSource('');
  };

  const updateSection = (patch: Partial<GallerySection>, save = true) => {
    const next: GalleryData = {
      sections: sections.map((s, i) => (i === safeActive ? { ...s, ...patch } : s)),
    };
    if (save) {
      persist(next);
    } else {
      setData(next);
    }
  };

  const updateCard = (cardIndex: number, patch: Partial<GalleryCard>) => {
    setData({
      sections: sections.map((s, i) =>
        i === safeActive
          ? {
              ...s,
              cards: s.cards.map((c, ci) => (ci === cardIndex ? { ...c, ...patch } : c)),
            }
          : s
      ),
    });
  };

  const addSection = () => {
    const label = newSection.trim() || 'New Section';
    const next: GalleryData = {
      sections: [
        ...sections,
        { id: crypto.randomUUID(), label, color: '#38bdf8', icon: '📁', cards: [] },
      ],
    };
    setNewSection('');
    setActive(next.sections.length - 1);
    setIndex(0);
    persist(next);
  };

  const deleteSection = (i: number) => {
    const next: GalleryData = { sections: sections.filter((_, idx) => idx !== i) };
    setActive(Math.max(0, Math.min(safeActive, next.sections.length - 1)));
    setIndex(0);
    persist(next);
  };

  const addCard = (card: GalleryCard) => {
    if (!section) {
      return;
    }
    const next: GalleryData = {
      sections: sections.map((s, i) =>
        i === safeActive
          ? { ...s, cards: [...s.cards, { ...card, id: crypto.randomUUID() }] }
          : s
      ),
    };
    resetForm();
    persist(next);
  };

  const submitForm = () => {
    const title = fTitle.trim() || (addType === 'link' ? 'Link' : 'Note');
    if (addType === 'note') {
      addCard({ type: 'note', title, text: fText });
    } else if (addType === 'link') {
      addCard({ type: 'link', title, url: fUrl.trim(), source: fSource.trim() });
    }
  };

  const deleteCard = (ci: number) => {
    const next: GalleryData = {
      sections: sections.map((s, i) =>
        i === safeActive ? { ...s, cards: s.cards.filter((_, idx) => idx !== ci) } : s
      ),
    };
    persist(next);
  };

  const addImages = () => {
    if (section) {
      window.galleryAPI
        .pickAndAddImages(section.id)
        .then((fresh) => setData(withIds(fresh)))
        .catch(console.error);
    }
  };

  const readImages = (
    fileList: FileList
  ): Promise<Array<{ name: string; base64: string }>> => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    return Promise.all(
      files.map(
        (file) =>
          new Promise<{ name: string; base64: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                base64: (reader.result as string).split(',')[1] || '',
              });
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          })
      )
    );
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!section || !e.dataTransfer?.files?.length) {
      return;
    }
    const images = await readImages(e.dataTransfer.files);
    if (images.length) {
      const fresh = await window.galleryAPI.addImageData(section.id, images);
      setData(withIds(fresh));
    }
  };

  const openImage = (card: GalleryCard) => {
    if (card.dataUrl) {
      setLightbox({ dataUrl: card.dataUrl, path: card.resolvedPath });
    }
  };

  return (
    <div
      className="window"
      onDragLeave={(e) => {
        if (e.target === e.currentTarget) {
          setDragOver(false);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDrop={onDrop}>
      {dragOver ? (
        <div className="dropzone">
          Drop images to add to {section?.label || 'this section'}
        </div>
      ) : null}

      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img
            className="lightbox-img"
            src={lightbox.dataUrl}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
            {lightbox.path ? (
              <button
                type="button"
                onClick={() =>
                  lightbox.path && window.galleryAPI.openPath(lightbox.path)
                }>
                Open externally ↗
              </button>
            ) : null}
            <button type="button" onClick={() => setLightbox(null)}>
              Close ✕
            </button>
          </div>
        </div>
      ) : null}

      <div className="titlebar">
        <span className="logo" />
        <span className="title">
          RadGesture <small>Reference Gallery</small>
        </span>
        <button
          className={'edit' + (editing ? ' on' : '')}
          title="Toggle edit mode"
          type="button"
          onClick={() => {
            setEditing((v) => !v);
            resetForm();
          }}>
          ✏️
        </button>
        <span className="close" onClick={() => window.galleryAPI.close()}>
          ✕
        </span>
      </div>

      <div className="body">
        <aside className="sidebar">
          <h4>Sections</h4>
          {sections.map((s, i) => (
            <div
              key={s.id}
              className={'section' + (i === safeActive ? ' active' : '')}
              onClick={() => {
                setActive(i);
                setIndex(0);
                resetForm();
              }}>
              <span className="swatch" style={{ background: s.color || '#888' }} />
              <span className="label">
                {s.icon} {s.label}
              </span>
              {editing ? (
                <button
                  className="del"
                  title="Delete section"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSection(i);
                  }}>
                  ✕
                </button>
              ) : (
                <span className="count">{s.cards.length}</span>
              )}
            </div>
          ))}
          {editing ? (
            <div className="addsection">
              <input
                placeholder="New section…"
                value={newSection}
                onChange={(e) => setNewSection(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addSection();
                  }
                }}
              />
              <button type="button" onClick={addSection}>
                ＋
              </button>
            </div>
          ) : null}
          <div className="foot">
            {editing ? 'Editing — changes save automatically' : 'Esc to close'}
          </div>
        </aside>

        <main className="stage" style={stageStyle}>
          {editing && section ? (
            <div className="section-editor">
              <div className="emoji-row">
                {EMOJI_CHOICES.map((em) => (
                  <button
                    key={em}
                    className={em === section.icon ? 'on' : ''}
                    type="button"
                    onClick={() => updateSection({ icon: em })}>
                    {em}
                  </button>
                ))}
              </div>
              <div className="se-fields">
                <input
                  className="se-name"
                  placeholder="Section name"
                  value={section.label}
                  onBlur={commit}
                  onChange={(e) => updateSection({ label: e.target.value }, false)}
                />
                <input
                  className="se-emoji"
                  maxLength={4}
                  placeholder="emoji"
                  value={section.icon ?? ''}
                  onBlur={commit}
                  onChange={(e) => updateSection({ icon: e.target.value }, false)}
                />
                <div className="color-row">
                  {COLOR_CHOICES.map((c) => (
                    <button
                      key={c}
                      className={'sw' + (c === section.color ? ' on' : '')}
                      style={{ background: c }}
                      title={c}
                      type="button"
                      onClick={() => updateSection({ color: c })}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="sectiontitle">
              {section ? `${section.icon || ''} ${section.label}` : ''}
            </div>
          )}

          {cards.length > 0 ? (
            <Swiper
              key={`${safeActive}-${cards.length}`}
              centeredSlides
              grabCursor
              slideToClickedSlide
              className="swiper"
              keyboard={{ enabled: true }}
              modules={[Keyboard, Mousewheel]}
              mousewheel={{ forceToAxis: true }}
              slidesPerView="auto"
              spaceBetween={18}
              onSlideChange={(s) => setIndex(s.activeIndex)}>
              {cards.map((card, i) => (
                <SwiperSlide key={card.id}>
                  <CardView
                    card={card}
                    isEditing={editing}
                    onChange={(patch) => updateCard(i, patch)}
                    onCommit={commit}
                    onDelete={() => deleteCard(i)}
                    onOpenImage={() => openImage(card)}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="empty">
              No cards yet — drop an image, or use ✏️ edit mode.
            </div>
          )}

          <div className="counter">
            {cards.length ? `${index + 1} / ${cards.length}` : ''}
          </div>

          {editing ? (
            <div className="editbar">
              {addType === null ? (
                <>
                  <button disabled={!section} type="button" onClick={addImages}>
                    ＋ Image
                  </button>
                  <button
                    disabled={!section}
                    type="button"
                    onClick={() => setAddType('note')}>
                    ＋ Note
                  </button>
                  <button
                    disabled={!section}
                    type="button"
                    onClick={() => setAddType('link')}>
                    ＋ Link
                  </button>
                </>
              ) : (
                <div className="addform">
                  <input
                    placeholder="Title"
                    value={fTitle}
                    onChange={(e) => setFTitle(e.target.value)}
                  />
                  {addType === 'note' ? (
                    <input
                      placeholder="Text / value / formula"
                      value={fText}
                      onChange={(e) => setFText(e.target.value)}
                    />
                  ) : (
                    <>
                      <input
                        placeholder="https://…"
                        value={fUrl}
                        onChange={(e) => setFUrl(e.target.value)}
                      />
                      <input
                        placeholder="Source (e.g. Radiopaedia)"
                        value={fSource}
                        onChange={(e) => setFSource(e.target.value)}
                      />
                    </>
                  )}
                  <button type="button" onClick={submitForm}>
                    Add
                  </button>
                  <button type="button" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hint">← → flip · drag to swipe · drop images to add</div>
          )}
        </main>
      </div>
    </div>
  );
}

async function boot() {
  let data: GalleryData = { sections: [] };
  try {
    data = await window.galleryAPI.getData();
  } catch (error) {
    console.error('Failed to load gallery data:', error);
  }
  const container = document.getElementById('root');
  if (container) {
    createRoot(container).render(<App initial={withIds(data)} />);
  }
  window.galleryAPI.galleryWindowReady();
}

boot();
