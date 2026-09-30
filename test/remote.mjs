// Exercises the remote-command path against an in-memory stand-in for the artifact db.
import puppeteer from 'puppeteer-core';
const out = new URL('./out/page.html', import.meta.url).pathname;
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.evaluateOnNewDocument(() => {
  const docs = new Map(), subs = [];
  const snap = id => ({ id, exists: docs.has(id), data: () => docs.get(id), metadata: {} });
  const notify = (type, id) => subs.forEach(fn => fn({ docChanges: () => [{ type, doc: snap(id) }] }));
  const ref = id => ({ id, get: async () => snap(id), update: async d => { docs.set(id, { ...docs.get(id), ...d }); notify('modified', id); }, acquire: async () => ({ acquired: true }) });
  const col = { doc: ref, orderBy: () => col, onSnapshot(fn) { subs.push(fn); fn({ docChanges: () => [...docs.keys()].map(id => ({ type: 'added', doc: snap(id) })) }); return () => {}; } };
  docs.set('c1', { cmd: 'pause', ts: Date.now() });
  docs.set('c0', { cmd: 'spiral', ts: Date.now() - 3600e3 });
  window.claude = { use: async n => n === 'db' ? { collection: () => col } : null };
  window.__mock = { add(id, d) { docs.set(id, d); notify('added', id); }, get: id => docs.get(id) };
});
await page.goto('file://' + out);
await page.waitForFunction(() => window.__mock.get('c1').status, { timeout: 10000 });
await page.evaluate(() => { __mock.add('c2', { cmd: 'speed', args: { x: 16 }, ts: Date.now() }); __mock.add('c3', { cmd: 'bogus', ts: Date.now() }); __mock.add('c4', { cmd: 'map', args: { cell: 0.5 }, ts: Date.now() }); });
await page.waitForFunction(() => __mock.get('c4').status, { timeout: 10000 });
const r = await page.evaluate(() => ({ c0: __mock.get('c0').status, c1: __mock.get('c1'), c2: __mock.get('c2').result?.speed, c3: __mock.get('c3'), c4: __mock.get('c4').result.rows.length, remote: document.getElementById('remote').hidden, st: roomba.state() }));
console.log(JSON.stringify({ c0: r.c0, c1: [r.c1.status, r.c1.result.paused], c2: r.c2, c3: [r.c3.status, r.c3.error], c4rows: r.c4, remoteHidden: r.remote, paused: r.st.paused, speed: r.st.speed }));
const ok = r.c0 === 'expired' && r.c1.status === 'done' && r.c1.result.paused && r.c2 === 16 && r.c3.status === 'error' && r.c4 === 16 && !r.remote && !errs.length;
console.log(ok ? 'REMOTE OK' : 'REMOTE FAIL ' + errs.join('; '));
await browser.close(); process.exit(ok ? 0 : 1);
