import { UnitTier, TIER_NAMES } from '@/types';
import { GS, addGold, showToast } from '@/state/GameState';
import { GC } from '@/data/constants';
import { tierCSS } from '@/utils/helpers';
import { createUnit } from '@/engine/synthesis';
import { createArtifactInstance } from '@/engine/artifact';
import { genShop } from '@/engine/shop';

let shopItems: any[] = [];

export function renderShop(): void {
  shopItems = genShop();
  const el = document.getElementById('view-shop')!;

  let itemsHtml = '';
  for (let i = 0; i < shopItems.length; i++) {
    const item = shopItems[i];
    if (item.tp === 'unit') {
      const d = item.data;
      const tc = tierCSS(item.tier);
      const tierName = TIER_NAMES[item.tier as UnitTier] || '';
      itemsHtml += `
        <div class="card" style="text-align:center">
          <div class="tier-badge" style="background:${tc}">${(tierName)[0] || ''}</div>
          <div style="font-family:var(--font-brush);color:${tc};font-size:.95rem">${d.nm}</div>
          <div style="font-size:.75rem;color:var(--gold)">${tierName}</div>
          <div style="font-size:.7rem;color:var(--tier-scarce);margin:6px 0">${item.price}金</div>
          <button class="btn btn-sm" data-shop-buy="${i}">购买</button>
        </div>`;
    } else {
      const a = item.data;
      const qColors: Record<string, string> = { normal: 'var(--tier-normal)', scarce: 'var(--tier-scarce)', legendary: 'var(--tier-legendary)', mythical: 'var(--tier-mythical)' };
    const qc = qColors[a.q] || 'var(--tier-normal)';
      const qName = TIER_NAMES[a.q as UnitTier] || '';
      itemsHtml += `
        <div class="card" style="text-align:center">
          <div class="tier-badge" style="background:${qc}">${qName[0] || ''}</div>
          <div style="font-family:var(--font-brush);color:${qc};font-size:.9rem">${a.nm}</div>
          <div style="font-size:.65rem;color:#aaa">${a.desc}</div>
          <div style="font-size:.7rem;color:var(--tier-scarce);margin:6px 0">${item.price}金</div>
          <button class="btn btn-sm" data-shop-buy="${i}">购买</button>
        </div>`;
    }
  }

  el.innerHTML = `
    <div class="fade-in" style="text-align:center;max-width:900px;width:100%">
      <div style="font-family:var(--font-brush);font-size:1.8rem;color:var(--gold);margin-bottom:5px">云游商贩</div>
      <div style="font-size:.85rem;color:var(--paper-dark);margin-bottom:5px">灵石:${GS.spirit} | 金币:<span class="gold-text">${GS.gold}</span></div>
      <button class="btn btn-sm" id="btn-shop-refresh" style="margin-bottom:15px">刷新 (100金)</button>
      <button class="btn btn-sm btn-gold" id="btn-shop-leave" style="margin-bottom:15px">离开商店</button>
      <div class="shop-items">${itemsHtml}</div>
    </div>`;

  document.querySelectorAll('[data-shop-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt((btn as HTMLElement).dataset.shopBuy!, 10);
      buyItem(idx);
    });
  });

  document.getElementById('btn-shop-refresh')!.onclick = () => {
    if (GS.gold < GC.SHOP_REFRESH) { showToast('金币不足'); return; }
    addGold(-GC.SHOP_REFRESH);
    renderShop();
  };

  document.getElementById('btn-shop-leave')!.onclick = () => {
    proceedFromShop();
  };
}

function buyItem(idx: number): void {
  const item = shopItems[idx];
  if (!item) return;

  if (GS.gold < item.price) { showToast('金币不足'); return; }

  if (item.tp === 'unit') {
    if (GS.units.length >= GC.UNIT_CAP) { showToast('队伍已满'); return; }
    const u = createUnit(item.data.id, item.tier, 1);
    if (u) {
      GS.units.push(u);
      addGold(-item.price);
      showToast(`购买：${u.nm}`);
      renderShop();
    }
  } else {
    const a = createArtifactInstance(item.data);
    GS.arts.push(a);
    addGold(-item.price);
    showToast(`购买：${a.nm}`);
    renderShop();
  }
}

async function proceedFromShop(): Promise<void> {
  const { switchView } = await import('./ViewHelpers');
  const { renderPrepare } = await import('./PrepareView');
  switchView('prepare');
  renderPrepare();
}
