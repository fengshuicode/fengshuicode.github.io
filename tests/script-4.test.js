import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button class="menu-button" aria-expanded="false" aria-label="打开教材目录"></button>
  <button class="theme-toggle"><span class="theme-icon"></span></button>
  <div data-drawer-overlay hidden></div>
  <aside id="site-sidebar">
    <button class="drawer-close"></button>
    <button class="unit-toggle" aria-controls="unit-1-list" aria-expanded="false"></button>
    <ul id="unit-1-list" hidden>
      <li><a href="unit-01.html#s1" data-section-link="s1" data-section-title="第一节">第一节</a></li>
      <li><a href="unit-01.html#s2" data-section-link="s2">第二节</a></li>
    </ul>
  </aside>
  <main>
    <section id="s1" class="content-section" data-section-title="第一节"></section>
    <section id="s2" class="content-section" data-section-title="第二节"></section>
    <section id="source-pages" class="content-section" data-section-title="原书页"></section>
  </main>
  <span id="current-section-name"></span>
`;

const load = (options) => createPage({ script: '4/script.js', html, ...options });

let page;
afterEach(() => page?.cleanup());

describe('4/script.js theme', () => {
  it('drops the data-theme attribute in light mode and sets it in dark mode', () => {
    page = load();
    expect(page.root.hasAttribute('data-theme')).toBe(false);
    expect(page.$('.theme-icon').textContent).toBe('◐');

    page.click(page.$('.theme-toggle'));
    expect(page.root.getAttribute('data-theme')).toBe('dark');
    expect(page.$('.theme-icon').textContent).toBe('☀');
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('dark');

    page.click(page.$('.theme-toggle'));
    expect(page.root.hasAttribute('data-theme')).toBe(false);
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('light');
  });

  it('prefers the stored theme over the OS setting', () => {
    page = load({ prefersDark: true, storage: { 'textbook-theme': 'light' } });
    expect(page.root.hasAttribute('data-theme')).toBe(false);
  });
});

describe('4/script.js drawer', () => {
  it('only opens below the desktop breakpoint', () => {
    page = load({ innerWidth: 1400 });
    page.click(page.$('.menu-button'));
    expect(page.body.classList.contains('drawer-open')).toBe(false);
    page.cleanup();

    page = load({ innerWidth: 900 });
    page.click(page.$('.menu-button'));
    expect(page.body.classList.contains('drawer-open')).toBe(true);
    expect(page.$('[data-drawer-overlay]').hidden).toBe(false);
    expect(page.$('.menu-button').getAttribute('aria-label')).toBe('关闭教材目录');
    expect(page.document.activeElement).toBe(page.$('.drawer-close'));
  });

  it('closes from the close button, the overlay, Escape and sidebar links', () => {
    page = load({ innerWidth: 900 });
    const open = () => page.click(page.$('.menu-button'));

    open();
    page.click(page.$('.drawer-close'));
    expect(page.body.classList.contains('drawer-open')).toBe(false);
    expect(page.$('.menu-button').getAttribute('aria-label')).toBe('打开教材目录');

    open();
    page.click(page.$('[data-drawer-overlay]'));
    expect(page.body.classList.contains('drawer-open')).toBe(false);

    open();
    page.press('Escape');
    expect(page.body.classList.contains('drawer-open')).toBe(false);

    open();
    page.click(page.$('[data-section-link="s2"]'));
    expect(page.body.classList.contains('drawer-open')).toBe(false);
  });

  it('closes when the window is resized to desktop width', () => {
    page = load({ innerWidth: 900 });
    page.click(page.$('.menu-button'));
    page.resizeTo(1400);
    expect(page.body.classList.contains('drawer-open')).toBe(false);
  });

  it('wraps Tab focus across the visible sidebar controls', () => {
    page = load({ innerWidth: 900 });
    page.click(page.$('.menu-button'));
    page.$('#unit-1-list').hidden = false;
    const items = page.$$('#site-sidebar button, #site-sidebar a');

    items.at(-1).focus();
    expect(page.press('Tab').defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(items[0]);
    expect(page.press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(items.at(-1));
  });

  it('skips hidden lesson links when trapping focus', () => {
    page = load({ innerWidth: 900 });
    page.click(page.$('.menu-button'));
    const closeButton = page.$('.drawer-close');
    const unitToggle = page.$('.unit-toggle');

    unitToggle.focus();
    page.press('Tab');
    expect(page.document.activeElement).toBe(closeButton);
  });
});

describe('4/script.js unit menus', () => {
  it('toggles the lesson list tied to aria-controls', () => {
    page = load();
    const toggle = page.$('.unit-toggle');

    page.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(page.$('#unit-1-list').hidden).toBe(false);

    page.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(page.$('#unit-1-list').hidden).toBe(true);
  });
});

describe('4/script.js section tracking', () => {
  it('activates the first content section on load', () => {
    page = load();
    expect(page.$('[data-section-link="s1"]').classList.contains('is-active')).toBe(true);
    expect(page.$('#current-section-name').textContent).toBe('第一节');
  });

  it('starts from the hash target when present', () => {
    page = load({ url: 'https://example.test/unit-01.html#s2' });
    expect(page.$('[data-section-link="s2"]').getAttribute('aria-current')).toBe('location');
    expect(page.$('#current-section-name').textContent).toBe('第二节');
  });

  it('activates the clicked lesson link without rewriting the hash', () => {
    page = load();
    page.click(page.$('[data-section-link="s2"]'));
    expect(page.$('[data-section-link="s2"]').classList.contains('is-active')).toBe(true);
    expect(page.$('[data-section-link="s1"]').classList.contains('is-active')).toBe(false);
    expect(page.window.location.hash).toBe('');
  });

  it('tracks the most visible section and syncs the hash', () => {
    page = load();
    page.observers[0].trigger([
      { target: page.$('#s1'), intersectionRatio: 0.1 },
      { target: page.$('#s2'), intersectionRatio: 0.9 },
    ]);
    expect(page.$('[data-section-link="s2"]').classList.contains('is-active')).toBe(true);
    expect(page.$('#current-section-name').textContent).toBe('第二节');
    expect(page.window.location.hash).toBe('#s2');
  });

  it('never observes the scanned-pages appendix section', () => {
    page = load();
    expect(page.observers[0].targets.map((target) => target.id)).toEqual(['s1', 's2']);
  });
});
