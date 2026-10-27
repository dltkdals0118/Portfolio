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
