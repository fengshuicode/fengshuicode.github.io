(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  UI.initTheme({
    button: '.theme-toggle',
    storageKey: 'textbook-theme',
    initial: 'dom',
    icon: { dark: '☀', light: '☾' },
    wrapIcon: true,
    title: (theme) => (theme === 'dark' ? '浅色模式' : '深色模式')
  });

  UI.initDrawer({
    sidebar: '#site-sidebar',
    menuButton: '.menu-button',
    overlay: '.drawer-overlay',
    openMaxWidth: 980,
    closeAboveWidth: 980,
    focusTarget: 'sidebar',
    trapFocus: false
  });

  UI.initSectionTracker({
    sections: '[data-section-title][id]',
    sectionFilter: (section) => !section.classList.contains('source-group'),
    links: '.unit-subnav a[data-target]',
    linkId: (link) => link.dataset.target || '',
    linkMatchesPage: (link) => new URL(link.href, location.href).pathname === location.pathname,
    smoothScrollLinks: true,
    label: '#current-section-title',
    labelFor: (section) => section?.dataset.sectionTitle || '',
    labelForLink: (link) => {
      const target = document.getElementById(link.dataset.target || '');
      return target?.dataset.sectionTitle || link.textContent.trim();
    },
    rootMargin: '-80px 0px -65% 0px',
    threshold: [0, 0.05, 0.2, 0.5]
  });
})();
