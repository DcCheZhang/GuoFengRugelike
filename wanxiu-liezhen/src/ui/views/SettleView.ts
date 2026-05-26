import { PlayerUnit } from '@/types';
import { GS, addGold, showToast } from '@/state/GameState';
import { GC } from '@/data/constants';
import { getRoundType } from '@/data/enemies';
import { tierCSS } from '@/utils/helpers';
import { TIER_NAMES } from '@/types';
import { generateRewards } from '@/engine/rewards';
import { BE } from '@/engine/battle';

let settleRewards: any = null;
let settleRecruits: PlayerUnit[] = [];

export function renderSettle(): void {
  const el = document.getElementById('view-settle')!;
  const isWin = BE.res === 'win';
  const rt = getRoundType(GS.round);

  const rewards = generateRewards();
  settleRewards = rewards;
  settleRecruits = rewards.recruits || [];

  if (isWin) addGold(rewards.gold);

  let recruitHtml = '';
  if (isWin && rewards.recruits.length > 0) {
    recruitHtml = rewards.recruits
      .map(
        (u: PlayerUnit, idx: number) =>
          `<div class="card" data-recruit-idx="${idx}" style="text-align:center;min-width:100px">
            <div class="tier-badge" style="background:${tierCSS(u.tier)}">${TIER_NAMES[u.tier][0]}</div>
            <div style="font-family:var(--font-brush);color:${tierCSS(u.tier)};font-size:.9rem">${u.nm}</div>
            <div style="font-size:.65rem;color:#aaa">Lv${u.lv} HP:${u.hp} 攻:${u.attack}</div>
            <button class="btn btn-sm" style="margin-top:4px" data-recruit-btn="${idx}">招募</button>
          </div>`
      )
      .join('');
  }

  let mvpHtml = '';
  if (isWin && rewards.mvp) {
    mvpHtml = `
      <div style="margin:10px 0;padding:8px;background:var(--ink);border-radius:6px">
        <div style="color:var(--gold);font-family:var(--font-brush)">MVP - 输出之王</div>
        <div style="color:${tierCSS(rewards.mvp.tier)};font-size:1.1rem">${rewards.mvp.nm}</div>
        <div style="color:#aaa;font-size:.8rem">伤害:${rewards.mvp.dd} | 击杀:${rewards.mvp.kills || 0}</div>
      </div>`;
  }

  let artHtml = '';
  if (rewards.artifact) {
    const a = rewards.artifact;
    const qColors: Record<string, string> = { normal: 'var(--tier-normal)', scarce: 'var(--tier-scarce)', legendary: 'var(--tier-legendary)', mythical: 'var(--tier-mythical)' };
    const qc = qColors[a.q] || 'var(--tier-normal)';
    const effText = a.effects
      ? Object.entries(a.effects)
          .filter(([, v]: [string, any]) => v !== undefined && v !== 0)
          .map(([k, v]: [string, any]) => {
            const labels: Record<string, string> = { at: '攻', df: '防', cr: '暴', mhp: 'HP', tg: '韧', as: '速', ms: '移' };
            return `+${v}${labels[k] || k}`;
          })
          .join(' ')
      : '';
    artHtml = `
      <div style="margin:10px 0">
        <div style="color:${qc};font-family:var(--font-brush);font-size:1.1rem">获得法宝：${a.nm}</div>
        <div style="font-size:.8rem;color:#aaa">${a.desc}</div>
        ${effText ? `<div style="color:var(--tier-scarce);font-size:.8rem;margin-top:2px">${effText}</div>` : ''}
      </div>`;
  }

  el.innerHTML = `
    <div class="fade-in" style="max-width:700px;width:90%;text-align:center">
      <div style="font-family:var(--font-brush);font-size:2rem;color:${isWin ? 'var(--tier-scarce)' : 'var(--cinnabar)'};margin-bottom:10px">
        ${isWin ? '大获全胜！' : '兵败如山倒……'}
      </div>
      ${isWin && rewards.gold > 0 ? `<div style="font-size:1rem;color:var(--gold);margin:8px 0">获得金币：<span class="gold-text" style="font-size:1.3rem">${rewards.gold}</span></div>` : ''}
      ${artHtml}
      ${mvpHtml}
      ${recruitHtml ? `<div style="margin-top:15px"><div style="font-family:var(--font-brush);color:var(--gold);font-size:1.1rem;margin-bottom:8px">选择招募</div><div class="settle-rewards">${recruitHtml}</div></div>` : ''}
      <div style="margin-top:20px">
        <button class="btn" id="btn-next-round">${rt === 'boss' ? '进入下一章' : '继续前进'}</button>
      </div>
    </div>`;

  document.querySelectorAll('[data-recruit-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt((btn as HTMLElement).dataset.recruitBtn!, 10);
      const u = settleRecruits[idx];
      if (!u) return;
      if (GS.units.length >= GC.UNIT_CAP) {
        showToast('队伍已满');
        return;
      }
      GS.units.push(u);
      showToast(`获得：${u.nm}`);
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLButtonElement).textContent = '已招募';
    });
  });

  document.getElementById('btn-next-round')!.onclick = async () => {
    const rt = getRoundType(GS.round);
    GS.round++;

    const { processRevives } = await import('@/state/GameState');
    processRevives();

    const { switchView } = await import('./ViewHelpers');
    if (rt === 'shop') {
      const { renderShop } = await import('./ShopView');
      switchView('shop');
      renderShop();
    } else {
      const { renderPrepare } = await import('./PrepareView');
      switchView('prepare');
      renderPrepare();
    }
  };
}
