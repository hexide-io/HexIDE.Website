# HexIDE.Website

The source of [hexide.io](https://hexide.io).

## What this is

Four pages of hand-written HTML and CSS, plus one small progressive-enhancement script.
**There is no build step**: no npm, no lockfile, no generator, nothing to break. `git push` is the
deploy. That is a deliberate match for the project it advertises, which is likewise careful about
what it takes a dependency on.

```
index.html      the landing page
demos.html      the demo gallery
scope.html      what HexIDE does, and what it deliberately doesn't
licence.html    MIT, attribution, trademarks, what leaves your machine
404.html
assets/
  site.css      the whole design system
  site.js       tab strips and the properties panel — the pages read fine without it
  shots/        screenshots, captured from the running IDE
CNAME           hexide.io
```

## Working on it

Open `index.html` in a browser. That is the whole toolchain.

Contributions go through a fork and a pull request, the same as the main repository.

## Checking it

There is optional tooling in `tools/`. **It is not a build step** — the site deploys without it ever
being run, and nothing in it produces anything the site serves. It only looks at what is already
there.

```sh
npm install          # once; pulls Playwright
npm run check        # the invariants — exits non-zero if any fail
npm run shoot -- index.html --dark --full
```

`npm run check` verifies the things that have actually gone wrong here, each added after it went
wrong once:

- every page has exactly one `<h1>` and skips no heading level
- every internal link and every fragment resolves, **including across pages** — renaming one `id`
  once broke seven references from four other pages, silently
- nothing overflows horizontally, at 375 / 768 / 1440, in light and dark
- every fragment jump lands clear of the sticky masthead rather than underneath it

`npm run shoot` renders a page as a browser actually draws it. This exists because the site was
designed for a long time without anyone looking at it, and the things that turned out to be wrong —
a full-bleed frame that read as a detached band, a warning banner wrapping to four lines — were
invisible in the CSS and obvious in a picture.

## Conventions worth knowing before you change something

**Colours are sampled, not invented.** Every value in `site.css` comes from the product's own theme
files — `Themes/Classic.axaml`, `Themes/Packs/Dark.json`, and the logo SVG. If you need a new colour,
take it from there rather than picking one.

**The primary action is the title-bar navy, not the brand orange.** White on `#f07820` is 2.83:1 and
fails WCAG AA outright. Navy carries white at 16:1, and it is the colour VB6 used for the thing you
clicked.

**Type is the viewer's own system UI font, on purpose.** VB6 always rendered in the host OS's UI
font, and it means the site bundles no fonts at all. Only weights 400/600/700 are used — intermediate
weights snap silently on the static fallbacks, so anything else is a bug you will not see locally.

**Both themes, always.** Light and dark are driven by `prefers-color-scheme`. Check both.

**Every claim on these pages is checkable.** The numbers, the capability lists and the limits are all
verified against the source before they go up, and several have been wrong and corrected. If you
change a factual statement, verify it rather than paraphrasing what the page said before.

## Licence

MIT, same as HexIDE itself.

“Visual Basic”, “VB”, and “VBA” are trademarks of Microsoft Corporation. HexIDE is an independent,
community-built project — not affiliated with, endorsed by, or sponsored by Microsoft.
