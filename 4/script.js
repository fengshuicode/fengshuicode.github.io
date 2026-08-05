(() => {
  const root = document.documentElement;
  const body = document.body;
  const menuButton = document.querySelector('.menu-button');
  const sidebar = document.getElementById('site-sidebar');
  const overlay = document.querySelector('[data-drawer-overlay]');
  const closeButton = document.querySelector('.drawer-close');
  const themeButton = document.querySelector('.theme-toggle');
  const themeIcon = document.querySelector('.theme-icon');
  const sectionName = document.getElementById('current-section-name');
  let lastFocus = null;

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const storedTheme = localStorage.getItem('textbook-theme');
  const initialTheme = storedTheme || (prefersDark.matches ? 'dark' : 'light');

  function applyTheme(theme) {
    if (theme === 'dark') root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    if (themeButton) {
      const dark = theme === 'dark';
      themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
      themeButton.title = dark ? '浅色模式' : '深色模式';
      if (themeIcon) themeIcon.textContent = dark ? '☀' : '◐';
    }
  }
  applyTheme(initialTheme);
  themeButton?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('textbook-theme', next);
    applyTheme(next);
  });

  function focusableInSidebar() {
    if (!sidebar) return [];
    return [...sidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden && el.offsetParent !== null);
  }
  function openDrawer() {
    if (!sidebar || !menuButton || window.innerWidth > 1050) return;
    lastFocus = document.activeElement;
    body.classList.add('drawer-open');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', '关闭教材目录');
    if (overlay) overlay.hidden = false;
    closeButton?.focus();
  }
  function closeDrawer() {
    body.classList.remove('drawer-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', '打开教材目录');
    if (overlay) overlay.hidden = true;
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
  menuButton?.addEventListener('click', () => body.classList.contains('drawer-open') ? closeDrawer() : openDrawer());
  closeButton?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  sidebar?.addEventListener('click', event => {
    if (event.target.closest('a') && window.innerWidth <= 1050) closeDrawer();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && body.classList.contains('drawer-open')) closeDrawer();
    if (event.key === 'Tab' && body.classList.contains('drawer-open')) {
      const items = focusableInSidebar();
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', () => { if (window.innerWidth > 1050 && body.classList.contains('drawer-open')) closeDrawer(); });

  document.querySelectorAll('.unit-toggle').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.getAttribute('aria-controls');
      const list = id ? document.getElementById(id) : null;
      if (!list) return;
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      list.hidden = expanded;
    });
  });

  const sections = [...document.querySelectorAll('main .content-section[id]')].filter(section => section.id !== 'source-pages');
  const links = [...document.querySelectorAll('[data-section-link]')];
  function activate(id, title, updateHash = false) {
    links.forEach(link => {
      const active = link.getAttribute('data-section-link') === id && link.getAttribute('href')?.includes(location.pathname.split('/').pop() || '');
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    if (sectionName && title) sectionName.textContent = title;
    if (updateHash && id && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  }
  links.forEach(link => link.addEventListener('click', () => {
    const id = link.getAttribute('data-section-link');
    const title = link.getAttribute('data-section-title') || link.textContent.trim();
    if (id && link.getAttribute('href')?.startsWith(location.pathname.split('/').pop() || '')) activate(id, title, false);
  }));
  if (sections.length && 'IntersectionObserver' in window) {
    const ratios = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
      const visible = sections.map(s => ({s, ratio: ratios.get(s.id) || 0})).filter(x => x.ratio > 0).sort((a,b) => b.ratio - a.ratio)[0];
      if (visible) activate(visible.s.id, visible.s.dataset.sectionTitle || '', true);
    }, {rootMargin: '-18% 0px -65% 0px', threshold: [0, .05, .2, .5]});
    sections.forEach(section => observer.observe(section));
  }
  const initialId = location.hash.slice(1);
  const initialSection = document.getElementById(initialId) || sections[0];
  if (initialSection) activate(initialSection.id, initialSection.dataset.sectionTitle || '', false);
})();
