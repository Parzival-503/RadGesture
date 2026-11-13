// The calculators a person has: the shipped ones (config/calculators.json)
// and their own, in %APPDATA%\RadGesture\calculators.json.
//
// A shipped calculator nobody changed follows the shipped copy, so a fix in a
// new version reaches everyone. Once edited it is the person's ("edited"),
// and Reset puts the shipped one back. A shipped one that was deleted stays
// deleted ("removed"), until Reset or Restore.
//
// Shared files (.rgcalc) carry only the calculators' data; they never run
// anything (formulas only compute, src/common/calc.js).

const fs = require('fs');
const path = require('path');
const C = require('../common/calc');

function createCalcStore({ userDir, defaultsPath }) {
  const file = () => path.join(userDir(), 'calculators.json');
  const defaults = () => {
    try { return (JSON.parse(fs.readFileSync(defaultsPath, 'utf8')).calculators || []).map((d) => C.clean({ ...d, builtin: true })); } catch (_) { return []; }
  };
  const readRaw = () => {
    try {
      const j = JSON.parse(fs.readFileSync(file(), 'utf8'));
      return { list: Array.isArray(j.list) ? j.list : [], removed: Array.isArray(j.removed) ? j.removed.map(String) : [] };
    } catch (_) { return { list: [], removed: [] }; }
  };
  const write = (state) => {
    fs.mkdirSync(userDir(), { recursive: true });
    fs.writeFileSync(file(), JSON.stringify({ list: state.list, removed: state.removed }, null, 2));
  };

  // Everything, in the person's order, shipped ones kept up to date.
  function state() {
    const raw = readRaw();
    const defs = defaults();
    const byId = new Map(defs.map((d) => [d.id, d]));
    const list = [];
    const seen = new Set();
    for (const x of raw.list) {
      const c = C.clean(x);
      if (!c.id || seen.has(c.id)) continue;
      if (c.builtin) {
        const d = byId.get(c.id);
        if (!d) { if (c.edited) { delete c.builtin; delete c.edited; } else continue; }
        else if (!c.edited) { list.push(d); seen.add(c.id); continue; }
      }
      list.push(c);
      seen.add(c.id);
    }
    for (const d of defs) if (!seen.has(d.id) && !raw.removed.includes(d.id)) { list.push(d); seen.add(d.id); }
    return { list, removed: raw.removed.filter((id) => byId.has(id)) };
  }

  const list = () => state().list;
  const get = (id) => list().find((c) => c.id === id) || null;

  // Save one (new or changed). Returns { ok, problems, calc }.
  function save(def, { before } = {}) {
    const s = state();
    const c = C.clean(def);
    const old = s.list.find((x) => x.id === (before || c.id));
    if (old && old.builtin) { c.builtin = true; c.edited = true; } else { delete c.builtin; delete c.edited; }
    if (!c.id) c.id = C.idFrom(c.name, s.list.map((x) => x.id));
    if (!old && s.list.some((x) => x.id === c.id)) c.id = C.idFrom(c.id, s.list.map((x) => x.id));
    if (old && old.builtin && c.id !== old.id) c.id = old.id; // a shipped one keeps its id
    const problems = C.check(c);
    if (problems.length) return { ok: false, problems };
    const at = old ? s.list.indexOf(old) : -1;
    if (at >= 0) s.list[at] = c; else s.list.push(c);
    if (old && old.id !== c.id && s.list.filter((x) => x.id === c.id).length > 1) return { ok: false, problems: [`There is already a calculator "${c.id}".`] };
    write(s);
    return { ok: true, calc: c };
  }

  function remove(id) {
    const s = state();
    const c = s.list.find((x) => x.id === id);
    if (!c) return false;
    s.list = s.list.filter((x) => x !== c);
    if (c.builtin && !s.removed.includes(id)) s.removed.push(id);
    write(s);
    return true;
  }

  // A shipped calculator back as shipped (also after a delete).
  function reset(id) {
    const s = state();
    const d = defaults().find((x) => x.id === id);
    if (!d) return false;
    s.removed = s.removed.filter((x) => x !== id);
    const at = s.list.findIndex((x) => x.id === id);
    if (at >= 0) s.list[at] = d; else s.list.push(d);
    write(s);
    return true;
  }

  function move(id, by) {
    const s = state();
    const i = s.list.findIndex((x) => x.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= s.list.length) return false;
    [s.list[i], s.list[j]] = [s.list[j], s.list[i]];
    write(s);
    return true;
  }

  // A file to share: the chosen calculators' data only.
  function exportText(ids) {
    const pick = list().filter((c) => !ids || ids.includes(c.id)).map((c) => { const x = { ...c }; delete x.builtin; delete x.edited; return x; });
    return JSON.stringify({ rgcalc: 1, calculators: pick }, null, 2);
  }

  // Adds what a shared file holds; one with an id already here gets a new id.
  // -> { added: [names], problems: [words] }
  function importText(text) {
    let j;
    try { j = JSON.parse(String(text || '')); } catch (_) { return { added: [], problems: ['That file is not a calculator file.'] }; }
    const incoming = Array.isArray(j && j.calculators) ? j.calculators : Array.isArray(j) ? j : [j];
    const s = state();
    const added = [], problems = [];
    for (const x of incoming.slice(0, 50)) {
      const c = C.clean(x);
      delete c.builtin; delete c.edited;
      c.id = C.idFrom(c.id || c.name, s.list.map((y) => y.id));
      const p = C.check(c);
      if (p.length) { problems.push(`${c.name || 'A calculator'}: ${p[0]}`); continue; }
      s.list.push(c);
      added.push(c.name);
    }
    if (added.length) write(s);
    return { added, problems };
  }

  return { list, get, save, remove, reset, move, exportText, importText, removed: () => state().removed, defaults };
}

module.exports = { createCalcStore };
