import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('file://' + new URL('./out/page.html', import.meta.url).pathname);
await page.waitForFunction(() => window.roomba);
console.log(await page.evaluate(() => {
  roomba.pause(); roomba.reset({ seed: 4 }); roomba.tick({ seconds: 2400 });
  const out = []; const modes = {};
  for (let i = 0; i < 1200; i++) { const s = roomba.tick({ seconds: 1 }); modes[s.mode] = (modes[s.mode] || 0) + 1; if (i % 60 === 0) out.push(`${(s.time/60).toFixed(0)}m ${s.x},${s.z} ${s.mode} ${s.reason} b${s.bumps}`); }
  return out.join('\n') + '\n' + JSON.stringify(modes);
}));
await browser.close();
