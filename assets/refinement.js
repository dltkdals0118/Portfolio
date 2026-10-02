(() => {
  const rail = document.querySelector('.section-rail');
  const toggle = document.querySelector('.section-menu-toggle');
  const links = [...rail.querySelectorAll('a')];
  const targets = links.map(a => document.getElementById(a.hash.slice(1))).filter(Boolean);
  const headerLinks = [...document.querySelectorAll('.nav a')];
  const closeMenu = (restoreFocus = false) => {
    rail.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('span').textContent = '＋';
    if (restoreFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    rail.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? '−' : '＋';
  });
  links.forEach(a => a.addEventListener('click', () => closeMenu()));
  document.addEventListener('click', e => {
    if (!rail.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && rail.classList.contains('is-open')) closeMenu(true);
  });
  document.addEventListener('focusin', e => {
    if (!rail.contains(e.target) && !toggle.contains(e.target)) closeMenu();
  });
  let pending = false;
  const update = () => {
    pending = false;
    let current = targets[0];
    for (const target of targets) {
      if (target.getBoundingClientRect().top <= innerHeight * .38) current = target;
    }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 8) current = targets.at(-1);
    [...links, ...headerLinks].forEach(a => {
      const active = a.getAttribute('href') === '#' + current.id;
      a.classList.toggle('active', active);
      if (active) a.setAttribute('aria-current', 'location');
      else if (a.pathname === location.pathname && !a.hash) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('load', update);
  update();
  // Keyboard and screen-reader state follows the visible Figma panel.
  const tabs = [...document.querySelectorAll('[data-figma-tab]')];
  const panels = [...document.querySelectorAll('[data-figma-panel]')];
  const expand = document.querySelector('[data-figma-expand]');
  const syncTabs = () => { tabs.forEach(tab => {
    const selected = tab.classList.contains('active');
    const name = tab.dataset.figmaTab;
    tab.id = 'figma-tab-' + name;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(selected));
    tab.setAttribute('aria-controls', 'figma-panel-' + name);
    tab.tabIndex = selected ? 0 : -1;
    const panel = panels.find(p => p.dataset.figmaPanel === name);
    panel.id = 'figma-panel-' + name;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.setAttribute('aria-hidden', String(!selected));
    panel.inert = !selected;
    panel.tabIndex = selected ? 0 : -1;
    if (selected && expand) {
      expand.dataset.lightbox = panel.querySelector('img').getAttribute('src');
      expand.setAttribute('aria-label', tab.textContent.trim() + ' 작업 화면 확대');
    }
  }); };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', syncTabs);
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { e.preventDefault(); tabs[next].click(); tabs[next].focus(); }
    });
  });
  syncTabs();
})();

(() => {
  const story = document.querySelector('.agent-story');
  if (!story) return;
  const stage = story.querySelector('.agent-stage');
  const steps = [...story.querySelectorAll('[data-agent-step]')];
  const frames = [...story.querySelectorAll('[data-agent-frame]')];
  const buttons = [...story.querySelectorAll('[data-agent-jump]')];
  const kicker = story.querySelector('[data-agent-kicker]');
  const title = story.querySelector('[data-agent-title]');
  let current = -1;
  const activate = index => {
    if (current === index) return;
    current = index;
    const step = steps[index];
    steps.forEach((s, i) => s.classList.toggle('active', i === index));
    frames.forEach(f => {
      const active = f.dataset.agentFrame === step.dataset.frame;
      f.classList.toggle('active', active);
      f.setAttribute('aria-hidden', String(!active));
      f.inert = !active;
      if (!active) f.querySelectorAll('video').forEach(video => video.pause());
    });
    buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    kicker.textContent = step.dataset.kicker;
    title.textContent = step.dataset.title;
  };
  const update = () => {
    const touchLayout = matchMedia('(max-width:1100px)').matches;
    const landscape = innerHeight <= 540 || (innerWidth >= 900 && innerWidth <= 1100);
    const stageBottom = stage.getBoundingClientRect().bottom;
    const line = touchLayout && !landscape
      ? Math.min(innerHeight * .88, stageBottom + Math.max(48, (innerHeight - stageBottom) * .35))
      : innerHeight * .5;
    let index = 0;
    steps.forEach((step, i) => { if (step.getBoundingClientRect().top <= line) index = i; });
    activate(index);
  };
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; update(); });
  };
  buttons.forEach((button, index) => button.addEventListener('click', () => {
    steps[index].scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'instant' : 'smooth' });
  }));
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('load', update);
  activate(0);
  update();
})();

