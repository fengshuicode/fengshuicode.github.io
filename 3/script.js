
(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const storage = { get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } }, set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} } };
  const stored = storage.get('history-theme');
  const initial = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const setTheme = (theme) => {
    root.dataset.theme = theme;
    storage.set('history-theme', theme);
    if (themeButton) {
      const dark = theme === 'dark';
      themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
      themeButton.title = dark ? '浅色模式' : '深色模式';
      themeButton.querySelector('span').textContent = dark ? '☀' : '◐';
    }
  };
  setTheme(initial);
  themeButton?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

  const sidebar = document.getElementById('site-sidebar');
  const overlay = document.querySelector('.drawer-overlay');
  const menuButton = document.querySelector('.menu-button');
  let lastFocused = null;
  const focusables = () => sidebar ? [...sidebar.querySelectorAll('a,button,summary,[tabindex]:not([tabindex="-1"])')] : [];
  const openDrawer = () => {
    if (!sidebar || !menuButton) return;
    lastFocused = document.activeElement;
    sidebar.classList.add('open'); overlay?.classList.add('open'); document.body.classList.add('drawer-open');
    menuButton.setAttribute('aria-expanded','true'); menuButton.setAttribute('aria-label','关闭目录');
    focusables()[0]?.focus();
  };
  const closeDrawer = () => {
    if (!sidebar || !menuButton) return;
    sidebar.classList.remove('open'); overlay?.classList.remove('open'); document.body.classList.remove('drawer-open');
    menuButton.setAttribute('aria-expanded','false'); menuButton.setAttribute('aria-label','打开目录');
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  };
  menuButton?.addEventListener('click', () => sidebar?.classList.contains('open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click', closeDrawer);
  sidebar?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { if (window.innerWidth <= 820) closeDrawer(); }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar?.classList.contains('open')) closeDrawer();
    if (e.key === 'Tab' && sidebar?.classList.contains('open')) {
      const f = focusables(); if (!f.length) return;
      const first=f[0], last=f[f.length-1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  const links = [...document.querySelectorAll('.section-link[data-section]')];
  const sections = links.map(a => document.getElementById(a.dataset.section)).filter(Boolean);
  const sectionName = document.getElementById('current-section-name');
  const labelFor = (id) => {
    const link = links.find(a => a.dataset.section === id);
    return link ? link.textContent.replace(/\s+/g,' ').trim() : '';
  };
  const activate = (id, updateHash=false) => {
    links.forEach(a => {
      const active = a.dataset.section === id;
      a.classList.toggle('active',active);
      if (active) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
    });
    const label=labelFor(id); if (label && sectionName) sectionName.textContent=label;
    if (updateHash && history.replaceState) history.replaceState(null,'',`#${id}`);
  };
  links.forEach(a => a.addEventListener('click', () => activate(a.dataset.section, true)));
  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => visible.set(entry.target.id, entry.intersectionRatio));
      const best=[...visible.entries()].filter(([,r])=>r>0).sort((a,b)=>b[1]-a[1])[0];
      if (best) activate(best[0]);
    }, {rootMargin:'-18% 0px -62% 0px',threshold:[0,.15,.35,.6]});
    sections.forEach(s=>observer.observe(s));
  }
  const initialHash=location.hash.slice(1); if (initialHash) activate(initialHash);
})();
