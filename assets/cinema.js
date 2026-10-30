(() => {
'use strict';
const section=document.getElementById('showreel');if(!section)return;
const root=document.documentElement,frame=section.querySelector('.cinema-frame');
const scenes=[...section.querySelectorAll('[data-cinema-scene]')],chapters=[...section.querySelectorAll('[data-cinema-chapter]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 680px)'),status=section.querySelector('.cinema-scroll-status');
const bounds=[0,.38,.70,1],lastStyles=new Map();
let current=0,manual=null,manualScroll=0,frameId=0,target=0,display=0,lastTime=0,dirty=true,inView=false,lastStatus='';
const paused=()=>reduced.matches||root.classList.contains('motion-paused');
function set(name,value){if(lastStyles.get(name)===value)return;lastStyles.set(name,value);frame.style.setProperty(name,value);}
function activate(index){
 current=index;
 scenes.forEach((scene,i)=>{const active=i===index;scene.classList.toggle('is-current',active);scene.inert=!active;scene.setAttribute('aria-hidden',String(!active));});
 chapters.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
}
function render(time){
 frameId=0;if(document.hidden||!inView){lastTime=0;return;}
 if(dirty){dirty=false;const range=Math.max(1,section.offsetHeight-innerHeight);target=reduced.matches?0:Math.max(0,Math.min(1,-section.getBoundingClientRect().top/range));}
 const dt=lastTime?Math.min(48,time-lastTime):16.7;lastTime=time;
 display+=(target-display)*(paused()?1:1-Math.exp(-dt/95));
 if(Math.abs(target-display)<.0001)display=target;
 const shrink=paused()?0:Math.max(0,Math.min(1,(display-.88)/.12)),eased=shrink*shrink*(3-2*shrink);
 set('--cinema-scale',(1-eased*(mobile.matches?.06:.12)).toFixed(5));
 set('--cinema-radius',(eased*24).toFixed(2)+'px');
 set('--cinema-progress',display.toFixed(5));
 if(manual!==null&&Math.abs(scrollY-manualScroll)>Math.max(120,innerHeight*.25))manual=null;
 const index=manual??(display<.38?0:display<.70?1:2);
 if(index!==current)activate(index);
 const local=manual!==null?0:Math.max(0,Math.min(1,(display-bounds[index])/(bounds[index+1]-bounds[index])));
 set('--scene-progress',local.toFixed(5));
 const label=String(index+1).padStart(2,'0')+' / 03 · '+Math.round(local*100)+'%';
 if(status&&label!==lastStatus){status.textContent=label;lastStatus=label;}
 if(Math.abs(target-display)>.0001)requestFrame();else lastTime=0;
}
function requestFrame(){if(!frameId&&inView&&!document.hidden)frameId=requestAnimationFrame(render);}
function schedule(){dirty=true;requestFrame();}
chapters.forEach((button,i)=>button.addEventListener('click',()=>{manual=i;manualScroll=scrollY;activate(i);schedule();}));
new IntersectionObserver(entries=>{
 inView=entries[0].isIntersecting;
 if(inView)schedule();else{cancelAnimationFrame(frameId);frameId=0;lastTime=0;}
},{threshold:0}).observe(section);
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',schedule,{passive:true});
reduced.addEventListener('change',schedule);
document.addEventListener('portfolio:motionchange',schedule);
document.addEventListener('visibilitychange',schedule);
activate(0);
})();
