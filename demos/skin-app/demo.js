(() => {
 'use strict';
 const params=new URLSearchParams(location.search), embedded=params.get('embed')==='1';
 if(embedded)document.body.classList.add('is-embedded');
 const routes={home:'home',reserve:'resvEntry',membership:'membership',consult:'consult',onboarding:'onboarding',doctors:'doctors'};
 const navigate=scene=>{
  if(!routes[scene])return;
  closeModal();document.getElementById('splash').classList.add('hide');
  if(scene==='onboarding'){S.member=false;S.guest=false;obPage=0;}
  else {S.member=true;S.guest=false;}
  reset(routes[scene]);
  if(embedded)parent.postMessage({type:'wacus:scene',scene},'*');
 };
 const nativeBind=bindCommon;
 bindCommon=function(el){nativeBind(el);el.querySelectorAll('input,textarea').forEach(x=>{x.autocomplete='off';x.spellcheck=false;});};
 const nativeRender=render;
 render=function(name,params,cls){const el=nativeRender(name,params,cls);if(embedded){const scene=Object.keys(routes).find(x=>routes[x]===name);if(scene)parent.postMessage({type:'wacus:scene',scene},'*');}return el;};
 document.getElementById('skin-reset').addEventListener('click',()=>location.reload());
 const status=document.querySelector('.statusbar');
 if(status){const span=document.createElement('span');span.className='sample-chip';span.textContent='SAMPLE · CLINIC B';status.insertBefore(span,status.lastElementChild);}
 addEventListener('message',event=>{if(!embedded||event.source!==parent)return;if(event.data?.type==='wacus:navigate')navigate(event.data.scene);});
 const roots=['modal','sheet'];
 const sync=()=>roots.forEach(id=>{const el=document.getElementById(id);if(el){const open=el.classList.contains('on');el.inert=!open;el.setAttribute('aria-hidden',String(!open));}});
 roots.forEach(id=>new MutationObserver(sync).observe(document.getElementById(id),{attributes:true,attributeFilter:['class']}));sync();
 addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(roots.some(id=>document.getElementById(id).classList.contains('on')))closeModal();else if(embedded)parent.postMessage({type:'wacus:escape'},'*');});
 if(embedded||params.get('start')==='1')navigate(params.get('scene')||'home');
 if(embedded)parent.postMessage({type:'wacus:ready'},'*');
})();
