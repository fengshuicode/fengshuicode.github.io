(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  UI.initTheme({
    button: '.theme-toggle',
    storageKey: 'textbook-theme',
    attribute: 'attribute',
    icon: { dark: '☀', light: '◐' },
    iconTarget: '.theme-icon',
    title: (theme) => (theme === 'dark' ? '浅色模式' : '深色模式')
  });

  UI.initDrawer({
    sidebar: '#site-sidebar',
    menuButton: '.menu-button',
    overlay: '[data-drawer-overlay]',
    closeButton: '.drawer-close',
    sidebarOpenClass: null,
    openState: 'body',
    labels: { open: '打开教材目录', close: '关闭教材目录' },
    openMaxWidth: 1050,
    closeOnLinkMaxWidth: 1050,
    closeAboveWidth: 1050,
    focusTarget: 'close-button',
    focusableFilter: (el) => !el.hidden && el.offsetParent !== null
  });

  UI.initCollapsibles();

  UI.initSectionTracker({
    sections: 'main .content-section[id]',
    sectionFilter: (section) => section.id !== 'source-pages',
    links: '[data-section-link]',
    linkId: (link) => link.getAttribute('data-section-link') || '',
    linkMatchesPage: (link) => Boolean(link.getAttribute('href')?.includes(UI.pageName())),
    label: '#current-section-name',
    labelFor: (section) => section?.dataset.sectionTitle || '',
    labelForLink: (link) => link.getAttribute('data-section-title') || link.textContent.trim(),
    strategy: 'ratio',
    updateHashOnClick: false,
    rootMargin: '-18% 0px -65% 0px',
    threshold: [0, 0.05, 0.2, 0.5]
  });
})();
