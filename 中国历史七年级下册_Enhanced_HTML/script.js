(() => {
  const root = document.documentElement;
  const body = document.body;
  const savedTheme = localStorage.getItem('history-theme');
  const savedSize = Number(localStorage.getItem('history-font-size'));
  const savedMode = localStorage.getItem('history-view-mode');
  if (savedTheme === 'dark') root.dataset.theme = 'dark';
  if (savedSize >= 15 && savedSize <= 24) root.style.setProperty('--reading-size', `${savedSize}px`);
  if (savedMode === 'text') body.classList.add('text-only');

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'menu') body.classList.add('menu-open');
    if (action === 'close-menu') body.classList.remove('menu-open');
    if (action === 'theme') {
      const dark = root.dataset.theme === 'dark';
      if (dark) delete root.dataset.theme; else root.dataset.theme = 'dark';
      localStorage.setItem('history-theme', dark ? 'light' : 'dark');
    }
    if (action === 'toggle-images') {
      body.classList.toggle('text-only');
      localStorage.setItem('history-view-mode', body.classList.contains('text-only') ? 'text' : 'spread');
      button.textContent = body.classList.contains('text-only') ? '显示原页' : '图文对照';
    }
    if (action === 'font-up' || action === 'font-down') {
      const current = parseFloat(getComputedStyle(root).getPropertyValue('--reading-size')) || 18;
      const next = Math.max(15, Math.min(24, current + (action === 'font-up' ? 1 : -1)));
      root.style.setProperty('--reading-size', `${next}px`);
      localStorage.setItem('history-font-size', String(next));
    }
  });

  document.querySelectorAll('[data-action="toggle-images"]').forEach(btn => {
    btn.textContent = body.classList.contains('text-only') ? '显示原页' : '图文对照';
  });

  const input = document.querySelector('.menu-search input');
  if (input) {
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      document.querySelectorAll('.lesson-link, .unit-link').forEach(link => {
        link.hidden = query && !link.textContent.toLowerCase().includes(query);
      });
    });
  }

  const progress = document.querySelector('.reading-progress span');
  if (progress) {
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = max > 0 ? `${Math.min(100, scrollY / max * 100)}%` : '0%';
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') body.classList.remove('menu-open');
  });
})();
