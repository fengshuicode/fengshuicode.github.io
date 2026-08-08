import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button class="menu-button" aria-expanded="false" aria-label="打开目录"></button>
  <button class="theme-toggle"><span></span></button>
  <div class="drawer-overlay"></div>
  <aside id="site-sidebar">
    <a class="section-link" data-section="s1" href="#s1"> 第一节 </a>
    <a class="section-link" data-section="s2" href="#s2">第二节</a>
  </aside>
  <main>
    <section id="s1"><h2>一</h2></section>
    <section id="s2"><h2>二</h2></section>
  </main>
  <span id="current-section-name"></span>
`;

const load = (options) => createPage({ script: '3/script.js', html, ...options });

let page;
afterEach(() => page?.cleanup());

describe('3/script.js theme', () => {
  it('applies and persists the stored theme on load', () => {
    page = load({ storage: { 'history-theme': 'dark' } });
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.$('.theme-toggle span').textContent).toBe('☀');
    expect(page.$('.theme-toggle').title).toBe('浅色模式');
  });

  it('derives the initial theme from the OS preference', () => {
    page = load({ prefersDark: true });
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.window.localStorage.getItem('history-theme')).toBe('dark');
  });

  it('toggles between themes on click', () => {
    page = load();
    expect(page.root.dataset.theme).toBe('light');
    page.click(page.$('.theme-toggle'));
    expect(page.root.dataset.theme).toBe('dark');
    page.click(page.$('.theme-toggle'));
    expect(page.root.dataset.theme).toBe('light');
    expect(page.$('.theme-toggle span').textContent).toBe('◐');
    expect(page.window.localStorage.getItem('history-theme')).toBe('light');
  });
});

describe('3/script.js drawer', () => {
  it('toggles the drawer from the menu button and focuses the first link', () => {
    page = load();
    page.click(page.$('.menu-button'));
    expect(page.$('#site-sidebar').classList.contains('open')).toBe(true);
    expect(page.$('.drawer-overlay').classList.contains('open')).toBe(true);
    expect(page.body.classList.contains('drawer-open')).toBe(true);
    expect(page.$('.menu-button').getAttribute('aria-label')).toBe('关闭目录');
    expect(page.document.activeElement).toBe(page.$('[data-section="s1"]'));

    page.click(page.$('.menu-button'));
    expect(page.$('#site-sidebar').classList.contains('open')).toBe(false);
    expect(page.$('.drawer-overlay').classList.contains('open')).toBe(false);
    expect(page.$('.menu-button').getAttribute('aria-label')).toBe('打开目录');
  });

  it('closes on overlay click and Escape, restoring focus to the opener', () => {
    page = load();
    page.click(page.$('.menu-button'));
    page.click(page.$('.drawer-overlay'));
    expect(page.$('#site-sidebar').classList.contains('open')).toBe(false);

    page.$('.theme-toggle').focus();
    page.click(page.$('.menu-button'));
    page.press('Escape');
    expect(page.$('#site-sidebar').classList.contains('open')).toBe(false);
    expect(page.document.activeElement).toBe(page.$('.theme-toggle'));
  });

  it('closes after tapping a link on narrow screens only', () => {
    page = load({ innerWidth: 700 });
    page.click(page.$('.menu-button'));
    page.click(page.$('[data-section="s2"]'));
    expect(page.$('#site-sidebar').classList.contains('open')).toBe(false);
    page.cleanup();

    page = load({ innerWidth: 1200 });
    page.click(page.$('.menu-button'));
    page.click(page.$('[data-section="s2"]'));
    expect(page.$('#site-sidebar').classList.contains('open')).toBe(true);
  });

  it('wraps Tab focus inside the open drawer', () => {
    page = load();
    page.click(page.$('.menu-button'));
    const first = page.$('[data-section="s1"]');
    const last = page.$('[data-section="s2"]');

    last.focus();
    expect(page.press('Tab').defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(first);
    expect(page.press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(last);
  });
});

describe('3/script.js section tracking', () => {
  it('activates the section from the initial hash', () => {
    page = load({ url: 'https://example.test/unit-01.html#s2' });
    expect(page.$('[data-section="s2"]').classList.contains('active')).toBe(true);
    expect(page.$('#current-section-name').textContent).toBe('第二节');
  });

  it('activates and rewrites the hash when a link is clicked', () => {
    page = load();
    page.click(page.$('[data-section="s1"]'));
    expect(page.$('[data-section="s1"]').getAttribute('aria-current')).toBe('location');
    expect(page.$('#current-section-name').textContent).toBe('第一节');
    expect(page.window.location.hash).toBe('#s1');
  });

  it('activates the most visible section while scrolling without touching the hash', () => {
    page = load();
    page.observers[0].trigger([
      { target: page.$('#s1'), intersectionRatio: 0.2 },
      { target: page.$('#s2'), intersectionRatio: 0.8 },
    ]);
    expect(page.$('[data-section="s2"]').classList.contains('active')).toBe(true);
    expect(page.$('[data-section="s1"]').classList.contains('active')).toBe(false);
    expect(page.window.location.hash).toBe('');
  });
});
