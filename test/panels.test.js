const test = require('node:test');
const assert = require('node:assert');
const { clean, ACTION } = require('../src/main/panels');

test('the helper\'s windows take only what they show, trimmed', () => {
  const tb = clean('toolbar', { visible: 1, priors: [{ peek: 'x'.repeat(500) }, null], chart: 'nope', extra: 1 });
  assert.deepStrictEqual(Object.keys(tb), ['visible', 'priors', 'chart']);
  assert.strictEqual(tb.priors[0].peek.length, 140);
  assert.deepStrictEqual(tb.chart, []);
  const c = clean('card', { title: 'Impression', text: 'a', copy: 'b', checks: 1, buttons: [{ id: 'imp:insert', label: 'Insert', primary: 1 }, { id: '', label: 'no id' }, { label: 'no id either' }] });
  assert.strictEqual(c.checks, true);
  assert.strictEqual(c.copy, 'b');
  assert.deepStrictEqual(c.buttons.map((b) => b.id), ['imp:insert']);
  const t = clean('toast', { text: 'hi', kind: 'weird', ms: 999999 });
  assert.deepStrictEqual(t, { text: 'hi', kind: 'info', ms: 60000 });
});

test('a panel button can only ask the helper for its own kinds of action', () => {
  for (const ok of ['prior:add', 'prior:remove:2', 'chart:clear', 'chart:keep', 'impression', 'oneliner', 'toolbar:hide', 'imp:insert', 'priorlist:insert', 'pick:oncologic', 'pick:cancel'])
    assert.ok(ACTION.test(ok), ok);
  for (const bad of ['keys:^c', 'lib:LoginUandP', 'run:start|c:\\x.exe|', 'reload', 'prior:add|x', 'Prior:add', 'oe:clip'])
    assert.ok(!ACTION.test(bad), bad);
});

// A stand-in for Electron, enough to drive the password box.
function fakePanels() {
  const handlers = {}, logged = [];
  class Win {
    constructor() { this.ev = {}; this.visible = false; this.webContents = { isLoading: () => false, send() {}, once() {} }; }
    on(n, f) { (this.ev[n] = this.ev[n] || []).push(f); }
    isDestroyed() { return false; }
    loadFile() {} setIgnoreMouseEvents() {} setAlwaysOnTop() {} moveTop() {} focus() {} showInactive() { this.visible = true; }
    show() { this.visible = true; }
    hide() { this.visible = false; (this.ev.hide || []).forEach((f) => f()); }
    isVisible() { return this.visible; }
    getBounds() { return { x: 0, y: 0, width: 380, height: 120 }; }
  }
  const made = [];
  const area = { x: 0, y: 0, width: 1600, height: 900 };
  const p = require('../src/main/panels').createPanels({
    BrowserWindow: function (o) { const w = new Win(o); made.push(w); return w; },
    screen: { getCursorScreenPoint: () => ({ x: 10, y: 10 }), getDisplayNearestPoint: () => ({ workArea: area }), getAllDisplays: () => [{ workArea: area }] },
    ipcMain: { handle: (n, f) => { handlers[n] = f; } },
    clipboard: { writeText() {} }, userDir: () => require('os').tmpdir(), theme: () => 'graphite',
    enqueue: (id) => logged.push('queue ' + id), log: (...a) => logged.push(a.join(' ')),
  });
  return { p, handlers, logged, made };
}

test('the password box hands the password to the helper once, and logs or queues nothing of it', async () => {
  const { p, handlers, logged, made } = fakePanels();
  assert.strictEqual(p.takeSecret(), 'none');
  assert.strictEqual(p.handle({ t: 'secret', title: 'Password' }), 'ok');
  assert.strictEqual(p.takeSecret(), 'wait');
  const ev = { sender: made[0].webContents };
  assert.strictEqual(await handlers['rgpn:secret'](ev, 'p@ss word '), true);
  assert.strictEqual(made[0].visible, false);
  assert.strictEqual(p.takeSecret(), 'ok\np@ss word ');
  assert.strictEqual(p.takeSecret(), 'none'); // once only
  assert.ok(!logged.join('\n').includes('p@ss'), logged.join('\n'));
  // A second answer without a new question is refused.
  assert.strictEqual(await handlers['rgpn:secret'](ev, 'again'), false);
  assert.strictEqual(p.takeSecret(), 'none');
});

test('closing the password box is a cancel, and only the box itself can answer', async () => {
  const { p, handlers, made } = fakePanels();
  p.handle({ t: 'toast', text: 'hi', ms: 0 });
  p.handle({ t: 'secret' });
  const box = made.find((w) => w.ev.hide);
  const other = made.find((w) => w !== box);
  assert.strictEqual(await handlers['rgpn:secret']({ sender: other.webContents }, 'sneaky'), false);
  box.hide();
  assert.strictEqual(p.takeSecret(), 'cancel');
  assert.strictEqual(p.takeSecret(), 'none');
  p.handle({ t: 'secret' });
  assert.strictEqual(await handlers['rgpn:secret']({ sender: box.webContents }, ''), true);
  assert.strictEqual(p.takeSecret(), 'cancel');
});
