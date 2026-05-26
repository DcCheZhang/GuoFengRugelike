import { GS } from '@/state/GameState';
import { EventBus, GameEvent } from '@/engine/EventBus';
import { BE } from '@/engine/battle';
import { showToast } from '@/state/GameState';

export function renderBattle(): void {
  const el = document.getElementById('view-battle')!;
  const canvas = document.getElementById('battle-canvas') as HTMLCanvasElement;
  el.innerHTML = '';
  el.appendChild(canvas);

  const ctrl = document.createElement('div');
  ctrl.className = 'battle-controls';
  ctrl.innerHTML = `
    <span style="color:var(--gold);font-family:var(--font-brush);font-size:.9rem">第${GS.round}回合</span>
    <button class="btn btn-sm" id="sp1">×1</button>
    <button class="btn btn-sm" id="sp2">×2</button>
    <button class="btn btn-sm" id="sp4">×4</button>
    <button class="btn btn-sm" id="pb">暂停</button>`;
  el.appendChild(ctrl);

  updateSpeedUI();
  bindSpeedControls();

  EventBus.once(GameEvent.BATTLE_END, (br: { result: string }) => {
    setTimeout(() => {
      BE.stop();
      canvas.style.display = 'none';
      handleBattleEnd(br.result);
    }, 800);
  });
}

function updateSpeedUI(): void {
  const speeds = [1, 2, 4];
  for (const s of speeds) {
    const btn = document.getElementById('sp' + s);
    if (btn) btn.style.background = GS.bspeed === s ? 'var(--cinnabar)' : '';
  }
  const pb = document.getElementById('pb');
  if (pb) pb.textContent = GS.bpaused ? '继续' : '暂停';
}

function bindSpeedControls(): void {
  document.getElementById('sp1')!.onclick = () => { GS.bspeed = 1; updateSpeedUI(); };
  document.getElementById('sp2')!.onclick = () => { GS.bspeed = 2; updateSpeedUI(); };
  document.getElementById('sp4')!.onclick = () => { GS.bspeed = 4; updateSpeedUI(); };
  document.getElementById('pb')!.onclick = () => { GS.bpaused = !GS.bpaused; updateSpeedUI(); };
}

async function handleBattleEnd(result: string): Promise<void> {
  const { switchView } = await import('./ViewHelpers');

  if (result === 'lose') {
    showToast('兵败如山倒…… 点击"重修"重新开始');
    const { renderMain } = await import('./MainView');
    switchView('main');
    renderMain();
    return;
  }

  const { renderSettle } = await import('./SettleView');
  switchView('settle');
  renderSettle();
}