// The same readable viewer serves search, documents and workflow screenshots.
(() => {
  const dialog = document.querySelector('[data-lightbox-dialog]');
  const img = dialog.querySelector('img');
  const viewport = dialog.querySelector('.lightbox-viewport');
  const canvas = dialog.querySelector('.lightbox-canvas');
  const title = dialog.querySelector('[data-lightbox-title]');
  const level = dialog.querySelector('[data-zoom-level]');
  const hint = dialog.querySelector('[data-lightbox-hint]');
  const out = dialog.querySelector('[data-zoom-out]');
  const more = dialog.querySelector('[data-zoom-in]');
  const close = dialog.querySelector('.lightbox-close');
  let scale = 1;
  let fitScale = 1;
  let fitMode = true;
  let trigger;
  const render = (next, preservePosition = false) => {
    if (!img.naturalWidth) return;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(1, canvas.offsetWidth);
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / Math.max(1, canvas.offsetHeight);
    scale = Math.max(fitScale, Math.min(2, next));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    img.style.width = width + 'px';
    img.style.height = height + 'px';
    canvas.style.width = Math.max(viewport.clientWidth, width + 32) + 'px';
    canvas.style.height = Math.max(viewport.clientHeight, height + 32) + 'px';
    level.textContent = Math.round(scale * 100) + '%';
    out.disabled = scale <= fitScale + .001;
    more.disabled = scale >= 2;
    viewport.scrollLeft = preservePosition ? centerX * canvas.offsetWidth - viewport.clientWidth / 2 : 0;
    viewport.scrollTop = preservePosition ? centerY * canvas.offsetHeight - viewport.clientHeight / 2 : 0;
  };
  const fit = () => {
    if (!dialog.open || !img.naturalWidth) return;
    fitScale = Math.min(1, (viewport.clientWidth - 32) / img.naturalWidth, (viewport.clientHeight - 32) / img.naturalHeight);
    fitMode = true;
    render(fitScale);
  };
  img.addEventListener('load', fit);
  img.addEventListener('error', () => { hint.textContent = '이미지를 불러오지 못했습니다. 닫은 뒤 다시 열어 주세요.'; });
  document.querySelectorAll('[data-lightbox]').forEach(button => {
    button.addEventListener('click', () => {
      trigger = button;
      title.textContent = button.getAttribute('aria-label') || '포트폴리오 증빙';
      img.alt = button.querySelector('img')?.alt || title.textContent;
      hint.textContent = '확대한 뒤 좌우·상하로 스크롤해 확인하세요.';
      img.style.width = '0px';
      img.style.height = '0px';
      img.src = button.dataset.lightbox;
      dialog.showModal();
      close.focus({ preventScroll: true });
      if (img.complete && img.naturalWidth) fit();
    });
  });
  out.addEventListener('click', () => { fitMode = false; render(scale / 1.5, true); });
  more.addEventListener('click', () => { fitMode = false; render(scale * 1.5, true); });
  dialog.querySelector('[data-zoom-fit]').addEventListener('click', fit);
  dialog.querySelector('[data-zoom-original]').addEventListener('click', () => { fitMode = false; render(1, true); });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { if (trigger?.isConnected && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true }); });
  addEventListener('resize', () => { if (dialog.open) { if (fitMode) fit(); else render(scale, true); } }, { passive: true });
})();
