/* 히어로 오피스 장면 — 책상에서 타자 치는 캐릭터. 번들 전 원본이다.
 *
 *  이 파일은 그대로 쓰이지 않는다. `scripts/build-character3d.mjs` 가
 *  three.js 와 함께 묶어 `assets/character3d.js` 를 만든다. 이 사이트는
 *  node_modules 가 없는 정적 사이트라, 묶은 결과만 저장소에 둔다.
 *
 *  `assets/desk-scene.glb` 에는 오피스 디오라마와 앉은 캐릭터가 함께 들어 있다.
 *  만든 것은 `assets3d/office.py`(사무실)와 LIFE 쪽 `life_boy.blend`(캐릭터)다.
 *  LIFE 홈에도 같은 파일이 들어간다.
 *
 *  **포즈는 뼈대가 아니라 모프로 낸다.** glb 에 여덟이 실려 있다:
 *    type_l · type_r   양손이 번갈아 내려간다
 *    blink · breathe   눈 · 가슴
 *    head_up · head_tilt · lean_in · lean_back   의사 본(정점 회전)
 *  고정 클립을 쓰지 않는 이유 — 타자도 깜빡임도 **간격이 일정하면 기계로 보인다.**
 *  속도를 흔들고 가끔 손을 멈춘다(생각하는 순간).
 *
 *  **입체감은 조명보다 그림자와 시차에서 온다.** 바닥 그림자로 바닥에 붙이고,
 *  포인터를 따라 카메라를 조금 돌린다. 둘 다 없으면 잘 그린 그림으로 보인다.
 *
 *  이 사이트의 모션 규칙을 따른다 — `prefers-reduced-motion` 과
 *  `html.motion-paused`(히어로의 '동작 멈춤' 버튼). 멈춰 있으면 한 장만 그린다.
 */

import {
  AmbientLight, DirectionalLight, HemisphereLight, PerspectiveCamera,
  Scene, SRGBColorSpace, ACESFilmicToneMapping, WebGLRenderer, Vector3, Box3,
  PCFShadowMap, PlaneGeometry, ShadowMaterial, Mesh, PMREMGenerator,
} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/* 카메라는 **장면을 재서** 잡는다. 좌표를 손으로 박아 두면 사무실에 물건을
   하나 더 놓을 때마다 잘린다. 보는 각도만 고정하고 거리는 계산한다.
   축 주의: 내보내면서 Y-up 으로 바뀐다.  three(x, y, z) = blender(x, z, -y) */
const VIEW_DIR = new Vector3(0.20, 0.34, 1).normalize();
const FIT_MARGIN = 1.04;      // 1 에 가까울수록 꽉 찬다
const FOV = 30;
const PARALLAX = 0.16;        // 포인터를 따라 카메라가 도는 폭(라디안)

const STROKE_HZ = 2.9;        // 한 손이 1초에 두드리는 횟수
const BREATHE_SEC = 4.6;
const BLINK_CLOSE = 0.09;
const BLINK_OPEN = 0.13;
const BLINK_GAP = [3.0, 7.0];
const PAUSE_GAP = [4.0, 9.0];
const PAUSE_LEN = [0.8, 2.2];
const REACT_SEC = 1.6;        // 클릭 반응이 지속되는 시간

/** 마우스를 올렸을 때 — 하던 일을 멈추고 이쪽을 본다. */
const HOVER_POSE = {head_up: 1.0, head_tilt: 0.30, lean_in: 0, lean_back: 0.25, typing: 0.25};
/** 그냥 일하는 중. 약간 앞으로 기울어 있어야 일하는 자세로 읽힌다. */
const IDLE_POSE = {head_up: 0, head_tilt: 0, lean_in: 0.22, lean_back: 0, typing: 1};
/** 누를 때마다 돌아가며 나온다 — 같은 반응이 반복되면 장치로 보인다. */
const REACTIONS = [
  {head_up: 1.0, head_tilt: 0.15, lean_in: 0, lean_back: 1.0, typing: 0},    // 기지개
  {head_up: 0.8, head_tilt: 1.0, lean_in: 0, lean_back: 0.3, typing: 0},     // 갸웃
  {head_up: 0.2, head_tilt: 0, lean_in: 1.0, lean_back: 0, typing: 1},       // 몰입
];

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

/** 목표값으로 부드럽게 따라간다. 프레임레이트가 달라도 같은 속도로 붙는다. */
function approach(now, target, dt, rate) {
  return now + (target - now) * (1 - Math.exp(-rate * dt));
}

