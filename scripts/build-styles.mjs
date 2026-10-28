// Regenerate after editing the source styles; preserve cascade order.
// 소스 CSS 는 전부 그대로 두고, 번들 단계에서 '지금 마크업에 없는 클래스' 규칙만 떨어낸다.
// 되돌리려면 PURGE 를 false 로 두면 된다 — 소스는 손상되지 않는다.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildCorpus,purgeStyles,verify,unbalancedSelectors} from './purge-styles.mjs';

const PURGE = true;
const root=new URL('../',import.meta.url);
const files=["assets/base.css","assets/refinement.css","assets/motion.css","assets/entry-motion.css","assets/prototype.css","assets/depth.css","assets/work-motion.css","assets/overview-ux.css","assets/cinema.css","assets/reading-focus.css","assets/unified-design.css","assets/single-page.css","assets/recruiter-polish.css","assets/responsive-motion.css","assets/review-polish.css","assets/focus.css","assets/case-studies.css"];
files.push('assets/editorial.css');
const bundled=files.map(path=>'/* '+path+' */\n'+readFileSync(new URL(path,root),'utf8')).join('\n');

let css=bundled;
if(PURGE){
  const rootDir=fileURLToPath(root);
  const corpus=buildCorpus(rootDir);
  const {css:purged,stats}=purgeStyles(bundled,corpus.text);
  const lost=verify(bundled,purged,corpus.text);
  if(lost.length){
    console.error('Purge aborted — 사용 중인 클래스가 사라졌습니다: '+lost.join(', '));
    process.exit(1);
  }
  // 닫히지 않은 셀렉터 하나가 파일 끝까지를 통째로 버리게 만든다.
  // 조용히 깨지면 사이트가 스타일 없이 나가므로, 여기서 세운다.
  const broken=unbalancedSelectors(purged);
  if(broken.length){
    console.error('Purge aborted — 괄호가 닫히지 않은 셀렉터: '+broken.slice(0,5).join(' | '));
    process.exit(1);
  }
  css=purged;
  console.log(`Purge: HTML ${corpus.htmlCount}개 + 로드되는 JS ${corpus.jsFiles.length}개 기준`);
  console.log(`  규칙 제거 ${stats.rulesRemoved} · 셀렉터 정리 ${stats.selectorsTrimmed} · @keyframes ${stats.keyframesRemoved} · 빈 @블록 ${stats.emptyAtRules}`);
  console.log(`  ${Buffer.byteLength(bundled)} → ${Buffer.byteLength(css)} bytes (-${((1-Buffer.byteLength(css)/Buffer.byteLength(bundled))*100).toFixed(0)}%)`);
  if(corpus.orphanJs.length) console.log('  참고 — 어떤 HTML 도 부르지 않는 JS: '+corpus.orphanJs.join(', '));
}

writeFileSync(new URL('assets/portfolio.css',root),css);
console.log('Built assets/portfolio.css ('+Buffer.byteLength(css)+' bytes)');
