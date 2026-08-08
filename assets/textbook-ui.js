/**
 * 共享交互工具库 —— 各教材站点（1-7、语文/历史增强版）复用同一套
 * 主题切换、抽屉目录、章节跟随、字号调节、搜索过滤、阅读进度实现。
 * 通过 window.TextbookUI 暴露，各站点的 script.js 只负责传入选择器与文案。
 */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch (_) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, String(value)); } catch (_) {}
    }
  };

  const matches = (query) => (window.matchMedia ? window.matchMedia(query).matches : false);
  const prefersDark = () => matches('(prefers-color-scheme: dark)');
  const prefersReducedMotion = () => matches('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');

  const one = (target, scope = doc) => (typeof target === 'string' ? scope.querySelector(target) : target || null);
  const many = (target, scope = doc) => {
    if (!target) return [];
    if (typeof target === 'string') return [...scope.querySelectorAll(target)];
    return [...target];
  };
  const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
  const pageName = () => location.pathname.split('/').pop() || '';
  const sectionTitleOf = (section) => {
    if (!section) return '';
    return section.dataset.sectionTitle || clean(section.querySelector('h1, h2')?.textContent);
  };

  /**
   * 主题切换：读取/写入 localStorage，同步按钮图标、aria-label 与 title。
   * @param {Object} options
   * @param {string} [options.storageKey='textbook-theme']
   * @param {string|Element} [options.button] 切换按钮
   * @param {{dark: string, light: string}} [options.icon] 深/浅色图标字符
   * @param {string} [options.iconTarget] 按钮内承载图标的子元素选择器
   * @param {boolean} [options.wrapIcon=false] 以 <span aria-hidden> 包裹图标写入 innerHTML
   * @param {'dataset'|'attribute'} [options.attribute='dataset'] attribute 模式下浅色时移除 data-theme
   * @param {'storage'|'dom'} [options.initial='storage'] dom 表示主题已由内联脚本写入
   * @param {boolean} [options.systemFallback=true] 无存储值时是否跟随系统深色偏好
   * @param {boolean} [options.persistInitial=false]
   * @param {((theme: string) => string)|null} [options.label] 传 null 则不改写 aria-label
   */
  function initTheme(options = {}) {
    const {
      storageKey = 'textbook-theme',
      button,
      icon = null,
      iconTarget = null,
      wrapIcon = false,
      label = (theme) => (theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'),
      title = null,
      attribute = 'dataset',
      initial = 'storage',
      systemFallback = true,
      persistInitial = false
    } = options;

    const themeButton = one(button);
    const current = () => {
      const value = attribute === 'attribute' ? root.getAttribute('data-theme') : root.dataset.theme;
      return value === 'dark' ? 'dark' : 'light';
    };

    const apply = (theme) => {
      if (attribute === 'attribute') {
        if (theme === 'dark') root.setAttribute('data-theme', 'dark');
        else root.removeAttribute('data-theme');
      } else {
        root.dataset.theme = theme;
      }
      if (!themeButton) return;
      const dark = theme === 'dark';
      if (label) themeButton.setAttribute('aria-label', label(theme));
      if (title) themeButton.title = title(theme);
      if (!icon) return;
      const glyph = dark ? icon.dark : icon.light;
      if (wrapIcon) {
        themeButton.innerHTML = `<span aria-hidden="true">${glyph}</span>`;
        return;
      }
      const holder = iconTarget ? themeButton.querySelector(iconTarget) : themeButton;
      if (holder) holder.textContent = glyph;
    };

    const setTheme = (theme, persist = true) => {
      apply(theme);
      if (persist) storage.set(storageKey, theme);
    };

    const stored = storage.get(storageKey);
    const startTheme = initial === 'dom'
      ? current()
      : (stored === 'dark' || stored === 'light' ? stored : (systemFallback && prefersDark() ? 'dark' : 'light'));
    setTheme(startTheme, persistInitial);

    themeButton?.addEventListener('click', () => setTheme(current() === 'dark' ? 'light' : 'dark'));

    return { setTheme, current };
  }

  /**
   * 移动端抽屉目录：开合状态、遮罩、焦点管理与焦点陷阱。
   * @param {Object} options
   * @param {string|Element} options.sidebar
   * @param {string|Element} options.menuButton
   * @param {string|Element} [options.overlay]
   * @param {string|Element} [options.closeButton]
   * @param {string|null} [options.sidebarOpenClass='is-open'] null 表示只在 body 上标记
   * @param {'hidden'|'class'|'fade'} [options.overlayMode='hidden']
   * @param {number|null} [options.openMaxWidth] 超过该宽度不再打开抽屉
   * @param {number|null} [options.closeOnLinkMaxWidth] 点击目录链接后自动关闭的宽度上限（null=始终关闭）
   * @param {number|null} [options.closeAboveWidth] 窗口放大到该宽度以上自动关闭
   * @param {'first'|'sidebar'|'close-button'|'first-or-sidebar'} [options.focusTarget='first']
   * @param {'sidebar'|'body'|'aria'} [options.openState='sidebar'] 判断开合状态的依据
   */
  function initDrawer(options = {}) {
    const {
      sidebar: sidebarOpt,
      menuButton: menuOpt,
      overlay: overlayOpt = null,
      closeButton: closeOpt = null,
      sidebarOpenClass = 'is-open',
      bodyClass = 'drawer-open',
      overlayMode = 'hidden',
      overlayClass = 'is-visible',
      fadeDelay = 220,
      labels = { open: '打开目录', close: '关闭目录' },
      setLabel = true,
      openMaxWidth = null,
      closeOnLink = true,
      closeOnLinkMaxWidth = null,
      restoreFocusOnLinkClose = true,
      closeAboveWidth = null,
      focusTarget = 'first',
      focusDelay = 0,
      focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      focusableFilter = (el) => el.offsetParent !== null,
      trapFocus = true,
      trapMaxWidth = null,
      menuButtonToggles = true,
      openState = 'sidebar'
    } = options;

    const body = doc.body;
    const sidebar = one(sidebarOpt);
    const menuButton = one(menuOpt);
    const overlay = one(overlayOpt);
    const closeButton = one(closeOpt);
    if (!sidebar || !menuButton) return { openDrawer() {}, closeDrawer() {}, isOpen: () => false };

    let lastFocus = null;

    const isOpen = () => {
      if (openState === 'body') return body.classList.contains(bodyClass);
      if (openState === 'aria') return menuButton.getAttribute('aria-expanded') === 'true';
      return sidebarOpenClass ? sidebar.classList.contains(sidebarOpenClass) : body.classList.contains(bodyClass);
    };

    const focusables = () => many(focusableSelector, sidebar).filter(focusableFilter);

    const showOverlay = (visible) => {
      if (!overlay) return;
      if (overlayMode === 'class') {
        overlay.classList.toggle(overlayClass, visible);
        return;
      }
      if (overlayMode === 'fade') {
        if (visible) {
          overlay.hidden = false;
          requestAnimationFrame(() => overlay.classList.add(overlayClass));
        } else {
          overlay.classList.remove(overlayClass);
          setTimeout(() => { overlay.hidden = true; }, fadeDelay);
        }
        return;
      }
      overlay.hidden = !visible;
    };

    const moveFocus = () => {
      const focusFirst = () => focusables()[0]?.focus();
      const run = () => {
        if (focusTarget === 'sidebar') sidebar.focus();
        else if (focusTarget === 'close-button') closeButton?.focus();
        else if (focusTarget === 'first-or-sidebar') (focusables()[0] || sidebar).focus();
        else focusFirst();
      };
      if (focusDelay > 0) setTimeout(run, focusDelay);
      else requestAnimationFrame(run);
    };

    const openDrawer = () => {
      if (openMaxWidth !== null && window.innerWidth > openMaxWidth) return;
      lastFocus = doc.activeElement;
      if (sidebarOpenClass) sidebar.classList.add(sidebarOpenClass);
      if (bodyClass) body.classList.add(bodyClass);
      showOverlay(true);
      menuButton.setAttribute('aria-expanded', 'true');
      if (setLabel) menuButton.setAttribute('aria-label', labels.close);
      moveFocus();
    };

    const closeDrawer = (restoreFocus = true) => {
      if (sidebarOpenClass) sidebar.classList.remove(sidebarOpenClass);
      if (bodyClass) body.classList.remove(bodyClass);
      showOverlay(false);
      menuButton.setAttribute('aria-expanded', 'false');
      if (setLabel) menuButton.setAttribute('aria-label', labels.open);
      if (restoreFocus && lastFocus instanceof HTMLElement) lastFocus.focus();
    };

    menuButton.addEventListener('click', () => {
      if (!menuButtonToggles) { openDrawer(); return; }
      if (isOpen()) closeDrawer(); else openDrawer();
    });
    closeButton?.addEventListener('click', () => closeDrawer());
    overlay?.addEventListener('click', () => closeDrawer());

    if (closeOnLink) {
      sidebar.addEventListener('click', (event) => {
        if (!event.target.closest('a[href]')) return;
        if (closeOnLinkMaxWidth !== null && window.innerWidth > closeOnLinkMaxWidth) return;
        closeDrawer(restoreFocusOnLinkClose);
      });
    }

    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        closeDrawer();
        return;
      }
      if (event.key !== 'Tab' || !trapFocus || !isOpen()) return;
      if (trapMaxWidth !== null && window.innerWidth > trapMaxWidth) return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && doc.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && doc.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (closeAboveWidth !== null) {
      window.addEventListener('resize', () => {
        if (window.innerWidth > closeAboveWidth && isOpen()) closeDrawer(false);
      });
    }

    return { openDrawer, closeDrawer, isOpen };
  }

  /**
   * 侧边栏单元折叠按钮（aria-expanded + aria-controls 面板）。
   * @param {Object} options
   * @param {string} [options.selector='.unit-toggle']
   * @param {string|null} [options.parentSelector] 需要同步 open class 的祖先容器
   * @param {{collapsed: string, expanded: string}|null} [options.labelWords] 互换 aria-label 中的动词
   */
  function initCollapsibles(options = {}) {
    const {
      selector = '.unit-toggle',
      parentSelector = null,
      parentOpenClass = 'is-open',
      labelWords = null
    } = options;

    many(selector).forEach((button) => {
      button.addEventListener('click', () => {
        const panel = doc.getElementById(button.getAttribute('aria-controls') || '');
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        if (labelWords) {
          const current = button.getAttribute('aria-label') || '';
          const from = expanded ? labelWords.expanded : labelWords.collapsed;
          const to = expanded ? labelWords.collapsed : labelWords.expanded;
          button.setAttribute('aria-label', current.replace(from, to));
        }
        if (parentSelector) button.closest(parentSelector)?.classList.toggle(parentOpenClass, !expanded);
        if (panel) panel.hidden = expanded;
      });
    });
  }

  /**
   * 章节跟随：IntersectionObserver 高亮目录链接、更新标题与地址栏 hash。
   * @param {Object} options
   * @param {string|Element[]} options.sections
   * @param {(section: Element) => boolean} [options.sectionFilter]
   * @param {string|Element[]} [options.links]
   * @param {(link: Element) => string} [options.linkId] 从链接解析章节 id
   * @param {(link: Element) => boolean} [options.linkMatchesPage] 链接是否指向当前页面
   * @param {'nearest'|'ratio'} [options.strategy='nearest'] 取最靠近视口顶部/可见比例最大的章节
   */
  function initSectionTracker(options = {}) {
    const {
      sections: sectionsOpt,
      sectionFilter = null,
      links: linksOpt = [],
      linkId = (link) => {
        const href = link.getAttribute('href') || '';
        return href.includes('#') ? decodeURIComponent(href.split('#').pop()) : '';
      },
      linkMatchesPage = () => true,
      activeClass = 'is-active',
      label: labelOpt = null,
      labelFor = (section) => sectionTitleOf(section),
      labelForLink = null,
      updateHashOnScroll = true,
      updateHashOnClick = true,
      hashDelay = 0,
      rootMargin = '-18% 0px -65% 0px',
      threshold = [0, 0.05, 0.2, 0.5],
      strategy = 'nearest',
      nearestOffset = 110,
      handleLinkClicks = true,
      smoothScrollLinks = false,
      initial = 'hash-or-first'
    } = options;

    let sections = many(sectionsOpt);
    if (sectionFilter) sections = sections.filter(sectionFilter);
    const links = many(linksOpt);
    const labelEl = one(labelOpt);
    let activeId = '';
    let hashTimer = null;

    const writeHash = (id) => {
      const apply = () => {
        if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
      };
      if (hashDelay > 0) {
        clearTimeout(hashTimer);
        hashTimer = setTimeout(apply, hashDelay);
      } else {
        apply();
      }
    };

    const setActive = (id, updateHash = false, labelText = null) => {
      if (!id) return;
      activeId = id;
      links.forEach((link) => {
        const active = linkId(link) === id && linkMatchesPage(link);
        link.classList.toggle(activeClass, active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      if (labelEl) {
        const text = labelText || labelFor(doc.getElementById(id), id);
        if (text) labelEl.textContent = text;
      }
      if (updateHash) writeHash(id);
    };

    if (handleLinkClicks) {
      links.forEach((link) => link.addEventListener('click', (event) => {
        const id = linkId(link);
        if (!id || !linkMatchesPage(link)) return;
        const target = doc.getElementById(id);
        if (!target) return;
        if (smoothScrollLinks) {
          event.preventDefault();
          target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
        }
        setActive(id, updateHashOnClick, labelForLink ? labelForLink(link) : null);
      }));
    }

    if (sections.length && 'IntersectionObserver' in window) {
      const ratios = new Map();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) ratios.set(entry.target, entry.intersectionRatio);
          else ratios.delete(entry.target);
        });
        if (!ratios.size) return;
        const visible = [...ratios.entries()];
        visible.sort((a, b) => {
          if (strategy === 'ratio') return b[1] - a[1];
          const distance = Math.abs(a[0].getBoundingClientRect().top - nearestOffset)
            - Math.abs(b[0].getBoundingClientRect().top - nearestOffset);
          return distance || b[1] - a[1];
        });
        const current = visible[0][0];
        if (current && current.id !== activeId) setActive(current.id, updateHashOnScroll);
      }, { rootMargin, threshold });
      sections.forEach((section) => observer.observe(section));
    }

    if (initial !== false) {
      const hashId = decodeURIComponent(location.hash.slice(1));
      const fromHash = hashId && doc.getElementById(hashId) ? hashId : '';
      if (fromHash) setActive(fromHash, false);
      else if (initial === 'hash-or-first' && sections[0]) setActive(sections[0].id, false);
    }

    return { setActive, sections, links };
  }

  /**
   * 页内锚点平滑滚动（尊重 prefers-reduced-motion）。
   * @param {Object} options
   * @param {string} [options.selector='a[href^="#"]']
   * @param {'push'|'replace'|false} [options.updateHash=false]
   * @param {(id: string, target: Element) => void} [options.onNavigate]
   */
  function initSmoothScroll(options = {}) {
    const {
      selector = 'a[href^="#"]',
      updateHash = false,
      onNavigate = null
    } = options;

    doc.addEventListener('click', (event) => {
      const link = event.target.closest(selector);
      if (!link) return;
      const url = new URL(link.getAttribute('href'), location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      const id = decodeURIComponent(url.hash.slice(1));
      const target = doc.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      if (updateHash === 'push') history.pushState(null, '', url.hash);
      else if (updateHash === 'replace') history.replaceState(null, '', url.hash);
      onNavigate?.(id, target);
    });
  }

  /**
   * 字号调节按钮，写入 CSS 自定义属性并记忆到 localStorage。
   * @param {Object} options
   * @param {string} options.property CSS 变量名，如 --reading-size
   * @param {string} options.storageKey
   * @param {number} [options.min] @param {number} [options.max] @param {number} [options.fallback]
   * @param {string} [options.buttons] 按钮选择器
   * @param {(button: Element) => number} [options.stepOf] 从按钮解析步进方向
   */
  function initFontSize(options = {}) {
    const {
      property,
      storageKey,
      min = 16,
      max = 28,
      step = 1,
      fallback = 18,
      buttons = null,
      stepOf = null,
      restore = true
    } = options;

    const setSize = (size) => {
      const next = Math.max(min, Math.min(max, size));
      root.style.setProperty(property, `${next}px`);
      storage.set(storageKey, next);
      return next;
    };

    if (restore) {
      const saved = Number(storage.get(storageKey));
      if (saved >= min && saved <= max) root.style.setProperty(property, `${saved}px`);
    }

    const currentSize = () => parseFloat(getComputedStyle(root).getPropertyValue(property)) || fallback;

    if (buttons) {
      many(buttons).forEach((button) => button.addEventListener('click', () => {
        const direction = stepOf ? stepOf(button) : 1;
        setSize(currentSize() + direction * step);
      }));
    }

    return { setSize, currentSize };
  }

  /**
   * 目录/卡片搜索过滤：按文本或 data 属性隐藏不匹配项。
   * @param {Object} options
   * @param {string|Element} options.input
   * @param {string} options.items 待过滤元素选择器
   * @param {(item: Element) => string} [options.textOf]
   */
  function initFilterSearch(options = {}) {
    const {
      input: inputOpt,
      items,
      textOf = (item) => item.textContent || ''
    } = options;

    const input = one(inputOpt);
    if (!input) return;
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      many(items).forEach((item) => {
        item.hidden = Boolean(query) && !textOf(item).toLowerCase().includes(query);
      });
    });
  }

  /**
   * 阅读进度条：按滚动比例设置元素宽度。
   * @param {Object} options
   * @param {string|Element} options.bar
   */
  function initReadingProgress(options = {}) {
    const bar = one(options.bar);
    if (!bar) return;
    const update = () => {
      const max = root.scrollHeight - window.innerHeight;
      bar.style.width = max > 0 ? `${Math.min(100, (window.scrollY / max) * 100)}%` : '0%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  window.TextbookUI = {
    storage,
    prefersDark,
    prefersReducedMotion,
    scrollBehavior,
    pageName,
    sectionTitleOf,
    initTheme,
    initDrawer,
    initCollapsibles,
    initSectionTracker,
    initSmoothScroll,
    initFontSize,
    initFilterSearch,
    initReadingProgress
  };
})();
