// Steps the sim one tick at a time and measures how often the heading reverses and how hard speed/turn rate change.
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync } from 'node:fs';
const src = process.argv[2], out = new URL('./out/jitter.html', import.meta.url).pathname;
writeFileSync(out, '<!doctype html><html><head><meta charset=utf8></head><body style="margin:0">' + readFileSync(src, 'utf8') + '</body></html>');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('file://' + out);
await page.waitForFunction(() => window.roomba);
const r = await page.evaluate(() => {
  const R = window.roomba, rows = [];
  for (const seed of [1, 2, 3]) {
    R.pause(); R.reset({ seed });
    let worstW = '', worstV = '', p = R.state(), pdh = 0, pv = 0, rev = 0, maxDw = 0, maxDv = 0, n = 0;
    const byMode = {};
    for (let i = 0; i < 36000; i++) {            // 10 sim minutes
      const s = R.tick({ seconds: 1 / 60 });
      let dh = s.heading - p.heading; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
      const v = Math.hypot(s.x - p.x, s.z - p.z) * 60;
      // A reversal = heading rate flips sign on back-to-back steps (a zigzag), not a new turn after a straight.
      if (Math.abs(dh) > 0.01 && Math.abs(pdh) > 0.01 && Math.sign(dh) !== Math.sign(pdh)) { rev++; byMode[s.mode] = (byMode[s.mode] || 0) + 1; }
      const aw = Math.abs(dh - pdh) * 60 * Math.PI / 180 * 60;
      if (aw > maxDw) { maxDw = aw; worstW = p.mode + '>' + s.mode; }
      const av = Math.abs(v - pv) * 60;
      if (s.bumps === p.bumps && av > maxDv) { maxDv = av; worstV = p.mode + '>' + s.mode; }
      pdh = dh; pv = v; p = s; n++;
    }
    rows.push({ seed, reversalsPerMin: +(rev / 10).toFixed(1), byMode, maxAngAccel: +maxDw.toFixed(1), maxLinAccel: +maxDv.toFixed(2), worstW, worstV, coverage: p.coverage });
  }
  return rows;
});
for (const row of r) console.log(JSON.stringify(row));
await browser.close();
