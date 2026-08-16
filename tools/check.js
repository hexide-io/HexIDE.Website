/*
 * Structural and layout checks for hexide.io.
 *
 * These are the invariants that have actually been broken during this site's development, each one
 * added after it went wrong once:
 *
 *   - a page shipped with no <h1>, or skipped a heading level
 *   - a link pointed at a file that did not exist, or a fragment that did not
 *   - the layout overflowed horizontally at a narrow width
 *   - a fragment jump landed underneath the sticky masthead
 *
 * Run with `npm run check`. Exits non-zero on any failure, so it can gate a pull request.
 * Nothing here is required to *build* the site — there is no build. This only verifies it.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WIDTHS = [375, 768, 1440];
const SCHEMES = ['light', 'dark'];

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

let failures = 0;
const fail = (msg) => { console.log('  FAIL  ' + msg); failures++; };
const pass = (msg) => console.log('  ok    ' + msg);

/* ---- static checks, no browser needed ---------------------------------------------------- */

function checkStatic() {
  console.log('\nStructure');

  // Every fragment target that any page links to, so cross-page anchors are covered.
  const idsByPage = {};
  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
    idsByPage[p] = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  }

  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, p), 'utf8');

    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map(m => +m[1]);
    const h1s = levels.filter(l => l === 1).length;
    if (h1s !== 1) fail(`${p}: expected exactly one <h1>, found ${h1s}`);

    for (let i = 1; i < levels.length; i++) {
      if (levels[i] - levels[i - 1] > 1) {
        fail(`${p}: heading level skips h${levels[i - 1]} to h${levels[i]}`);
        break;
      }
    }

    for (const m of html.matchAll(/(?:href|src|srcset)="([^"]+)"/g)) {
      const raw = m[1];
      if (/^(https?:|mailto:|data:)/.test(raw)) continue;

      const [target, frag] = raw.replace(/^\//, '').split('#');

      if (target && !fs.existsSync(path.join(ROOT, target))) {
        fail(`${p}: link target does not exist — ${raw}`);
        continue;
      }
      if (frag) {
        const owner = target || p;
        const ids = idsByPage[owner];
        if (!ids) fail(`${p}: fragment points at an unknown page — ${raw}`);
        else if (!ids.has(frag)) fail(`${p}: fragment #${frag} does not exist in ${owner}`);
      }
    }
  }
  if (!failures) pass(`${pages.length} pages: one h1 each, no level skips, every link and fragment resolves`);
}

/* ---- rendered checks ---------------------------------------------------------------------- */

async function checkRendered(browser) {
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      console.log(`\nRendered — ${width}px, ${scheme}`);
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
      const page = await ctx.newPage();

      for (const p of pages) {
        await page.goto('file:///' + path.join(ROOT, p).split(path.sep).join('/'));
        await page.waitForLoadState('networkidle');

        const overflow = await page.evaluate(() => {
          const de = document.documentElement;
          if (de.scrollWidth <= de.clientWidth) return null;
          const culprits = [...document.querySelectorAll('body *')]
            .filter(el => {
              const r = el.getBoundingClientRect();
              // Ignore deliberately off-screen content (skip link, visually-hidden text).
              if (getComputedStyle(el).position === 'absolute' && r.width <= 1) return false;
              return r.right > de.clientWidth + 1 || r.left < -1;
            })
            .slice(0, 3)
            .map(el => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
          return { by: de.scrollWidth - de.clientWidth, culprits };
        });

        if (overflow) fail(`${p}: overflows horizontally by ${overflow.by}px — ${overflow.culprits.join(', ')}`);
      }

      await ctx.close();
      if (!failures) pass(`${pages.length} pages: no horizontal overflow`);
    }
  }
}

/* A fragment jump must land somewhere readable, not under the sticky masthead. */
async function checkAnchors(browser) {
  console.log('\nFragment jumps clear the sticky masthead');
  const targets = new Set();
  for (const p of pages) {
    const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
    for (const m of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
      const [t, frag] = m[1].replace(/^\//, '').split('#');
      if (frag === 'main') continue;              // the skip link, which moves focus rather than scrolling
      targets.add(`${t || p}#${frag}`);
    }
  }

  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();

    for (const t of targets) {
      const [file, frag] = t.split('#');
      await page.goto('file:///' + path.join(ROOT, file).split(path.sep).join('/') + '#' + frag);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(150);

      const r = await page.evaluate((f) => {
        const target = document.getElementById(f);
        if (!target) return null;
        const bar = document.querySelector('.masthead');
        const first = target.querySelector('.eyebrow, h1, h2, h3') || target;
        return {
          clearance: Math.round(first.getBoundingClientRect().top - bar.getBoundingClientRect().bottom),
        };
      }, frag);

      if (!r) fail(`${t}: no such element`);
      else if (r.clearance < 0) fail(`${t} at ${width}px: lands ${-r.clearance}px under the masthead`);
    }
    await ctx.close();
  }
  if (!failures) pass(`${targets.size} fragment target(s) clear the header at ${WIDTHS.join('/')}px`);
}

(async () => {
  checkStatic();
  const browser = await chromium.launch();
  try {
    await checkRendered(browser);
    await checkAnchors(browser);
  } finally {
    await browser.close();
  }

  console.log(failures ? `\n${failures} failure(s).\n` : '\nAll checks passed.\n');
  process.exit(failures ? 1 : 0);
})();
