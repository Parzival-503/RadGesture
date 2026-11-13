// The calculator window: pick a calculator, type the values, read the result
// and the sentence, Insert it into the report (the hub copies it, closes this
// window and the helper pastes it where the cursor was) or Copy it.
// Nothing typed here is kept anywhere.
(function () {
  const api = window.rgc;
  const T = window.RGThemes;
  const C = window.RGCalc;
  const $ = (id) => document.getElementById(id);
  let calcs = [];
  let cur = null;
  let raw = {};
  let edited = false; // the sentence was changed by hand

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'class') el.className = v;
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const msym = (n) => h('span', { class: 'msym' }, n);
  const TONE = { good: 'check_circle', warn: 'help', bad: 'error', info: 'info' };

  function pick(id) {
    cur = calcs.find((c) => c.id === id) || calcs[0] || null;
    raw = {};
    edited = false;
    try { if (cur) localStorage.setItem('rg.calc', cur.id); } catch (_) {}
    render();
    const first = document.querySelector('.cins input');
    if (first) first.focus();
  }

  function render() {
    $('pick').replaceChildren(...calcs.map((c) => h('button', { class: 'cchip' + (cur && c.id === cur.id ? ' on' : ''), role: 'tab', 'data-id': c.id, onclick: () => pick(c.id) }, c.name)));
    if (!cur) { $('title').textContent = 'Calculator'; $('page').replaceChildren(h('p', { class: 'cempty' }, 'No calculators. Add one in Settings > Calculators.')); return; }
    $('title').textContent = cur.name;
    const ins = h('div', { class: 'cins' });
    for (const i of cur.inputs) {
      const input = h('input', { id: 'in-' + i.id, type: i.type === 'date' ? 'date' : 'text', inputmode: i.type === 'date' ? null : 'decimal', autocomplete: 'off', spellcheck: 'false', value: raw[i.id] || '',
        oninput: (e) => { raw[i.id] = e.target.value; update(); } });
      ins.append(h('label', { for: 'in-' + i.id }, i.label, i.hint ? h('small', {}, i.hint) : null), input, h('span', { class: 'unit' }, i.unit || ''));
    }
    const page = [
      cur.about ? h('p', { class: 'cabout' }, cur.about) : null,
      ins,
      h('div', { class: 'cres', id: 'res' }),
      h('div', { id: 'verdict' }),
      h('div', { class: 'csent' }, h('div', { class: 'lbl' }, 'For the report'),
        h('textarea', { id: 'sentence', rows: '3', placeholder: 'Type the values above.', oninput: () => { edited = true; grow(); } })),
      h('div', { class: 'cacts' },
        h('button', { class: 'btn primary small', id: 'insert', title: 'Paste it where the cursor was in the report (Ctrl+Enter)', onclick: insert }, msym('input'), 'Insert into report'),
        h('button', { class: 'btn small', id: 'copy', onclick: copy }, msym('content_copy'), 'Copy'),
        h('span', { class: 'grow' }),
        h('button', { class: 'btn ghost small', id: 'clear', onclick: () => pick(cur.id) }, 'Clear')),
      h('div', { class: 'cerr', id: 'err' }),
      cur.source ? h('details', { class: 'csrc' }, h('summary', {}, 'Where the numbers come from'), h('p', {}, cur.source)) : null,
    ];
    $('page').replaceChildren(...page.filter(Boolean));
    update();
  }

  function update() {
    if (!cur) return;
    const r = C.compute(cur, raw);
    const res = $('res');
    res.replaceChildren(...r.results.filter((x) => !x.hidden).flatMap((x) => [
      h('span', { class: 'k' }, x.label),
      h('span', { class: 'v' + (x.value === null ? ' none' : ''), 'data-id': x.id }, x.value === null ? '-' : `${x.text}${x.unit ? (x.unit === '%' ? '%' : ' ' + x.unit) : ''}`),
    ]));
    $('verdict').replaceChildren(...(r.verdict ? [h('div', { class: 'cverdict ' + r.verdict.tone, id: 'verdictBox' }, msym(TONE[r.verdict.tone] || 'info'), h('span', {}, r.verdict.text))] : []));
    for (const i of cur.inputs) {
      const el = $('in-' + i.id);
      if (el) el.classList.toggle('err', r.errors.some((e) => e.startsWith((i.label || i.id) + ':')));
    }
    if (!edited) $('sentence').value = r.sentence;
    grow();
    $('err').textContent = r.errors.filter((e) => !cur.inputs.some((i) => e.startsWith((i.label || i.id) + ':'))).join(' ');
  }

  // The sentence box fits its sentence, so all of it can be read.
  function grow() {
    const t = $('sentence');
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight + 2, 220) + 'px';
  }
  const text = () => String($('sentence') ? $('sentence').value : '').trim();
  function insert() { const t = text(); if (t) api.insert(t); }
  function copy() {
    const t = text();
    if (!t) return;
    api.copy(t);
    const b = $('copy');
    b.replaceChildren(msym('check'), 'Copied');
    setTimeout(() => { if (b.isConnected) b.replaceChildren(msym('content_copy'), 'Copy'); }, 1200);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); api.close(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); insert(); }
  });
  $('close').addEventListener('click', () => api.close());
  $('edit').addEventListener('click', () => api.edit(cur ? cur.id : ''));

  function load(d) {
    T.apply(document.documentElement, d.theme, 'ui');
    calcs = d.calcs || [];
    let last = '';
    try { last = localStorage.getItem('rg.calc') || ''; } catch (_) {}
    pick(d.id || (cur && cur.id) || last);
  }
  api.onShow(load);
  api.get().then(load);
})();
