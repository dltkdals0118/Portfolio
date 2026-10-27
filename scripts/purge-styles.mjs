// 빌드 산출물(portfolio.css)에서 '지금 마크업에 없는 클래스' 규칙만 떨어낸다.
//
// 소스 CSS 는 건드리지 않는다. 떨어내는 기준은 매 빌드마다 현재 HTML/JS 에서 다시 계산되므로,
// 마크업에 클래스를 되살리면 다음 빌드에서 규칙도 자동으로 돌아온다.
//
// 판정 규칙(보수적으로):
//  - 셀렉터에 클래스 토큰이 하나도 없으면 건드리지 않는다 (요소·id·:root·의사요소).
//  - 클래스 토큰이 있고 그 '전부'가 코퍼스에 없을 때만 그 셀렉터를 버린다.
//  - 콤마로 묶인 셀렉터는 살아 있는 쪽만 남긴다.
//  - @keyframes·@font-face·@property 는 통과시키고, 끝난 뒤 미참조 @keyframes 만 정리한다.
//
// 전제: JS 가 클래스명을 문자열로 조립하지 않는다 (전부 리터럴). 조립이 생기면 이 전제가 깨지므로
// 그때는 purge 를 끄거나 해당 이름을 KEEP 에 적는다.
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, basename } from 'node:path';

// 동적으로 붙거나 외부에서 참조돼 코퍼스에 안 잡히는 이름을 여기 적는다.
const KEEP = [];

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

export function buildCorpus(root) {
  const files = walk(root);
  const htmls = files.filter(f => f.endsWith('.html'));
  const html = htmls.map(f => readFileSync(f, 'utf8')).join('\n');
  // HTML 이 실제로 <script src> 로 부르는 JS 만 센다. 아무도 안 부르는 JS 의 클래스는 죽은 것이다.
  const js = files.filter(f => f.endsWith('.js') && html.includes(basename(f)));
  return {
    text: html + '\n' + js.map(f => readFileSync(f, 'utf8')).join('\n') + '\n' + KEEP.join(' '),
    htmlCount: htmls.length,
    jsFiles: js.map(f => relative(root, f)),
    orphanJs: files.filter(f => f.endsWith('.js') && !html.includes(basename(f))).map(f => relative(root, f)),
  };
}

// 중괄호 깊이로 최상위 블록을 나눈다. 의존성 없이 돌아야 해서 직접 센다.
function splitRules(css) {
  const out = [];
  let buf = '', depth = 0, i = 0;
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const j = css.indexOf('*/', i + 2);
      const end = j < 0 ? css.length : j + 2;
      buf += css.slice(i, end); i = end; continue;
    }
    const c = css[i];
    buf += c;
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { out.push(buf); buf = ''; } }
    i++;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

const CLASS = /\.(-?[_a-zA-Z][\w-]*)/g;

function selectorIsDead(sel, corpus) {
  const names = sel.match(CLASS);
  if (!names) return false;
  return names.every(n => !corpus.includes(n.slice(1)));
}

function purge(css, corpus, stats) {
  const kept = [];
  for (const rule of splitRules(css)) {
    const brace = rule.indexOf('{');
    if (brace < 0) { kept.push(rule); continue; }
    const head = rule.slice(0, brace).trim();
    if (head.startsWith('@')) {
      if (/^@(keyframes|font-face|property|charset|import)/.test(head)) { kept.push(rule); continue; }
      const inner = rule.slice(brace + 1, rule.lastIndexOf('}'));
      const sub = purge(inner, corpus, stats);
      if (sub.trim()) kept.push(head + '{' + sub + '}');
      else stats.emptyAtRules++;
      continue;
    }
    const alive = head.split(',').map(s => s.trim()).filter(s => s && !selectorIsDead(s, corpus));
    const total = head.split(',').filter(s => s.trim()).length;
    if (!alive.length) { stats.rulesRemoved++; continue; }
    if (alive.length < total) stats.selectorsTrimmed += total - alive.length;
    kept.push(alive.join(',') + rule.slice(brace));
  }
  return kept.join('\n');
}

export function purgeStyles(css, corpus) {
  const stats = { rulesRemoved: 0, selectorsTrimmed: 0, emptyAtRules: 0, keyframesRemoved: 0 };
  let out = purge(css, corpus, stats);
  // 어떤 animation 도 더 이상 부르지 않는 @keyframes 정리
  for (const name of [...new Set([...out.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]))]) {
    const uses = out.match(new RegExp(`\\b${name.replace(/[-]/g, '\\-')}\\b`, 'g')) || [];
    if (uses.length <= 1) {
      out = out.replace(new RegExp(`@keyframes\\s+${name.replace(/[-]/g, '\\-')}\\s*\\{(?:[^{}]|\\{[^{}]*\\})*\\}`, 'g'), '');
      stats.keyframesRemoved++;
    }
  }
  return { css: out, stats };
}

// 셀렉터 머리만 모은다. 선언부까지 훑으면 data URI 안의 'www.w3.org' 가 .w3 / .org 클래스로 읽힌다.
function collectSelectors(css, out = []) {
  for (const rule of splitRules(css)) {
    const brace = rule.indexOf('{');
    if (brace < 0) continue;
    const head = rule.slice(0, brace).trim();
    if (head.startsWith('@')) {
      if (/^@(keyframes|font-face|property|charset|import)/.test(head)) continue;
      collectSelectors(rule.slice(brace + 1, rule.lastIndexOf('}')), out);
      continue;
    }
    for (const s of head.split(',')) if (s.trim()) out.push(s.trim());
  }
  return out;
}

// 안전망: purge 전에 규칙이 있던 클래스가 purge 후 전부 사라지지 않았는지 확인한다.
export function verify(before, after, corpus) {
  const used = new Set();
  for (const sel of collectSelectors(before))
    for (const m of sel.matchAll(CLASS)) if (corpus.includes(m[1])) used.add(m[1]);
  const kept = new Set();
  for (const sel of collectSelectors(after))
    for (const m of sel.matchAll(CLASS)) kept.add(m[1]);
  return [...used].filter(n => !kept.has(n));
}
