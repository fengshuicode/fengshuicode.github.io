import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button class="menu-button" aria-expanded="false" aria-label="打开目录"></button>
  <button class="theme-toggle"></button>
  <div class="drawer-overlay" hidden></div>
  <aside id="site-sidebar" tabindex="-1">
    <div class="unit-subnav">
      <a href="unit-01.html#s1" data-target="s1">第一节</a>
      <a href="unit-01.html#s2" data-target="s2">第二节</a>
      <a href="unit-02.html#s1" data-target="s1">别单元</a>
    </div>
  </aside>
  <main>
    <section id="s1" data-section-title="第一节"></section>
    <section id="s2" data-section-title="第二节"></section>
    <section id="s3" class="source-group" data-section-title="原书页"></section>
  </main>
  <span id="current-section-title"></span>
`;

const load = (options) => createPage({ script: '6/script.js', html, ...options });

let page;
afterEach(() => page?.cleanup());

describe('6/script.js theme', () => {
  it('renders the moon icon in light mode and the sun icon in dark mode', () => {
    page = load();
    const button = page.$('.theme-toggle');
    expect(button.textContent).toBe('☾');
    expect(button.title).toBe('深色模式');

    page.click(button);
    expect(page.root.dataset.theme).toBe('dark');
    expect(button.textContent).toBe('☀');
    expect(button.getAttribute('aria-label')).toBe('切换到浅色模式');
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('dark');

    page.click(button);
    expect(page.root.dataset.theme).toBe('light');
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('light');
  });
});

describe('6/script.js drawer', () => {
  it('only opens below the desktop breakpoint', () => {
    page = load({ innerWidth: 1200 });
    page.click(page.$('.menu-button'));
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(false);
    page.cleanup();

    page = load({ innerWidth: 900 });
    page.click(page.$('.menu-button'));
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(true);
    expect(page.body.classList.contains('drawer-open')).toBe(true);
    expect(page.$('.drawer-overlay').hidden).toBe(false);
    expect(page.$('.menu-button').getAttribute('aria-label')).toBe('关闭目录');
  });

  it('closes from the menu button, the overlay, a link, Escape and a desktop resize', () => {
    page = load({ innerWidth: 900 });
    const open = () => page.click(page.$('.menu-button'));
    const isOpen = () => page.$('#site-sidebar').classList.contains('is-open');

    open();
    page.click(page.$('.menu-button'));
    expect(isOpen()).toBe(false);
    expect(page.$('.menu-button').getAttribute('aria-label')).toBe('打开目录');

    open();
    page.click(page.$('.drawer-overlay'));
    expect(isOpen()).toBe(false);

    open();
    page.click(page.$('[data-target="s2"]'));
    expect(isOpen()).toBe(false);

    open();
    page.press('Escape', { target: page.window });
    expect(isOpen()).toBe(false);

    open();
    page.resizeTo(1200);
    expect(isOpen()).toBe(false);
  });

  it('restores focus to the opener when closing', () => {
    page = load({ innerWidth: 900 });
    page.$('.menu-button').focus();
    page.click(page.$('.menu-button'));
    page.click(page.$('.drawer-overlay'));
    expect(page.document.activeElement).toBe(page.$('.menu-button'));
  });
});

describe('6/script.js section tracking', () => {
  it('activates the first tracked section, ignoring scanned-page groups', () => {
    page = load();
    expect(page.$('#current-section-title').textContent).toBe('第一节');
    expect(page.observers[0].targets.map((target) => target.id)).toEqual(['s1', 's2']);
  });

  it('starts from the hash target', () => {
    page = load({ url: 'https://example.test/unit-01.html#s2' });
    expect(page.$('#current-section-title').textContent).toBe('第二节');
    expect(page.$('.unit-subnav a[href="unit-01.html#s2"]').getAttribute('aria-current')).toBe('location');
  });

  it('scrolls to same-page targets instead of navigating', () => {
    page = load();
    page.click(page.$('a[href="unit-01.html#s2"]'));
    expect(page.scrollCalls.at(-1)).toMatchObject({ target: page.$('#s2'), options: { behavior: 'smooth' } });
    expect(page.window.location.hash).toBe('#s2');
    expect(page.$('#current-section-title').textContent).toBe('第二节');
  });

  it('lets links to other pages navigate normally', () => {
    page = load();
    page.click(page.$('a[href="unit-02.html#s1"]'));
    expect(page.scrollCalls).toHaveLength(0);
    expect(page.window.location.hash).toBe('');
  });

  it('honours reduced motion when scrolling', () => {
    page = load({ reducedMotion: true });
    page.click(page.$('a[href="unit-01.html#s2"]'));
    expect(page.scrollCalls.at(-1).options.behavior).toBe('auto');
  });

  it('follows the visible section nearest the header and keeps the hash in sync', () => {
    page = load();
    page.setRect(page.$('#s1'), { top: -320 });
    page.setRect(page.$('#s2'), { top: 118 });
    page.observers[0].trigger([{ target: page.$('#s1') }, { target: page.$('#s2') }]);
    expect(page.$('#current-section-title').textContent).toBe('第二节');
    expect(page.window.location.hash).toBe('#s2');
    expect(page.$('a[href="unit-01.html#s2"]').classList.contains('is-active')).toBe(true);
    expect(page.$('a[href="unit-02.html#s1"]').classList.contains('is-active')).toBe(false);
  });
});
