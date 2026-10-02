(() => {
  'use strict';
  const showcase = document.getElementById('wacus-prototype');
  if (!showcase) return;
  const stage = showcase.querySelector('.prototype-stage');
  const launch = showcase.querySelector('.prototype-launch');
  const poster = showcase.querySelector('.prototype-poster');
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
  const sceneNames = { home:'홈', reserve:'예약', analytics:'분석', market:'마케팅', report:'리포트' };

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
    frame.id = 'wacus-demo-frame';
    frame.title = 'WACUS 관리자 앱 익명화 인터랙티브 데모';
    frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('referrerpolicy','no-referrer');
    frame.src = 'demos/wacus-app/?embed=1&scene=' + scene + '&v=prototype-2';
    launch.disabled = true;
    launch.textContent = '데모 여는 중…';
    showcase.classList.add('is-live');
    poster.hidden = true;
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
  poster.addEventListener('click',start);
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
})();
