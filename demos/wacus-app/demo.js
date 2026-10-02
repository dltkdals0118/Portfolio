(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const embedded = params.get('embed') === '1';
  const views = { home:'v-home', reserve:'v-reserve', analytics:'v-analytics', market:'v-market', report:'v-report' };
  const root = document.documentElement;
  root.classList.toggle('embedded', embedded);
  const gate = document.getElementById('gate');
  const appBody = document.getElementById('body');
  const phone = document.querySelector('.phone');
  const sheets = [...document.querySelectorAll('.sheet')];
  const panels = [...sheets, gate, ...document.querySelectorAll('.pv,.zoom,#chatPanel')];
  let previousScene = '';

  function notify(type, detail = {}) {
    if (embedded && parent !== window) parent.postMessage({ type, ...detail }, '*');
  }
  function chooseScene(scene) {
    const view = views[scene];
    if (!view) return;
    closeSheet(); closePanel(); closeReport();
    document.getElementById('zoom').classList.remove('on');
    gate.classList.remove('opening', 'verifying');
    gate.classList.add('off');
    document.querySelector('.tab[data-view="' + view + '"]').click();
    appBody.scrollTop = 0;
  }
  function updateState() {
    const gateOpen = !gate.classList.contains('off');
    const openSheet = sheets.find(el => el.classList.contains('on'));
    const blocking = openSheet || panels.find(el => el !== gate && el.classList.contains('on'));
    const top = gateOpen ? gate : blocking;
    for (const el of panels) {
      const open = el === gate ? gateOpen : el.classList.contains('on');
      el.inert = !open;
      el.setAttribute('aria-hidden', String(!open));
    }
    const bodyCovered = !!top;
    appBody.inert = bodyCovered;
    document.querySelector('.tabbar').inert = bodyCovered;
    document.querySelector('.appbar').inert = bodyCovered;
    document.getElementById('fab').inert = bodyCovered;
    for (const tab of document.querySelectorAll('.tab')) tab.setAttribute('aria-pressed', String(tab.classList.contains('on')));
    const id = document.querySelector('.view.on')?.id;
    const scene = Object.keys(views).find(k => views[k] === id) || 'home';
    for (const el of document.querySelectorAll('.pv-land,.pv-grid')) {
      el.inert = !el.classList.contains('on');
      el.setAttribute('aria-hidden', String(el.inert));
    }
    if (!gateOpen && previousScene !== scene) {
      previousScene = scene;
      notify('wacus:scene', { scene });
    }
  }
  new MutationObserver(updateState).observe(phone, { subtree:true, attributes:true, attributeFilter:['class'] });
  document.getElementById('demoReset').addEventListener('click', () => location.reload());
  document.querySelector('#setSheet .set-row.tap:not(#logoutRow)').addEventListener('click', () => demoToast('샘플 계정입니다. 비밀번호는 변경되지 않습니다.'));
  document.getElementById('artOpen').setAttribute('aria-label','샘플 기사 안내');
  document.getElementById('toast').setAttribute('role','status');
  document.getElementById('toast').setAttribute('aria-live','polite');
  document.getElementById('fab').setAttribute('aria-label','샘플 지원 대화 열기');
  document.getElementById('chatSend').setAttribute('aria-label','샘플 메시지 전송');
  document.getElementById('chatInput').setAttribute('aria-label','샘플 메시지');
  document.getElementById('zoomClose').setAttribute('aria-label','열지도 확대 닫기');
  document.getElementById('chatClose').setAttribute('aria-label','샘플 지원 대화 닫기');

  // The app is frontend-only. Form submission never leaves the browser.
  document.addEventListener('submit', event => event.preventDefault());
  // Add keyboard activation to the supplied clickable card/list UI, including
  // cards created by the reservation filters and report thumbnail viewer.
  const selector = '.row-item,.rv-card,.news-row,[data-flip],.pv-pg,.gi,.qmark,.set-row.tap,.burgerhit,.hmmenu .close,.chk';
  function keyboardTargets(host) {
    host.querySelectorAll(selector).forEach(el => {
      if (el.dataset.demoKeys) return;
      el.dataset.demoKeys = '1';
      el.tabIndex = 0;
      el.setAttribute('role','button');
      el.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault(); el.click();
      });
    });
  }
  keyboardTargets(phone);
  new MutationObserver(records => {
    if (records.some(r => r.addedNodes.length)) keyboardTargets(phone);
  }).observe(phone, { childList:true, subtree:true });

  let escapeHadOverlay = false;
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') escapeHadOverlay = panels.some(el => el !== gate && el.classList.contains('on'));
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !escapeHadOverlay) notify('wacus:escape');
  });
  window.addEventListener('message', event => {
    if (!embedded || event.source !== parent || event.data?.type !== 'wacus:navigate') return;
    chooseScene(event.data.scene);
  });
  if (embedded || params.get('start') === '1') chooseScene(params.get('scene') || 'home');
  updateState();
  notify('wacus:ready');
})();
