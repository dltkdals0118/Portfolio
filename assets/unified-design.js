(() => {
'use strict';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
if(reduced.matches||!('IntersectionObserver' in window))return;
const targets=[...document.querySelectorAll('.selected-work .work-heading,.selected-work .work-row,.overview-results .results-heading,.overview-results .result-card,.detail-cover h1,.detail-cover .detail-summary,.next-projects a')];
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;entry.target.dataset.enter='shown';observer.unobserve(entry.target);}},{threshold:.08,rootMargin:'0px 0px -30px 0px'});
for(const [i,target]of targets.entries()){const rect=target.getBoundingClientRect();target.classList.add('unified-enter');target.style.setProperty('--enter-delay',`${Math.min(i%3,2)*65}ms`);target.dataset.enter=rect.top<innerHeight&&rect.bottom>0?'shown':'waiting';if(target.dataset.enter==='waiting')observer.observe(target);}
reduced.addEventListener('change',()=>{if(!reduced.matches)return;observer.disconnect();targets.forEach(target=>target.dataset.enter='shown');});
})();
