(() => {
  const toggles = [...document.querySelectorAll('[data-motion-toggle]')];
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  const sync = () => {
    root.classList.toggle('motion-paused', paused);
    toggles.forEach(toggle => {
      toggle.textContent = reduced.matches ? '모션 축소 적용' : paused ? '동작 재생' : '동작 멈춤';
      toggle.disabled = reduced.matches;
      toggle.setAttribute('aria-pressed', String(paused));
    });
    document.dispatchEvent(new Event('portfolio:motionchange'));
  };
  toggles.forEach(toggle => toggle.addEventListener('click', () => { paused = !paused; sync(); }));
  reduced.addEventListener('change', () => { paused = reduced.matches; sync(); });
  sync();
  document.querySelectorAll('.agent-map-node').forEach((node, index) => node.style.setProperty('--node-delay', index * .55 + 's'));

})();

