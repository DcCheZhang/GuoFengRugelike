const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./ViewHelpers-DDnmuU6t.js","./GameState-DLn0qV3R.js","./PrepareView-RZP9Bi7i.js","./index-CxvBKbmr.js","./index-WCTere9U.css","./StartView--De3M-0B.js"])))=>i.map(i=>d[i]);
import{_ as h}from"./index-CxvBKbmr.js";import{t as d,U as m,d as E,T as b,G as n,a as y,s as l,h as u}from"./GameState-DLn0qV3R.js";import{U as w,R as v,c as _}from"./StartView--De3M-0B.js";import{A as x,c as A}from"./SettleView-C3WbmV0c.js";import"./PrepareView-RZP9Bi7i.js";function I(){const s=[],e=w.filter(r=>d(r.min)<=d(m.SCARCE)),t={normal:100,scarce:300,legendary:1e3};for(let r=0;r<3;r++){const a=v.pick(e),c=v.w([{tier:m.NORMAL,weight:50},{tier:m.SCARCE,weight:35},{tier:m.LEGENDARY,weight:15}]).tier,g=d(c),$=d(a.min);g>=$&&s.push({tp:"unit",data:a,tier:c,price:t[c]??100})}const i=x.filter(r=>r.q!=="mythical");for(let r=0;r<3;r++){const a=v.pick(i);s.push({tp:"artifact",data:a,price:a.price||300})}return s}let p=[];function f(){p=I();const s=document.getElementById("view-shop");let e="";for(let t=0;t<p.length;t++){const i=p[t];if(i.tp==="unit"){const r=i.data,a=E(i.tier),o=b[i.tier]||"";e+=`
        <div class="card" style="text-align:center">
          <div class="tier-badge" style="background:${a}">${o[0]||""}</div>
          <div style="font-family:var(--font-brush);color:${a};font-size:.95rem">${r.nm}</div>
          <div style="font-size:.75rem;color:var(--gold)">${o}</div>
          <div style="font-size:.7rem;color:var(--tier-scarce);margin:6px 0">${i.price}金</div>
          <button class="btn btn-sm" data-shop-buy="${t}">购买</button>
        </div>`}else{const r=i.data,o={normal:"var(--tier-normal)",scarce:"var(--tier-scarce)",legendary:"var(--tier-legendary)",mythical:"var(--tier-mythical)"}[r.q]||"var(--tier-normal)",c=b[r.q]||"";e+=`
        <div class="card" style="text-align:center">
          <div class="tier-badge" style="background:${o}">${c[0]||""}</div>
          <div style="font-family:var(--font-brush);color:${o};font-size:.9rem">${r.nm}</div>
          <div style="font-size:.65rem;color:#aaa">${r.desc}</div>
          <div style="font-size:.7rem;color:var(--tier-scarce);margin:6px 0">${i.price}金</div>
          <button class="btn btn-sm" data-shop-buy="${t}">购买</button>
        </div>`}}s.innerHTML=`
    <div class="fade-in" style="text-align:center;max-width:900px;width:100%">
      <div style="font-family:var(--font-brush);font-size:1.8rem;color:var(--gold);margin-bottom:5px">云游商贩</div>
      <div style="font-size:.85rem;color:var(--paper-dark);margin-bottom:5px">灵石:${n.spirit} | 金币:<span class="gold-text">${n.gold}</span></div>
      <button class="btn btn-sm" id="btn-shop-refresh" style="margin-bottom:15px">刷新 (100金)</button>
      <button class="btn btn-sm btn-gold" id="btn-shop-leave" style="margin-bottom:15px">离开商店</button>
      <div class="shop-items">${e}</div>
    </div>`,document.querySelectorAll("[data-shop-buy]").forEach(t=>{t.addEventListener("click",()=>{const i=parseInt(t.dataset.shopBuy,10);S(i)})}),document.getElementById("btn-shop-refresh").onclick=()=>{if(n.gold<y.SHOP_REFRESH){l("金币不足");return}u(-100),f()},document.getElementById("btn-shop-leave").onclick=()=>{R()}}function S(s){const e=p[s];if(e){if(n.gold<e.price){l("金币不足");return}if(e.tp==="unit"){if(n.units.length>=y.UNIT_CAP){l("队伍已满");return}const t=_(e.data.id,e.tier,1);t&&(n.units.push(t),u(-e.price),l(`购买：${t.nm}`),f())}else{const t=A(e.data);n.arts.push(t),u(-e.price),l(`购买：${t.nm}`),f()}}}async function R(){const{switchView:s}=await h(async()=>{const{switchView:t}=await import("./ViewHelpers-DDnmuU6t.js");return{switchView:t}},__vite__mapDeps([0,1]),import.meta.url),{renderPrepare:e}=await h(async()=>{const{renderPrepare:t}=await import("./PrepareView-RZP9Bi7i.js").then(i=>i.P);return{renderPrepare:t}},__vite__mapDeps([2,3,4,1,5]),import.meta.url);s("prepare"),e()}export{f as renderShop};
//# sourceMappingURL=ShopView-BPIM8qRA.js.map
