import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button class="menu-button" aria-expanded="false" aria-label="打开目录"></button>
  <button class="theme-toggle"><span class="theme-icon"></span></button>
  <div class="drawer-overlay" hidden></div>
  <aside id="site-sidebar" tabindex="-1">
    <a href="#s1" data-section-id="s1">第一节</a>
    <a href="#s2" data-section-id="s2">第二节</a>
  </aside>
  <main>
    <section id="s1" class="tracked-section" data-section-title="第一节"><h2>一</h2></section>
    <section id="s2" class="tracked-section"><h2>第二节标题</h2></section>
  </main>
  <span id="current-section-label"></span>
`;

const load = (options) => createPage({ script: '7/script.js', html, ...options });

let page;
afterEach(() => page?.cleanup());

describe('7/script.js theme', () => {
  it('restores a stored theme', () => {
    page = load({ storage: { 'textbook-theme': 'dark' } });
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.$('.theme-icon').textContent).toBe('☀');
    expect(page.$('.theme-toggle').title).toBe('切换浅色模式');
  });

  it('ignores unusable stored values and falls back to the OS preference', () => {
    page = load({ storage: { 'textbook-theme': 'sepia' }, prefersDark: true });
    expect(page.root.dataset.theme).toBe('dark');
    page.cleanup();

    page = load({ storage: { 'textbook-theme': 'sepia' } });
    expect(page.root.dataset.theme).toBe('light');
    expect(page.$('.theme-icon').textContent).toBe('☾');
  });

  it('persists the theme picked by the user', () => {
    page = load();
    page.click(page.$('.theme-toggle'));
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('dark');
    expect(page.root.dataset.theme).toBe('dark');
  });
});

describe('7/script.js drawer', () => {
  it('only opens below the mobile breakpoint and fades the overlay in', async () => {
    page = load({ innerWidth: 1200 });
    page.click(page.$('.menu-button'));
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(false);
    page.cleanup();

    page = load({ innerWidth: 700 });
    page.click(page.$('.menu-button'));
    expect(page.$('#site-sidebar').classList.contains('is-open')).toBe(true);
    expect(page.body.classList.contains('drawer-open')).toBe(true);
    expect(page.$('.drawer-overlay').hidden).toBe(false);
    expect(page.$('.menu-button').getAttribute('aria-label')).toBe('关闭目录');

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(page.$('.drawer-overlay').classList.contains('is-visible')).toBe(true);
    expect(page.document.activeElement).toBe(page.$('#site-sidebar'));
  });

  it('hides the overlay only after the closing transition', async () => {
    page = load({ innerWidth: 700 });
    page.click(page.$('.menu-button'));
    page.click(page.$('.drawer-overlay'));
    expect(page.$('.drawer-overlay').classList.contains('is-visible')).toBe(false);
    expect(page.$('.drawer-overlay').hidden).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(page.$('.drawer-overlay').hidden).toBe(true);
  });

  it('closes on Escape, on link taps and on a desktop resize', () => {
    page = load({ innerWidth: 700 });
    const open = () => page.click(page.$('.menu-button'));
    const isOpen = () => page.$('#site-sidebar').classList.contains('is-open');

    open();
    page.press('Escape');
    expect(isOpen()).toBe(false);

    open();
    page.click(page.$('[data-section-id="s2"]'));
    expect(isOpen()).toBe(false);

    open();
    page.resizeTo(1200);
    expect(isOpen()).toBe(false);
  });

  it('restores focus to the opener when closed with Escape', () => {
    page = load({ innerWidth: 700 });
    page.$('.menu-button').focus();
    page.click(page.$('.menu-button'));
    page.press('Escape');
    expect(page.document.activeElement).toBe(page.$('.menu-button'));
  });

  it('wraps Tab focus inside the drawer', () => {
    page = load({ innerWidth: 700 });
    page.click(page.$('.menu-button'));
    const first = page.$('[data-section-id="s1"]');
    const last = page.$('[data-section-id="s2"]');

    last.focus();
    expect(page.press('Tab').defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(first);
    expect(page.press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(last);
  });
});

describe('7/script.js section tracking', () => {
  it('labels the first tracked section on load', () => {
    page = load();
    expect(page.$('#current-section-label').textContent).toBe('第一节');
    expect(page.$('[data-section-id="s1"]').getAttribute('aria-current')).toBe('location');
  });

  it('starts from the hash target', () => {
    page = load({ url: 'https://example.test/lesson-01.html#s2' });
    expect(page.$('#current-section-label').textContent).toBe('第二节标题');
    expect(page.$('[data-section-id="s2"]').classList.contains('is-active')).toBe(true);
  });

  it('falls back to the first section when the hash is unknown', () => {
    page = load({ url: 'https://example.test/lesson-01.html#nope' });
    expect(page.$('#current-section-label').textContent).toBe('第一节');
  });

  it('activates the section with the highest visible ratio', () => {
    page = load();
    page.observers[0].trigger([
      { target: page.$('#s1'), intersectionRatio: 0.2 },
      { target: page.$('#s2'), intersectionRatio: 0.7 },
    ]);
    expect(page.$('#current-section-label').textContent).toBe('第二节标题');
    expect(page.$('[data-section-id="s1"]').classList.contains('is-active')).toBe(false);
    expect(page.window.location.hash).toBe('');
  });
});

describe('7/script.js in-page anchors', () => {
  it('scrolls to the target, rewrites the hash and updates the label', () => {
    page = load();
    page.click(page.$('a[href="#s2"]'));
    expect(page.scrollCalls.at(-1)).toMatchObject({ target: page.$('#s2'), options: { behavior: 'smooth', block: 'start' } });
    expect(page.window.location.hash).toBe('#s2');
    expect(page.$('#current-section-label').textContent).toBe('第二节标题');
  });

  it('honours reduced motion', () => {
    page = load({ reducedMotion: true });
    page.click(page.$('a[href="#s2"]'));
    expect(page.scrollCalls.at(-1).options.behavior).toBe('auto');
  });
});
