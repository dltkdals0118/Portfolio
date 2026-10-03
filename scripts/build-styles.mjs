// Regenerate after editing the source styles; preserve cascade order.
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const files=["assets/base.css","assets/refinement.css","assets/motion.css","assets/entry-motion.css","assets/prototype.css","assets/depth.css","assets/work-motion.css","assets/overview-ux.css","assets/cinema.css","assets/reading-focus.css","assets/unified-design.css","assets/prototype.css","assets/single-page.css","assets/recruiter-polish.css","assets/responsive-motion.css","assets/review-polish.css"];
const css=files.map(path=>'/* '+path+' */\n'+readFileSync(new URL(path,root),'utf8')).join('\n');
writeFileSync(new URL('assets/portfolio.css',root),css);
console.log('Built assets/portfolio.css ('+Buffer.byteLength(css)+' bytes)');
