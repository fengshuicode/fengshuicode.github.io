(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  UI.initTheme({
    button: '.theme-toggle',
    storageKey: 'history-theme',
    persistInitial: true,
    icon: { dark: '☀', light: '◐' },
    iconTarget: 'span',
    title: (theme) => (theme === 'dark' ? '浅色模式' : '深色模式')
  });

  UI.initDrawer({
    sidebar: '#site-sidebar',
    menuButton: '.menu-button',
    overlay: '.drawer-overlay',
    sidebarOpenClass: 'open',
    overlayMode: 'class',
    overlayClass: 'open',
    focusableSelector: 'a, button, summary, [tabindex]:not([tabindex="-1"])',
    focusableFilter: () => true,
    closeOnLinkMaxWidth: 820
  });

  const links = [...document.querySelectorAll('.section-link[data-section]')];

  UI.initSectionTracker({
    sections: links.map((link) => document.getElementById(link.dataset.section)).filter(Boolean),
    links,
    linkId: (link) => link.dataset.section || '',
    activeClass: 'active',
    label: '#current-section-name',
    labelFor: (section, id) => {
      const link = links.find((item) => item.dataset.section === id);
      return link ? link.textContent.replace(/\s+/g, ' ').trim() : '';
    },
    strategy: 'ratio',
    updateHashOnScroll: false,
    rootMargin: '-18% 0px -62% 0px',
    threshold: [0, 0.15, 0.35, 0.6],
    initial: 'hash'
  });
})();
