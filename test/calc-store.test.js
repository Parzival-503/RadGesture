const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCalcStore } = require('../src/main/calc-store');

const DEF = path.join(__dirname, '..', 'config', 'calculators.json');
const fresh = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rg-calc-')); return { dir, s: createCalcStore({ userDir: () => dir, defaultsPath: DEF }) }; };
const mine = { id: 'psad', name: 'PSA density', inputs: [{ id: 'psa', label: 'PSA', unit: 'ng/mL' }, { id: 'v', label: 'Prostate volume', unit: 'mL' }], results: [{ id: 'd', label: 'PSA density', formula: 'psa / v', decimals: 2 }], rules: [{ when: 'd >= 0.15', text: 'PSA density 0.15 or more.' }], sentence: 'PSA density {d}. {verdict}' };

test('the shipped calculators are there from the start', () => {
  const { s } = fresh();
  assert.deepStrictEqual(s.list().map((c) => c.id), ['adrenal-ct', 'adrenal-mri', 'hcc-growth']);
});

test('your own calculator is saved, checked, and moved', () => {
  const { s } = fresh();
  assert.strictEqual(s.save(mine).ok, true);
  assert.strictEqual(s.get('psad').name, 'PSA density');
  const bad = s.save({ ...mine, id: 'bad', results: [{ id: 'd', formula: 'psa / zz' }] });
  assert.strictEqual(bad.ok, false);
  assert.match(bad.problems.join(' '), /"zz"/);
  s.move('psad', -1);
  assert.deepStrictEqual(s.list().map((c) => c.id), ['adrenal-ct', 'adrenal-mri', 'psad', 'hcc-growth']);
});

test('an edited shipped calculator stays yours; Reset brings the shipped one back; a deleted one stays deleted', () => {
  const { s } = fresh();
  const ct = s.get('adrenal-ct');
  const changed = { ...ct, rules: ct.rules.map((r) => (r.when === 'apw >= 60' ? { ...r, when: 'apw >= 55' } : r)) };
  assert.strictEqual(s.save(changed).ok, true);
  assert.strictEqual(s.get('adrenal-ct').edited, true);
  assert.ok(s.get('adrenal-ct').rules.some((r) => r.when === 'apw >= 55'));
  s.reset('adrenal-ct');
  assert.ok(!s.get('adrenal-ct').edited);
  assert.ok(s.get('adrenal-ct').rules.some((r) => r.when === 'apw >= 60'));
  s.remove('adrenal-mri');
  assert.strictEqual(s.get('adrenal-mri'), null);
  assert.deepStrictEqual(s.removed(), ['adrenal-mri']);
  s.reset('adrenal-mri');
  assert.ok(s.get('adrenal-mri'));
});

test('an unedited shipped calculator follows the shipped copy', () => {
  const { dir, s } = fresh();
  s.save(mine);
  const f = path.join(dir, 'calculators.json');
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.list.find((c) => c.id === 'hcc-growth').name = 'An old shipped name';
  fs.writeFileSync(f, JSON.stringify(j));
  assert.strictEqual(s.get('hcc-growth').name, 'HCC threshold growth');
});

test('export and import a shared file; ids never clash and nothing is marked shipped', () => {
  const a = fresh(), b = fresh();
  a.s.save(mine);
  const text = a.s.exportText(['psad', 'adrenal-ct']);
  assert.ok(!/builtin|edited/.test(text));
  const r = b.s.importText(text);
  assert.deepStrictEqual(r.added, ['Adrenal CT washout', 'PSA density']);
  assert.ok(b.s.get('psad'));
  assert.ok(b.s.get('adrenal-ct-2') && !b.s.get('adrenal-ct-2').builtin);
  assert.match(b.s.importText('not json').problems[0], /not a calculator file/);
  assert.match(b.s.importText(JSON.stringify({ calculators: [{ id: 'x', name: 'X', inputs: [{ id: 'a' }], results: [{ id: 'r', formula: 'alert(1)' }] }] })).problems[0], /X:/);
});
