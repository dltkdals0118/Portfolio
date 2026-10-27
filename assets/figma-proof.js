// Figma 증빙 탭 — 패널 전환 · 키보드/스크린리더 상태 · 가로 드래그 패닝.
//
// 원래 index.html 에서 둘로 나뉘어 있었다. 인라인 스크립트가 .active 를 토글하고
// refinement.js 가 ARIA 를 맞췄다. 한쪽만 옮기면 조용히 반쪽이 되므로 여기에 함께 둔다.
(() => {
  const tabs = [...document.querySelectorAll('[data-figma-tab]')];
  const panels = [...document.querySelectorAll('[data-figma-panel]')];
  if (!tabs.length || !panels.length) return;
  const expand = document.querySelector('[data-figma-expand]');

  // 비활성 패널은 display:none 이 아니라 opacity:0 이다 — loading="lazy" 가 막아 주지 못해서
  // 처음 화면에서 보이지도 않는 이미지까지 전부 받는다. 첫 선택 때, 늦어도 유휴 시점에 채운다.
  const hydrate = panel => {
    const img = panel?.querySelector('img[data-src]');
    if (!img) return;
    img.src = img.dataset.src;
    delete img.dataset.src;
  };
  const srcOf = panel => {
    const img = panel.querySelector('img');
    return img ? (img.getAttribute('src') || img.dataset.src || '') : '';
  };

  const sync = () => {
    tabs.forEach(tab => {
      const selected = tab.classList.contains('active');
      const name = tab.dataset.figmaTab;
      tab.id = 'figma-tab-' + name;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('aria-controls', 'figma-panel-' + name);
      tab.tabIndex = selected ? 0 : -1;
      const panel = panels.find(p => p.dataset.figmaPanel === name);
      if (!panel) return;
      panel.id = 'figma-panel-' + name;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.setAttribute('aria-hidden', String(!selected));
      panel.inert = !selected;
      panel.tabIndex = selected ? 0 : -1;
      if (selected) {
        hydrate(panel);
        if (expand) {
          const src = srcOf(panel);
          if (src) expand.dataset.lightbox = src;
          expand.setAttribute('aria-label', tab.textContent.trim() + ' 작업 화면 확대');
        }
      }
    });
  };

  const select = tab => {
    tabs.forEach(b => b.classList.toggle('active', b === tab));
    panels.forEach(p => p.classList.toggle('active', p.dataset.figmaPanel === tab.dataset.figmaTab));
    sync();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { e.preventDefault(); tabs[next].click(); tabs[next].focus(); }
    });
  });
  sync();

  // 탭을 누르지 않아도 결국은 받아 둔다 — 단, 첫 화면을 다 그린 뒤에.
  const hydrateRest = () => panels.forEach(hydrate);
  addEventListener('load', () => {
    if ('requestIdleCallback' in window) requestIdleCallback(hydrateRest, { timeout: 4000 });
    else setTimeout(hydrateRest, 1200);
  });

  // 가로로 긴 User Flow 는 마우스로 끌어서 본다.
  document.querySelectorAll('.figma-pan').forEach(scroller => {
    let down = false, startX = 0, startScroll = 0;
    scroller.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button')) return;
      down = true; startX = e.clientX; startScroll = scroller.scrollLeft;
      scroller.classList.add('dragging');
      scroller.setPointerCapture?.(e.pointerId);
    });
    scroller.addEventListener('pointermove', e => {
      if (!down) return;
      scroller.scrollLeft = startScroll - (e.clientX - startX);
    });
    const stop = e => {
      down = false;
      scroller.classList.remove('dragging');
      try { scroller.releasePointerCapture?.(e.pointerId); } catch {}
    };
    scroller.addEventListener('pointerup', stop);
    scroller.addEventListener('pointercancel', stop);
    scroller.addEventListener('pointerleave', e => { if (down) stop(e); });
  });
})();
