(() => {
  'use strict';
  document.querySelectorAll('.prototype-showcase').forEach(showcase => {
  const stage = showcase.querySelector('.prototype-stage');
  const launch = showcase.querySelector('.prototype-launch');
  const poster = showcase.querySelector('.prototype-poster');
  const preview = poster.querySelector('video');
  const previewReturn = showcase.querySelector('[data-demo-video]');
  const reset = showcase.querySelector('[data-demo-reset]');
  const expand = showcase.querySelector('[data-demo-expand]');
  const close = showcase.querySelector('[data-demo-close]');
  const sceneButtons = [...showcase.querySelectorAll('[data-demo-scene]')];
  const status = showcase.querySelector('[data-demo-status]');
  let frame = null;
  let ready = false;
  let scene = 'home';
  let timer = null;
  let returnFocus = null;
  let inerted = [];
  const sceneNames = Object.fromEntries(sceneButtons.map(b=>[b.dataset.demoScene,b.querySelector('b').textContent]));
  let syncPreview = () => {};
  const pausePreview = () => { if (preview && !preview.paused) preview.pause(); };
  if (preview) {
    const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)');
    let visible = false;
    let userPaused = false;
    let automaticPause = false;
    const pause = () => {
      if (preview.paused) return;
      automaticPause = true;
      preview.pause();
    };
    syncPreview = () => {
      const canPlay = visible && !document.hidden && !poster.hidden &&
        !showcase.classList.contains('is-live') && !reducedMotion.matches &&
        !document.documentElement.classList.contains('motion-paused') &&
        !document.body.classList.contains('motion-paused') &&
        !navigator.connection?.saveData;
      if (canPlay && !userPaused) {
        if (preview.paused) preview.play().catch(() => { userPaused = true; });
      } else pause();
    };
    preview.addEventListener('pause', () => {
      if (automaticPause) { automaticPause = false; return; }
      if (!poster.hidden) userPaused = true;
    });
    preview.addEventListener('play', () => { userPaused = false; });
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.2;
      syncPreview();
    }, { threshold: [0, 0.2] });
    observer.observe(preview);
    document.addEventListener('visibilitychange', syncPreview);
    reducedMotion.addEventListener('change', syncPreview);
    const motionObserver = new MutationObserver(syncPreview);
    motionObserver.observe(document.documentElement, { attributes:true, attributeFilter:['class'] });
    motionObserver.observe(document.body, { attributes:true, attributeFilter:['class'] });
  }

  function syncScene(next) {
    if (!(next in sceneNames)) return;
    scene = next;
    sceneButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.demoScene === scene)));
  }
  function navigate(next) {
    syncScene(next);
    if (!frame) { start(); return; }
    if (ready) frame.contentWindow.postMessage({ type:'wacus:navigate', scene }, '*');
  }
  function start() {
    if (frame) {
      if (ready) { frame.focus(); expandView(); }
      return;
    }
    frame = document.createElement('iframe');
    frame.id = showcase.id === 'wacus-prototype' ? 'wacus-demo-frame' : showcase.id + '-frame';
    frame.title = showcase.dataset.demoTitle || 'WACUS 관리자 앱 익명화 인터랙티브 데모';
    frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('referrerpolicy','no-referrer');
    frame.src = (showcase.dataset.demoSrc || 'demos/wacus-app/') + '?embed=1&scene=' + scene + '&v=demo-5';
    launch.disabled = true;
    launch.textContent = '데모 여는 중…';
    showcase.classList.add('is-live');
    poster.hidden = true;
    pausePreview();
    if (previewReturn) previewReturn.hidden = false;
    stage.append(frame);
    status.textContent = '데모를 여는 중입니다.';
    reset.disabled = false;
    timer = setTimeout(() => {
      if (ready) return;
      launch.disabled = false;
      launch.textContent = '다시 불러오기 ↻';
      status.textContent = '열기가 지연되고 있습니다. 다시 시작하거나 새 탭에서 열어주세요.';
    },12000);
  }
  function resetDemo() {
    if (!frame) return;
    clearTimeout(timer);
    frame.remove(); frame = null; ready = false;
    start();
  }
  function expandView() {
    if (showcase.classList.contains('is-expanded')) { collapseView(); return; }
    if (!frame) start();
    returnFocus = document.activeElement;
    inerted = [];
    // Keep only this showcase active while it covers the page.
    let node = showcase;
    while (node && node !== document.body) {
      for (const sibling of node.parentElement.children) {
        if (sibling === node || sibling.inert || /^(SCRIPT|STYLE|LINK)$/.test(sibling.tagName)) continue;
        inerted.push(sibling); sibling.inert = true;
      }
      node = node.parentElement;
    }
    showcase.classList.add('is-expanded');
    document.body.classList.add('prototype-expanded');
    showcase.setAttribute('role','dialog');
    showcase.setAttribute('aria-modal','true');
    expand.textContent = '작게 보기';
    close.focus();
  }
  function collapseView() {
    if (!showcase.classList.contains('is-expanded')) return;
    showcase.classList.remove('is-expanded');
    document.body.classList.remove('prototype-expanded');
    showcase.removeAttribute('role');
    showcase.removeAttribute('aria-modal');
    inerted.forEach(el => { el.inert = false; }); inerted = [];
    expand.textContent = '크게 보기';
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll:true });
  }
  sceneButtons.forEach(b => b.addEventListener('click', () => navigate(b.dataset.demoScene)));
  launch.addEventListener('click', () => {
    if (frame && !ready) resetDemo(); else start();
  });
  if (poster.tagName === 'BUTTON') poster.addEventListener('click',start);
  previewReturn?.addEventListener('click', () => {
    collapseView();
    clearTimeout(timer);
    frame?.remove(); frame = null; ready = false;
    showcase.classList.remove('is-live');
    poster.hidden = false;
    previewReturn.hidden = true;
    launch.disabled = false;
    launch.textContent = '데모 시작 ↗';
    reset.disabled = true;
    syncScene('home');
    if (preview) preview.currentTime = 0;
    status.textContent = '시연 영상으로 돌아왔습니다. 재생 버튼 또는 데모 시작을 눌러보세요.';
    syncPreview();
    launch.focus({ preventScroll:true });
  });
  reset.addEventListener('click',resetDemo);
  expand.addEventListener('click',expandView);
  close.addEventListener('click',collapseView);
  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow) return;
    if (event.data?.type === 'wacus:ready') {
      ready = true;
      clearTimeout(timer);
      launch.disabled = false;
      launch.textContent = '데모 크게 보기 ↗';
      status.textContent = '실행 중 · 하단 메뉴와 화면 안의 버튼을 직접 눌러보세요.';
      frame.contentWindow.postMessage({ type:'wacus:navigate', scene }, '*');
    } else if (event.data?.type === 'wacus:scene') syncScene(event.data.scene);
    else if (event.data?.type === 'wacus:escape') collapseView();
  });
  showcase.addEventListener('keydown', event => {
    if (!showcase.classList.contains('is-expanded')) return;
    if (event.key === 'Escape') { event.preventDefault(); collapseView(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...showcase.querySelectorAll('button:not(:disabled),a[href],iframe')].filter(el => !el.hidden && el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  });
})();
