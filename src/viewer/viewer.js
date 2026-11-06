// The Reference Library window: opens a note or picture from the ring, finds
// anything in the library (Ctrl+F), edits a note or a picture's title and
// caption right here (saved as you type), and starts new notes in a section.
// Sections, tags and moving things stay in Settings ("open in Settings").
//
// A picture sits on a stage: the mouse wheel zooms around the pointer, drag
// pans, double-click switches between fit and actual size; keys: + / - zoom,
// 0 fit, 1 actual size, arrows pan.
(function () {
  const api = window.rgv;
  const T = window.RGThemes;
  const MD = window.RGMarkdown;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  let current = qs.get('id') || '';
  let ref = null; // what is shown
  let mode = 'view'; // view | edit | list
  let view = null; // the picture's zoom and position, while one is shown
  let lib = null; // { items, sections } while the list is shown
  let sel = 0;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const msym = (n) => h('span', { class: 'msym' }, n);
  const KIND = { note: ['description', 'Note'], picture: ['image', 'Picture'], pdf: ['picture_as_pdf', 'PDF'], file: ['attach_file', 'File'], link: ['link', 'Link'], document: ['folder_open', 'On this PC'] };

  function bar() {
    const editable = mode === 'view' && ref && (!ref.file);
    $('edit').hidden = !editable;
    $('done').hidden = mode !== 'edit';
    $('more').hidden = mode === 'list' && !current;
    $('zoombar').hidden = !(mode === 'view' && view);
    $('home').classList.toggle('on', mode === 'list');
  }

  async function show(id) {
    if (!id) return showList('');
    current = id;
    mode = 'view';
    const got = await api.get(id);
    ref = got.ref;
    T.apply(document.documentElement, got.theme, 'ui');
    const page = $('page');
    page.innerHTML = '';
    page.className = 'md';
    view = null;
    if (!ref) {
      $('title').textContent = 'Not found';
      page.innerHTML = '<p>This reference was deleted.</p>';
      return bar();
    }
    document.title = ref.title;
    $('title').textContent = ref.title;
    $('tags').innerHTML = (ref.tags || []).map((t) => `<span class="chip">${MD.esc(t)}</span>`).join(' ');
    const body = document.createElement('div');
    body.innerHTML = MD.render(ref.body || ''); // MD escapes everything itself
    if (ref.image) {
      page.classList.add('pic');
      const stage = document.createElement('div');
      stage.className = 'stage';
      stage.id = 'stage';
      const img = document.createElement('img');
      img.alt = ref.title;
      img.draggable = false;
      stage.append(img);
      const hint = document.createElement('div');
      hint.className = 'stagehint';
      hint.textContent = 'Scroll to zoom · drag to move · double-click: fit / actual size';
      stage.append(hint);
      setTimeout(() => { hint.style.opacity = '0'; }, 3500);
      body.className = 'caption md';
      page.append(stage, body);
      view = { stage, img, s: 1, x: 0, y: 0, fit: true };
      img.onload = () => { fitView(); window.__viewerReady = true; };
      img.src = ref.image;
      return bar();
    }
    if (!(ref.body || '').trim()) page.append(h('p', { class: 'empty' }, 'Nothing written yet. ', h('a', { href: '#', id: 'startWriting', onclick: (e) => { e.preventDefault(); edit(); } }, 'Start writing')));
    else page.append(body);
    window.__viewerReady = true;
    bar();
  }

  // ---- edit here: a note's title and text, or a picture's title and caption

  let saveTimer = null;
  function edit() {
    if (!ref || ref.file) return;
    mode = 'edit';
    view = null;
    const page = $('page');
    page.className = 'editing';
    page.innerHTML = '';
    const title = h('input', { type: 'text', id: 'edTitle', class: 'edtitle', value: ref.title, placeholder: 'Title', 'aria-label': 'Title' });
    const text = h('textarea', { id: 'edText', class: 'edtext', spellcheck: 'true', placeholder: ref.image ? 'A caption under the picture (optional)' : '# Heading\n- **Bold** point\n> **Pearl** a tip worth remembering' });
    text.value = ref.body || '';
    const preview = h('div', { class: 'edprev md', id: 'edPrev' });
    const state = h('span', { class: 'edstate', id: 'edState' }, 'Saved');
    const draw = () => { preview.innerHTML = MD.render(text.value || ''); };
    const save = () => {
      state.textContent = 'Saving...';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        const r = await api.save({ id: ref.id, title: title.value, body: text.value });
        if (r) { ref = r; $('title').textContent = r.title; document.title = r.title; state.textContent = 'Saved'; }
        else state.textContent = 'Could not save: it may have been deleted';
      }, 450);
    };
    title.addEventListener('input', save);
    text.addEventListener('input', () => { draw(); save(); });
    text.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'i')) {
        e.preventDefault();
        const m = e.key === 'b' ? '**' : '*';
        const a = text.selectionStart, b = text.selectionEnd;
        text.setRangeText(m + text.value.slice(a, b) + m, a, b, b > a ? 'select' : 'end');
        if (a === b) text.selectionStart = text.selectionEnd = a + m.length;
        draw(); save();
      }
    });
    draw();
    const head = h('div', { class: 'edhead' }, title, state);
    const thumb = ref.image ? h('img', { class: 'edthumb', src: ref.image, alt: '' }) : null;
    page.append(...[head, thumb, h('div', { class: 'edcols' + (ref.image ? ' one' : '') }, text, ref.image ? null : preview)].filter(Boolean),
      h('div', { class: 'edfoot' }, msym('info'), ref.image ? 'Saved as you type.' : 'Saved as you type. Markdown: **bold**, *italic*, - list, # heading, > **Pearl** callout.'));
    bar();
    setTimeout(() => (ref.title === 'New note' ? title.select() : text.focus()), 30);
  }
  async function done() {
    clearTimeout(saveTimer);
    const t = $('edTitle'), x = $('edText');
    if (t && x) await api.save({ id: ref.id, title: t.value, body: x.value });
    show(ref.id);
  }

  // ---- everything in the library, and finding it

  async function showList(q) {
    mode = 'list';
    view = null;
    lib = await api.library();
    if (!ref) {
      const got = await api.get('');
      T.apply(document.documentElement, got.theme, 'ui');
    }
    $('title').textContent = 'Reference Library';
    $('tags').innerHTML = '';
    document.title = 'Reference Library';
    sel = 0;
    renderList(q);
    bar();
  }
  const norm = (x) => String(x || '').toLowerCase();
  function matches(it, words) {
    const hay = norm([it.title, it.section, it.topic, it.host, (it.tags || []).join(' '), KIND[it.kind] ? KIND[it.kind][1] : '', it.text].join(' '));
    return words.every((w) => hay.includes(w));
  }
  function renderList(q) {
    const page = $('page');
    page.className = 'listing';
    page.innerHTML = '';
    const words = norm(q).split(/\s+/).filter(Boolean);
    const hits = lib.items.filter((it) => matches(it, words));
    sel = Math.min(sel, Math.max(0, hits.length - 1));
    if (!lib.items.length) {
      page.append(h('p', { class: 'empty' }, 'The library is empty. Start with New note, or add links, PDFs and screenshots in Settings.'));
      return;
    }
    if (!hits.length) { page.append(h('p', { class: 'empty' }, `Nothing matches "${q}".`)); return; }
    const groups = new Map();
    hits.forEach((it) => { const k = it.section || 'Not in a section'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); });
    let i = 0;
    for (const [name, list] of groups) {
      page.append(h('h2', { class: 'lgroup' }, name, h('span', { class: 'lcount' }, String(list.length))));
      page.append(h('div', { class: 'lrows' }, list.map((it) => {
        const k = KIND[it.kind] || KIND.note;
        const idx = i++;
        return h('button', { class: 'lrow' + (idx === sel ? ' on' : ''), 'data-i': String(idx), onclick: () => open(it), onmouseenter: () => mark(idx) },
          h('span', { class: 'licon' }, msym(k[0])),
          h('span', { class: 'ltext' }, h('b', {}, it.title || '(untitled)'), h('span', { class: 'lsub' }, [it.topic, it.host || k[1]].filter(Boolean).join(' · '))),
          it.kind === 'link' ? msym('open_in_new') : null);
      })));
    }
    page.__hits = hits;
  }
  function mark(i) {
    sel = i;
    document.querySelectorAll('.lrow').forEach((b) => b.classList.toggle('on', +b.dataset.i === i));
  }
  function open(it) {
    if (!it) return;
    $('find').value = '';
    if (it.id && (it.kind === 'note' || it.kind === 'picture')) return show(it.id);
    api.openEntry(it); // links in the browser, PDFs in the reader, files in their program
  }

  // ---- a new note, in the section picked

  async function newNote(section) {
    $('newPop').hidden = true;
    const r = await api.newNote(section);
    await show(r.id);
    edit();
  }
  async function pickSection() {
    const pop = $('newPop');
    if (!pop.hidden) { pop.hidden = true; return; }
    const l = lib || await api.library();
    const here = ref && l.items.find((x) => x.id === ref.id);
    pop.innerHTML = '';
    pop.append(h('div', { class: 'vpoph' }, 'New note in'));
    (l.sections.length ? l.sections : ['']).forEach((name) => pop.append(h('button', { class: 'vpopi' + (here && here.section === name ? ' on' : ''), onclick: () => newNote(name) },
      msym('folder'), name || 'The Reference Library ring')));
    pop.hidden = false;
  }
  document.addEventListener('click', (e) => { if (!e.target.closest('.vmenu')) $('newPop').hidden = true; });

  // ---- zoom and pan
  const MIN = 0.05, MAX = 16;
  function apply() {
    if (!view) return;
    const { img, s, x, y } = view;
    img.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    img.classList.toggle('pixels', s >= 3); // sharp pixels when looking closely
    $('zoomPct').textContent = Math.round(s * 100) + '%';
    window.__viewerZoom = s;
  }
  function fitScale() {
    const r = view.stage.getBoundingClientRect();
    const w = view.img.naturalWidth || 1, hgt = view.img.naturalHeight || 1;
    return Math.min(1, (r.width - 24) / w, (r.height - 24) / hgt);
  }
  function center(s) {
    const r = view.stage.getBoundingClientRect();
    view.s = s;
    view.x = (r.width - view.img.naturalWidth * s) / 2;
    view.y = (r.height - view.img.naturalHeight * s) / 2;
  }
  function fitView() {
    if (!view) return;
    center(fitScale());
    view.fit = true;
    apply();
  }
  // Zoom to scale s, keeping the point (px, py) of the stage where it is.
  function zoomTo(s, px, py) {
    if (!view) return;
    const r = view.stage.getBoundingClientRect();
    if (px === undefined) { px = r.width / 2; py = r.height / 2; }
    s = Math.max(MIN, Math.min(MAX, s));
    view.x = px - (px - view.x) * (s / view.s);
    view.y = py - (py - view.y) * (s / view.s);
    view.s = s;
    view.fit = false;
    apply();
  }
  const step = (dir, px, py) => view && zoomTo(view.s * (dir > 0 ? 1.25 : 0.8), px, py);

  document.addEventListener('wheel', (e) => {
    if (!view || !view.stage.contains(e.target)) return;
    e.preventDefault();
    const r = view.stage.getBoundingClientRect();
    // A touchpad pinch or a wheel notch: zoom by how far it moved.
    const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    zoomTo(view.s * k, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    if (!view || e.button !== 0 || !view.stage.contains(e.target)) return;
    drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    view.stage.classList.add('dragging');
    view.stage.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || !view) return;
    view.x = drag.vx + e.clientX - drag.x;
    view.y = drag.vy + e.clientY - drag.y;
    view.fit = false;
    apply();
  });
  const endDrag = () => { drag = null; if (view) view.stage.classList.remove('dragging'); };
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('dblclick', (e) => {
    if (!view || !view.stage.contains(e.target)) return;
    const r = view.stage.getBoundingClientRect();
    if (view.fit || Math.abs(view.s - fitScale()) < 0.01) zoomTo(1 === view.s ? 2 : 1, e.clientX - r.left, e.clientY - r.top);
    else fitView();
  });
  window.addEventListener('resize', () => { if (view && view.fit) fitView(); });

  $('zoomIn').addEventListener('click', () => step(1));
  $('zoomOut').addEventListener('click', () => step(-1));
  $('zoomFit').addEventListener('click', fitView);
  $('zoomPct').addEventListener('click', () => zoomTo(1));

  // Links open in the browser, never inside this window.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || a.id === 'startWriting') return;
    e.preventDefault();
    api.openLink(a.getAttribute('href'));
  });

  const find = $('find');
  find.addEventListener('focus', () => { if (mode !== 'list') showList(find.value); });
  find.addEventListener('input', () => { if (mode === 'list' && lib) { sel = 0; renderList(find.value); } else showList(find.value); });
  find.addEventListener('keydown', (e) => {
    const hits = $('page').__hits || [];
    if (e.key === 'ArrowDown') { mark(Math.min(sel + 1, hits.length - 1)); scrollSel(); }
    else if (e.key === 'ArrowUp') { mark(Math.max(sel - 1, 0)); scrollSel(); }
    else if (e.key === 'Enter') open(hits[sel]);
    else if (e.key === 'Escape') {
      if (find.value) { find.value = ''; renderList(''); }
      else if (current) { find.blur(); show(current); }
      else api.close();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  });
  const scrollSel = () => { const b = document.querySelector('.lrow.on'); if (b) b.scrollIntoView({ block: 'nearest' }); };

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); find.focus(); find.select(); return; }
    if (e.key === 'Escape') {
      if (mode === 'edit') return done();
      if (mode === 'list' && current) return show(current);
      return api.close();
    }
    if (e.target.closest('input, textarea')) return;
    if (mode === 'view' && (e.key === 'e' || e.key === 'E') && ref && !ref.file) { e.preventDefault(); return edit(); }
    if (!view) return;
    const pan = 60;
    if (e.key === '+' || e.key === '=') step(1);
    else if (e.key === '-' || e.key === '_') step(-1);
    else if (e.key === '0') fitView();
    else if (e.key === '1') zoomTo(1);
    else if (e.key === 'ArrowLeft') { view.x += pan; apply(); }
    else if (e.key === 'ArrowRight') { view.x -= pan; apply(); }
    else if (e.key === 'ArrowUp') { view.y += pan; apply(); }
    else if (e.key === 'ArrowDown') { view.y -= pan; apply(); }
    else return;
    e.preventDefault();
  });
  $('close').addEventListener('click', () => api.close());
  $('edit').addEventListener('click', edit);
  $('done').addEventListener('click', done);
  $('home').addEventListener('click', () => (mode === 'list' && current ? show(current) : showList('')));
  $('newNote').addEventListener('click', pickSection);
  $('more').addEventListener('click', () => api.edit(mode === 'list' ? '' : current));
  api.onShow((id) => { find.value = ''; show(id); });
  if (current) show(current);
  else showList('').then(() => find.focus());
})();
