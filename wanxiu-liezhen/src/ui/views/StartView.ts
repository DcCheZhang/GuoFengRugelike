import { PlayerUnit, UnitTier, TIER_NAMES, TYPE_NAMES } from '@/types';
import { GS, showToast } from '@/state/GameState';
import { UD } from '@/data/units';
import { DL } from '@/data/dialogues';
import { R } from '@/utils/random';
import { tierCSS, tierIndex } from '@/utils/helpers';
import { createUnit } from '@/engine/synthesis';

let startU: PlayerUnit[] = [];

export function renderStart(): void {
  startU = generateStartUnits();
  updateStart();
}

function generateStartUnits(): PlayerUnit[] {
  const units: PlayerUnit[] = [];
  const pool = UD.filter((d) => tierIndex(d.min) <= tierIndex(UnitTier.SCARCE));
  for (let i = 0; i < 3; i++) {
    const d = R.pick(pool);
    const tr = R.w([
      { tier: UnitTier.NORMAL, weight: 60 },
      { tier: UnitTier.SCARCE, weight: 30 },
      { tier: UnitTier.LEGENDARY, weight: 10 },
    ]);
    const ti = tierIndex(tr.tier);
    const mi = tierIndex(d.min);
    const ft = ti >= mi ? tr.tier : d.min;
    const u = createUnit(d.id, ft, 1);
    if (u) {
      u.hp = Math.round(u.hp * 0.9);
      u.maxHp = Math.round(u.maxHp * 0.9);
      u.attack = Math.round(u.attack * 0.9);
      u.defense = Math.round(u.defense * 0.9);
      units.push(u);
    }
  }
  return units;
}

function updateStart(): void {
  const el = document.getElementById('view-start')!;
  let cards = '';
  for (const u of startU) {
    const tc = tierCSS(u.tier);
    const dialog = DL[u.nm] ? R.pick(DL[u.nm].idle) : '';
    cards += `
      <div class="card" style="text-align:center;min-width:120px">
        <div style="font-family:var(--font-brush);color:${tc};font-size:1.1rem">${u.nm}</div>
        <div style="font-size:.75rem;color:var(--gold)">${TIER_NAMES[u.tier]} Lv${u.lv} ${TYPE_NAMES[u.tp] || ''}</div>
        <div style="font-size:.7rem;color:#aaa;margin-top:4px">HP:${u.hp} 攻:${u.attack} 防:${u.defense}</div>
        <div style="font-size:.7rem;color:#aaa">速:${u.attackSpeed}s 射:${u.range}</div>
        ${dialog ? `<div style="font-size:.65rem;color:var(--paper-dark);margin-top:4px;font-style:italic">"${dialog}"</div>` : ''}
      </div>`;
  }

  el.innerHTML = `
    <div class="fade-in" style="text-align:center;max-width:800px;width:100%">
      <div style="font-family:var(--font-brush);font-size:1.8rem;color:var(--gold);margin-bottom:6px">天机初显</div>
      <div style="font-size:.85rem;color:var(--paper-dark);margin-bottom:8px">以下弟子将随你踏上修行之路</div>
      <div style="font-size:.7rem;color:#f97316;margin-bottom:12px">⚠ 初入凡尘，弟子属性仅为完全体的80%，修行路上将逐步成长</div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:30px">${cards}</div>
      <div style="display:flex;gap:12px;justify-content:center;align-items:center;margin-bottom:15px">
        <button class="btn" id="btn-confirm-start">就此定夺</button>
        <button class="btn btn-gold" id="btn-reroll" ${GS.rerolls <= 0 ? 'disabled' : ''}>再测天机 (${GS.rerolls}次·100灵石)</button>
        <span style="color:var(--gold);font-family:var(--font-brush);font-size:.9rem">灵石:${GS.spirit}</span>
      </div>
    </div>`;

  document.getElementById('btn-confirm-start')!.onclick = async () => {
    GS.units = startU;
    const { switchView } = await import('./ViewHelpers');
    const { renderPrepare } = await import('./PrepareView');
    switchView('prepare');
    renderPrepare();
  };

  document.getElementById('btn-reroll')!.onclick = () => {
    if (GS.rerolls <= 0) { showToast('天机已尽，无法再测了'); return; }
    if (GS.spirit < 100) { showToast('灵石不足'); return; }
    GS.spirit -= 100;
    GS.rerolls--;
    startU = generateStartUnits();
    updateStart();
  };
}
