(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  UI.initTheme({
    button: 'button[data-theme]',
    storageKey: 'study-theme',
    attribute: 'attribute',
    systemFallback: false,
    label: null
  });

  UI.initFontSize({
    property: '--study-font-size',
    storageKey: 'study-font-size',
    min: 16,
    max: 28,
    fallback: 20,
    buttons: '[data-font]',
    stepOf: (button) => (button.dataset.font === 'up' ? 1 : -1)
  });

  UI.initFilterSearch({
    input: '#lesson-search',
    items: '[data-search]',
    textOf: (item) => item.dataset.search || ''
  });
})();
