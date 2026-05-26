import { PlayerUnit, RoundType } from '@/types';
import { GS, showToast } from '@/state/GameState';
import { GC } from '@/data/constants';
import { getRoundType, getRoundTypeByIndex, genEnemies } from '@/data/enemies';
import { R } from '@/utils/random';
import { tierCSS, foldUnits } from '@/utils/helpers';
import { TIER_NAMES, TYPE_NAMES } from '@/types';
import { findSynthGroups, doSynth } from '@/engine/synthesis';
import { EventBus, GameEvent } from '@/engine/EventBus';
import { BE } from '@/engine/battle';

let selSynth: PlayerUnit[] = [];

export async function renderPrepare(): Promise<void> {
  selSynth = [];
  const el = document.getElementById('view-prepare')!;
  const rt = getRoundType(GS.round);
  const ri = (GS.round - 1) % 20 + 1;
  const cy = Math.floor((GS.round - 1) / 20) + 1;
  const cn = GC.CHAPTERS[Math.min(cy - 1, 8)];

  const roundNames: Record<string, string> = {
    normal: '普通战斗', relic: '遗物战斗', shop: '商店战斗', boss: 'Boss战',
  };
  const roundColors: Record<string, string> = {
    normal: 'var(--paper)', relic: 'var(--tier-legendary)', shop: 'var(--gold)', boss: 'var(--cinnabar)',
  };

  const dotColors: Record<string, string> = {
    normal: '#666',
    relic: 'var(--tier-legendary)',
    shop: 'var(--gold)',
    boss: 'var(--cinnabar)',
  };

  let progressDots = '';
  for (let i = 1; i <= 20; i++) {
    const t = getRoundTypeByIndex(i);
    const isCurrent = i === ri;
    const dotColor = dotColors[t];
    const tn = roundNames[t];
    progressDots += `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;position:relative">
      <div style="width:${isCurrent ? 14 : 8}px;height:${isCurrent ? 14 : 8}px;border-radius:50%;background:${isCurrent ? 'var(--cinnabar)' : dotColor};border:${isCurrent ? '2px solid var(--gold)' : '1px solid rgba(255,255,255,0.2)'};cursor:pointer;transition:all 0.2s;box-shadow:${isCurrent ? '0 0 8px rgba(196,30,58,0.6)' : 'none'}" title="第${i}回合 · ${tn}"></div>
      ${i % 5 === 0 ? `<span style="font-size:.5rem;color:#888">${i}</span>` : ''}
    </div>`;
  }

  let unitHtml = '';
  for (const u of GS.units) {
    const tc = tierCSS(u.tier);
    const sel = selSynth.some((s) => s.uid === u.uid);
    const hasArts = u.arts && u.arts.length > 0;
    let artDots = '';
    if (hasArts) {
      artDots = '<div style="display:flex;gap:2px;margin-top:2px">' +
        u.arts.map((a) => {
          const qc = { normal: 'var(--tier-normal)', scarce: 'var(--tier-scarce)', legendary: 'var(--tier-legendary)', mythical: 'var(--tier-mythical)' }[a.q] || '#ccc';
          return `<span style="width:6px;height:6px;border-radius:50%;background:${qc}" title="${a.nm}"></span>`;
        }).join('') + '</div>';
    }
    unitHtml += `
      <div class="card" data-uid="${u.uid}" style="cursor:pointer;${sel ? 'border-color:var(--cinnabar);box-shadow:var(--shadow-cinnabar)' : ''}">
        <div class="tier-badge" style="background:${tc}">${TIER_NAMES[u.tier][0]}</div>
        <div style="font-family:var(--font-brush);color:${tc};font-size:.95rem">${u.nm}</div>
        <div style="font-size:.7rem;color:var(--gold)">Lv${u.lv} ${TYPE_NAMES[u.tp] || ''}</div>
        <div style="font-size:.65rem;color:#aaa">HP:${u.hp} 攻:${u.attack} 防:${u.defense}</div>
        <div class="hp-bar" style="margin-top:3px"><div class="fill" style="width:${(u.hp / u.maxHp * 100)}%"></div></div>
        ${artDots}
      </div>`;
  }

  let deadHtml = '';
  if (GS.dead.length > 0) {
    deadHtml = `
      <div style="margin-top:8px;font-size:.8rem;color:#888">
        阵亡：${GS.dead.map((u) => `${u.nm}(${u.rcd}回合)`).join('、')}
      </div>`;
  }

  let synthHtml = '';
  const groups = findSynthGroups();
  if (groups.length > 0) {
    synthHtml = groups
      .map(
        (g) =>
          `<div style="font-size:.8rem;color:var(--paper);margin:4px 0">
            ${g.units[0].nm}(${TIER_NAMES[g.tier]} Lv${g.lv}) ×${g.units.length}
            <button class="btn btn-sm" data-synth-did="${g.did}" data-synth-tier="${g.tier}" data-synth-lv="${g.lv}">合成</button>
          </div>`
      )
      .join('');
  }

  if (selSynth.length >= 3) {
    const idSet = new Set(selSynth.map((u) => u.did));
    if (idSet.size === 1 && selSynth.every((u) => u.tier === selSynth[0].tier && u.lv === selSynth[0].lv)) {
      synthHtml = `<div style="font-size:.8rem;color:var(--paper);margin:4px 0">
        ${selSynth[0].nm}(${TIER_NAMES[selSynth[0].tier]} Lv${selSynth[0].lv}) ×${selSynth.length}
        <button class="btn btn-sm" id="btn-manual-synth">手动合成</button>
      </div>` + synthHtml;
    }
  }

  let artHtml = '';
  for (const a of GS.arts) {
    const qColors: Record<string, string> = { normal: 'var(--tier-normal)', scarce: 'var(--tier-scarce)', legendary: 'var(--tier-legendary)', mythical: 'var(--tier-mythical)' };
    const qc = qColors[a.q] || 'var(--tier-normal)';
    const effText = a.effects
      ? Object.entries(a.effects)
          .filter(([, v]) => v !== undefined && v !== 0)
          .map(([k, v]) => {
            const labels: Record<string, string> = { at: '攻', df: '防', cr: '暴', mhp: 'HP', tg: '韧', as: '速', ms: '移' };
            return `+${v}${labels[k] || k}`;
          })
          .join(' ')
      : '';
    artHtml += `
      <div style="border:1px solid var(--gold);border-radius:4px;padding:4px;margin:3px 0;font-size:.7rem">
        <div style="color:${qc};font-family:var(--font-brush)">${a.nm}</div>
        <div style="color:var(--paper-dark)">${a.desc}</div>
        ${effText ? `<div style="color:var(--tier-scarce);font-size:.65rem">${effText}</div>` : ''}
      </div>`;
  }

  el.innerHTML = `
    <div class="prepare-left">
      <div class="prepare-section">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <h3>万修列阵 · ${cn}</h3>
          <button class="btn btn-sm" id="btn-back-main" style="background:var(--ink-lighter);border-color:#666;font-size:.75rem;padding:4px 12px">放弃修行</button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:.8rem;margin-bottom:8px">
          <span style="color:${roundColors[rt]}">第${ri}回合 · ${roundNames[rt]}</span>
          <span class="gold-text">金币:${GS.gold}</span>
          <span style="color:var(--tier-scarce)">灵石:${GS.spirit}</span>
        </div>
        ${deadHtml}
      </div>
      <div class="prepare-section">
        <h3>弟子 (${GS.units.length}/${GC.UNIT_CAP})</h3>
        <div class="unit-grid">${unitHtml}</div>
      </div>
      <div class="prepare-section">
        <h3>合成 ${selSynth.length > 0 ? `(已选${selSynth.length})` : ''}</h3>
        ${synthHtml || '<div style="font-size:.75rem;color:#666">无可合成的单位</div>'}
      </div>
    </div>
    <div class="prepare-right">
      <div class="prepare-camp">
        <h3 style="font-family:var(--font-brush);color:var(--gold);margin-bottom:8px">营帐</h3>
        <div class="camp-zone" id="camp-zone"></div>
        <div style="margin:12px 0 8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <span style="font-family:var(--font-brush);color:var(--gold);font-size:.85rem">关卡进度</span>
            <span style="font-size:.7rem;color:#888">${cn} · 第${ri}/20回合</span>
          </div>
          <div class="progress-bar" style="margin-bottom:8px">
            <div class="fill" style="width:${(ri / 20) * 100}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:2px;padding:0 2px">
            ${progressDots}
          </div>
          <div style="display:flex;gap:12px;margin-top:6px;font-size:.6rem;color:#666;justify-content:center">
            <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#666;margin-right:3px"></span>普通</span>
            <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--tier-legendary);margin-right:3px"></span>遗物</span>
            <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--gold);margin-right:3px"></span>商店</span>
            <span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--cinnabar);margin-right:3px"></span>Boss</span>
          </div>
        </div>
        <button class="btn" id="btn-start-battle" style="width:100%;margin-top:4px">
          ${rt === RoundType.BOSS ? '挑战Boss' : '开始战斗'}
        </button>
      </div>
      <div class="prepare-arts">
        <h3 style="font-family:var(--font-brush);color:var(--gold);margin-bottom:8px;font-size:.9rem">法宝 (${GS.arts.length})</h3>
        ${artHtml || '<div style="font-size:.7rem;color:#666">暂无法宝</div>'}
      </div>
    </div>`;

  document.getElementById('btn-back-main')!.onclick = async () => {
    if (confirm('确定要放弃当前修行，返回主菜单吗？')) {
      BE.stop();
      const { switchView } = await import('./ViewHelpers');
      const { renderMain } = await import('./MainView');
      switchView('main');
      renderMain();
    }
  };

  document.getElementById('btn-start-battle')!.onclick = () => {
    startBattle();
  };

  document.querySelectorAll('.unit-grid .card[data-uid]').forEach((card) => {
    card.addEventListener('click', () => {
      const uid = parseInt((card as HTMLElement).dataset.uid!, 10);
      const unit = GS.units.find((u) => u.uid === uid);
      if (!unit) return;
      const idx = selSynth.findIndex((s) => s.uid === uid);
      if (idx >= 0) {
        selSynth.splice(idx, 1);
      } else {
        selSynth.push(unit);
      }
      renderPrepare();
    });
  });

  document.getElementById('btn-manual-synth')?.addEventListener('click', () => {
    if (selSynth.length < 3) return;
    const c = selSynth.length >= 5 ? 5 : 3;
    const uids = selSynth.map((u) => u.uid);
    const groups = findSynthGroups();
    const g = groups.find((sg) => {
      const guids = new Set(sg.units.map((u) => u.uid));
      return sg.units.length >= 3 && selSynth.every((su) => guids.has(su.uid));
    });
    if (!g) { showToast('所选单位无法合成'); return; }
    const r = doSynth(g, Math.min(c, g.units.length));
    if (r) {
      showToast(`合成成功！${r.nm}升至Lv${r.lv}`);
      selSynth = [];
      renderPrepare();
    }
  });

  const { initCamp } = await import('@/ui/components/CampZone');
  setTimeout(() => initCamp(), 50);

  document.querySelectorAll('[data-synth-did]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const did = parseInt((btn as HTMLElement).dataset.synthDid!, 10);
      const tier = (btn as HTMLElement).dataset.synthTier! as any;
      const lv = parseInt((btn as HTMLElement).dataset.synthLv!, 10);
      const sc = findSynthGroups();
      const g = sc.find((s) => s.did === did && s.tier === tier && s.lv === lv);
      if (!g) return;
      const c = Math.min(g.units.length, g.units.length >= 5 ? 5 : 3);
      const r = doSynth(g, c);
      if (r) {
        showToast(`合成成功！${r.nm}升至Lv${r.lv}`);
        renderPrepare();
      }
    });
  });

}

async function startBattle(): Promise<void> {
  const enemies = genEnemies(GS.round);
  BE.init(GS.units, enemies as any);

  const canvas = document.getElementById('battle-canvas') as HTMLCanvasElement;
  canvas.style.display = 'block';

  const { switchView } = await import('./ViewHelpers');
  const { renderBattle } = await import('./BattleView');
  switchView('battle');
  renderBattle();
  BE.start();
}
