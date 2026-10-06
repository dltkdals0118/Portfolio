(() => {
  'use strict';
  const showcase = document.querySelector('[data-agent-demo]');
  if (!showcase) return;
  const video = showcase.querySelector('video');
  const buttons = [...showcase.querySelectorAll('[data-agent-time]')];
  const description = showcase.querySelector('[data-agent-description]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let userPaused = false;
  let automaticPause = false;
  let pendingTime = null;
  let activeChapter = -1;

  const play = () => {
    if (!visible || document.hidden) return;
    video.play().then(() => {
      if (!visible || document.hidden) pause();
    }).catch(() => { /* Native controls remain available. */ });
  };
  const pause = () => {
    if (video.paused) return;
    automaticPause = true;
    video.pause();
  };
  const syncPlayback = () => {
    const allowed = visible && !document.hidden && !reducedMotion.matches &&
      !document.documentElement.classList.contains('motion-paused') &&
      !document.body.classList.contains('motion-paused') &&
      !navigator.connection?.saveData;
    if (allowed && !userPaused && pendingTime === null) play();
    else pause();
  };
  const selectChapter = index => {
    if (index === activeChapter) return;
    activeChapter = index;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    description.textContent = buttons[index].dataset.agentDescription;
  };
  const updateChapter = () => {
    let index = 0;
    buttons.forEach((button, i) => { if (video.currentTime >= Number(button.dataset.agentTime)) index = i; });
    selectChapter(index);
  };
  buttons.forEach((button, i) => button.addEventListener('click', () => {
    userPaused = false;
    selectChapter(i);
    const time = Number(button.dataset.agentTime);
    if (video.readyState >= 1) {
      video.currentTime = Math.min(time, Math.max(0, video.duration - .1));
      play();
    } else {
      pendingTime = time;
      video.preload = 'metadata';
      video.load();
    }
  }));
  video.addEventListener('loadedmetadata', () => {
    if (pendingTime === null) return;
    video.currentTime = Math.min(pendingTime, Math.max(0, video.duration - .1));
    pendingTime = null;
    play();
  });
  video.addEventListener('pause', () => {
    if (automaticPause) { automaticPause = false; return; }
    userPaused = true;
  });
  video.addEventListener('play', () => { userPaused = false; });
  video.addEventListener('timeupdate', updateChapter);
  video.addEventListener('error', () => {
    description.textContent = '영상이 열리지 않으면 아래 영상 새 탭 링크로 확인해 주세요.';
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .2;
      syncPlayback();
    }, { threshold: [0, .2] }).observe(video);
  }
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
  const observer = new MutationObserver(syncPlayback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  selectChapter(0);
})();
