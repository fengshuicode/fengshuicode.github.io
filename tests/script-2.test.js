import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button class="menu-toggle" aria-expanded="false"></button>
  <button class="theme-toggle"></button>
  <div class="drawer-overlay" hidden></div>
  <aside id="site-sidebar">
    <button class="drawer-close"></button>
    <a href="unit-01.html#s1" data-section-id="s1" data-unit="1">第一节</a>
    <a href="unit-01.html#s2" data-section-id="s2" data-unit="1">第二节</a>
    <a href="unit-02.html#s1" data-section-id="s1" data-unit="2">别单元</a>
  </aside>
  <main>
    <section id="s1" class="tracked-section" data-section-title="第一节"><h2>一</h2></section>
    <section id="s2" class="tracked-section"><h2>第二节标题</h2></section>
  </main>
  <span id="current-section-name"></span>
`;

const load = (options) => createPage({ script: '2/script.js', html, bodyAttributes: { 'data-unit': '1' }, ...options });

let page;
afterEach(() => page?.cleanup());

describe('2/script.js theme', () => {
  it('renders the light icon and switches to dark on click', () => {
    page = load();
    const button = page.$('.theme-toggle');
    expect(button.textContent).toBe('◐');

    page.click(button);
    expect(page.root.dataset.theme).toBe('dark');
    expect(button.textContent).toBe('☀');
    expect(button.getAttribute('aria-label')).toBe('切换到浅色模式');
    expect(button.title).toBe('切换到浅色模式');
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('dark');
  });
});

describe('2/script.js drawer', () => {
  it('opens from the menu button and focuses the first control inside', async () => {
    page = load();
    page.click(page.$('.menu-toggle'));
    expect(page.body.classList.contains('drawer-open')).toBe(true);
    expect(page.$('.drawer-overlay').hidden).toBe(false);
    expect(page.$('.menu-toggle').getAttribute('aria-expanded')).toBe('true');

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(page.document.activeElement).toBe(page.$('.drawer-close'));
  });

  it('closes from the close button, the overlay and Escape', () => {
    page = load();
    page.click(page.$('.menu-toggle'));
    page.click(page.$('.drawer-close'));
    expect(page.body.classList.contains('drawer-open')).toBe(false);
    expect(page.$('.drawer-overlay').hidden).toBe(true);
    expect(page.$('.menu-toggle').getAttribute('aria-expanded')).toBe('false');

    page.click(page.$('.menu-toggle'));
    page.click(page.$('.drawer-overlay'));
    expect(page.body.classList.contains('drawer-open')).toBe(false);

    page.click(page.$('.menu-toggle'));
    const event = page.press('Escape');
    expect(event.defaultPrevented).toBe(true);
    expect(page.body.classList.contains('drawer-open')).toBe(false);
  });

  it('closes after following a lesson link on narrow screens only', () => {
    page = load({ innerWidth: 700 });
    page.click(page.$('.menu-toggle'));
    page.click(page.$('[data-section-id="s2"]'));
    expect(page.body.classList.contains('drawer-open')).toBe(false);
    page.cleanup();

    page = load({ innerWidth: 1400 });
    page.click(page.$('.menu-toggle'));
    page.click(page.$('[data-section-id="s2"]'));
    expect(page.body.classList.contains('drawer-open')).toBe(true);
  });

  it('cycles focus between the first and last sidebar controls', () => {
    page = load();
    page.click(page.$('.menu-toggle'));
    const items = page.$$('#site-sidebar button, #site-sidebar a');
    const first = items[0];
    const last = items.at(-1);

    last.focus();
    expect(page.press('Tab').defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(first);

    expect(page.press('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(last);
  });

  it('leaves Tab alone while the drawer is closed', () => {
    page = load();
    expect(page.press('Tab').defaultPrevented).toBe(false);
  });
});

describe('2/script.js section tracking', () => {
  it('activates the first section of the current unit on load', () => {
    page = load();
    expect(page.$('#current-section-name').textContent).toBe('第一节');
    expect(page.$('[data-unit="1"][data-section-id="s1"]').classList.contains('is-active')).toBe(true);
    expect(page.$('[data-unit="2"][data-section-id="s1"]').classList.contains('is-active')).toBe(false);
  });

  it('honours the hash when picking the initial section', () => {
    page = load({ url: 'https://example.test/unit-01.html#s2' });
    expect(page.$('#current-section-name').textContent).toBe('第二节标题');
    expect(page.$('[data-unit="1"][data-section-id="s2"]').getAttribute('aria-current')).toBe('location');
  });

  it('activates a section when its sidebar link is clicked', () => {
    page = load();
    page.click(page.$('[data-unit="1"][data-section-id="s2"]'));
    expect(page.$('[data-unit="1"][data-section-id="s2"]').classList.contains('is-active')).toBe(true);
    expect(page.$('[data-unit="1"][data-section-id="s1"]').getAttribute('aria-current')).toBeNull();
    expect(page.$('#current-section-name').textContent).toBe('第二节');
  });

  it('ignores sidebar links that belong to another unit', () => {
    page = load();
    page.click(page.$('[data-unit="2"]'));
    expect(page.$('#current-section-name').textContent).toBe('第一节');
    expect(page.$('[data-unit="2"]').classList.contains('is-active')).toBe(false);
  });

  it('follows the section nearest the sticky header while scrolling', () => {
    page = load();
    page.setRect(page.$('#s1'), { top: -300 });
    page.setRect(page.$('#s2'), { top: 100 });
    page.observers[0].trigger([{ target: page.$('#s1') }, { target: page.$('#s2') }]);

    expect(page.$('#current-section-name').textContent).toBe('第二节标题');
    expect(page.$('[data-unit="1"][data-section-id="s2"]').classList.contains('is-active')).toBe(true);
  });
});
