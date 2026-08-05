
(() => {
  const root = document.documentElement;
  const body = document.body;
  const sidebar = document.getElementById('site-sidebar');
  const overlay = document.querySelector('.drawer-overlay');
  const menuButton = document.querySelector('.menu-toggle');
  const closeButton = document.querySelector('.drawer-close');
  const themeButton = document.querySelector('.theme-toggle');
  const currentSectionName = document.getElementById('current-section-name');
  const currentUnit = Number(body.dataset.unit || 0);
  let lastFocus = null;

  const themeIcon = () => {
    if (!themeButton) return;
    const dark = root.dataset.theme === 'dark';
    themeButton.innerHTML = `<span aria-hidden="true">${dark ? '☀' : '◐'}</span>`;
    themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    themeButton.title = dark ? '切换到浅色模式' : '切换到深色模式';
  };

  themeIcon();
  themeButton?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('textbook-theme', next); } catch (e) {}
    themeIcon();
  });

  const focusableSelector = 'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  const openDrawer = () => {
    if (!sidebar || !menuButton || !overlay) return;
    lastFocus = document.activeElement;
    body.classList.add('drawer-open');
    overlay.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    const first = sidebar.querySelector(focusableSelector);
    window.setTimeout(() => first?.focus(), 30);
  };
  const closeDrawer = () => {
    if (!sidebar || !menuButton || !overlay) return;
    body.classList.remove('drawer-open');
    overlay.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  };
  menuButton?.addEventListener('click', openDrawer);
  closeButton?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  sidebar?.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) closeDrawer();
  }));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && body.classList.contains('drawer-open')) {
      event.preventDefault();
      closeDrawer();
      return;
    }
    if (event.key !== 'Tab' || !body.classList.contains('drawer-open') || !sidebar) return;
    const items = [...sidebar.querySelectorAll(focusableSelector)].filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const unitLinks = [...document.querySelectorAll('a[data-section-id][data-unit]')];
  const setActive = (id, title) => {
    unitLinks.forEach(link => {
      const active = Number(link.dataset.unit) === currentUnit && link.dataset.sectionId === id;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    if (currentSectionName && title) currentSectionName.textContent = title;
  };

  unitLinks.forEach(link => link.addEventListener('click', () => {
    if (Number(link.dataset.unit) !== currentUnit) return;
    const id = link.dataset.sectionId;
    const target = id ? document.getElementById(id) : null;
    const title = target?.dataset.sectionTitle || link.textContent.trim();
    setActive(id, title);
  }));

  const sections = [...document.querySelectorAll('.tracked-section[id]')];
  if (sections.length) {
    const initialId = location.hash.slice(1);
    const initial = sections.find(section => section.id === initialId) || sections[0];
    setActive(initial.id, initial.dataset.sectionTitle || initial.querySelector('h1,h2')?.textContent.trim());

    if ('IntersectionObserver' in window) {
      const visible = new Map();
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => visible.set(entry.target.id, entry));
        const candidates = [...visible.values()]
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => Math.abs(a.boundingClientRect.top - 110) - Math.abs(b.boundingClientRect.top - 110));
        const active = candidates[0];
        if (active) {
          const el = active.target;
          setActive(el.id, el.dataset.sectionTitle || el.querySelector('h1,h2')?.textContent.trim());
        }
      }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .05, .2] });
      sections.forEach(section => observer.observe(section));
    }
  }
})();
