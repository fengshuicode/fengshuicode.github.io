
(() => {
  const root = document.documentElement;
  const body = document.body;
  const menuButton = document.querySelector('.menu-button');
  const sidebar = document.getElementById('site-sidebar');
  const overlay = document.querySelector('.drawer-overlay');
  const themeButton = document.querySelector('.theme-toggle');
  const sectionTitle = document.getElementById('current-section-title');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastFocus = null;

  function updateThemeButton() {
    if (!themeButton) return;
    const dark = root.dataset.theme === 'dark';
    themeButton.innerHTML = `<span aria-hidden="true">${dark ? '☀' : '☾'}</span>`;
    themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    themeButton.title = dark ? '浅色模式' : '深色模式';
  }
  updateThemeButton();
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('textbook-theme', next); } catch (e) {}
    updateThemeButton();
  });

  function openDrawer() {
    if (!sidebar || !menuButton || innerWidth > 980) return;
    lastFocus = document.activeElement;
    sidebar.classList.add('is-open');
    body.classList.add('drawer-open');
    overlay.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', '关闭目录');
    sidebar.focus();
  }
  function closeDrawer() {
    if (!sidebar || !menuButton) return;
    sidebar.classList.remove('is-open');
    body.classList.remove('drawer-open');
    overlay.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', '打开目录');
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  }
  menuButton?.addEventListener('click', () => sidebar?.classList.contains('is-open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', closeDrawer);
  sidebar?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
  addEventListener('resize', () => { if (innerWidth > 980) closeDrawer(); });

  const sections = [...document.querySelectorAll('[data-section-title][id]')].filter(s => !s.classList.contains('source-group'));
  const navLinks = [...document.querySelectorAll('.unit-subnav a[data-target]')];
  function setActive(id, title, updateHash = false) {
    navLinks.forEach(a => {
      const active = a.dataset.target === id && new URL(a.href, location.href).pathname === location.pathname;
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    if (sectionTitle && title) sectionTitle.textContent = title;
    if (updateHash && id && location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  }
  navLinks.forEach(a => a.addEventListener('click', e => {
    const url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash) {
      const target = document.querySelector(url.hash);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({behavior: reduceMotion ? 'auto' : 'smooth', block:'start'});
        setActive(target.id, target.dataset.sectionTitle || a.textContent.trim(), true);
      }
    }
  }));
  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
      const current = [...visible.entries()].filter(([,ratio]) => ratio > 0).sort((a,b) => {
        const dy = Math.abs(a[0].getBoundingClientRect().top - 110) - Math.abs(b[0].getBoundingClientRect().top - 110);
        return dy || b[1] - a[1];
      })[0]?.[0];
      if (current) setActive(current.id, current.dataset.sectionTitle, true);
    }, {rootMargin:'-80px 0px -65% 0px', threshold:[0,.05,.2,.5]});
    sections.forEach(s => observer.observe(s));
  }
  const initial = location.hash && document.querySelector(location.hash);
  if (initial?.dataset.sectionTitle) setActive(initial.id, initial.dataset.sectionTitle, false);
  else if (sections[0]) setActive(sections[0].id, sections[0].dataset.sectionTitle, false);
})();
