/* 히어로 마스코트 — 3D 캐릭터. 번들 전 원본이다.
 *
 *  이 파일은 그대로 쓰이지 않는다. `scripts/build-character3d.mjs` 가
 *  three.js 와 함께 묶어 `assets/character3d.js` 를 만든다. 이 사이트는
 *  node_modules 가 없는 정적 사이트라, 묶은 결과만 저장소에 둔다.
 *
 *  모델 정본은 LIFE 쪽이다 — `LIFE/app/assets3d/life_boy.blend`.
 *  `assets/character.glb` 는 거기서 내보낸 것을 복사한 것이고, blink·breathe
 *  **모프 타깃만** 들어 있다(애니메이션 클립은 없다). 깜빡임 간격을 불규칙하게
 *  주려면 고정 클립보다 모프 값을 직접 움직이는 쪽이 자연스럽다.
 *
 *  이 사이트의 모션 규칙을 따른다 — `prefers-reduced-motion` 과
 *  `html.motion-paused`(히어로의 '동작 멈춤' 버튼). 멈춰 있으면 한 장만 그린다.
 */

import {
  AmbientLight, DirectionalLight, HemisphereLight, PerspectiveCamera,
  Scene, SRGBColorSpace, ACESFilmicToneMapping, WebGLRenderer,
} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const MODEL_H = 1.388;       // 모델 키(m) — life_boy.blend 가 이 값으로 서 있다
const FOOT_PAD = 0.03;       // 칸 바닥에서 발까지 띄우는 비율
const BREATHE_SEC = 4.2;
const BLINK_CLOSE = 0.09;
const BLINK_OPEN = 0.13;
const BLINK_GAP = [3.2, 7.4];

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const host = document.querySelector('[data-character3d]');

if (host && hasWebGL()) {
  // 히어로에 들어오기 전에는 2.9MB(스크립트+모델)를 받지 않는다.
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    start(host);
  }, {rootMargin: '200px'});
  io.observe(host);
}

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function start(el) {
  const renderer = new WebGLRenderer({alpha: true, antialias: true});
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  el.appendChild(canvas);

  const scene = new Scene();

  // 축 주의 — 블렌더는 Z 가 위지만 glTF 는 Y 가 위다. 모델은 Y 로 서서 +Z 를 본다.
  const fov = 26;
  const box = el.getBoundingClientRect();
  const frameH = MODEL_H / (1 - FOOT_PAD * 2);
  const dist = (frameH / 2) / Math.tan((fov / 2) * Math.PI / 180);
  const centreY = frameH / 2 - FOOT_PAD * frameH;
  const camera = new PerspectiveCamera(fov, (box.width || 1) / (box.height || 1), 0.1, 30);
  camera.position.set(0, centreY, dist);
  camera.lookAt(0, centreY, 0);

  // 배경이 주황(#ff5a1f)이라 반사광이 따뜻하다. 그걸 빛에 넣어야 붙어 보인다.
  const key = new DirectionalLight(0xfff1dc, 3.0);
  key.position.set(1.6, 2.8, 2.8);
  scene.add(key);
  const bounce = new DirectionalLight(0xff8a4a, 1.5);   // 주황 바닥에서 올라오는 반사
  bounce.position.set(-1.2, -1.6, 1.8);
  scene.add(bounce);
  const rim = new DirectionalLight(0xffd9a8, 2.0);
  rim.position.set(-2.6, 1.6, -1.8);
  scene.add(rim);
  scene.add(new HemisphereLight(0xffffff, 0xff7a3c, 1.3));
  scene.add(new AmbientLight(0xffffff, 0.3));

  let mesh = null, iBlink = -1, iBreathe = -1, frame = 0, visible = true;

  new GLTFLoader().load('assets/character.glb', gltf => {
    gltf.scene.traverse(o => {
      if (o.isMesh && o.morphTargetDictionary && !mesh) {
        mesh = o;
        iBlink = o.morphTargetDictionary.blink ?? -1;
        iBreathe = o.morphTargetDictionary.breathe ?? -1;
      }
    });
    scene.add(gltf.scene);
    el.setAttribute('data-ready', '');
    resize();
    draw(0);
  }, undefined, err => console.warn('[character3d] 모델을 읽지 못했습니다', err));

  function resize() {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(r.width * dpr), Math.round(r.height * dpr), false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(el);

  const t0 = performance.now();
  let blinkAt = rand(BLINK_GAP[0], BLINK_GAP[1]);

  function still() {
    return reduced.matches || root.classList.contains('motion-paused');
  }

  function blinkValue(t) {
    const d = t - blinkAt;
    if (d < 0) return 0;
    if (d < BLINK_CLOSE) return d / BLINK_CLOSE;
    if (d < BLINK_CLOSE + BLINK_OPEN) return 1 - (d - BLINK_CLOSE) / BLINK_OPEN;
    blinkAt = t + rand(BLINK_GAP[0], BLINK_GAP[1]);
    return 0;
  }

  function draw(t) {
    if (mesh && mesh.morphTargetInfluences) {
      const inf = mesh.morphTargetInfluences;
      const quiet = still();
      if (iBreathe >= 0) {
        inf[iBreathe] = quiet ? 0.35 : 0.5 - 0.5 * Math.cos((t / BREATHE_SEC) * Math.PI * 2);
      }
      if (iBlink >= 0) inf[iBlink] = quiet ? 0 : blinkValue(t);
    }
    renderer.render(scene, camera);
  }

  function loop(now) {
    frame = requestAnimationFrame(loop);
    // 멈춤 상태에서도 루프는 돈다 — 버튼으로 다시 켤 때 바로 이어지게.
    // 다만 보이지 않으면 그리지 않는다.
    if (!visible || document.hidden) return;
    draw((now - t0) / 1000);
  }
  frame = requestAnimationFrame(loop);

  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, {threshold: 0.01}).observe(el);
  window.addEventListener('pagehide', () => cancelAnimationFrame(frame), {once: true});
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}
