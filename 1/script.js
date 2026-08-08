(() => {
  const root = document.documentElement;
  const hashId = (hash) => {
    try { return decodeURIComponent(String(hash).replace(/^#/, '')); }
    catch (error) { console.warn('[textbook] malformed location hash:', hash, error); return ''; }
  };
  const warnStorage = (action, error) => console.warn(`[textbook] localStorage ${action} failed; preferences will not persist:`, error);
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (error) { warnStorage('read', error); return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (error) { warnStorage('write', error); } }
  };
  const storedTheme = storage.get('textbook-theme');
  const preferredDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = storedTheme || (preferredDark ? 'dark' : 'light');

  const themeButton = document.getElementById('theme-toggle');
  const updateThemeButton = () => {
    if (!themeButton) return;
    const dark = root.dataset.theme === 'dark';
    themeButton.textContent = dark ? '☀' : '◐';
    themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
  };
  updateThemeButton();
  themeButton?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    storage.set('textbook-theme', root.dataset.theme);
    updateThemeButton();
  });

  document.querySelectorAll('.unit-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const unit = button.closest('[data-unit-menu]');
      const target = document.getElementById(button.getAttribute('aria-controls'));
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      const label = button.getAttribute('aria-label');
      if (label) button.setAttribute('aria-label', label.replace(expanded ? '收起' : '展开', expanded ? '展开' : '收起'));
      unit?.classList.toggle('is-open', !expanded);
      if (target) target.hidden = expanded;
    });
  });

  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menu-toggle');
  const overlay = document.getElementById('drawer-overlay');
  let lastFocused = null;
  const mobileQuery = window.matchMedia('(max-width: 1000px)');

  const focusableInSidebar = () => sidebar ? Array.from(sidebar.querySelectorAll('a[href], button:not([disabled])')).filter(el => !el.closest('[hidden]')) : [];
  const openDrawer = () => {
    if (!sidebar || !menuButton || !overlay) return;
    lastFocused = document.activeElement;
    sidebar.classList.add('is-open');
    overlay.hidden = false;
    document.body.classList.add('drawer-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', '关闭目录');
    requestAnimationFrame(() => focusableInSidebar()[0]?.focus());
  };
  const closeDrawer = () => {
    if (!sidebar || !menuButton || !overlay) return;
    sidebar.classList.remove('is-open');
    overlay.hidden = true;
    document.body.classList.remove('drawer-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开目录');
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  };
  menuButton?.addEventListener('click', () => sidebar?.classList.contains('is-open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', closeDrawer);
  sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { if (mobileQuery.matches) closeDrawer(); }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sidebar?.classList.contains('is-open')) closeDrawer();
    if (event.key === 'Tab' && sidebar?.classList.contains('is-open') && mobileQuery.matches) {
      const focusables = focusableInSidebar();
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  mobileQuery.addEventListener?.('change', (e) => { if (!e.matches) closeDrawer(); });

  const sections = Array.from(document.querySelectorAll('[data-nav-section][id]'));
  const currentName = document.getElementById('current-section-name');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let currentId = '';
  let hashTimer = null;

  const setCurrentSection = (section, updateHash = true) => {
    if (!section || section.id === currentId) return;
    currentId = section.id;
    if (currentName) currentName.textContent = section.dataset.sectionTitle || section.querySelector('h2')?.textContent || section.id;
    document.querySelectorAll('.sidebar-children a[data-section-link]').forEach(link => {
      const href = link.getAttribute('href') || '';
      const targetHash = href.includes('#') ? href.split('#').pop() : '';
      const samePage = href.startsWith(location.pathname.split('/').pop() || '') || href.startsWith('#') || href.split('#')[0] === location.pathname.split('/').pop();
      const active = samePage && targetHash === section.id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    if (updateHash) {
      clearTimeout(hashTimer);
      hashTimer = setTimeout(() => {
        if (location.hash !== '#' + section.id) history.replaceState(null, '', '#' + section.id);
      }, 160);
    }
  };

  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visible.set(entry.target, entry.intersectionRatio);
        else visible.delete(entry.target);
      });
      if (!visible.size) return;
      const candidates = Array.from(visible.keys()).sort((a, b) => {
        const da = Math.abs(a.getBoundingClientRect().top - 110);
        const db = Math.abs(b.getBoundingClientRect().top - 110);
        return da - db;
      });
      setCurrentSection(candidates[0]);
    }, { rootMargin: '-12% 0px -70% 0px', threshold: [0, .1, .25, .5] });
    sections.forEach(section => observer.observe(section));
  }

  document.querySelectorAll('a[href*="#"]').forEach(link => {
    link.addEventListener('click', (event) => {
      const url = new URL(link.href, location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      const target = document.getElementById(hashId(url.hash));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      history.pushState(null, '', url.hash);
      if (target.matches('[data-nav-section]')) setCurrentSection(target, false);
    });
  });

  const initial = location.hash ? document.getElementById(hashId(location.hash)) : sections[0];
  if (initial?.matches?.('[data-nav-section]')) setCurrentSection(initial, false);
})();
