/* 히어로 오피스 장면 — 책상에서 타자 치는 캐릭터. 번들 전 원본이다.
 *
 *  이 파일은 그대로 쓰이지 않는다. `scripts/build-character3d.mjs` 가
 *  three.js 와 함께 묶어 `assets/character3d.js` 를 만든다. 이 사이트는
 *  node_modules 가 없는 정적 사이트라, 묶은 결과만 저장소에 둔다.
 *
 *  `assets/desk-scene.glb` 에는 오피스 디오라마와 앉은 캐릭터가 함께 들어 있다.
 *  만든 것은 `assets3d/office.py`(사무실)와 LIFE 쪽 `life_boy.blend`(캐릭터)다.
 *
 *  모프 타깃 넷만 싣고 값은 여기서 움직인다:
 *    type_l · type_r  양손이 번갈아 내려간다
 *    blink            눈을 감는다
 *    breathe          가슴이 부푼다
 *  고정 클립을 쓰지 않는 이유 — 타자도 깜빡임도 **간격이 일정하면 기계로 보인다.**
 *  여기서는 속도를 흔들고 가끔 손을 멈춘다(생각하는 순간).
 *
 *  이 사이트의 모션 규칙을 따른다 — `prefers-reduced-motion` 과
 *  `html.motion-paused`(히어로의 '동작 멈춤' 버튼). 멈춰 있으면 한 장만 그린다.
 */

import {
  AmbientLight, DirectionalLight, HemisphereLight, PerspectiveCamera,
  Scene, SRGBColorSpace, ACESFilmicToneMapping, WebGLRenderer, Vector3, Box3,
} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

/* 카메라는 **장면을 재서** 잡는다. 좌표를 손으로 박아 두면 사무실에 물건을
   하나 더 놓을 때마다 잘린다. 보는 각도만 고정하고 거리는 계산한다.
   축 주의: 내보내면서 Y-up 으로 바뀐다.  three(x, y, z) = blender(x, z, -y) */
const VIEW_DIR = new Vector3(0.20, 0.34, 1).normalize();   // 앞에서 살짝 내려다본다
const FIT_MARGIN = 1.10;
const FOV = 30;

const STROKE_HZ = 2.9;        // 한 손이 1초에 두드리는 횟수
const BREATHE_SEC = 4.6;
const BLINK_CLOSE = 0.09;
const BLINK_OPEN = 0.13;
const BLINK_GAP = [3.0, 7.0];
const PAUSE_GAP = [4.0, 9.0]; // 타자를 멈추고 생각하는 간격
const PAUSE_LEN = [0.8, 2.2];

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const host = document.querySelector('[data-character3d]');

if (host && hasWebGL()) {
  // 히어로에 들어오기 전에는 스크립트도 모델도 받지 않는다.
  const io = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    io.disconnect();
    start(host);
  }, {rootMargin: '220px'});
  io.observe(host);
}

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

/** 한 번 두드리는 모양. 빠르게 내려갔다 천천히 올라온다. */
function stroke(x) {
  const s = Math.sin(x);
  return s > 0 ? Math.pow(s, 0.7) : 0;
}

function start(el) {
  const renderer = new WebGLRenderer({alpha: true, antialias: true});
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  el.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  let model = null;

  /** 장면 전체가 화면에 들어오도록 카메라 거리를 계산한다. */
  function frame() {
    if (!model) return;
    const box = new Box3().setFromObject(model);
    const size = new Vector3(), centre = new Vector3();
    box.getSize(size); box.getCenter(centre);
    const v = (FOV * Math.PI) / 180;
    const fitH = (size.y / 2) / Math.tan(v / 2);
    const fitW = (size.x / 2) / Math.tan(v / 2) / camera.aspect;
    const dist = Math.max(fitH, fitW) * FIT_MARGIN + size.z / 2;
    camera.position.copy(centre).addScaledVector(VIEW_DIR, dist);
    camera.lookAt(centre);
  }

  // 파스텔 디오라마는 그림자보다 **부드럽게 고르게** 비춰야 레퍼런스처럼 읽힌다.
  const key = new DirectionalLight(0xfff6ec, 2.5);
  key.position.set(2.2, 4.0, 3.2);
  scene.add(key);
  const fill = new DirectionalLight(0xdfe4ff, 1.3);
  fill.position.set(-3.0, 1.6, 2.2);
  scene.add(fill);
  const back = new DirectionalLight(0xffffff, 0.8);
  back.position.set(-0.6, 2.2, -3.0);
  scene.add(back);
  scene.add(new HemisphereLight(0xffffff, 0xb9b6ea, 1.5));
  scene.add(new AmbientLight(0xffffff, 0.35));

  let morphs = null;   // {mesh, i:{type_l,type_r,blink,breathe}}
  let raf = 0;
  let visible = true;

  new GLTFLoader().load('assets/desk-scene.glb', gltf => {
    gltf.scene.traverse(o => {
      if (o.isMesh && o.morphTargetDictionary && !morphs) {
        morphs = {mesh: o, i: o.morphTargetDictionary};
      }
    });
    model = gltf.scene;
    scene.add(model);
    el.setAttribute('data-ready', '');
    resize();
    draw(0);
  }, undefined, err => console.warn('[character3d] 장면을 읽지 못했습니다', err));

  function resize() {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(r.width * dpr), Math.round(r.height * dpr), false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    frame();
  }
  resize();
  new ResizeObserver(resize).observe(el);

  const t0 = performance.now();
  let blinkAt = rand(BLINK_GAP[0], BLINK_GAP[1]);
  let pauseAt = rand(PAUSE_GAP[0], PAUSE_GAP[1]);
  let pauseTo = -1;
  let phase = 0;        // 타자 위상. 속도를 흔들어야 메트로놈처럼 안 들린다
  let speed = STROKE_HZ;
  let last = 0;

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
    const dt = Math.min(Math.max(t - last, 0), 0.1);
    last = t;
    if (morphs) {
      const inf = morphs.mesh.morphTargetInfluences;
      const idx = morphs.i;
      const quiet = still();

      if (idx.breathe !== undefined) {
        inf[idx.breathe] = quiet ? 0.35
          : 0.5 - 0.5 * Math.cos((t / BREATHE_SEC) * Math.PI * 2);
      }
      if (idx.blink !== undefined) inf[idx.blink] = quiet ? 0 : blinkValue(t);

      // 타자 — 가끔 멈춰 생각하고, 속도가 조금씩 흔들린다
      if (!quiet) {
        if (pauseTo < 0 && t > pauseAt) pauseTo = t + rand(PAUSE_LEN[0], PAUSE_LEN[1]);
        if (pauseTo > 0 && t > pauseTo) {
          pauseTo = -1;
          pauseAt = t + rand(PAUSE_GAP[0], PAUSE_GAP[1]);
          speed = STROKE_HZ * rand(0.85, 1.2);
        }
        const typing = pauseTo > 0 ? 0 : 1;
        phase += dt * speed * Math.PI * 2;
        if (idx.type_l !== undefined) inf[idx.type_l] = typing * stroke(phase);
        if (idx.type_r !== undefined) inf[idx.type_r] = typing * stroke(phase + Math.PI);
      } else {
        if (idx.type_l !== undefined) inf[idx.type_l] = 0;
        if (idx.type_r !== undefined) inf[idx.type_r] = 0;
      }
    }
    renderer.render(scene, camera);
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    draw((now - t0) / 1000);
  }
  raf = requestAnimationFrame(loop);

  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, {threshold: 0.01}).observe(el);
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), {once: true});
}
