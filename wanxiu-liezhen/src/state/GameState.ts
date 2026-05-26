import { GameState, PlayerUnit, ArtifactInstance, UnitTier } from '@/types';
import { GC } from '@/data/constants';
import { EventBus, GameEvent } from '@/engine/EventBus';
import { clamp } from '@/utils/helpers';

let nUID = 1;

export function nextUID(): number {
  return nUID++;
}

export function resetUID(): void {
  nUID = 1;
}

export const GS: GameState = {
  cv: 'main',
  gold: 0,
  spirit: 200,
  round: 1,
  units: [],
  arts: [],
  dead: [],
  rerolls: 3,
  bspeed: 1,
  bpaused: false,
  chapter: 1,
  cycle: 1,
};

export function gsReset(): void {
  GS.gold = 0;
  GS.spirit = 200;
  GS.round = 1;
  GS.units = [];
  GS.arts = [];
  GS.dead = [];
  GS.rerolls = 3;
  GS.bspeed = 1;
  GS.bpaused = false;
  GS.chapter = 1;
  GS.cycle = 1;
  resetUID();
}

export function addGold(amount: number): void {
  const old = GS.gold;
  GS.gold = clamp(GS.gold + amount, 0, GC.GOLD_CAP);
  EventBus.emit(GameEvent.GOLD_CHANGE, GS.gold);
  if (amount !== 0) {
    const el = document.getElementById('gold-anim');
    if (!el) {
      const div = document.createElement('div');
      div.id = 'gold-anim';
      div.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-brush);font-size:2rem;pointer-events:none;z-index:3000;transition:all 0.8s';
      document.body.appendChild(div);
    }
    const anim = document.getElementById('gold-anim')!;
    anim.textContent = (amount > 0 ? '+' : '') + amount + '金';
    anim.style.color = amount > 0 ? '#fbbf24' : '#ef4444';
    anim.style.opacity = '1';
    anim.style.transform = 'translate(-50%,-50%) scale(1)';
    setTimeout(() => {
      anim.style.opacity = '0';
      anim.style.transform = 'translate(-50%,-80%) scale(1.3)';
    }, 50);
    setTimeout(() => anim.remove(), 900);
  }
}

export function addSpirit(amount: number): void {
  GS.spirit += amount;
  EventBus.emit(GameEvent.SPIRIT_CHANGE, GS.spirit);
  if (amount !== 0) {
    const el = document.getElementById('spirit-anim');
    if (!el) {
      const div = document.createElement('div');
      div.id = 'spirit-anim';
      div.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-brush);font-size:1.5rem;pointer-events:none;z-index:3000;transition:all 0.8s';
      document.body.appendChild(div);
    }
    const anim = document.getElementById('spirit-anim')!;
    anim.textContent = (amount > 0 ? '+' : '') + amount + '灵';
    anim.style.color = amount > 0 ? '#4ade80' : '#ef4444';
    anim.style.opacity = '1';
    anim.style.transform = 'translate(-50%,-50%) scale(1)';
    setTimeout(() => {
      anim.style.opacity = '0';
      anim.style.transform = 'translate(-50%,-80%) scale(1.3)';
    }, 50);
    setTimeout(() => anim.remove(), 900);
  }
}

export function processRevives(): void {
  for (let i = GS.dead.length - 1; i >= 0; i--) {
    const u = GS.dead[i];
    u.rcd--;
    if (u.rcd <= 0) {
      u.alive = true;
      u.hp = Math.round(u.maxHp * GC.REVIVE_HP);
      u.rcd = -1;
      GS.units.push(u);
      showToast(`${u.nm} 复活，生命恢复50%`);
      GS.dead.splice(i, 1);
    }
  }
}

export function showToast(msg: string, dur = 2500): void {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.getElementById('toasts')!.appendChild(t);
  setTimeout(() => t.remove(), dur);
}

EventBus.on(GameEvent.TOAST, (d: { msg: string; dur?: number }) => {
  showToast(d.msg, d.dur);
});
