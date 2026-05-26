export function renderMain(): void {
  const el = document.getElementById('view-main')!;
  el.innerHTML = `
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
    </div>`;

  document.getElementById('btn-start-game')!.onclick = async () => {
    const { gsReset } = await import('@/state/GameState');
    gsReset();
    const { renderStart } = await import('./StartView');
    renderStart();
    const { switchView } = await import('./ViewHelpers');
    switchView('start');
  };
}
