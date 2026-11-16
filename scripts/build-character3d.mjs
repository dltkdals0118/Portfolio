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

import {existsSync, readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const threeDir = process.env.THREE_DIR
  || resolve(root, '../LIFE/app/node_modules/three');

const entry = resolve(root, 'assets/character3d.src.js');
const three = resolve(threeDir, 'build/three.module.js');

// 소스가 쓰는 addon 을 **읽어서** 연결한다. 목록을 손으로 적으면 addon 을
// 하나 더 쓰는 날 빌드가 깨진다(실제로 RoomEnvironment 에서 깨졌다).
const addons = [...new Set(
  [...readFileSync(entry, 'utf8').matchAll(/from '(three\/addons\/[^']+)'/g)].map(m => m[1]),
)];

const aliases = [`--alias:three=${three}`];
for (const spec of addons) {
  const path = resolve(threeDir, spec.replace('three/addons/', 'examples/jsm/'));
  if (!existsSync(path)) {
    console.error(`addon 을 찾지 못했습니다: ${spec} -> ${path}`);
    process.exit(1);
  }
  aliases.push(`--alias:${spec}=${path}`);
}

if (!existsSync(three)) {
  console.error(`three 를 찾지 못했습니다: ${three}`);
  console.error('THREE_DIR 로 three 설치 경로를 지정하거나, LIFE 앱에서 `npm install` 을 먼저 하십시오.');
  process.exit(1);
}
console.log('addons:', addons.join(', ') || '(없음)');

execFileSync('npx', [
  '--yes', 'esbuild', entry,
  '--bundle', '--minify', '--format=esm', '--target=es2020',
  ...aliases,
  `--outfile=${resolve(root, 'assets/character3d.js')}`,
], {stdio: 'inherit', shell: process.platform === 'win32'});

console.log('Built assets/character3d.js');
