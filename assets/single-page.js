(() => {
'use strict';
function revealTarget(hash){let target;try{target=document.getElementById(decodeURIComponent(hash.slice(1)));}catch{return;}if(!target)return;for(let node=target.parentElement;node;node=node.parentElement){if(node.tagName==='DETAILS')node.open=true;}}
document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(link)revealTarget(link.hash);});
addEventListener('hashchange',()=>revealTarget(location.hash));revealTarget(location.hash);
})();
