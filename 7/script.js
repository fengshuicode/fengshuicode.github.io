(() => {
  'use strict';
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const menuButton = document.querySelector('.menu-button');
  const sidebar = document.getElementById('site-sidebar');
  const overlay = document.querySelector('.drawer-overlay');
  const currentLabel = document.getElementById('current-section-label');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastFocused = null;

  const warnStorage = (action, error) => console.warn(`[textbook] localStorage ${action} failed; preferences will not persist:`, error);
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (error) { warnStorage('read', error); return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (error) { warnStorage('write', error); } }
  };
  const hashId = (hash) => {
    try { return decodeURIComponent(String(hash).replace(/^#/, '')); }
    catch (error) { console.warn('[textbook] malformed location hash:', hash, error); return ''; }
  };

  function preferredTheme() {
    const saved = storage.get('textbook-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    if (!themeButton) return;
    const dark = theme === 'dark';
    themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    themeButton.title = dark ? '切换浅色模式' : '切换深色模式';
    const icon = themeButton.querySelector('.theme-icon');
    if (icon) icon.textContent = dark ? '☀' : '☾';
  }

  applyTheme(preferredTheme());
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('textbook-theme', next);
    applyTheme(next);
  });

  function focusableInSidebar() {
    return sidebar ? [...sidebar.querySelectorAll('a[href], summary, button:not([disabled])')].filter(el => el.offsetParent !== null) : [];
  }

  function openDrawer() {
    if (!sidebar || !menuButton || window.innerWidth > 860) return;
    lastFocused = document.activeElement;
    sidebar.classList.add('is-open');
    document.body.classList.add('drawer-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', '关闭目录');
    if (overlay) {
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    }
    setTimeout(() => sidebar.focus(), 20);
  }

  function closeDrawer(restoreFocus = true) {
    if (!sidebar || !menuButton) return;
    sidebar.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开目录');
    if (overlay) {
      overlay.classList.remove('is-visible');
      setTimeout(() => { overlay.hidden = true; }, 220);
    }
    if (restoreFocus && lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  menuButton?.addEventListener('click', () => sidebar?.classList.contains('is-open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', () => closeDrawer());
  sidebar?.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && window.innerWidth <= 860) closeDrawer(false);
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) closeDrawer(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar?.classList.contains('is-open')) closeDrawer();
    if (event.key === 'Tab' && sidebar?.classList.contains('is-open')) {
      const items = focusableInSidebar();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  const tracked = [...document.querySelectorAll('.tracked-section[id]')];
  const sectionLinks = [...document.querySelectorAll('[data-section-id]')];
  function setActive(id, updateHash = false) {
    const section = document.getElementById(id);
    if (!section) return;
    sectionLinks.forEach(link => {
      const active = link.dataset.sectionId === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (currentLabel) currentLabel.textContent = section.dataset.sectionTitle || section.querySelector('h2')?.textContent || '';
    if (updateHash && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  }

  if (tracked.length) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.id, false);
    }, { rootMargin: '-24% 0px -62% 0px', threshold: [0, .08, .2, .45] });
    tracked.forEach(section => observer.observe(section));
    const initial = hashId(location.hash);
    setActive(initial && document.getElementById(initial) ? initial : tracked[0].id, false);
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = hashId(link.getAttribute('href'));
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    setActive(id, true);
  });
})();
