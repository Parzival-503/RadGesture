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
function CardView({ card }: { card: GalleryCard }) {
  let body: React.ReactNode = null;

  if (card.type === 'table' && card.rows) {
    body = (
      <table>
        <tbody>
          {card.rows.map((row, i) => (
            <tr key={i}>
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
        {card.source && <span className="src">◈ {card.source}</span>}
        <button
          className="openbtn"
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
        <span className="tag">{card.type}</span>
      </div>
      <div className="content">{body}</div>
    </div>
  );
}

/** The whole gallery: a sidebar of sections + a bouncy card carousel. */
function App({ data }: { data: GalleryData }) {
  const [active, setActive] = React.useState(0);
  const [index, setIndex] = React.useState(0);

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
  const section = sections[active];
  const cards = section?.cards || [];
  const accent = section?.color || '#38bdf8';

  return (
    <div className="window">
      <div className="titlebar">
        <span className="logo" />
        <span className="title">
          RadGesture <small>Reference Gallery</small>
        </span>
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
              className={'section' + (i === active ? ' active' : '')}
              onClick={() => {
                setActive(i);
                setIndex(0);
              }}>
              <span className="swatch" style={{ background: s.color || '#888' }} />
              <span className="label">
                {s.icon} {s.label}
              </span>
              <span className="count">{s.cards.length}</span>
            </div>
          ))}
          <div className="foot">Esc to close · edit gallery.json to customize</div>
        </aside>
        <main className="stage" style={{ '--accent': accent } as React.CSSProperties}>
          <div className="sectiontitle">
            {section ? `${section.icon || ''} ${section.label}` : ''}
          </div>
          {cards.length > 0 ? (
            <Swiper
              key={active}
              className="swiper"
              effect="cards"
              grabCursor
              keyboard={{ enabled: true }}
              modules={[EffectCards, Keyboard]}
              onSlideChange={(s) => setIndex(s.activeIndex)}>
              {cards.map((card, i) => (
                <SwiperSlide key={i}>
                  <CardView card={card} />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="empty">No cards in this section yet.</div>
          )}
          <div className="counter">
            {cards.length ? `${index + 1} / ${cards.length}` : ''}
          </div>
          <div className="hint">← → flip · drag to swipe · click a section to jump</div>
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
    createRoot(container).render(<App data={data} />);
  }
  window.galleryAPI.galleryWindowReady();
}

boot();
