(() => {
'use strict';
const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion:reduce)');
const paused=()=>reduced.matches||root.classList.contains('motion-paused');
const candidates=[...new Set(document.querySelectorAll('.reveal,.section:not(#top) h2,.section .section-label,.audit-card,.handoff-cases article,.agent-principles article,.result-brief>a,.prototype-demo,.beyond-list article,.selected-work .work-heading,.selected-work .work-row,.detail-cover h1,.detail-cover .detail-summary,.next-projects a'))];
const candidateSet=new Set(candidates);
const targets=candidates.filter(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(candidateSet.has(p))return false;return true;});
const show=el=>{el.classList.add('motion-shown');if(el.classList.contains('reveal'))el.classList.add('is-visible');};
const targetSet=new Set(targets);candidates.filter(el=>!targetSet.has(el)).forEach(show);
let enter, entranceHeight=innerHeight;
function observeEntrances(){
 enter?.disconnect();entranceHeight=innerHeight;
 enter=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){show(e.target);enter.unobserve(e.target);}}),{threshold:0,rootMargin:'-'+Math.round(innerHeight*.12)+'px 0px -'+Math.round(innerHeight*.30)+'px 0px'});
 targets.filter(el=>!el.classList.contains('motion-shown')).forEach(el=>enter.observe(el));
}
let entrancesStarted=false;
targets.forEach((el,i)=>{if(paused()){show(el);return;}el.classList.add('motion-enter');el.style.setProperty('--motion-delay',(i%3)*55+'ms');});
function beginEntrances(){if(entrancesStarted)return;entrancesStarted=true;if(paused())targets.forEach(show);else observeEntrances();}
document.addEventListener('portfolio:entryend',beginEntrances,{once:true});
const intro=document.getElementById('entry-intro');
if(!intro||intro.hidden)beginEntrances();
const items=[...document.querySelectorAll('.work-visual,.signature-visual')],visible=new Set();
const view=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)visible.add(e.target);else visible.delete(e.target)});schedule();},{rootMargin:'40px 0px',threshold:0});
items.forEach(el=>view.observe(el));
let scheduled=false,dirty=true,lastTime=0;
const motion=new Map();
const railElement=document.querySelector('.section-rail'),progressElement=document.querySelector('.scroll-progress'),header=document.querySelector('[data-header]');
let lastY=scrollY,headerHidden=false,documentHeight=root.scrollHeight;
new ResizeObserver(()=>{documentHeight=root.scrollHeight;schedule();}).observe(document.body);
const cycles=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('motion-in-view',e.isIntersecting)),{rootMargin:'80px 0px'});
document.querySelectorAll('.agent-story,.skills-band').forEach(el=>cycles.observe(el));
function render(time){
 scheduled=false;
 if(document.hidden){lastTime=0;return;}
 const dt=lastTime?Math.min(48,time-lastTime):16.7;lastTime=time;
 const alpha=paused()?1:1-Math.exp(-dt/95);
 if(dirty){
  dirty=false;
  const max=Math.max(1,documentHeight-innerHeight);
  const rail=Math.min(1,Math.max(0,scrollY/max));
  const updates=[];
  for(const el of visible){const r=el.getBoundingClientRect();const p=paused()?.5:Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));updates.push([el,p]);}
  railElement?.style.setProperty('--rail-progress',String(rail));
  if(progressElement)progressElement.style.transform='scaleX('+rail+')';
  const y=scrollY,hide=y>lastY&&y>200&&!header?.contains(document.activeElement);
  if(hide!==headerHidden){header?.classList.toggle('hide',hide);headerHidden=hide;}lastY=y;
  for(const [el,p] of updates){const state=motion.get(el)||{value:p,target:p};state.target=p;motion.set(el,state);}
 }
 let moving=false;
 for(const el of visible){const state=motion.get(el);if(!state)continue;state.value+=(state.target-state.value)*alpha;if(Math.abs(state.target-state.value)>.0002)moving=true;else state.value=state.target;el.style.setProperty('--visual-progress',state.value.toFixed(5));}
 if(moving)requestFrame();else lastTime=0;
}
function requestFrame(){if(!scheduled){scheduled=true;requestAnimationFrame(render)}}
function schedule(){dirty=true;requestFrame();}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',()=>{if(entrancesStarted&&Math.abs(innerHeight-entranceHeight)>64)observeEntrances();schedule()},{passive:true});
document.addEventListener('portfolio:motionchange',()=>{if(paused())targets.forEach(show);schedule()});
reduced.addEventListener('change',()=>{if(paused())targets.forEach(show);schedule()});
document.addEventListener('visibilitychange',schedule);schedule();
})();
