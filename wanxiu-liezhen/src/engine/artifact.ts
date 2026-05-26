import { ArtifactData, ArtifactInstance, ArtifactQuality, PlayerUnit } from '@/types';
import { nextUID } from '@/state/GameState';
import { TIER_QUALITY_MAP } from '@/types';

export function createArtifactInstance(ad: ArtifactData): ArtifactInstance {
  const m = TIER_QUALITY_MAP[ad.q] || 1;
  const effects: Record<string, number> = {};

  if (ad.tp === '进攻') {
    effects.at = Math.round(5 * m);
    effects.cr = 0.02 * m;
  } else if (ad.tp === '防御') {
    effects.df = Math.round(3 * m);
    effects.mhp = Math.round(20 * m);
    effects.tg = Math.round(2 * m);
  } else if (ad.tp === '功能') {
    effects.as = -0.05 * m;
    effects.ms = Math.round(5 * m);
  } else if (ad.tp === '特殊') {
    const specialEffects: Record<number, Record<string, number>> = {
      18: { at: Math.round(3 * m), cr: 0.01 * m },
      28: { at: Math.round(2 * m) },
      62: { at: Math.round(4 * m), mhp: Math.round(10 * m) },
      67: { df: Math.round(2 * m), tg: Math.round(1 * m) },
      75: { at: Math.round(3 * m), ms: Math.round(3 * m) },
      83: { at: Math.round(2 * m), cr: 0.01 * m },
      85: { at: Math.round(3 * m), cr: 0.02 * m },
      106: { df: Math.round(2 * m), tg: Math.round(1 * m) },
      112: { at: Math.round(4 * m) },
      116: { df: Math.round(2 * m), tg: Math.round(1 * m) },
      121: { at: Math.round(2 * m), mhp: Math.round(10 * m) },
      157: { mhp: Math.round(15 * m), df: Math.round(1 * m) },
      163: { as: -0.03 * m, ms: Math.round(3 * m) },
      165: { cr: 0.02 * m, at: Math.round(2 * m) },
      212: { at: Math.round(5 * m), cr: 0.02 * m, as: -0.03 * m },
    };
    const se = specialEffects[ad.id];
    if (se) {
      for (const k of Object.keys(se)) {
        (effects as any)[k] = (se as any)[k];
      }
    }
  }

  return {
    id: ad.id,
    nm: ad.nm,
    tp: ad.tp,
    desc: ad.desc,
    q: ad.q,
    price: ad.price,
    iid: nextUID(),
    effects: effects as any,
    onEquip(unit: PlayerUnit) {
      if (!unit) return;
      const e = this.effects;
      if (e.at) unit.attack += e.at;
      if (e.df) unit.defense += e.df;
      if (e.cr) unit.critRate = Math.min(1, unit.critRate + e.cr);
      if (e.mhp) {
        unit.maxHp += e.mhp;
        unit.hp = Math.min(unit.hp + e.mhp, unit.maxHp);
      }
      if (e.tg) unit.toughness += e.tg;
      if (e.as) unit.attackSpeed = Math.max(0.1, unit.attackSpeed + e.as);
      if (e.ms) unit.moveSpeed += e.ms;
    },
    onUnequip(unit: PlayerUnit) {
      if (!unit) return;
      const e = this.effects;
      if (e.at) unit.attack -= e.at;
      if (e.df) unit.defense -= e.df;
      if (e.cr) unit.critRate = Math.max(0, unit.critRate - e.cr);
      if (e.mhp) {
        unit.maxHp -= e.mhp;
        unit.hp = Math.min(unit.hp, unit.maxHp);
        unit.hp = Math.max(1, unit.hp);
      }
      if (e.tg) unit.toughness -= e.tg;
      if (e.as) unit.attackSpeed = Math.max(0.1, unit.attackSpeed - e.as);
      if (e.ms) unit.moveSpeed -= e.ms;
    },
  };
}

export function applyArtifact(art: ArtifactInstance, unit: PlayerUnit): void {
  if (!art || !unit) return;
  art.onEquip(unit);
}

export function removeArtifact(art: ArtifactInstance, unit: PlayerUnit): void {
  if (!art || !unit) return;
  art.onUnequip(unit);
}
