// 히어로 마스코트 스크립트를 three.js 와 함께 한 파일로 묶는다.
//
// 이 사이트에는 node_modules 가 없다. 그래서 three 를 통째로 복사해 두는 대신
// (파일 넷 · 2.4MB) 쓰이는 부분만 묶어 `assets/character3d.js` 하나로 만들고,
// **그 결과물만** 저장소에 둔다. 다시 묶을 일은 드물다.
//
// three 는 LIFE 앱의 node_modules 에서 가져온다 — 모델 정본이 그쪽이라
// 버전이 갈리지 않는다. 경로는 THREE_DIR 로 덮어쓸 수 있다.
//
//   node scripts/build-character3d.mjs
//
// esbuild 는 npx 로 받는다(이 저장소에 설치하지 않는다).

import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const threeDir = process.env.THREE_DIR
  || resolve(root, '../LIFE/app/node_modules/three');

const three = resolve(threeDir, 'build/three.module.js');
const gltf = resolve(threeDir, 'examples/jsm/loaders/GLTFLoader.js');

for (const [label, path] of [['three', three], ['GLTFLoader', gltf]]) {
  if (!existsSync(path)) {
    console.error(`${label} 을 찾지 못했습니다: ${path}`);
    console.error('THREE_DIR 로 three 설치 경로를 지정하거나, LIFE 앱에서 `npm install` 을 먼저 하십시오.');
    process.exit(1);
  }
}

execFileSync('npx', [
  '--yes', 'esbuild',
  resolve(root, 'assets/character3d.src.js'),
  '--bundle', '--minify', '--format=esm', '--target=es2020',
  `--alias:three=${three}`,
  `--alias:three/addons/loaders/GLTFLoader.js=${gltf}`,
  `--outfile=${resolve(root, 'assets/character3d.js')}`,
], {stdio: 'inherit', shell: process.platform === 'win32'});

console.log('Built assets/character3d.js');
