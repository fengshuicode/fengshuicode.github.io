(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  if (UI.prefersReducedMotion()) document.documentElement.dataset.reducedMotion = 'true';

  UI.initTheme({
    button: '#theme-toggle',
    storageKey: 'textbook-theme',
    initial: 'dom',
    icon: { dark: '☀', light: '◐' },
    iconTarget: '.theme-icon'
  });

  UI.initCollapsibles();

  UI.initDrawer({
    sidebar: '#site-sidebar',
    menuButton: '#menu-button',
    overlay: '#drawer-overlay',
    openState: 'aria',
    focusTarget: 'first-or-sidebar',
    focusableFilter: (el) => !el.closest('[hidden]'),
    closeOnLinkMaxWidth: 820,
    restoreFocusOnLinkClose: false
  });

  UI.initSectionTracker({
    sections: '.track-section[id]',
    links: '.sidebar-subnav a[data-section-link]',
    linkId: (link) => link.dataset.sectionLink || '',
    linkMatchesPage: (link) => Boolean(link.getAttribute('href')?.includes(UI.pageName())),
    activeClass: 'active',
    label: '#current-section-title',
    rootMargin: '-84px 0px -62% 0px',
    threshold: [0, 0.1, 0.35, 0.7]
  });
})();
