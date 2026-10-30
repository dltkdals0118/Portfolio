(() => {
  const root=document.documentElement, section=document.getElementById('work');
  if(!section)return;
  const button=section.querySelector('[data-work-motion]'), visuals=[...section.querySelectorAll('.work-visual')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=false;
  const sync=()=>{const stopped=paused||document.hidden||root.classList.contains('motion-paused');section.classList.toggle('work-motion-paused',stopped);button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(stopped));button.textContent=reduced.matches?'모션 줄이기 적용':stopped?'모션 재생 ▷':'모션 일시정지 Ⅱ';};
  button.addEventListener('click',()=>{paused=!paused;sync();});
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-visible',entry.isIntersecting)),{threshold:.12});visuals.forEach(v=>observer.observe(v));sync();
})();
