
(() => {
  const root = document.documentElement;
  const body = document.body;
  const themeBtn = document.getElementById('theme-toggle');
  const menuBtn = document.getElementById('menu-button');
  const sidebar = document.getElementById('site-sidebar');
  const overlay = document.getElementById('drawer-overlay');
  const currentSectionTitle = document.getElementById('current-section-title');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function preferredTheme(){
    const saved = localStorage.getItem('textbook-theme');
    if(saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme(theme){
    if(theme === 'dark') root.setAttribute('data-theme','dark'); else root.removeAttribute('data-theme');
    if(themeBtn){
      themeBtn.innerHTML = theme === 'dark' ? '<span aria-hidden="true">☀</span>' : '<span aria-hidden="true">☾</span>';
      themeBtn.setAttribute('aria-label', theme === 'dark' ? '切换到浅色模式' : '切换到深色模式');
    }
  }
  applyTheme(preferredTheme());
  themeBtn?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('textbook-theme',next); applyTheme(next);
  });

  let lastFocus = null;
  function openDrawer(){
    if(!menuBtn || !sidebar || !overlay) return;
    lastFocus = document.activeElement;
    body.classList.add('drawer-open'); overlay.hidden = false;
    menuBtn.setAttribute('aria-expanded','true'); menuBtn.setAttribute('aria-label','关闭目录');
    sidebar.focus({preventScroll:true});
  }
  function closeDrawer(){
    if(!menuBtn || !overlay) return;
    body.classList.remove('drawer-open'); overlay.hidden = true;
    menuBtn.setAttribute('aria-expanded','false'); menuBtn.setAttribute('aria-label','打开目录');
    if(lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({preventScroll:true});
  }
  menuBtn?.addEventListener('click',()=> body.classList.contains('drawer-open') ? closeDrawer() : openDrawer());
  overlay?.addEventListener('click',closeDrawer);
  sidebar?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{ if(window.innerWidth<=980) closeDrawer(); }));
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape' && body.classList.contains('drawer-open')) closeDrawer();
    if(e.key==='Tab' && body.classList.contains('drawer-open') && sidebar){
      const focusables=[...sidebar.querySelectorAll('a,button')].filter(el=>!el.hidden && el.offsetParent!==null);
      if(!focusables.length) return;
      const first=focusables[0], last=focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
  });

  document.querySelectorAll('.nav-unit-toggle').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const target=document.getElementById(btn.getAttribute('aria-controls'));
      const expanded=btn.getAttribute('aria-expanded')==='true';
      btn.setAttribute('aria-expanded',String(!expanded)); if(target) target.hidden=expanded;
    });
  });

  const sections=[...document.querySelectorAll('.content-section[id]')];
  const navLinks=[...document.querySelectorAll('.nav-subsections a[data-section-id]')].filter(a => {
    try { return new URL(a.href, location.href).pathname === location.pathname; } catch (_) { return true; }
  });
  function setActive(id){
    const section=sections.find(s=>s.id===id); if(!section) return;
    navLinks.forEach(a=>{
      const on=a.dataset.sectionId===id;
      a.classList.toggle('active',on);
      if(on) a.setAttribute('aria-current','location'); else a.removeAttribute('aria-current');
    });
    if(currentSectionTitle) currentSectionTitle.textContent=section.dataset.sectionTitle || '';
  }
  navLinks.forEach(a=>a.addEventListener('click',()=>{
    const id=a.dataset.sectionId; setActive(id);
    if(id && history.replaceState) history.replaceState(null,'','#'+id);
  }));
  if(sections.length){
    const initial=location.hash ? location.hash.slice(1) : sections[0].id; setActive(initial);
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(visible.length){ const id=visible[0].target.id; setActive(id); }
    },{rootMargin:'-20% 0px -68% 0px',threshold:[0,.1,.5]});
    sections.forEach(s=>observer.observe(s));
  }
})();
