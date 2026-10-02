(() => {
'use strict';
const section=document.getElementById('showreel');if(!section)return;
const frame=section.querySelector('.cinema-frame'),canvas=section.querySelector('canvas'),scenes=[...section.querySelectorAll('[data-cinema-scene]')],chapters=[...section.querySelectorAll('[data-cinema-chapter]')],button=section.querySelector('[data-cinema-pause]'),root=document.documentElement;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width: 680px)');
let visible=false,paused=false,progress=0,current=0,manual=null,manualScroll=0,lastTime=0,time=0,raf=0,dirty=true,renderer=null;
const vertex=`attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}`;
const fragment=`precision highp float;
uniform vec2 u_resolution;uniform float u_time;uniform float u_scroll;uniform float u_chapter;
mat2 R(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float torus(vec3 p,vec2 t){return length(vec2(length(p.xz)-t.x,p.y))-t.y;}
float scene(vec3 p){p.xz*=R(u_time*.17+u_scroll*2.);p.xy*=R(.45+u_time*.11);p.yz*=R(.65);float a=torus(p,vec2(1.23,.105));p.xy*=R(1.047);float b=torus(p,vec2(1.23,.085));p.xy*=R(1.047);float c=torus(p,vec2(1.23,.07));return min(a,min(b,c));}
vec3 normal(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(scene(p+e.xyy)-scene(p-e.xyy),scene(p+e.yxy)-scene(p-e.yxy),scene(p+e.yyx)-scene(p-e.yyx)));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*u_resolution)/u_resolution.y;float t=u_time;vec3 ro=vec3(0.,0.,4.3),rd=normalize(vec3(uv-vec2(.13,.02),-1.65));
vec3 accent=mix(vec3(.82,.98,.31),vec3(.23,.44,1.),smoothstep(0.,1.,u_chapter));accent=mix(accent,vec3(.75,.94,.46),smoothstep(1.,2.,u_chapter));
vec3 col=vec3(.014,.025,.057);float glow=0.,dist=0.;vec3 p=ro;float d=1.;for(int i=0;i<40;i++){p=ro+rd*dist;d=scene(p);glow+=.006/(.02+abs(d));if(d<.003||dist>7.)break;dist+=d*.8;}
float neb=exp(-length(uv-vec2(.2,.02))*1.4);col+=vec3(.024,.055,.14)*neb;col+=accent*glow*.027;
if(d<.006){vec3 n=normal(p);vec3 light=normalize(vec3(-.6,1.,2.));float diffuse=max(dot(n,light),0.);float fresnel=pow(1.-max(dot(n,-rd),0.),2.6);float spec=pow(max(dot(reflect(-light,n),-rd),0.),32.);float bands=.5+.5*sin(p.y*22.+p.x*8.+t*.5);col=accent*(.08+diffuse*.2)+vec3(.5,.62,.85)*spec+accent*fresnel*1.2+accent*bands*.08;}
vec2 flooruv=uv;float perspective=1./max(.12,abs(flooruv.y+.5));float grid=abs(sin(flooruv.x*perspective*4.+t*.1))*abs(sin(perspective*2.-t*.25));col+=accent*.06*pow(1.-grid,12.)*(1.-smoothstep(-.65,-.05,uv.y));
for(int i=0;i<18;i++){float f=float(i);vec2 point=vec2(sin(f*53.1)*1.4,cos(f*17.7+t*.035)*.9);float star=.000018/(dot(uv-point,uv-point)+.00004);col+=accent*star*.15;}
col+=(hash(gl_FragCoord.xy+t)-.5)*.018;col*=1.-.25*length(uv);gl_FragColor=vec4(pow(max(col,vec3(0.)),vec3(.9)),1.);}`;
function makeRenderer(){
const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl){console.info('[cinema] WebGL unavailable; using CSS orbit renderer.');return null;}
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn('[cinema] Shader:',gl.getShaderInfoLog(s));gl.deleteShader(s);return null;}return s;}
const v=shader(gl.VERTEX_SHADER,vertex),f=shader(gl.FRAGMENT_SHADER,fragment);if(!v||!f)return null;
const program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))return null;
gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
const res=gl.getUniformLocation(program,'u_resolution'),clock=gl.getUniformLocation(program,'u_time'),scroll=gl.getUniformLocation(program,'u_scroll'),chapter=gl.getUniformLocation(program,'u_chapter');
return {resize(){const b=frame.getBoundingClientRect(),cap=mobile.matches?650:1150,ratio=Math.min(1.25,cap/Math.max(1,b.width));canvas.width=Math.round(b.width*ratio);canvas.height=Math.round(b.height*ratio);gl.viewport(0,0,canvas.width,canvas.height);},draw(){gl.uniform2f(res,canvas.width,canvas.height);gl.uniform1f(clock,time);gl.uniform1f(scroll,progress);gl.uniform1f(chapter,current);gl.drawArrays(gl.TRIANGLES,0,6);}};
}
const orbit=document.createElement('div');orbit.className='cinema-orbit';orbit.setAttribute('aria-hidden','true');orbit.innerHTML='<i></i><i></i><i></i>';frame.insertBefore(orbit,frame.firstChild);
function activate(index){if(index===current&&scenes[index].classList.contains('is-current'))return;current=index;scenes.forEach((scene,i)=>{const on=i===index;scene.classList.toggle('is-current',on);scene.inert=!on;scene.setAttribute('aria-hidden',String(!on));});chapters.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));frame.dataset.chapter=String(index);dirty=true;}
const isPaused=()=>paused||reduced.matches||root.classList.contains('motion-paused');
function sync(){const stop=isPaused();frame.classList.toggle('is-paused',stop);button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(stop));button.textContent=reduced.matches?'모션 줄이기 적용':stop?'모션 재생 ▷':'모션 멈춤 Ⅱ';dirty=true;wake();}
function measure(){const rect=section.getBoundingClientRect(),range=Math.max(1,section.offsetHeight-innerHeight);progress=reduced.matches?0:Math.max(0,Math.min(1,-rect.top/range));const shrink=Math.max(0,Math.min(1,(progress-.55)/.45));const eased=shrink*shrink*(3.-2.*shrink);frame.style.setProperty('--cinema-scale',String(1-eased*(mobile.matches?.08:.16)));frame.style.setProperty('--cinema-radius',(eased*(mobile.matches?22:38))+'px');frame.style.setProperty('--cinema-progress',String(progress));if(manual!==null&&Math.abs(scrollY-manualScroll)>45)manual=null;if(progress>.06&&manual===null)activate(Math.min(2,Math.floor(progress*3)));dirty=true;wake();}
function tick(now){raf=0;if(!visible||document.hidden)return;const elapsed=lastTime?Math.min(.08,(now-lastTime)/1000):0;const stopped=isPaused();const budget=mobile.matches?33:24;if(!lastTime||now-lastTime>=budget||dirty){if(!stopped)time+=elapsed;lastTime=now;if(!stopped&&progress<=.06&&manual===null)activate(Math.floor(time/6)%3);if(renderer)renderer.draw();dirty=false;}if(!stopped)raf=requestAnimationFrame(tick);}
function wake(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(tick);}
try{renderer=makeRenderer();if(renderer){renderer.resize();frame.classList.add('has-webgl');}}catch(_){renderer=null;}
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer=null;frame.classList.remove('has-webgl');});
button.addEventListener('click',()=>{paused=!paused;sync();});chapters.forEach((b,i)=>b.addEventListener('click',()=>{manual=i;manualScroll=scrollY;activate(i);dirty=true;wake();}));
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;section.classList.toggle('in-view',visible);lastTime=0;if(!visible&&raf){cancelAnimationFrame(raf);raf=0;}wake();},{threshold:.02}).observe(section);
let scheduled=false;addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;measure();});},{passive:true});
addEventListener('resize',()=>{if(renderer)renderer.resize();measure();});new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});reduced.addEventListener('change',()=>{measure();sync();});document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0;}wake();});measure();sync();
})();
