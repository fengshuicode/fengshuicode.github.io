(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) root.dataset.reducedMotion = 'true';

  const hashId = (hash) => {
    try { return decodeURIComponent(String(hash).replace(/^#/, '')); }
    catch (error) { console.warn('[textbook] malformed location hash:', hash, error); return ''; }
  };
  const storage = {
    set(key, value) {
      try { localStorage.setItem(key, value); }
      catch (error) { console.warn(`[textbook] localStorage write failed; ${key} will not persist:`, error); }
    }
  };

  const themeButton = document.getElementById('theme-toggle');
  const setTheme = (theme, persist = true) => {
    root.dataset.theme = theme;
    if (persist) storage.set('textbook-theme', theme);
    if (themeButton) {
      const dark = theme === 'dark';
      themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
      const icon = themeButton.querySelector('.theme-icon');
      if (icon) icon.textContent = dark ? '☀' : '◐';
    }
  };
  setTheme(root.dataset.theme === 'dark' ? 'dark' : 'light', false);
  themeButton?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  document.querySelectorAll('.unit-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      if (panel) panel.hidden = open;
    });
  });

  const menuButton = document.getElementById('menu-button');
  const sidebar = document.getElementById('site-sidebar');
  const overlay = document.getElementById('drawer-overlay');
  let previousFocus = null;
  const focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const closeDrawer = (restore = true) => {
    if (!sidebar || !menuButton || !overlay) return;
    sidebar.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开目录');
    overlay.hidden = true;
    body.classList.remove('drawer-open');
    if (restore && previousFocus) previousFocus.focus();
  };
  const openDrawer = () => {
    if (!sidebar || !menuButton || !overlay) return;
    previousFocus = document.activeElement;
    sidebar.classList.add('is-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', '关闭目录');
    overlay.hidden = false;
    body.classList.add('drawer-open');
    const first = sidebar.querySelector(focusableSelector);
    (first || sidebar).focus();
  };
  menuButton?.addEventListener('click', () => menuButton.getAttribute('aria-expanded') === 'true' ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', () => closeDrawer());
  sidebar?.addEventListener('click', event => {
    if (event.target.closest('a') && window.innerWidth <= 820) closeDrawer(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeDrawer();
    if (event.key === 'Tab' && menuButton?.getAttribute('aria-expanded') === 'true' && sidebar) {
      const items = [...sidebar.querySelectorAll(focusableSelector)].filter(el => !el.closest('[hidden]'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  const title = document.getElementById('current-section-title');
  const sections = [...document.querySelectorAll('.track-section[id]')];
  const sidebarLinks = [...document.querySelectorAll('.sidebar-subnav a[data-section-link]')];
  const setActive = (id, updateHash = false) => {
    sidebarLinks.forEach(link => {
      const active = link.dataset.sectionLink === id && link.getAttribute('href')?.includes(location.pathname.split('/').pop() || '');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    const section = document.getElementById(id);
    if (section && title) title.textContent = section.dataset.sectionTitle || section.querySelector('h1,h2')?.textContent?.trim() || title.textContent;
    if (updateHash && id && location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  };

  sidebarLinks.forEach(link => link.addEventListener('click', () => {
    const href = link.getAttribute('href') || '';
    const id = href.includes('#') ? href.split('#').pop() : '';
    if (id && document.getElementById(id)) setActive(id, true);
  }));

  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.set(entry.target.id, entry.intersectionRatio) : visible.delete(entry.target.id));
      if (!visible.size) return;
      const ordered = sections.filter(section => visible.has(section.id));
      const current = ordered.sort((a,b) => {
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
        const aScore = Math.abs(ar.top - 110), bScore = Math.abs(br.top - 110);
        return aScore - bScore;
      })[0];
      if (current) setActive(current.id, true);
    }, {rootMargin:'-84px 0px -62% 0px', threshold:[0,.1,.35,.7]});
    sections.forEach(section => observer.observe(section));
  }
  const initialId = hashId(location.hash);
  if (initialId && document.getElementById(initialId)) setActive(initialId, false);
  else if (sections[0]) setActive(sections[0].id, false);
})();
