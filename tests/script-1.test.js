import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button id="theme-toggle"></button>
  <button id="menu-toggle" aria-expanded="false" aria-label="打开目录"></button>
  <div id="drawer-overlay" hidden></div>
  <aside id="sidebar">
    <div data-unit-menu>
      <button class="unit-toggle" aria-controls="unit-1-list" aria-expanded="false" aria-label="展开第一单元"></button>
      <ul id="unit-1-list" class="sidebar-children" hidden>
        <li><a href="unit-01.html#s1" data-section-link>第一节</a></li>
        <li><a href="unit-01.html#s2" data-section-link>第二节</a></li>
      </ul>
    </div>
  </aside>
  <main>
    <section id="s1" data-nav-section data-section-title="第一节"><h2>一</h2></section>
    <section id="s2" data-nav-section><h2>第二节标题</h2></section>
  </main>
  <span id="current-section-name"></span>
`;

const load = (options) => createPage({ script: '1/script.js', html, ...options });

let page;
afterEach(() => page?.cleanup());

describe('1/script.js theme', () => {
  it('restores the stored theme and labels the toggle for switching back', () => {
    page = load({ storage: { 'textbook-theme': 'dark' } });
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.$('#theme-toggle').textContent).toBe('☀');
    expect(page.$('#theme-toggle').getAttribute('aria-label')).toBe('切换到浅色模式');
  });

  it('falls back to the OS preference when nothing is stored', () => {
    page = load({ prefersDark: true });
    expect(page.root.dataset.theme).toBe('dark');
    page.cleanup();

    page = load({ prefersDark: false });
    expect(page.root.dataset.theme).toBe('light');
    expect(page.$('#theme-toggle').textContent).toBe('◐');
  });

  it('persists the theme on toggle', () => {
    page = load();
    page.click(page.$('#theme-toggle'));
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('dark');

    page.click(page.$('#theme-toggle'));
    expect(page.root.dataset.theme).toBe('light');
    expect(page.window.localStorage.getItem('textbook-theme')).toBe('light');
  });
});

describe('1/script.js unit menus', () => {
  it('expands and collapses the lesson list, rewriting the toggle label', () => {
    page = load();
    const toggle = page.$('.unit-toggle');

    page.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('收起第一单元');
    expect(page.$('#unit-1-list').hidden).toBe(false);
    expect(page.$('[data-unit-menu]').classList.contains('is-open')).toBe(true);

    page.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('展开第一单元');
    expect(page.$('#unit-1-list').hidden).toBe(true);
    expect(page.$('[data-unit-menu]').classList.contains('is-open')).toBe(false);
  });
});

describe('1/script.js drawer', () => {
  const open = (options) => {
    page = load({ innerWidth: 800, ...options });
    page.click(page.$('#menu-toggle'));
    return page;
  };

  it('opens on the menu button and marks the page as having a drawer', () => {
    open();
    expect(page.$('#sidebar').classList.contains('is-open')).toBe(true);
    expect(page.$('#drawer-overlay').hidden).toBe(false);
    expect(page.body.classList.contains('drawer-open')).toBe(true);
    expect(page.$('#menu-toggle').getAttribute('aria-expanded')).toBe('true');
    expect(page.$('#menu-toggle').getAttribute('aria-label')).toBe('关闭目录');
  });

  it('closes on the menu button, the overlay and Escape', () => {
    open();
    page.click(page.$('#menu-toggle'));
    expect(page.$('#sidebar').classList.contains('is-open')).toBe(false);
    expect(page.$('#menu-toggle').getAttribute('aria-label')).toBe('打开目录');

    page.click(page.$('#menu-toggle'));
    page.click(page.$('#drawer-overlay'));
    expect(page.$('#sidebar').classList.contains('is-open')).toBe(false);

    page.click(page.$('#menu-toggle'));
    page.press('Escape');
    expect(page.$('#sidebar').classList.contains('is-open')).toBe(false);
    expect(page.body.classList.contains('drawer-open')).toBe(false);
  });

  it('returns focus to the element that opened it', () => {
    page = load({ innerWidth: 800 });
    page.$('#menu-toggle').focus();
    page.click(page.$('#menu-toggle'));
    page.$('.unit-toggle').focus();
    page.press('Escape');
    expect(page.document.activeElement).toBe(page.$('#menu-toggle'));
  });

  it('closes when a sidebar link is used on narrow screens only', () => {
    page = load({ innerWidth: 800 });
    page.click(page.$('#menu-toggle'));
    page.click(page.$('#unit-1-list a'));
    expect(page.$('#sidebar').classList.contains('is-open')).toBe(false);
    page.cleanup();

    page = load({ innerWidth: 1400 });
    page.click(page.$('#menu-toggle'));
    page.click(page.$('#unit-1-list a'));
    expect(page.$('#sidebar').classList.contains('is-open')).toBe(true);
  });

  it('traps Tab inside the drawer on narrow screens', () => {
    page = load({ innerWidth: 800 });
    page.$('#unit-1-list').hidden = false;
    page.click(page.$('#menu-toggle'));
    const [first, , last] = page.$$('#sidebar button, #sidebar a');

    last.focus();
    const forward = page.press('Tab');
    expect(forward.defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(first);

    const backward = page.press('Tab', { shiftKey: true });
    expect(backward.defaultPrevented).toBe(true);
    expect(page.document.activeElement).toBe(last);
  });

  it('closes when the viewport grows past the mobile breakpoint', () => {
    page = load({ innerWidth: 800 });
    page.click(page.$('#menu-toggle'));
    page.window.innerWidth = 1400;
    page.mediaLists.filter((list) => list.media === '(max-width: 1000px)').forEach((list) => list.dispatchChange(false));
    expect(page.$('#sidebar').classList.contains('is-open')).toBe(false);
  });
});

describe('1/script.js section tracking', () => {
  it('labels the first section on load', () => {
    page = load();
    expect(page.$('#current-section-name').textContent).toBe('第一节');
    expect(page.$('a[href="unit-01.html#s1"]').classList.contains('is-active')).toBe(true);
  });

  it('starts from the section named in the hash', () => {
    page = load({ url: 'https://example.test/unit-01.html#s2' });
    expect(page.$('#current-section-name').textContent).toBe('第二节标题');
    expect(page.$('a[href="unit-01.html#s2"]').getAttribute('aria-current')).toBe('location');
  });

  it('activates the visible section closest to the header offset and syncs the hash', async () => {
    page = load();
    page.setRect(page.$('#s1'), { top: -400 });
    page.setRect(page.$('#s2'), { top: 130 });
    page.observers[0].trigger([{ target: page.$('#s1') }, { target: page.$('#s2') }]);

    expect(page.$('#current-section-name').textContent).toBe('第二节标题');
    expect(page.$('a[href="unit-01.html#s1"]').classList.contains('is-active')).toBe(false);
    expect(page.$('a[href="unit-01.html#s2"]').classList.contains('is-active')).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(page.window.location.hash).toBe('#s2');
  });

  it('ignores sections that scrolled out of view', () => {
    page = load();
    page.setRect(page.$('#s2'), { top: 120 });
    page.observers[0].trigger([{ target: page.$('#s2') }]);
    page.observers[0].trigger([{ target: page.$('#s2'), isIntersecting: false }]);
    expect(page.$('#current-section-name').textContent).toBe('第二节标题');
  });
});

describe('1/script.js in-page anchors', () => {
  it('smooth-scrolls to the target and pushes the hash', () => {
    page = load();
    page.$('#unit-1-list').hidden = false;
    const link = page.$('a[href="unit-01.html#s2"]');
    page.click(link);

    expect(page.scrollCalls.at(-1)).toMatchObject({ target: page.$('#s2'), options: { behavior: 'smooth', block: 'start' } });
    expect(page.window.location.hash).toBe('#s2');
    expect(page.$('#current-section-name').textContent).toBe('第二节标题');
  });

  it('uses instant scrolling when reduced motion is requested', () => {
    page = load({ reducedMotion: true });
    page.click(page.$('a[href="unit-01.html#s2"]'));
    expect(page.scrollCalls.at(-1).options.behavior).toBe('auto');
  });
});
