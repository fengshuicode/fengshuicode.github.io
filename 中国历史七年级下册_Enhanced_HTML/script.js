(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  const body = document.body;

  UI.initTheme({
    button: '[data-action="theme"]',
    storageKey: 'history-theme',
    attribute: 'attribute',
    systemFallback: false,
    label: null
  });

  UI.initFontSize({
    property: '--reading-size',
    storageKey: 'history-font-size',
    min: 15,
    max: 24,
    fallback: 18,
    buttons: '[data-action="font-up"], [data-action="font-down"]',
    stepOf: (button) => (button.dataset.action === 'font-up' ? 1 : -1)
  });

  UI.initFilterSearch({
    input: '.menu-search input',
    items: '.lesson-link, .unit-link'
  });

  UI.initReadingProgress({ bar: '.reading-progress span' });

  if (UI.storage.get('history-view-mode') === 'text') body.classList.add('text-only');
  const imageToggles = [...document.querySelectorAll('[data-action="toggle-images"]')];
  const syncImageToggles = () => {
    const textOnly = body.classList.contains('text-only');
    imageToggles.forEach((button) => { button.textContent = textOnly ? '显示原页' : '图文对照'; });
  };
  syncImageToggles();

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'menu') body.classList.add('menu-open');
    if (action === 'close-menu') body.classList.remove('menu-open');
    if (action === 'toggle-images') {
      body.classList.toggle('text-only');
      UI.storage.set('history-view-mode', body.classList.contains('text-only') ? 'text' : 'spread');
      syncImageToggles();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') body.classList.remove('menu-open');
  });
})();
