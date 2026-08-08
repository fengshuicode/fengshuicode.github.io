import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button id="menu-button" aria-expanded="false" aria-label="打开目录"></button>
  <button id="theme-toggle"><span class="theme-icon"></span></button>
  <div id="drawer-overlay" hidden></div>
  <aside id="site-sidebar" tabindex="-1">
    <button class="unit-toggle" aria-controls="unit-1-list" aria-expanded="false"></button>
    <div class="sidebar-subnav">
      <ul id="unit-1-list" hidden>
        <li><a href="unit-01.html#s1" data-section-link="s1">第一节</a></li>
        <li><a href="unit-01.html#s2" data-section-link="s2">第二节</a></li>
      </ul>
    </div>
  </aside>
  <main>
    <section id="s1" class="track-section" data-section-title="第一节"><h2>一</h2></section>
    <section id="s2" class="track-section"><h2>第二节标题</h2></section>
  </main>
  <span id="current-section-title"></span>
`;

const load = (options) => createPage({ script: '5/script.js', html, ...options });

let page;
afterEach(() => page?.cleanup());

describe('5/script.js theme', () => {
  it('does not persist the theme derived from the server-rendered attribute', () => {
    page = load();
    expect(page.root.dataset.theme).toBe('light');
    expect(page.$('.theme-icon').textContent).toBe('◐');
    expect(page.window.localStorage.getItem('textbook-theme')).toBeNull();
  });

  it('persists the theme once the user toggles it', () => {
    page = load();
    page.click(page.$('#theme-toggle'));
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.$('.theme-icon').textContent).toBe('☀');
    expect(page.$('#theme-toggle').getAttribute('aria-label')).toBe('切换到浅色模式');
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('dark');
  });
});

describe('5/script.js reduced motion', () => {
  it('flags reduced motion on the document element', () => {
    page = load({ reducedMotion: true });
    expect(page.root.dataset.reducedMotion).toBe('true');
    page.cleanup();

    page = load();
    expect(page.root.dataset.reducedMotion).toBeUndefined();
  });
});

describe('5/script.js drawer', () => {
  it('opens and closes from the menu button, tracking aria-expanded', () => {
    page = load();
    page.click(page.$('#menu-button'));
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(true);
    expect(page.$('#drawer-overlay').hidden).toBe(false);
    expect(page.body.classList.contains('drawer-open')).toBe(true);
    expect(page.$('#menu-button').getAttribute('aria-label')).toBe('关闭目录');
    expect(page.document.activeElement).toBe(page.$('.unit-toggle'));

    page.click(page.$('#menu-button'));
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(false);
    expect(page.$('#drawer-overlay').hidden).toBe(true);
    expect(page.$('#menu-button').getAttribute('aria-label')).toBe('打开目录');
  });

  it('closes on overlay click and on Escape, restoring the previous focus', () => {
    page = load();
    page.click(page.$('#menu-button'));
    page.click(page.$('#drawer-overlay'));
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(false);

    page.$('#theme-toggle').focus();
    page.click(page.$('#menu-button'));
    page.press('Escape');
    expect(page.body.classList.contains('drawer-open')).toBe(false);
    expect(page.document.activeElement).toBe(page.$('#theme-toggle'));
  });

  it('keeps focus on the tapped link when closing on narrow screens', () => {
    page = load({ innerWidth: 700 });
    page.$('#unit-1-list').hidden = false;
    page.$('#menu-button').focus();
    page.click(page.$('#menu-button'));
    const link = page.$('[data-section-link="s2"]');
    link.focus();
    page.click(link);
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(false);
    expect(page.document.activeElement).toBe(link);
  });

  it('wraps Tab focus around the visible sidebar controls', () => {
    page = load();
    page.click(page.$('#menu-button'));
    page.$('#unit-1-list').hidden = false;
    const items = page.$$('#site-sidebar button, #site-sidebar a');

    items.at(-1).focus();
    expect(page.press('Tab').defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(items[0]);
    expect(page.press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(items.at(-1));
  });
});

describe('5/script.js unit menus', () => {
  it('reveals the lesson list on toggle', () => {
    page = load();
    const toggle = page.$('.unit-toggle');
    page.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(page.$('#unit-1-list').hidden).toBe(false);
    page.click(toggle);
    expect(page.$('#unit-1-list').hidden).toBe(true);
  });
});

describe('5/script.js section tracking', () => {
  it('titles the first section on load', () => {
    page = load();
    expect(page.$('#current-section-title').textContent).toBe('第一节');
    expect(page.$('[data-section-link="s1"]').classList.contains('active')).toBe(true);
  });

  it('decodes the hash before resolving the initial section', () => {
    page = load({ url: `https://example.test/unit-01.html#${encodeURIComponent('s2')}` });
    expect(page.$('#current-section-title').textContent).toBe('第二节标题');
    expect(page.$('[data-section-link="s2"]').getAttribute('aria-current')).toBe('location');
  });

  it('activates the section a sidebar link points at and rewrites the hash', () => {
    page = load();
    page.click(page.$('[data-section-link="s2"]'));
    expect(page.$('[data-section-link="s2"]').classList.contains('active')).toBe(true);
    expect(page.$('[data-section-link="s1"]').classList.contains('active')).toBe(false);
    expect(page.window.location.hash).toBe('#s2');
  });

  it('picks the visible section closest to the sticky header', () => {
    page = load();
    page.setRect(page.$('#s1'), { top: -260 });
    page.setRect(page.$('#s2'), { top: 96 });
    page.observers[0].trigger([{ target: page.$('#s1') }, { target: page.$('#s2') }]);
    expect(page.$('#current-section-title').textContent).toBe('第二节标题');
    expect(page.window.location.hash).toBe('#s2');
  });

  it('keeps the last active section when everything scrolls out of view', () => {
    page = load();
    page.setRect(page.$('#s2'), { top: 96 });
    page.observers[0].trigger([{ target: page.$('#s2') }]);
    page.observers[0].trigger([{ target: page.$('#s2'), isIntersecting: false }]);
    expect(page.$('#current-section-title').textContent).toBe('第二节标题');
  });
});
