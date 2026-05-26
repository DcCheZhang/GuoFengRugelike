import { PlayerUnit, UnitTier, UnitData, SynthGroup } from '@/types';
import { GS, nextUID } from '@/state/GameState';
import { GC } from '@/data/constants';
import { UD } from '@/data/units';
import { EventBus, GameEvent } from '@/engine/EventBus';
import { tierIndex, tierAt } from '@/utils/helpers';

export function findSynthGroups(): SynthGroup[] {
  const groups: Record<string, SynthGroup> = {};
  for (const u of GS.units) {
    if (!u.alive) continue;
    const k = `${u.did}_${u.tier}_${u.lv}`;
    if (!groups[k]) {
      groups[k] = { did: u.did, tier: u.tier, lv: u.lv, units: [] };
    }
    groups[k].units.push(u);
  }
  return Object.values(groups).filter(
    (g) => g.units.length >= 3 && g.lv < GC.MAX_LV
  );
}

export function doSynth(
  group: SynthGroup,
  count: number
): PlayerUnit | null {
  count = Math.min(count, group.units.length);
  if (count < 3) return null;

  const levelUp = count >= 5 ? 2 : 1;
  const consumed = group.units.slice(0, count);
  const newLv = Math.min(GC.MAX_LV, group.lv + levelUp);

  for (const u of consumed) {
    const idx = GS.units.indexOf(u);
    if (idx >= 0) GS.units.splice(idx, 1);
  }

  const ti = tierIndex(group.tier);
  const nt = tierAt(ti);

  const nu = createUnit(group.did, nt, newLv);
  if (nu) {
    GS.units.push(nu);
    EventBus.emit(GameEvent.SYNTH_SUCCESS, { unit: nu });
  }
  return nu;
}

export function createUnit(
  dataId: number,
  tier: UnitTier,
  lv: number
): PlayerUnit | null {
  const d = UD.find((u) => u.id === dataId);
  if (!d) return null;

  const ti = tierIndex(tier);
  const mi = tierIndex(d.min);
  if (ti < mi) return null;

  const bs = d.t[tier];
  if (!bs) return null;

  const sm = lv === 1 ? 1 : 1 + 0.5 * (lv - 1);
  const uid = nextUID();

  return {
    uid,
    did: dataId,
    nm: d.nm,
    tp: d.tp,
    tier,
    lv,
    hp: Math.round(bs.hp * sm),
    maxHp: Math.round(bs.hp * sm),
    attack: Math.round(bs.at * sm),
    defense: Math.round(bs.df * sm),
    attackSpeed: bs.as,
    moveSpeed: bs.ms,
    range: bs.rg,
    critRate: bs.cr,
    critDamage: bs.cd,
    dodgeRate: bs.dr,
    toughness: bs.tg,
    alive: true,
    rcd: -1,
    arts: [],
    bx: 0,
    by: 0,
    acd: 0,
    tgt: null,
    dd: 0,
    dt: 0,
    hd: 0,
    isPlayer: true,
    vx: 0,
    vy: 0,
    walkAngle: 0,
    idleTimer: 0,
    idleDx: 0,
    idleDy: 0,
    _deathT: 0,
    kills: 0,
  };
}
