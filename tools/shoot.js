/*
 * Screenshots a page of hexide.io as a browser actually renders it.
 *
 * This exists because the site was designed for a long time without anyone looking at it, and the
 * things that turned out to be wrong — a full-bleed frame that read as a detached band, a warning
 * banner wrapping to four lines — were invisible in the CSS and obvious in a picture.
 *
 *   npm run shoot -- index.html                       1440px, light, viewport
 *   npm run shoot -- scope.html --width 375           narrow
 *   npm run shoot -- index.html --dark                dark theme
 *   npm run shoot -- index.html --full                whole page, not just the fold
 *   npm run shoot -- scope.html --el "#saving"        one element
 *   npm run shoot -- index.html --out hero.png
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);

const flag = (name) => argv.includes('--' + name);
const value = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const page$ = argv.find(a => a.endsWith('.html')) || 'index.html';
const width = parseInt(value('width', '1440'), 10);
const scheme = flag('dark') ? 'dark' : 'light';
const selector = value('el', null);
const full = flag('full');

const outDir = path.join(ROOT, 'tools', 'shots');
const defaultName = `${path.basename(page$, '.html')}-${width}-${scheme}${selector ? '-el' : ''}${full ? '-full' : ''}.png`;
const out = path.resolve(value('out', path.join(outDir, defaultName)));

(async () => {
  if (!fs.existsSync(path.join(ROOT, page$))) {
    console.error(`No such page: ${page$}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: scheme,
    deviceScaleFactor: 2,     // legible when read back at any size
  });
  const page = await ctx.newPage();
  await page.goto('file:///' + path.join(ROOT, page$).split(path.sep).join('/'));
  await page.waitForLoadState('networkidle');

  if (selector) {
    const el = page.locator(selector);
    if (!(await el.count())) {
      console.error(`No element matches ${selector}`);
      await browser.close();
      process.exit(1);
    }
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: full });
  }

  await browser.close();
  console.log(`${page$} — ${width}px ${scheme}${selector ? ' ' + selector : ''} -> ${path.relative(ROOT, out)}`);
})();
