// Calculators: a calculator is data, not code, so anyone can write one and
// share it. Each has inputs (numbers or dates), results (formulas over the
// inputs and earlier results), rules (the first one that holds gives the
// verdict) and a report sentence.
//
// Formulas are parsed here and only do arithmetic: + - * / ^, ( ), numbers,
// the names of inputs and results, comparisons (< <= > >= == !=), and / or /
// not, and the functions below. Nothing else can run, so a shared calculator
// cannot do anything but compute.
//
// A value nobody typed is "missing" (null). Anything computed from a missing
// value is missing too, so a result shows only when its inputs are there.
// Logic is three-valued: "a or b" holds when either holds, even if the other
// is missing; a rule whose test is missing does not apply.
//
// A date input is a number of days, so "t2 - t1" is the days between them.
//
// The sentence fills {name} with a value (results rounded to their
// decimals, dates written M/D/YYYY) and {verdict} with the verdict. A part in
// [square brackets] is left out when a value inside it is missing.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RGCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const FUNCS = {
    min: (...a) => Math.min(...a), max: (...a) => Math.max(...a), abs: Math.abs, sqrt: Math.sqrt,
    ln: Math.log, log: Math.log10, exp: Math.exp, round: (x, d) => { const p = Math.pow(10, d || 0); return Math.round(x * p) / p; },
    floor: Math.floor, ceil: Math.ceil,
    if: null, // if(test, a, b): a when the test holds, b (or missing) when not
  };
  const NAME = /^[a-z][a-z0-9_]{0,23}$/i;
  const RESERVED = new Set(['and', 'or', 'not', 'verdict', ...Object.keys(FUNCS)]);

  // ---------------------------------------------------------------- parse

  function tokens(src) {
    const out = [];
    const s = String(src || '');
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
      if (num) { out.push({ t: 'num', v: parseFloat(num[0]) }); i += num[0].length; continue; }
      const id = /^[a-z_][a-z0-9_]*/i.exec(s.slice(i));
      if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
      const op = /^(<=|>=|==|!=|&&|\|\||[-+*/^()<>,!%])/.exec(s.slice(i));
      if (op) { out.push({ t: 'op', v: op[0] }); i += op[0].length; continue; }
      throw new Error(`"${c}" is not allowed in a formula`);
    }
    return out;
  }

  // Precedence climbing. Returns a tree of plain objects.
  function parse(src) {
    const tk = tokens(src);
    if (!tk.length) throw new Error('The formula is empty');
    let p = 0;
    const peek = () => tk[p];
    const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
    const isWord = (v) => peek() && peek().t === 'id' && peek().v.toLowerCase() === v;
    const expect = (v) => { if (!isOp(v)) throw new Error(`Expected "${v}"`); p++; };

    function or() {
      let l = and();
      while (isWord('or') || isOp('||')) { p++; l = { k: 'or', l, r: and() }; }
      return l;
    }
    function and() {
      let l = not();
      while (isWord('and') || isOp('&&')) { p++; l = { k: 'and', l, r: not() }; }
      return l;
    }
    function not() {
      if (isWord('not') || isOp('!')) { p++; return { k: 'not', a: not() }; }
      return cmp();
    }
    function cmp() {
      const l = add();
      const t = peek();
      if (t && t.t === 'op' && ['<', '<=', '>', '>=', '==', '!='].includes(t.v)) { p++; return { k: 'cmp', op: t.v, l, r: add() }; }
      return l;
    }
    function add() {
      let l = mul();
      while (isOp('+') || isOp('-')) { const op = tk[p++].v; l = { k: 'bin', op, l, r: mul() }; }
      return l;
    }
    function mul() {
      let l = unary();
      while (isOp('*') || isOp('/') || isOp('%')) { const op = tk[p++].v; l = { k: 'bin', op, l, r: unary() }; }
      return l;
    }
    function unary() {
      if (isOp('-')) { p++; return { k: 'neg', a: unary() }; }
      if (isOp('+')) { p++; return unary(); }
      return pow();
    }
    function pow() {
      const b = atom();
      if (isOp('^')) { p++; return { k: 'bin', op: '^', l: b, r: unary() }; }
      return b;
    }
    function atom() {
      const t = peek();
      if (!t) throw new Error('The formula ends too soon');
      if (t.t === 'num') { p++; return { k: 'num', v: t.v }; }
      if (isOp('(')) { p++; const e = or(); expect(')'); return e; }
      if (t.t === 'id') {
        p++;
        const name = t.v;
        if (isOp('(')) {
          const f = name.toLowerCase();
          if (!(f in FUNCS)) throw new Error(`"${name}" is not a function here`);
          p++;
          const args = [];
          if (!isOp(')')) { args.push(or()); while (isOp(',')) { p++; args.push(or()); } }
          expect(')');
          if (f === 'if' && (args.length < 2 || args.length > 3)) throw new Error('if(test, value, otherwise) takes 2 or 3 parts');
          return { k: 'fn', f, args };
        }
        const low = name.toLowerCase();
        if (low === 'true' || low === 'false') return { k: 'bool', v: low === 'true' };
        if (low === 'missing' || low === 'null') return { k: 'null' };
        return { k: 'var', name };
      }
      throw new Error(`"${t.v}" is out of place`);
    }
    const tree = or();
    if (p < tk.length) throw new Error(`"${tk[p].v}" is out of place`);
    return tree;
  }

  // The names a formula reads.
  function namesIn(tree, out = new Set()) {
    if (!tree) return out;
    if (tree.k === 'var') out.add(tree.name);
    for (const k of ['l', 'r', 'a']) if (tree[k]) namesIn(tree[k], out);
    if (tree.args) tree.args.forEach((x) => namesIn(x, out));
    return out;
  }

  // ---------------------------------------------------------------- evaluate

  const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

  function ev(tree, vars) {
    switch (tree.k) {
      case 'num': return tree.v;
      case 'bool': return tree.v;
      case 'null': return null;
      case 'var': { const v = vars[tree.name]; return v === undefined ? null : v; }
      case 'neg': { const a = num(ev(tree.a, vars)); return a === null ? null : -a; }
      case 'bin': {
        const l = num(ev(tree.l, vars)), r = num(ev(tree.r, vars));
        if (l === null || r === null) return null;
        const v = tree.op === '+' ? l + r : tree.op === '-' ? l - r : tree.op === '*' ? l * r
          : tree.op === '/' ? (r === 0 ? null : l / r) : tree.op === '%' ? (r === 0 ? null : l % r) : Math.pow(l, r);
        return num(v);
      }
      case 'cmp': {
        const l = ev(tree.l, vars), r = ev(tree.r, vars);
        // "x == missing" / "x != missing" ask whether x was typed.
        if ((tree.op === '==' || tree.op === '!=') && (tree.l.k === 'null' || tree.r.k === 'null')) {
          const isMissing = (tree.l.k === 'null' ? r : l) === null;
          return tree.op === '==' ? isMissing : !isMissing;
        }
        if (num(l) === null || num(r) === null) return null;
        return { '<': l < r, '<=': l <= r, '>': l > r, '>=': l >= r, '==': l === r, '!=': l !== r }[tree.op];
      }
      case 'and': {
        const l = ev(tree.l, vars), r = ev(tree.r, vars);
        if (l === false || r === false) return false;
        if (l === null || r === null) return null;
        return !!l && !!r;
      }
      case 'or': {
        const l = ev(tree.l, vars), r = ev(tree.r, vars);
        if (l === true || r === true) return true;
        if (l === null || r === null) return null;
        return !!l || !!r;
      }
      case 'not': { const a = ev(tree.a, vars); return a === null ? null : !a; }
      case 'fn': {
        if (tree.f === 'if') {
          const t = ev(tree.args[0], vars);
          if (t === null) return null;
          const pick = t ? tree.args[1] : tree.args[2];
          return pick ? num(ev(pick, vars)) : null;
        }
        const args = tree.args.map((x) => num(ev(x, vars)));
        if (args.some((x) => x === null)) return null;
        return num(FUNCS[tree.f](...args));
      }
      default: return null;
    }
  }

  function evaluate(src, vars) { return ev(parse(src), vars || {}); }

  // ---------------------------------------------------------------- dates

  // 'YYYY-MM-DD' -> days since 1970 (UTC), or null.
  function dayOf(s) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(t);
    if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return Math.round(t / 86400000);
  }
  function showDay(n) {
    const d = new Date(n * 86400000);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
  }

  // ---------------------------------------------------------------- calculators

  const fmt = (v, decimals) => {
    if (v === null || v === undefined) return '';
    const d = Number.isInteger(decimals) ? decimals : 1;
    const s = v.toFixed(Math.max(0, Math.min(6, d)));
    return s.includes('.') ? s.replace(/\.?0+$/, '') || '0' : s;
  };

  // Fill a sentence template. Values: { name: shown text or '' }.
  function fill(template, shown) {
    const one = (part) => {
      let missing = false;
      const out = part.replace(/\{([a-z][a-z0-9_]*)\}/gi, (_, n) => {
        const v = shown[n];
        if (v === undefined || v === null || v === '') { missing = true; return ''; }
        return v;
      });
      return { out, missing };
    };
    // Optional parts first: [ ... ] without nesting.
    const withOpt = String(template || '').replace(/\[([^\[\]]*)\]/g, (_, part) => { const r = one(part); return r.missing ? '' : r.out; });
    return one(withOpt).out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
  }

  // Run a calculator on what was typed. raw: { inputId: string }.
  // -> { values, shown, results: [{ id, label, unit, value, text }], verdict, sentence, errors }
  function compute(def, raw) {
    const values = {}, shown = {}, errors = [];
    for (const inp of def.inputs || []) {
      const s = raw && raw[inp.id] !== undefined ? String(raw[inp.id]).trim() : '';
      let v = null;
      if (s !== '') {
        if (inp.type === 'date') v = dayOf(s);
        else { const n = Number(s.replace(/,/g, '')); v = Number.isFinite(n) ? n : null; }
        if (v === null) errors.push(`${inp.label || inp.id}: not a ${inp.type === 'date' ? 'date' : 'number'}`);
      }
      values[inp.id] = v;
      shown[inp.id] = v === null ? '' : inp.type === 'date' ? showDay(v) : fmt(v, 6);
    }
    const results = [];
    for (const r of def.results || []) {
      let v = null;
      try { v = num(evaluate(r.formula, values)); } catch (e) { errors.push(`${r.label || r.id}: ${e.message}`); }
      values[r.id] = v;
      shown[r.id] = v === null ? '' : fmt(v, r.decimals);
      results.push({ id: r.id, label: r.label || r.id, unit: r.unit || '', value: v, text: shown[r.id], hidden: !!r.hidden });
    }
    let verdict = null;
    for (const rule of def.rules || []) {
      let ok = null;
      try { ok = evaluate(rule.when, values); } catch (e) { errors.push(`Rule "${rule.text}": ${e.message}`); }
      if (ok === true) { verdict = { text: rule.text, tone: rule.tone || 'info' }; break; }
    }
    shown.verdict = verdict ? verdict.text : '';
    const anyTyped = (def.inputs || []).some((i) => values[i.id] !== null);
    const sentence = anyTyped ? fill(def.sentence || '', shown) : '';
    return { values, shown, results, verdict, sentence, errors };
  }

  // Problems with a calculator definition, in words ([] = fine).
  function check(def) {
    const out = [];
    if (!def || typeof def !== 'object') return ['Not a calculator'];
    if (!String(def.name || '').trim()) out.push('It needs a name.');
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(String(def.id || ''))) out.push('Its id must be lower-case letters, numbers and dashes.');
    const seen = new Set();
    const known = new Set();
    const use = (id, what) => {
      if (!NAME.test(String(id || ''))) out.push(`${what}: the short name "${id || ''}" must start with a letter and use only letters, numbers and _.`);
      else if (RESERVED.has(String(id).toLowerCase())) out.push(`${what}: "${id}" is a reserved word; pick another short name.`);
      else if (seen.has(id)) out.push(`${what}: the short name "${id}" is used twice.`);
      seen.add(id);
    };
    if (!Array.isArray(def.inputs) || !def.inputs.length) out.push('It needs at least one input.');
    for (const i of def.inputs || []) { use(i.id, `Input "${i.label || i.id}"`); known.add(i.id); }
    for (const r of def.results || []) {
      use(r.id, `Result "${r.label || r.id}"`);
      try {
        const names = namesIn(parse(r.formula));
        for (const n of names) if (!known.has(n)) out.push(`Result "${r.label || r.id}": "${n}" is not an input or an earlier result.`);
      } catch (e) { out.push(`Result "${r.label || r.id}": ${e.message}.`); }
      known.add(r.id);
    }
    for (const rule of def.rules || []) {
      try {
        const names = namesIn(parse(rule.when));
        for (const n of names) if (!known.has(n)) out.push(`Rule "${rule.text || ''}": "${n}" is not an input or result.`);
      } catch (e) { out.push(`Rule "${rule.text || ''}": ${e.message}.`); }
      if (!String(rule.text || '').trim()) out.push('A rule needs the words it shows.');
    }
    for (const m of String(def.sentence || '').matchAll(/\{([a-z][a-z0-9_]*)\}/gi)) {
      if (m[1] !== 'verdict' && !known.has(m[1])) out.push(`The sentence uses {${m[1]}}, which is not an input or result.`);
    }
    return out;
  }

  // A calculator as it is safe to keep: only the known fields, trimmed.
  function clean(def) {
    const str = (v, n) => String(v === undefined || v === null ? '' : v).slice(0, n);
    const d = def || {};
    return {
      id: str(d.id, 41).toLowerCase(),
      name: str(d.name, 60),
      group: str(d.group, 40),
      icon: str(d.icon, 40),
      about: str(d.about, 600),
      source: str(d.source, 600),
      inputs: (Array.isArray(d.inputs) ? d.inputs : []).slice(0, 16).map((i) => ({
        id: str(i && i.id, 24), label: str(i && i.label, 60), unit: str(i && i.unit, 16),
        type: i && i.type === 'date' ? 'date' : 'number', hint: str(i && i.hint, 120),
      })),
      results: (Array.isArray(d.results) ? d.results : []).slice(0, 16).map((r) => ({
        id: str(r && r.id, 24), label: str(r && r.label, 60), unit: str(r && r.unit, 16),
        formula: str(r && r.formula, 400), decimals: Math.max(0, Math.min(4, Math.floor(+(r && r.decimals)) || 0)),
        ...(r && r.hidden ? { hidden: true } : {}),
      })),
      rules: (Array.isArray(d.rules) ? d.rules : []).slice(0, 16).map((r) => ({
        when: str(r && r.when, 400), text: str(r && r.text, 200),
        tone: ['good', 'warn', 'bad', 'info'].includes(r && r.tone) ? r.tone : 'info',
      })),
      sentence: str(d.sentence, 800),
      ...(d.builtin ? { builtin: true } : {}),
      ...(d.builtin && d.edited ? { edited: true } : {}),
    };
  }

  // A fresh short id from a name: "Adrenal CT" -> "adrenal-ct", made unique.
  function idFrom(name, taken) {
    let base = String(name || 'calculator').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'calculator';
    let id = base, n = 2;
    while ((taken || []).includes(id)) id = `${base}-${n++}`;
    return id;
  }

  return { parse, evaluate, namesIn, compute, check, clean, fill, dayOf, showDay, idFrom, fmt };
});
