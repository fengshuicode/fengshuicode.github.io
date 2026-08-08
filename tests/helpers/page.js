import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Loads one of the reader bundles into a throwaway jsdom page.
 *
 * The bundles are self-executing scripts that read the DOM at load time, so
 * every test gets its own window: the script is injected after `html` is in
 * place, exactly like the `<script src="script.js">` tag at the end of each
 * page.
 */
export function createPage({
  script,
  html = '',
  bodyAttributes = {},
  url = 'https://example.test/unit-01.html',
  prefersDark = false,
  reducedMotion = false,
  innerWidth = 1280,
  storage = {},
} = {}) {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
    url,
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });
  const { window } = dom;
  const { document } = window;
  for (const [name, value] of Object.entries(bodyAttributes)) document.body.setAttribute(name, value);

  Object.defineProperty(window, 'innerWidth', { value: innerWidth, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });

  const mediaLists = [];
  window.matchMedia = (query) => {
    const listeners = new Set();
    const list = {
      media: query,
      get matches() {
        return evaluateQuery(query, { prefersDark, reducedMotion, width: window.innerWidth });
      },
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
      addListener: (listener) => listeners.add(listener),
      removeListener: (listener) => listeners.delete(listener),
      dispatchChange(matches = list.matches) {
        listeners.forEach((listener) => listener.call(list, { matches, media: query }));
      },
      onchange: null,
    };
    mediaLists.push(list);
    return list;
  };

  const observers = [];
  window.IntersectionObserver = class IntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.targets = [];
      observers.push(this);
    }

    observe(target) {
      this.targets.push(target);
    }

    unobserve(target) {
      this.targets = this.targets.filter((item) => item !== target);
    }

    disconnect() {
      this.targets = [];
    }

    /** Feeds entries to the observed callback the way a real scroll would. */
    trigger(entries) {
      this.callback(
        entries.map((entry) => ({
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: entry.target.getBoundingClientRect(),
          ...entry,
        })),
        this,
      );
    }
  };

  // jsdom has no layout: elements report no offset parent and a zero-sized box,
  // which the bundles use to skip hidden nodes and to rank visible sections.
  Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.closest('[hidden]') || !this.isConnected ? null : this.parentElement;
    },
  });
  const scrollCalls = [];
  window.Element.prototype.scrollIntoView = function scrollIntoView(options) {
    scrollCalls.push({ target: this, options });
  };

  for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);

  const scriptPath = path.join(repoRoot, script);
  const code = readFileSync(scriptPath, 'utf8');
  const element = document.createElement('script');
  element.textContent = `${code}\n//# sourceURL=${pathToFileURL(scriptPath).href}`;
  document.body.appendChild(element);

  return {
    dom,
    window,
    document,
    observers,
    mediaLists,
    scrollCalls,
    root: document.documentElement,
    body: document.body,
    $: (selector) => document.querySelector(selector),
    $$: (selector) => [...document.querySelectorAll(selector)],
    press: (key, init = {}) => {
      const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
      (init.target || document).dispatchEvent(event);
      return event;
    },
    click: (target) => target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })),
    setRect: (element, rect) => {
      element.getBoundingClientRect = () => ({
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        ...rect,
      });
    },
    resizeTo: (width) => {
      window.innerWidth = width;
      window.dispatchEvent(new window.Event('resize'));
    },
    cleanup: () => window.close(),
  };
}

function evaluateQuery(query, { prefersDark, reducedMotion, width }) {
  if (query.includes('prefers-color-scheme: dark')) return prefersDark;
  if (query.includes('prefers-reduced-motion: reduce')) return reducedMotion;
  const max = query.match(/max-width:\s*(\d+)px/);
  if (max) return width <= Number(max[1]);
  const min = query.match(/min-width:\s*(\d+)px/);
  if (min) return width >= Number(min[1]);
  return false;
}
