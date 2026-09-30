// Headless check: wraps the page in the publish skeleton, drives window.roomba, screenshots.
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('..', import.meta.url).pathname;
const out = process.argv[2] || root + 'test/out';
mkdirSync(out, { recursive: true });
writeFileSync(out + '/page.html', '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui;background:#fafaf8}img{max-width:100%}[hidden]{display:none!important}</style>' + readFileSync(root + 'index.html', 'utf8') + '</body></html>');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const assert = (c, m) => { if (!c) { errors.push('ASSERT: ' + m); } };
for (const [name, vp, dark] of [['desktop', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, true]]) {
  const page = await browser.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(`${name} console: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`${name} pageerror: ${e.message}`));
  await page.setViewport(vp);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }]);
  await page.goto('file://' + out + '/page.html');
  await page.waitForFunction(() => window.roomba, { timeout: 15000 });
  const r = await page.evaluate(() => {
    const R = window.roomba; R.pause(); R.reset({ seed: 42 });
    const bad = []; let prev = R.state(), stuckFor = 0, maxStuck = 0;
    for (let i = 0; i < 1200; i++) {           // 20 sim minutes, checked every second
      const s = R.tick({ seconds: 1 });
      if (R._collides(s.x, s.z, 0.169)) bad.push([s.time, s.x, s.z]);
      const moved = Math.hypot(s.x - prev.x, s.z - prev.z);
      stuckFor = moved < 0.05 ? stuckFor + 1 : 0; maxStuck = Math.max(maxStuck, stuckFor); prev = s;
    }
    const s = R.state();
    let threw = false; try { R.exec('nope'); } catch { threw = true; }
    let tpThrew = false; try { R.teleport({ x: 0.01, z: 0.01 }); } catch { tpThrew = true; }
    R.teleport({ x: 2.5, z: 3.0, heading: -90 }); R.drive({ v: 0.3, w: 0, seconds: 2 }); R.tick({ seconds: 3 });
    const d = R.state();
    const covs = [1, 2, 3, 4, 5].map(seed => { R.reset({ seed }); R.tick({ seconds: 1200 }); return R.state().coverage; });
    R.reset({ seed: 42 }); R.tick({ seconds: 1200 });
    return { covs, s, bad: bad.slice(0, 5), nbad: bad.length, maxStuck, threw, tpThrew, d, map: R.map({ cell: 0.25 }).rows };
  });
  console.log(name, 'coverage@20min by seed', r.covs.join(' '));
  assert(r.covs.reduce((a, b) => a + b) / r.covs.length > 0.5, `${name}: mean coverage low`);
  console.log(name, JSON.stringify({ cov: r.s.coverage, bumps: r.s.bumps, spotsFound: r.s.dirtSpots.filter(d => d.found).length, nbad: r.nbad, bad: r.bad, maxStuck: r.maxStuck, drive: [r.d.x, r.d.z, r.d.mode] }));
  if (name === 'desktop') console.log(r.map.join('\n'));
  assert(r.nbad === 0, `${name}: robot inside obstacle ${r.nbad}x`);
  assert(r.s.coverage > 0.45, `${name}: coverage ${r.s.coverage} after 20 min`);
  assert(r.maxStuck < 60, `${name}: stuck ${r.maxStuck}s`);
  assert(r.threw && r.tpThrew, `${name}: bad commands should throw`);
  assert(Math.abs(r.d.z - 2.4) < 0.05 && ['manual','paused'].includes(r.d.mode), `${name}: drive moved to z=${r.d.z}`);
  // live views
  await page.evaluate(() => { roomba.reset({ seed: 7 }); roomba.resume(); roomba.speed({ x: 1 }); });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: `${out}/${name}-pov-start.png` });
  await page.evaluate(() => { roomba.pause(); roomba.teleport({ x: 1.8, z: 5.6, heading: 90 }); });   // looking under the bed
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: `${out}/${name}-pov-bed.png` });
  await page.evaluate(() => { roomba.teleport({ x: 7.3, z: 3.75, heading: -90 }); });                 // kitchen chairs
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: `${out}/${name}-pov-chairs.png` });
  await page.evaluate(() => { roomba.reset({ seed: 42 }); roomba.pause(); roomba.tick({ seconds: 600 }); roomba.view({ mode: 'map' }); });
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: `${out}/${name}-map.png` });
  const ov = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert(!ov, `${name}: horizontal overflow`);
  await page.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'ALL OK');
process.exit(errors.length ? 1 : 0);
