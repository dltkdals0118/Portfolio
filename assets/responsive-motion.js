(() => {
'use strict';
const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion:reduce)');
const paused=()=>reduced.matches||root.classList.contains('motion-paused');
const targets=[...document.querySelectorAll('.section:not(#top) h2,.section .section-label,.audit-card,.handoff-cases article,.agent-principles article,.result-brief>a,.prototype-demo,.beyond-list article')];
const enter=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('motion-shown');enter.unobserve(e.target);}}),{threshold:.08,rootMargin:'0px 0px -24px 0px'});
targets.forEach((el,i)=>{if(paused())return;el.classList.add('motion-enter');el.style.setProperty('--motion-delay',(i%3)*45+'ms');const r=el.getBoundingClientRect();if(r.top<innerHeight&&r.bottom>0)el.classList.add('motion-shown');else enter.observe(el);});
const items=[...document.querySelectorAll('.work-visual,.signature-visual')],visible=new Set();
const view=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target)});schedule();},{rootMargin:'40px 0px',threshold:0});
items.forEach(el=>view.observe(el));
let scheduled=false;
function render(){
 scheduled=false;
 if(document.hidden)return;
 const max=Math.max(1,root.scrollHeight-innerHeight);
 root.style.setProperty('--rail-progress',String(Math.min(1,Math.max(0,scrollY/max))));
 const updates=[];
 for(const el of visible){const r=el.getBoundingClientRect();const p=paused()?.5:Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));updates.push([el,p]);}
 for(const [el,p] of updates)el.style.setProperty('--visual-progress',p.toFixed(4));
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(render)}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});
document.addEventListener('portfolio:motionchange',()=>{if(paused())targets.forEach(el=>el.classList.add('motion-shown'));schedule()});
reduced.addEventListener('change',()=>{if(paused())targets.forEach(el=>el.classList.add('motion-shown'));schedule()});
document.addEventListener('visibilitychange',schedule);render();
})();
