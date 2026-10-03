(() => {
'use strict';
const section=document.getElementById('showreel');if(!section)return;
const frame=section.querySelector('.cinema-frame'),scenes=[...section.querySelectorAll('[data-cinema-scene]')],chapters=[...section.querySelectorAll('[data-cinema-chapter]')],reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 680px)');
let current=0,manual=null,manualScroll=0,scheduled=false;
const status=section.querySelector('.cinema-scroll-status');
const bounds=[0,.38,.70,1];
function activate(index){current=index;scenes.forEach((scene,i)=>{scene.classList.toggle('is-current',i===index);scene.inert=i!==index;scene.setAttribute('aria-hidden',String(i!==index));});chapters.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));}
function measure(){const range=Math.max(1,section.offsetHeight-innerHeight),progress=reduced.matches?0:Math.max(0,Math.min(1,-section.getBoundingClientRect().top/range)),shrink=Math.max(0,Math.min(1,(progress-.88)/.12)),eased=shrink*shrink*(3-2*shrink);frame.style.setProperty('--cinema-scale',String(1-eased*(mobile.matches?.06:.12)));frame.style.setProperty('--cinema-radius',String(eased*24)+'px');frame.style.setProperty('--cinema-progress',String(progress));if(manual!==null&&Math.abs(scrollY-manualScroll)>Math.max(120,innerHeight*.25))manual=null;const index=manual??(progress < .38 ? 0 : progress < .70 ? 1 : 2);if(index!==current)activate(index);const local=Math.max(0,Math.min(1,(progress-bounds[index])/(bounds[index+1]-bounds[index])));frame.style.setProperty('--scene-progress',String(local));if(status)status.textContent=String(index+1).padStart(2,'0')+' / 03 · '+Math.round(local*100)+'%';}
chapters.forEach((button,i)=>button.addEventListener('click',()=>{manual=i;manualScroll=scrollY;activate(i);frame.style.setProperty('--scene-progress','0');if(status)status.textContent=String(i+1).padStart(2,'0')+' / 03 · 0%';}));
addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;measure();});},{passive:true});addEventListener('resize',measure);reduced.addEventListener('change',measure);activate(0);measure();
})();
