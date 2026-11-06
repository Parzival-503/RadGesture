const test = require('node:test');
const assert = require('node:assert');
const PT = require('../src/common/priortags');

const lines = [
  '**RUL nodule**: compare size, was 6 mm to 8 mm [P1 1/5/2024, P2 3/14/2025]',
  '**Liver lesion**: confirm stable [P2 3/14/2025]',
  '**Adrenal nodule**: check washout [P1 1/5/2024]',
  '**Lines and tubes**: note any new devices',
];

test('reads which priors each checklist line came from', () => {
  assert.deepStrictEqual(PT.priorsOf(lines[0]), [1, 2]);
  assert.deepStrictEqual(PT.priorsOf(lines[1]), [2]);
  assert.deepStrictEqual(PT.priorsOf(lines[3]), []);
  assert.deepStrictEqual(PT.priorsOf('see P3 in the text, no tag'), []);
  assert.deepStrictEqual(PT.priorsOf('**X**: y [P2]'), [2]);
});

test('lists every prior once, in order, with its date', () => {
  assert.deepStrictEqual(PT.priorList(lines), [{ n: 1, date: '1/5/2024' }, { n: 2, date: '3/14/2025' }]);
  assert.deepStrictEqual(PT.priorList(['a [P2]', 'b [P2 3/14/2025]', 'c [P10 2/2/2022]']), [{ n: 2, date: '3/14/2025' }, { n: 10, date: '2/2/2022' }]);
  assert.deepStrictEqual(PT.priorList(['no tags here']), []);
});

test('a filter shows its own prior\'s lines, and lines with no source always', () => {
  assert.deepStrictEqual(lines.map((l) => PT.shows(l, 0)), [true, true, true, true]);
  assert.deepStrictEqual(lines.map((l) => PT.shows(l, 1)), [true, false, true, true]);
  assert.deepStrictEqual(lines.map((l) => PT.shows(l, 2)), [true, true, false, true]);
  assert.strictEqual(PT.shows('**X**: y [P12 1/1/2020]', 1), false);
});
