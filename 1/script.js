(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  UI.initTheme({
    button: '#theme-toggle',
    storageKey: 'textbook-theme',
    icon: { dark: '☀', light: '◐' }
  });

  UI.initCollapsibles({
    parentSelector: '[data-unit-menu]',
    labelWords: { collapsed: '展开', expanded: '收起' }
  });

  UI.initDrawer({
    sidebar: '#sidebar',
    menuButton: '#menu-toggle',
    overlay: '#drawer-overlay',
    focusableSelector: 'a[href], button:not([disabled])',
    focusableFilter: (el) => !el.closest('[hidden]'),
    closeOnLinkMaxWidth: 1000,
    closeAboveWidth: 1000,
    trapMaxWidth: 1000
  });

  const samePage = (link) => {
    const href = link.getAttribute('href') || '';
    const page = UI.pageName();
    return href.startsWith('#') || href.split('#')[0] === page || href.startsWith(page);
  };

  const tracker = UI.initSectionTracker({
    sections: '[data-nav-section][id]',
    links: '.sidebar-children a[data-section-link]',
    linkMatchesPage: samePage,
    label: '#current-section-name',
    labelFor: (section, id) => (section ? UI.sectionTitleOf(section) || id : id),
    rootMargin: '-12% 0px -70% 0px',
    threshold: [0, 0.1, 0.25, 0.5],
    hashDelay: 160,
    handleLinkClicks: false
  });

  UI.initSmoothScroll({
    selector: 'a[href*="#"]',
    updateHash: 'push',
    onNavigate: (id, target) => {
      if (target.matches('[data-nav-section]')) tracker.setActive(id, false);
    }
  });
})();
