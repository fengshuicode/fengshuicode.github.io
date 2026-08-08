(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  UI.initTheme({
    button: '.theme-toggle',
    storageKey: 'textbook-theme',
    icon: { dark: '☀', light: '☾' },
    iconTarget: '.theme-icon',
    title: (theme) => (theme === 'dark' ? '切换浅色模式' : '切换深色模式')
  });

  UI.initDrawer({
    sidebar: '#site-sidebar',
    menuButton: '.menu-button',
    overlay: '.drawer-overlay',
    overlayMode: 'fade',
    openMaxWidth: 860,
    closeOnLinkMaxWidth: 860,
    restoreFocusOnLinkClose: false,
    closeAboveWidth: 860,
    focusTarget: 'sidebar',
    focusDelay: 20,
    focusableSelector: 'a[href], summary, button:not([disabled])'
  });

  const tracker = UI.initSectionTracker({
    sections: '.tracked-section[id]',
    links: '[data-section-id]',
    linkId: (link) => link.dataset.sectionId || '',
    label: '#current-section-label',
    strategy: 'ratio',
    updateHashOnScroll: false,
    handleLinkClicks: false,
    rootMargin: '-24% 0px -62% 0px',
    threshold: [0, 0.08, 0.2, 0.45]
  });

  UI.initSmoothScroll({
    onNavigate: (id) => tracker.setActive(id, true)
  });
})();
