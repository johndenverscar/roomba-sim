import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('file://' + new URL('./out/page.html', import.meta.url).pathname);
await page.waitForFunction(() => window.roomba);
console.log(await page.evaluate(() => {
  roomba.pause();
  return [1, 2, 3, 4, 5].map(seed => { roomba.reset({ seed }); const c = []; for (const m of [20, 40, 60, 90]) { roomba.tick({ seconds: (m - (c.length ? [20, 40, 60, 90][c.length - 1] : 0)) * 60 }); c.push(roomba.state().coverage); } return c.join(' '); }).join('\n');
}));
await browser.close();
