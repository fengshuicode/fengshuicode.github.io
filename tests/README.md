# Tests

The repository ships static reader pages; the only executable code is the
per-textbook `script.js` bundle in each folder plus the markdown converter in
`old/raw_to_content.py`. Before this suite existed, none of it was covered.

## Running

```bash
npm ci
npm test            # vitest run
npm run coverage    # same, with a v8 coverage report

pip install -r requirements-dev.txt
pytest tests
```

## How the JavaScript bundles are tested

Each bundle is a self-executing script that reads the DOM once at load time, so
there is nothing to import. `tests/helpers/page.js` builds a throwaway jsdom
window per test, inserts a fixture that mirrors the markup of the real pages,
then appends the bundle as an inline `<script>` — the same order as the
`<script src="script.js">` tag at the end of every page.

Because jsdom has no layout engine and no `IntersectionObserver`, the helper
supplies the pieces the bundles depend on:

- `matchMedia` answers `prefers-color-scheme`, `prefers-reduced-motion` and
  `max-width`/`min-width` queries from the options passed to `createPage`.
- `IntersectionObserver` records its targets and exposes `trigger(entries)` so a
  test can replay a scroll.
- `offsetParent` reports a parent for connected, non-hidden elements, which is
  how the bundles skip collapsed sidebar entries when trapping focus.
- `setRect(el, {top})` fakes `getBoundingClientRect`, used by the bundles that
  rank visible sections by distance to the sticky header.
- `scrollIntoView` is recorded in `page.scrollCalls`.

## Coverage

`npm run coverage` covers every bundle at 100% of lines and functions; the
remaining branch gaps are defensive `?.`/`||` fallbacks for elements that only
exist on some pages.
