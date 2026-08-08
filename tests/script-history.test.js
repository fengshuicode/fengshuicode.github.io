import { afterEach, describe, expect, it } from 'vitest';
import { createPage } from './helpers/page.js';

const html = `
  <button data-action="menu">目录</button>
  <button data-action="close-menu">关闭</button>
  <button data-action="theme">主题</button>
  <button data-action="toggle-images"></button>
  <button data-action="font-up">A+</button>
  <button data-action="font-down">A-</button>
  <div class="menu-search"><input type="search"></div>
  <nav>
    <a class="unit-link" href="unit-01.html">第一单元 隋唐</a>
    <a class="lesson-link" href="lesson-01.html">第1课 隋朝的统一</a>
    <a class="lesson-link" href="lesson-02.html">第2课 唐朝的兴亡</a>
  </nav>
  <div class="reading-progress"><span></span></div>
`;

const load = (options) => createPage({ script: '中国历史七年级下册_Enhanced_HTML/script.js', html, ...options });

let page;
afterEach(() => page?.cleanup());

describe('history reader preferences', () => {
  it('restores the saved theme, font size and reading mode', () => {
    page = load({
      storage: { 'history-theme': 'dark', 'history-font-size': '21', 'history-view-mode': 'text' },
    });
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.root.style.getPropertyValue('--reading-size')).toBe('21px');
    expect(page.body.classList.contains('text-only')).toBe(true);
    expect(page.$('[data-action="toggle-images"]').textContent).toBe('显示原页');
  });

  it('ignores a stored font size outside the supported range', () => {
    page = load({ storage: { 'history-font-size': '40' } });
    expect(page.root.style.getPropertyValue('--reading-size')).toBe('');
  });

  it('defaults to the light theme and the illustrated reading mode', () => {
    page = load();
    expect(page.root.dataset.theme).toBeUndefined();
    expect(page.body.classList.contains('text-only')).toBe(false);
    expect(page.$('[data-action="toggle-images"]').textContent).toBe('图文对照');
  });
});

describe('history reader toolbar', () => {
  it('opens and closes the menu, including via Escape', () => {
    page = load();
    page.click(page.$('[data-action="menu"]'));
    expect(page.body.classList.contains('menu-open')).toBe(true);

    page.click(page.$('[data-action="close-menu"]'));
    expect(page.body.classList.contains('menu-open')).toBe(false);

    page.click(page.$('[data-action="menu"]'));
    page.press('Escape');
    expect(page.body.classList.contains('menu-open')).toBe(false);
  });

  it('toggles the theme and stores the opposite value each time', () => {
    page = load();
    page.click(page.$('[data-action="theme"]'));
    expect(page.root.dataset.theme).toBe('dark');
    expect(page.window.localStorage.getItem('history-theme')).toBe('dark');

    page.click(page.$('[data-action="theme"]'));
    expect(page.root.dataset.theme).toBeUndefined();
    expect(page.window.localStorage.getItem('history-theme')).toBe('light');
  });

  it('switches between the text-only and the illustrated view', () => {
    page = load();
    const button = page.$('[data-action="toggle-images"]');

    page.click(button);
    expect(page.body.classList.contains('text-only')).toBe(true);
    expect(button.textContent).toBe('显示原页');
    expect(page.window.localStorage.getItem('history-view-mode')).toBe('text');

    page.click(button);
    expect(page.body.classList.contains('text-only')).toBe(false);
    expect(button.textContent).toBe('图文对照');
    expect(page.window.localStorage.getItem('history-view-mode')).toBe('spread');
  });

  it('grows the reading size and clamps it at the maximum', () => {
    page = load({ storage: { 'history-font-size': '23' } });
    page.click(page.$('[data-action="font-up"]'));
    expect(page.root.style.getPropertyValue('--reading-size')).toBe('24px');
    expect(page.window.localStorage.getItem('history-font-size')).toBe('24');

    page.click(page.$('[data-action="font-up"]'));
    expect(page.root.style.getPropertyValue('--reading-size')).toBe('24px');
  });

  it('shrinks the reading size and clamps it at the minimum', () => {
    page = load({ storage: { 'history-font-size': '16' } });
    page.click(page.$('[data-action="font-down"]'));
    expect(page.root.style.getPropertyValue('--reading-size')).toBe('15px');

    page.click(page.$('[data-action="font-down"]'));
    expect(page.root.style.getPropertyValue('--reading-size')).toBe('15px');
    expect(page.window.localStorage.getItem('history-font-size')).toBe('15');
  });

  it('ignores clicks that are not on a toolbar action', () => {
    page = load();
    page.click(page.$('.unit-link'));
    expect(page.body.classList.contains('menu-open')).toBe(false);
    expect(page.root.dataset.theme).toBeUndefined();
  });
});

describe('history reader menu search', () => {
  it('hides the entries that do not match the query', () => {
    page = load();
    const input = page.$('.menu-search input');
    input.value = ' 唐朝 ';
    input.dispatchEvent(new page.window.Event('input', { bubbles: true }));

    expect(page.$$('a').map((link) => link.hidden)).toEqual([true, true, false]);
  });

  it('shows every entry again when the query is cleared', () => {
    page = load();
    const input = page.$('.menu-search input');
    const fire = () => input.dispatchEvent(new page.window.Event('input', { bubbles: true }));

    input.value = '隋朝';
    fire();
    expect(page.$('.lesson-link[href="lesson-02.html"]').hidden).toBe(true);

    input.value = '';
    fire();
    expect(page.$$('a').every((link) => !link.hidden)).toBe(true);
  });

  it('matches case-insensitively', () => {
    page = load({
      html: `${html}<a class="lesson-link" href="lesson-03.html">Tang Dynasty</a>`,
    });
    const input = page.$('.menu-search input');
    input.value = 'TANG';
    input.dispatchEvent(new page.window.Event('input', { bubbles: true }));
    expect(page.$('.lesson-link[href="lesson-03.html"]').hidden).toBe(false);
    expect(page.$('.lesson-link[href="lesson-01.html"]').hidden).toBe(true);
  });
});

describe('history reader progress bar', () => {
  it('reports zero progress when the page fits the viewport', () => {
    page = load();
    expect(page.$('.reading-progress span').style.width).toBe('0%');
  });

  it('tracks the scroll position as a percentage', () => {
    page = load();
    Object.defineProperty(page.root, 'scrollHeight', { value: 2800, configurable: true });
    Object.defineProperty(page.window, 'scrollY', { value: 1000, writable: true, configurable: true });
    page.window.dispatchEvent(new page.window.Event('scroll'));
    expect(page.$('.reading-progress span').style.width).toBe('50%');

    page.window.scrollY = 5000;
    page.window.dispatchEvent(new page.window.Event('scroll'));
    expect(page.$('.reading-progress span').style.width).toBe('100%');
  });
});
