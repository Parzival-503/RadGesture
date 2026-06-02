// SPDX-FileCopyrightText: 2026 Sina Mazaheri
// SPDX-License-Identifier: MIT

import './index.scss';
import 'swiper/css';
import 'swiper/css/effect-cards';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Keyboard } from 'swiper/modules';

import { GalleryWindowWithAPI } from './gallery-window-api';
import { GalleryData, GalleryCard } from '../common/gallery';

declare const window: GalleryWindowWithAPI;

/** Renders a single reference card based on its type. */
function CardView({
  card,
  isEditing,
  onDelete,
}: {
  readonly card: GalleryCard;
  readonly isEditing: boolean;
  readonly onDelete: () => void;
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
    body = <div className="note">{card.text}</div>;
  } else if (card.type === 'link') {
    body = (
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
        title="Click to open full size"
        onClick={() => card.resolvedPath && window.galleryAPI.openPath(card.resolvedPath)}
      />
    ) : (
      <div className="shot">image not found</div>
    );
  }

  return (
    <div className="card">
      <div className="head">
        <span className="ttl">{card.title}</span>
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

/** The whole gallery: a sidebar of sections + a bouncy card carousel, with edit mode. */
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

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.galleryAPI.close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sections = data.sections || [];
  const safeActive = Math.min(active, Math.max(0, sections.length - 1));
  const section = sections[safeActive];
  const cards = section?.cards || [];
  const accent = section?.color || '#38bdf8';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const stageStyle = { '--accent': accent } as React.CSSProperties;

  // Optimistically update local state, then persist and adopt the canonical result.
  const persist = (next: GalleryData) => {
    setData(next);
    window.galleryAPI.save(next).then(setData).catch(console.error);
  };

  const resetForm = () => {
    setAddType(null);
    setFTitle('');
    setFText('');
    setFUrl('');
    setFSource('');
  };

  const addSection = () => {
    const label = newSection.trim() || 'New Section';
    const id = 'sec-' + Date.now();
    const next: GalleryData = {
      sections: [...sections, { id, label, color: '#38bdf8', icon: '📁', cards: [] }],
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
        i === safeActive ? { ...s, cards: [...s.cards, card] } : s
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
      window.galleryAPI.pickAndAddImages(section.id).then(setData).catch(console.error);
    }
  };

  // Read dropped image files in the renderer and stream their bytes (base64) to the main
  // process — avoids fragile file-path extraction in a sandboxed window.
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
      setData(fresh);
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
          <div className="sectiontitle">
            {section ? `${section.icon || ''} ${section.label}` : ''}
          </div>

          {cards.length > 0 ? (
            <Swiper
              key={`${safeActive}-${cards.length}`}
              grabCursor
              className="swiper"
              effect="cards"
              keyboard={{ enabled: true }}
              modules={[EffectCards, Keyboard]}
              onSlideChange={(s) => setIndex(s.activeIndex)}>
              {cards.map((card, i) => (
                <SwiperSlide key={`${card.type}:${card.title}`}>
                  <CardView
                    card={card}
                    isEditing={editing}
                    onDelete={() => deleteCard(i)}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="empty">No cards in this section yet.</div>
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
            <div className="hint">← → flip · drag to swipe · click a section to jump</div>
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
    createRoot(container).render(<App initial={data} />);
  }
  window.galleryAPI.galleryWindowReady();
}

boot();
