(() => {
  'use strict';
  const root = document.documentElement;
  const intro = document.getElementById('entry-intro');
  const hero = document.getElementById('top');
  const title = document.getElementById('hero-title');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const replay = document.querySelector('[data-intro-replay]');
  const skip = document.querySelector('[data-intro-skip]');
  let holdTimer, exitTimer, guardTimer, returnFocus;
  let introOpen = false;

  const finishIntro = () => {
    clearTimeout(holdTimer); clearTimeout(exitTimer); clearTimeout(guardTimer);
    clearTimeout(window.portfolioIntroFailsafe);
    const hadFocus = intro.contains(document.activeElement);
    intro.hidden = true;
    intro.classList.remove('is-playing');
    root.classList.remove('intro-pending', 'intro-leaving');
    root.classList.add('hero-entered');
    document.querySelectorAll('[data-intro-inert]').forEach(el => {
      el.inert = false;
      el.removeAttribute('data-intro-inert');
    });
    introOpen = false;
    if (window.portfolioResetAfterIntro) {
      scrollTo({ top: 0, left: 0, behavior: 'instant' });
      window.portfolioResetAfterIntro = false;
      history.scrollRestoration = 'auto';
    }
    if (hadFocus) (returnFocus?.isConnected ? returnFocus : title).focus({ preventScroll: true });
    document.dispatchEvent(new Event('portfolio:entryend'));
  };

  const startIntro = (isReplay = false) => {
    if (root.classList.contains('motion-paused') && !reduced.matches) return;
    clearTimeout(window.portfolioIntroFailsafe);
    returnFocus = isReplay ? replay : null;
    introOpen = true;
    root.classList.remove('hero-entered', 'intro-leaving');
    root.classList.add('intro-pending');
    // Only roots made inert by this intro are restored when it closes.
    [...document.body.children].forEach(el => {
      if (el !== intro && !['SCRIPT', 'STYLE'].includes(el.tagName) && !el.inert) {
        el.setAttribute('data-intro-inert', '');
        el.inert = true;
      }
    });
    intro.hidden = false;
    intro.classList.add('is-playing');
    skip.focus({ preventScroll: true });
    holdTimer = setTimeout(() => {
      root.classList.add('intro-leaving', 'hero-entered');
      exitTimer = setTimeout(finishIntro, reduced.matches ? 0 : 620);
    }, reduced.matches ? 650 : 1450);
    guardTimer = setTimeout(finishIntro, 2800);
  };

  skip.addEventListener('click', finishIntro);
  replay.addEventListener('click', () => startIntro(true));
  intro.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); finishIntro(); }
    if (event.key === 'Tab') { event.preventDefault(); skip.focus(); }
  });
  addEventListener('portfolio:intro-expired', finishIntro);
  addEventListener('hashchange', () => { if (introOpen) finishIntro(); });
  addEventListener('pagehide', finishIntro);
  addEventListener('pageshow', event => { if (event.persisted) finishIntro(); });
  const syncReplay = () => {
    replay.disabled = root.classList.contains('motion-paused') && !reduced.matches;
    if ((introOpen || root.classList.contains('intro-pending')) && replay.disabled) finishIntro();
  };
  reduced.addEventListener('change', syncReplay);
  document.addEventListener('portfolio:motionchange', syncReplay);
  syncReplay();
  if (window.portfolioIntroEligible) startIntro();

  // A vector mesh is sharp at every size and animates only while the hero is visible.
  const grid = hero.querySelector('.hero-grid');
  const namespace = 'http://www.w3.org/2000/svg';
  const mesh = document.createElementNS(namespace, 'svg');
  mesh.classList.add('hero-mesh');
  mesh.setAttribute('preserveAspectRatio', 'none');
  mesh.setAttribute('aria-hidden', 'true');
  const lines = document.createElementNS(namespace, 'path');
  lines.classList.add('hero-mesh-lines');
  mesh.append(lines);
  grid.append(mesh);
  grid.classList.add('mesh-ready');
  let width = 1, height = 1, frameId = 0, lastFrame = 0, phase = 0;
  let visible = false, pointerDown = false, energy = 0;
  let targetX = .62, targetY = .38, pointX = .62, pointY = .38, scrollDepth = 0;
  const coarse = matchMedia('(pointer: coarse)');
  const canRun = () => visible && !document.hidden && !reduced.matches && !root.classList.contains('motion-paused') && !root.classList.contains('intro-pending');

  const draw = (still = false) => {
    const radius = Math.min(width, height) * .36;
    const cx = pointX * width, cy = pointY * height;
    const warp = (x, y) => {
      if (still) return [x, y];
      const dx = x - cx, dy = y - cy;
      const distance = Math.hypot(dx, dy);
      const influence = Math.exp(-(distance * distance) / (radius * radius));
      const wave = Math.sin(x * .006 + phase) * Math.cos(y * .005 - phase * .65);
      const pulse = Math.sin(distance * .025 - phase * 3) * energy * influence * 15;
      return [x + wave * 7 + dx * influence * .045 + pulse, y + Math.cos(x * .004 - phase * .7) * Math.sin(y * .006 + phase) * 8 + dy * influence * .045 + pulse + scrollDepth * 6];
    };
    const step = coarse.matches ? 96 : 72, spacing = 72;
    let path = '';
    for (let x = -spacing; x <= width + spacing; x += spacing) {
      for (let y = -step; y <= height + step; y += step) {
        const p = warp(x, y);
        path += (y === -step ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
    }
    for (let y = -spacing; y <= height + spacing; y += spacing) {
      for (let x = -step; x <= width + step; x += step) {
        const p = warp(x, y);
        path += (x === -step ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      }
    }
    lines.setAttribute('d', path);
  };

  const tick = timestamp => {
    frameId = 0;
    if (!canRun()) return;
    // 30 fps on touch screens; no offscreen or background-tab work.
    const interval = 32;
    if (timestamp - lastFrame >= interval) {
      const delta = Math.min(50, timestamp - (lastFrame || timestamp));
      lastFrame = timestamp;
      phase += delta * .00036;
      pointX += (targetX - pointX) * .08;
      pointY += (targetY - pointY) * .08;
      energy *= .96;
      draw();
      hero.style.setProperty('--hero-text-x', ((pointX - .62) * (coarse.matches ? 2 : 5)).toFixed(2) + 'px');
      hero.style.setProperty('--hero-text-y', ((pointY - .38) * 3 + scrollDepth * -5).toFixed(2) + 'px');
    }
    frameId = requestAnimationFrame(tick);
  };
  const refresh = () => {
    if (canRun()) { if (!frameId) { lastFrame = 0; frameId = requestAnimationFrame(tick); } }
    else {
      cancelAnimationFrame(frameId); frameId = 0;
      if (reduced.matches) {
        draw(true);
        hero.style.removeProperty('--hero-text-x'); hero.style.removeProperty('--hero-text-y');
      }
    }
  };
  const resize = () => {
    width = hero.clientWidth; height = hero.clientHeight;
    mesh.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    draw(reduced.matches);
  };
  const locatePointer = event => {
    if (!canRun() || (event.pointerType === 'touch' && !pointerDown)) return;
    const bounds = hero.getBoundingClientRect();
    targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / width));
    targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / height));
  };
  hero.addEventListener('pointerdown', event => { pointerDown = true; locatePointer(event); energy = 1; }, { passive: true });
  hero.addEventListener('pointermove', locatePointer, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerDown = false; targetX = .62; targetY = .38; });
  const releasePointer = () => { pointerDown = false; };
  addEventListener('pointerup', releasePointer, { passive: true });
  addEventListener('pointercancel', releasePointer, { passive: true });
  addEventListener('scroll', () => {
    if (!visible || reduced.matches) return;
    scrollDepth = Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / height));
    if (coarse.matches) { targetX = .62 + Math.sin(scrollDepth * 4) * .2; targetY = .38 + scrollDepth * .3; }
  }, { passive: true });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; refresh(); }, { threshold: 0 }).observe(hero);
  document.addEventListener('visibilitychange', refresh);
  document.addEventListener('portfolio:motionchange', refresh);
  document.addEventListener('portfolio:entryend', refresh);
  reduced.addEventListener('change', refresh);
  resize();
})();
