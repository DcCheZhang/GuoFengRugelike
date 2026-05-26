const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./StartView--De3M-0B.js","./GameState-DLn0qV3R.js","./ViewHelpers-DDnmuU6t.js"])))=>i.map(i=>d[i]);
(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))l(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const n of t.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&l(n)}).observe(document,{childList:!0,subtree:!0});function a(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function l(e){if(e.ep)return;e.ep=!0;const t=a(e);fetch(e.href,t)}})();const h="modulepreload",b=function(c,o){return new URL(c,o).href},v={},m=function(o,a,l){let e=Promise.resolve();if(a&&a.length>0){const n=document.getElementsByTagName("link"),r=document.querySelector("meta[property=csp-nonce]"),p=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));e=Promise.allSettled(a.map(i=>{if(i=b(i,l),i in v)return;v[i]=!0;const d=i.endsWith(".css"),g=d?'[rel="stylesheet"]':"";if(!!l)for(let u=n.length-1;u>=0;u--){const f=n[u];if(f.href===i&&(!d||f.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${i}"]${g}`))return;const s=document.createElement("link");if(s.rel=d?"stylesheet":h,d||(s.as="script"),s.crossOrigin="",s.href=i,p&&s.setAttribute("nonce",p),document.head.appendChild(s),d)return new Promise((u,f)=>{s.addEventListener("load",u),s.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${i}`)))})}))}function t(n){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=n,window.dispatchEvent(r),!r.defaultPrevented)throw n}return e.then(n=>{for(const r of n||[])r.status==="rejected"&&t(r.reason);return o().catch(t)})};function y(){const c=document.getElementById("view-main");c.innerHTML=`
    <div style="text-align:center" class="fade-in">
      <div style="font-family:var(--font-title);font-size:4rem;color:var(--cinnabar);text-shadow:0 0 30px rgba(196,30,58,.5),3px 3px 0 var(--ink-lighter);margin-bottom:10px;letter-spacing:8px">
        万修列阵
      </div>
      <div style="font-family:var(--font-brush);font-size:1.3rem;color:var(--gold);margin-bottom:8px;letter-spacing:4px">
        国风修仙 · Roguelike · 自动战斗
      </div>
      <div style="font-family:var(--font-body);font-size:.9rem;color:var(--paper-dark);margin-bottom:40px">
        列阵修仙，以弱胜强，万修归一
      </div>
      <button class="btn" style="font-size:1.3rem;padding:14px 48px;animation:pulse 2s infinite" id="btn-start-game">
        开始修行
      </button>
      <div style="margin-top:20px;font-size:.75rem;color:#666">
        <div>27种修仙单位 · 213个法宝遗物 · 9大章节</div>
        <div style="margin-top:4px">合成升阶 · 法宝装备 · 自动战斗 · Roguelike循环</div>
      </div>
    </div>`,document.getElementById("btn-start-game").onclick=async()=>{const{gsReset:o}=await m(async()=>{const{gsReset:e}=await import("./GameState-DLn0qV3R.js").then(t=>t.i);return{gsReset:e}},[],import.meta.url);o();const{renderStart:a}=await m(async()=>{const{renderStart:e}=await import("./StartView--De3M-0B.js").then(t=>t.S);return{renderStart:e}},__vite__mapDeps([0,1]),import.meta.url);a();const{switchView:l}=await m(async()=>{const{switchView:e}=await import("./ViewHelpers-DDnmuU6t.js");return{switchView:e}},__vite__mapDeps([2,1]),import.meta.url);l("start")}}const w=Object.freeze(Object.defineProperty({__proto__:null,renderMain:y},Symbol.toStringTag,{value:"Module"}));y();export{w as M,m as _};
//# sourceMappingURL=index-CxvBKbmr.js.map
