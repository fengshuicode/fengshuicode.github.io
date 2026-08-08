(() => {
  const UI = window.TextbookUI;
  if (!UI) return;

  const currentUnit = Number(document.body.dataset.unit || 0);

  UI.initTheme({
    button: '.theme-toggle',
    storageKey: 'textbook-theme',
    initial: 'dom',
    icon: { dark: '☀', light: '◐' },
    wrapIcon: true,
    title: (theme) => (theme === 'dark' ? '切换到浅色模式' : '切换到深色模式')
  });

  UI.initDrawer({
    sidebar: '#site-sidebar',
    menuButton: '.menu-toggle',
    overlay: '.drawer-overlay',
    closeButton: '.drawer-close',
    sidebarOpenClass: null,
    openState: 'body',
    setLabel: false,
    menuButtonToggles: false,
    focusDelay: 30,
    focusableSelector: 'a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
    focusableFilter: (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
    closeOnLinkMaxWidth: 900
  });

  UI.initSectionTracker({
    sections: '.tracked-section[id]',
    links: 'a[data-section-id][data-unit]',
    linkId: (link) => link.dataset.sectionId || '',
    linkMatchesPage: (link) => Number(link.dataset.unit) === currentUnit,
    label: '#current-section-name',
    labelForLink: (link) => {
      const target = document.getElementById(link.dataset.sectionId || '');
      return target?.dataset.sectionTitle || link.textContent.trim();
    },
    updateHashOnScroll: false,
    updateHashOnClick: false,
    rootMargin: '-18% 0px -68% 0px',
    threshold: [0, 0.05, 0.2]
  });
})();
