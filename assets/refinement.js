(() => {
  const rail = document.querySelector('.section-rail');
  const toggle = document.querySelector('.section-menu-toggle');
  const links = [...rail.querySelectorAll('a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href')));
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
  const syncTabs = () => tabs.forEach(tab => {
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
  });
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
