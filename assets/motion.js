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

// Empty entries preserve verified screenshots. Only supplied recordings become video.
(async () => {
  try {
    const response = await fetch('assets/media-manifest.json');
    if (!response.ok) return;
    const { recordings } = await response.json();
    const videos = [];
    for (const [key, item] of Object.entries(recordings || {})) {
      if (!item?.src || !/^assets\/[a-zA-Z0-9_/-]+\.(mp4|webm)$/.test(item.src)) continue;
      const targets = [...document.querySelectorAll('[data-media-slot="' + key + '"]')];
      for (const target of targets) {
        target.hidden = false;
        const preview = target.querySelector('.agent-preview,.practice-preview,.project-media');
        const shell = document.createElement('div');
        shell.className = 'video-shell';
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'none';
        video.src = item.src;
        video.poster = item.poster || preview?.querySelector('img')?.getAttribute('src') || '';
        video.setAttribute('aria-label', item.title || '실제 업무 화면 녹화');
        if (item.captions && /^assets\/[a-zA-Z0-9_/-]+\.vtt$/.test(item.captions)) {
          const track = document.createElement('track');
          track.kind = 'captions'; track.srclang = 'ko'; track.label = '한국어'; track.src = item.captions; track.default = true;
          video.append(track);
        }
        shell.append(video);
        if (preview) preview.replaceWith(shell); else target.append(shell);
        videos.push(video);
      }
    }
    const pauseHidden = new IntersectionObserver(entries => entries.forEach(e => { if (!e.isIntersecting) e.target.pause(); }), { threshold: .1 });
    videos.forEach(video => pauseHidden.observe(video));
    document.addEventListener('visibilitychange', () => { if (document.hidden) videos.forEach(v => v.pause()); });
  } catch (error) {
    console.warn('영상 대신 기존 증빙 화면을 표시합니다.', error);
  }
})();
