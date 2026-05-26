import { ArtifactData, ArtifactInstance, ArtifactQuality, PlayerUnit } from '@/types';
import { nextUID } from '@/state/GameState';
import { TIER_QUALITY_MAP } from '@/types';
import { artifactSystem } from './artifact/system';

// 导出新系统
export * from './artifact/index';

// 兼容层：尝试创建新系统实例，失败则用旧系统
function createArtifactInstanceLegacy(data: any): ArtifactInstance {
  const config = artifactSystem.createArtifact(data.id);
  if (config) {
    return config;
  }

  // 降级到旧系统
  const m = TIER_QUALITY_MAP[data.q as keyof typeof TIER_QUALITY_MAP] || 1;
  const effects: any = {};

  if (data.tp === '进攻') {
    effects.at = Math.round(5 * m);
    effects.cr = 0.02 * m;
  } else if (data.tp === '防御') {
    effects.df = Math.round(3 * m);
    effects.mhp = Math.round(20 * m);
    effects.tg = Math.round(2 * m);
  } else if (data.tp === '功能') {
    effects.as = -0.05 * m;
    effects.ms = Math.round(5 * m);
  } else if (data.tp === '特殊') {
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
    const se = specialEffects[data.id];
    if (se) {
      for (const k of Object.keys(se)) {
        (effects as any)[k] = (se as any)[k];
      }
    }
  }

  return {
    id: data.id,
    nm: data.nm,
    tp: data.tp,
    desc: data.desc,
    q: data.q,
    price: data.price,
    iid: nextUID(),
    effects,
    onEquip(unit: PlayerUnit) {
      if (!unit) return;
      const e = effects;
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
      const e = effects;
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

// 旧的创建函数 - 保持签名不变
export function createArtifactInstance(ad: ArtifactData): ArtifactInstance {
  return createArtifactInstanceLegacy(ad);
}

export function applyArtifact(art: ArtifactInstance, unit: PlayerUnit): void {
  if (!art || !unit) return;
  art.onEquip(unit);
}

export function removeArtifact(art: ArtifactInstance, unit: PlayerUnit): void {
  if (!art || !unit) return;
  art.onUnequip(unit);
}
