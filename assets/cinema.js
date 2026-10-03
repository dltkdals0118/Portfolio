(() => {
'use strict';
const section=document.getElementById('showreel');if(!section)return;
const frame=section.querySelector('.cinema-frame'),scenes=[...section.querySelectorAll('[data-cinema-scene]')],chapters=[...section.querySelectorAll('[data-cinema-chapter]')],reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 680px)');
let current=0,manual=null,manualScroll=0,scheduled=false,targetProgress=0,displayProgress=0,lastTime=0,dirty=true;
const status=section.querySelector('.cinema-scroll-status');
const bounds=[0,.38,.70,1];
function activate(index){current=index;scenes.forEach((scene,i)=>{scene.classList.toggle('is-current',i===index);scene.inert=i!==index;scene.setAttribute('aria-hidden',String(i!==index));});chapters.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}
function measure(time){scheduled=false;if(document.hidden){lastTime=0;return;}if(dirty){dirty=false;const range=Math.max(1,section.offsetHeight-innerHeight),progress=reduced.matches?0:Math.max(0,Math.min(1,-section.getBoundingClientRect().top/range));targetProgress=progress;}const dt=lastTime?Math.min(48,time-lastTime):16.7;lastTime=time;displayProgress+=(targetProgress-displayProgress)*(reduced.matches?1:1-Math.exp(-dt/95));if(Math.abs(targetProgress-displayProgress)<.0001)displayProgress=targetProgress;const progress=displayProgress,shrink=Math.max(0,Math.min(1,(progress-.88)/.12)),eased=shrink*shrink*(3-2*shrink);frame.style.setProperty('--cinema-scale',String(1-eased*(mobile.matches?.06:.12)));frame.style.setProperty('--cinema-radius',String(eased*24)+'px');frame.style.setProperty('--cinema-progress',String(progress));if(manual!==null&&Math.abs(scrollY-manualScroll)>Math.max(120,innerHeight*.25))manual=null;const index=manual??(progress < .38 ? 0 : progress < .70 ? 1 : 2);if(index!==current)activate(index);const local=Math.max(0,Math.min(1,(progress-bounds[index])/(bounds[index+1]-bounds[index])));frame.style.setProperty('--scene-progress',String(local));if(status)status.textContent=String(index+1).padStart(2,'0')+' / 03 · '+Math.round(local*100)+'%';if(Math.abs(targetProgress-displayProgress)>.0001)requestFrame();else lastTime=0;}
chapters.forEach((button,i)=>button.addEventListener('click',()=>{manual=i;manualScroll=scrollY;activate(i);frame.style.setProperty('--scene-progress','0');if(status)status.textContent=String(i+1).padStart(2,'0')+' / 03 · 0%';}));
function requestFrame(){if(!scheduled){scheduled=true;requestAnimationFrame(measure);}}
function schedule(){dirty=true;requestFrame();}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});reduced.addEventListener('change',schedule);document.addEventListener('visibilitychange',schedule);activate(0);schedule();
})();
