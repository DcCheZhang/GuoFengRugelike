import { PlayerUnit, UnitTier } from '@/types';
import { GS } from '@/state/GameState';
import { R } from '@/utils/random';
import { tierCSS } from '@/utils/helpers';

interface CampUnit {
  uid: number;
  nm: string;
  tier: UnitTier;
  alive: boolean;
  hp: number;
  mhp: number;
  attack: number;
  defense: number;
  tp: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

let campAF: number = 0;
let campUnits: CampUnit[] = [];
let campDetailTimer: number = 0;

export function initCamp(): void {
  if (campAF) cancelAnimationFrame(campAF);
  campUnits = [];
  const zone = document.getElementById('camp-zone');
  if (!zone) return;

  const zw = zone.clientWidth || 400;
  const zh = zone.clientHeight || 220;
  const allUnits = [...GS.units, ...GS.dead];
  const spacing = 36;
  const cols = Math.floor((zw - 20) / spacing);

  for (let i = 0; i < allUnits.length; i++) {
    const u = allUnits[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    campUnits.push({
      uid: u.uid,
      nm: u.nm,
      tier: u.tier,
      alive: u.alive,
      hp: u.hp,
      mhp: u.maxHp,
      attack: u.attack,
      defense: u.defense,
      tp: u.tp,
      x: 20 + col * spacing + R.i(0, 8),
      y: 20 + row * spacing + R.i(0, 8),
      vx: u.alive ? R.fl(-20, 20) : 0,
      vy: u.alive ? R.fl(-20, 20) : 0,
    });
  }
  renderCamp();
  updateCampLoop();
}

function updateCampLoop(): void {
  const zone = document.getElementById('camp-zone');
  if (!zone) { campAF = 0; return; }

  const zw = zone.clientWidth || 400;
  const zh = zone.clientHeight || 220;
  const pad = 16;

  for (let i = 0; i < campUnits.length; i++) {
    const cu = campUnits[i];
    if (!cu.alive) continue;

    cu.x += cu.vx * 0.016;
    cu.y += cu.vy * 0.016;

    if (cu.x < pad) { cu.x = pad; cu.vx = Math.abs(cu.vx); }
    if (cu.x > zw - pad - 28) { cu.x = zw - pad - 28; cu.vx = -Math.abs(cu.vx); }
    if (cu.y < pad) { cu.y = pad; cu.vy = Math.abs(cu.vy); }
    if (cu.y > zh - pad - 28) { cu.y = zh - pad - 28; cu.vy = -Math.abs(cu.vy); }

    for (let j = i + 1; j < campUnits.length; j++) {
      const cu2 = campUnits[j];
      const dx = cu.x - cu2.x;
      const dy = cu.y - cu2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 30 && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;
        cu.vx += nx * 2;
        cu.vy += ny * 2;
        cu2.vx -= nx * 2;
        cu2.vy -= ny * 2;
      }
      if (dist < 26) {
        const push = (26 - dist) / 2;
        cu.x += (dx / dist) * push;
        cu.y += (dy / dist) * push;
        cu2.x -= (dx / dist) * push;
        cu2.y -= (dy / dist) * push;
      }
    }

    const spd = Math.sqrt(cu.vx * cu.vx + cu.vy * cu.vy);
    if (spd > 30) { cu.vx = (cu.vx / spd) * 30; cu.vy = (cu.vy / spd) * 30; }
    if (Math.random() < 0.01) { cu.vx += R.fl(-8, 8); cu.vy += R.fl(-8, 8); }
  }

  renderCamp();
  campAF = requestAnimationFrame(updateCampLoop);
}

function ensureDecor(zone: HTMLElement): void {
  if (zone.querySelector('.camp-decor-inner')) return;
  const d1 = document.createElement('div');
  d1.className = 'camp-decor camp-decor-inner';
  d1.style.cssText = 'top:0;left:0;right:0;bottom:0;border:2px solid rgba(212,165,116,0.2);border-radius:10px;pointer-events:none';
  zone.appendChild(d1);
  const d2 = document.createElement('div');
  d2.className = 'camp-decor';
  d2.style.cssText = 'top:8px;left:50%;transform:translateX(-50%);width:60px;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)';
  zone.appendChild(d2);
  const d3 = document.createElement('div');
  d3.className = 'camp-decor';
  d3.style.cssText = 'bottom:8px;left:50%;transform:translateX(-50%);width:60px;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)';
  zone.appendChild(d3);
}

function renderCamp(): void {
  const zone = document.getElementById('camp-zone');
  if (!zone) return;

  ensureDecor(zone);

  const existing = zone.querySelectorAll('.camp-unit, .camp-detail');
  existing.forEach((e) => e.remove());

  for (const cu of campUnits) {
    const el = document.createElement('div');
    el.className = 'camp-unit' + (cu.alive ? '' : ' dead');
    const tc =
      ({ normal: '#ccc', scarce: '#4ade80', legendary: '#a855f7', mythical: '#f97316' }[cu.tier] || '#ccc');
    el.style.left = Math.round(cu.x) + 'px';
    el.style.top = Math.round(cu.y) + 'px';
    el.style.borderColor = tc;
    el.style.background = cu.alive ? 'rgba(26,26,46,0.8)' : 'rgba(50,50,50,0.5)';
    el.style.color = tc;
    const dn = cu.nm.length > 2 ? cu.nm.slice(0, 2) : cu.nm;
    el.textContent = dn;
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      showCampDetail(cu, ev as MouseEvent);
    });
    zone.appendChild(el);
  }
}

function showCampDetail(cu: CampUnit, ev: MouseEvent): void {
  const zone = document.getElementById('camp-zone');
  if (!zone) return;

  const old = zone.querySelector('.camp-detail');
  if (old) old.remove();

  const el = document.createElement('div');
  el.className = 'camp-detail';
  const tc = tierCSS(cu.tier);
  let x = cu.x + 30;
  let y = cu.y - 10;
  if (x + 140 > (zone.clientWidth || 400)) x = cu.x - 140;
  if (y < 0) y = 10;

  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.innerHTML =
    `<div style="color:${tc};font-family:var(--font-brush);font-size:.9rem">${cu.nm}</div>` +
    `<div style="color:var(--gold);font-size:.7rem">${cu.tier} ${cu.tp}</div>` +
    `<div style="color:#aaa">HP:${cu.hp}/${cu.mhp} 攻:${cu.attack} 防:${cu.defense}</div>` +
    (cu.alive ? '' : '<div style="color:var(--cinnabar);font-size:.7rem">已阵亡</div>');

  zone.appendChild(el);

  if (campDetailTimer) clearTimeout(campDetailTimer);
  campDetailTimer = window.setTimeout(() => {
    const d = zone.querySelector('.camp-detail');
    if (d) d.remove();
  }, 3000);
}
