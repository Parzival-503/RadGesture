const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../src/common/calc');

const shipped = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'calculators.json'), 'utf8')).calculators;
const calc = (id) => shipped.find((c) => c.id === id);

test('formulas: arithmetic, order of operations, functions', () => {
  assert.strictEqual(C.evaluate('1 + 2 * 3'), 7);
  assert.strictEqual(C.evaluate('(1 + 2) * 3'), 9);
  assert.strictEqual(C.evaluate('2 ^ 3 ^ 2'), 512);
  assert.strictEqual(C.evaluate('-2 ^ 2'), -4);
  assert.strictEqual(C.evaluate('max(3, 9, 4) - min(2, 5)'), 7);
  assert.strictEqual(C.evaluate('round(2.345, 2)'), 2.35);
  assert.strictEqual(C.evaluate('a / b', { a: 6, b: 4 }), 1.5);
  assert.strictEqual(C.evaluate('if(a > 2, 10, 20)', { a: 3 }), 10);
  assert.strictEqual(C.evaluate('if(a > 2, 10)', { a: 1 }), null);
});

test('formulas: a missing value makes the result missing; logic is three-valued', () => {
  assert.strictEqual(C.evaluate('a + 1', {}), null);
  assert.strictEqual(C.evaluate('a / 0', { a: 1 }), null);
  assert.strictEqual(C.evaluate('a > 1 or b > 1', { b: 5 }), true);
  assert.strictEqual(C.evaluate('a > 1 or b > 1', { b: 0 }), null);
  assert.strictEqual(C.evaluate('a > 1 and b > 1', { b: 0 }), false);
  assert.strictEqual(C.evaluate('a == missing', {}), true);
  assert.strictEqual(C.evaluate('a != missing', { a: 0 }), true);
  assert.strictEqual(C.evaluate('not (a > 1)', { a: 3 }), false);
});

test('formulas can only compute: anything else is refused', () => {
  for (const bad of ['alert(1)', 'constructor.constructor("x")()', 'a; b', 'a = 1', '`x`', '"text"', 'a[0]', 'process.exit()']) {
    assert.throws(() => C.evaluate(bad, { a: 1 }), undefined, bad);
  }
});

test('dates are days, written M/D/YYYY', () => {
  assert.strictEqual(C.dayOf('2026-05-01') - C.dayOf('2026-01-10'), 111);
  assert.strictEqual(C.dayOf('2026-02-30'), null);
  assert.strictEqual(C.showDay(C.dayOf('2026-03-04')), '3/4/2026');
});

test('sentences: [optional parts] drop out when a value inside is missing', () => {
  assert.strictEqual(C.fill('A[ b {x}][, c {y}]. {verdict}', { x: '1', y: '', verdict: 'Done.' }), 'A b 1. Done.');
  assert.strictEqual(C.fill('Size {s} mm[ on {t}].', { s: '5' }), 'Size 5 mm.');
});

test('every shipped calculator is valid', () => {
  assert.deepStrictEqual(shipped.map((c) => c.id), ['adrenal-ct', 'adrenal-mri', 'hcc-growth']);
  for (const c of shipped) {
    assert.deepStrictEqual(C.check(c), [], c.id);
    assert.deepStrictEqual(C.clean(c), c, c.id + ' keeps every field when cleaned');
  }
});

test('Adrenal CT: absolute and relative washout, and what they mean', () => {
  const ct = calc('adrenal-ct');
  let r = C.compute(ct, { u: '18', e: '85', d: '32' });
  assert.deepStrictEqual(r.results.map((x) => x.text), ['79', '62']);
  assert.match(r.verdict.text, /adenoma \(absolute washout 60% or more\)/);
  assert.strictEqual(r.sentence, 'Adrenal nodule measuring 18 HU unenhanced, 85 HU portal venous, 32 HU at 15 minutes. Absolute washout 79%. Relative washout 62%. Consistent with adenoma (absolute washout 60% or more).');
  assert.match(C.compute(ct, { u: '8' }).verdict.text, /lipid-rich adenoma/);
  assert.match(C.compute(ct, { u: '30' }).verdict.text, /Indeterminate on unenhanced CT/);
  r = C.compute(ct, { e: '100', d: '55' });
  assert.deepStrictEqual(r.results.map((x) => x.text), ['', '45']);
  assert.match(r.verdict.text, /relative washout 40% or more/);
  assert.match(C.compute(ct, { u: '30', e: '100', d: '80' }).verdict.text, /below adenoma thresholds/);
  assert.strictEqual(C.compute(ct, {}).sentence, '');
});

test('Adrenal MRI: signal intensity index and adrenal-to-spleen ratio', () => {
  const mri = calc('adrenal-mri');
  let r = C.compute(mri, { aip: '400', aop: '300' });
  assert.strictEqual(r.results[0].text, '25');
  assert.match(r.verdict.text, /consistent with a lipid-rich adenoma/);
  r = C.compute(mri, { aip: '400', aop: '380', sip: '300', sop: '300' });
  assert.deepStrictEqual(r.results.map((x) => x.text), ['5', '0.95']);
  assert.match(r.verdict.text, /indeterminate/);
  r = C.compute(mri, { aip: '400', aop: '380', sip: '300', sop: '400' });
  assert.strictEqual(r.results[1].text, '0.71');
});

test('HCC growth: LI-RADS threshold growth is 50% or more in 6 months or less', () => {
  const h = calc('hcc-growth');
  let r = C.compute(h, { s1: '20', t1: '2026-01-10', s2: '31', t2: '2026-05-01' });
  const by = Object.fromEntries(r.results.map((x) => [x.id, x.text]));
  assert.deepStrictEqual(by, { g: '55', days: '111', mo: '3.6', t50: '103', vdt: '59' });
  assert.match(r.verdict.text, /^Meets LI-RADS threshold growth/);
  assert.strictEqual(r.sentence, 'Observation measures 31 mm on 5/1/2026, previously 20 mm on 1/10/2026: 55% change in size over 3.6 months. Meets LI-RADS threshold growth (50% or more in 6 months or less).');
  assert.match(C.compute(h, { s1: '20', t1: '2025-01-10', s2: '31', t2: '2026-05-01' }).verdict.text, /over more than 6 months: not LI-RADS threshold growth/);
  assert.match(C.compute(h, { s1: '20', s2: '24' }).verdict.text, /under 50%/);
  r = C.compute(h, { s1: '20', t1: '2026-01-10', s2: '18', t2: '2026-05-01' });
  assert.strictEqual(r.verdict.text, 'No growth.');
  assert.strictEqual(r.results.find((x) => x.id === 'vdt').value, null, 'no doubling time without growth');
  assert.match(C.compute(h, { s1: '20', t1: '2026-05-01', s2: '31', t2: '2026-01-10' }).verdict.text, /Check the dates/);
});

test('check: a broken calculator is described in words', () => {
  const bad = { id: 'x', name: 'X', inputs: [{ id: 'a' }, { id: 'a' }], results: [{ id: 'r', formula: 'a + z' }, { id: 'and', formula: '1' }], rules: [{ when: 'r >', text: 'x' }], sentence: '{nope}' };
  const p = C.check(bad).join(' | ');
  assert.match(p, /used twice/);
  assert.match(p, /"z" is not an input/);
  assert.match(p, /reserved word/);
  assert.match(p, /Rule "x"/);
  assert.match(p, /\{nope\}/);
  assert.strictEqual(C.idFrom('Adrenal CT!', ['adrenal-ct']), 'adrenal-ct-2');
});