function start(el) {
  const renderer = new WebGLRenderer({alpha: true, antialias: true});
  renderer.setClearAlpha(0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  // 이 버전에서 PCFSoft 는 빠졌다 — 지정하지 않으면 경고를 남기고 되돌아간다.
  renderer.shadowMap.type = PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  el.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  let model = null;
  const centre = new Vector3();
  let dist = 4;

  /** 장면 전체가 화면에 들어오도록 카메라 거리를 계산한다. */
  function measure() {
    if (!model) return;
    const box = new Box3().setFromObject(model);
    const size = new Vector3();
    box.getSize(size); box.getCenter(centre);
    const v = (FOV * Math.PI) / 180;
    const fitH = (size.y / 2) / Math.tan(v / 2);
    const fitW = (size.x / 2) / Math.tan(v / 2) / camera.aspect;
    dist = Math.max(fitH, fitW) * FIT_MARGIN + size.z / 2;
  }

  /** 포인터를 따라 카메라를 조금 돌린다 — 입체감이 여기서 가장 크게 온다. */
  function place(y, p) {
    const dir = VIEW_DIR.clone();
    dir.applyAxisAngle(new Vector3(0, 1, 0), y);
    dir.applyAxisAngle(new Vector3(1, 0, 0), p);
    camera.position.copy(centre).addScaledVector(dir, dist);
    camera.lookAt(centre);
  }

  // 환경광 — 매트한 플라스틱이 환경을 받아야 장난감처럼 보인다.
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const key = new DirectionalLight(0xfff6ec, 2.2);
  key.position.set(2.4, 4.2, 3.0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0012;
  const sc = key.shadow.camera;
  sc.left = -2.4; sc.right = 2.4; sc.top = 2.4; sc.bottom = -2.4;
  sc.near = 0.5; sc.far = 14;
  scene.add(key);
  const fill = new DirectionalLight(0xdfe4ff, 0.9);
  fill.position.set(-3.0, 1.6, 2.2);
  scene.add(fill);
  // 정면광 — 키라이트가 위·옆에서 와서 얼굴이 어두웠다. 얼굴이 읽혀야 한다.
  const front = new DirectionalLight(0xffffff, 0.75);
  front.position.set(0.3, 1.1, 4.0);
  scene.add(front);
  scene.add(new HemisphereLight(0xffffff, 0xb9b6ea, 0.9));
  scene.add(new AmbientLight(0xffffff, 0.2));

  // 바닥 그림자만 받는 판. 바닥을 그리지 않으면서 바닥에 붙인다.
  const ground = new Mesh(new PlaneGeometry(9, 9), new ShadowMaterial({opacity: 0.22}));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let morphs = null;
  let raf = 0;
  let visible = true;

  new GLTFLoader().load('assets/desk-scene.glb', gltf => {
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.morphTargetDictionary && !morphs) morphs = {mesh: o, i: o.morphTargetDictionary};
    });
    model = gltf.scene;
    scene.add(model);
    el.setAttribute('data-ready', '');
    resize();
    draw(0);
  }, undefined, err => console.warn('[character3d] 장면을 읽지 못했습니다', err));

  // ── 상태 ──────────────────────────────────────────────────────────
  const t0 = performance.now();
  let blinkAt = rand(BLINK_GAP[0], BLINK_GAP[1]);
  let pauseAt = rand(PAUSE_GAP[0], PAUSE_GAP[1]);
  let pauseTo = -1;
  let phase = 0;
  let speed = STROKE_HZ;
  let last = 0;
  let hover = false;
  let reactTo = -1;
  let reactIdx = -1;
  let yaw = 0, pitch = 0, yawTo = 0, pitchTo = 0;
  const pose = {head_up: 0, head_tilt: 0, lean_in: 0, lean_back: 0, typing: 1};

  function resize() {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(1);
    renderer.setSize(Math.round(r.width * dpr), Math.round(r.height * dpr), false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
    measure();
    place(yaw, pitch);
  }
  resize();
  new ResizeObserver(resize).observe(el);

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

  function wanted(t) {
    if (reactTo > 0 && t < reactTo) return REACTIONS[reactIdx];
    if (reactTo > 0) reactTo = -1;
    return hover ? HOVER_POSE : IDLE_POSE;
  }

  function draw(t) {
    const dt = Math.min(Math.max(t - last, 0), 0.1);
    last = t;
    const quiet = still();

    yaw = approach(yaw, quiet ? 0 : yawTo, dt, 4);
    pitch = approach(pitch, quiet ? 0 : pitchTo, dt, 4);
    place(yaw, pitch);

    if (morphs) {
      const inf = morphs.mesh.morphTargetInfluences;
      const idx = morphs.i;
      const want = quiet ? IDLE_POSE : wanted(t);
      for (const nm of ['head_up', 'head_tilt', 'lean_in', 'lean_back', 'typing']) {
        pose[nm] = quiet ? want[nm] : approach(pose[nm], want[nm], dt, 6);
        if (idx[nm] !== undefined) inf[idx[nm]] = pose[nm];
      }

      if (idx.breathe !== undefined) {
        inf[idx.breathe] = quiet ? 0.35
          : 0.5 - 0.5 * Math.cos((t / BREATHE_SEC) * Math.PI * 2);
      }
      if (idx.blink !== undefined) inf[idx.blink] = quiet ? 0 : blinkValue(t);

      if (!quiet) {
        if (pauseTo < 0 && t > pauseAt) pauseTo = t + rand(PAUSE_LEN[0], PAUSE_LEN[1]);
        if (pauseTo > 0 && t > pauseTo) {
          pauseTo = -1;
          pauseAt = t + rand(PAUSE_GAP[0], PAUSE_GAP[1]);
          speed = STROKE_HZ * rand(0.85, 1.2);
        }
        const typing = (pauseTo > 0 ? 0 : 1) * pose.typing;
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

  // ── 입력 ──────────────────────────────────────────────────────────
  // 시차는 화면 전체의 포인터를 따른다. 상자 안에서만 반응하면 거의 안 움직인다.
  window.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const cx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
    const cy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
    yawTo = Math.max(-1, Math.min(1, cx)) * PARALLAX;
    pitchTo = Math.max(-1, Math.min(1, cy)) * PARALLAX * 0.45;
    // 호버 판정은 상자보다 조금 넉넉하게 — 가장자리에서 깜박이지 않게.
    const pad = 60;
    hover = e.clientX > r.left - pad && e.clientX < r.right + pad &&
            e.clientY > r.top - pad && e.clientY < r.bottom + pad;
  }, {passive: true});
  window.addEventListener('pointerleave', () => { hover = false; yawTo = 0; pitchTo = 0; });

  el.addEventListener('pointerdown', () => {
    reactIdx = (reactIdx + 1) % REACTIONS.length;
    reactTo = (performance.now() - t0) / 1000 + REACT_SEC;
  });

  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, {threshold: 0.01}).observe(el);
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), {once: true});
}
