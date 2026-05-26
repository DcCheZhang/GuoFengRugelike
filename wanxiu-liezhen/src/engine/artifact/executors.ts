import {
  EffectExecutor,
  TriggerContext,
  ArtifactEffect,
  EffectType,
  StatType,
} from './types';
import { calcEffectValue, selectTargets } from './utils';
import { calcDmg } from '@/engine/combat';

// ====== 数值修改执行器 ======
export const statModExecutor: EffectExecutor = (ctx, effect, qMult) => {
  const targets = selectTargets(effect.target, ctx);
  const stat = effect.values.stat?.base as unknown as StatType;
  const value = calcEffectValue(effect.values.value, qMult, ctx);
  const isPercent = effect.values.isPercent?.base ?? 0;

  for (const target of targets) {
    if (!target.alive) continue;

    let actualValue = value;
    if (isPercent) {
      switch (stat) {
        case StatType.ATTACK:
          actualValue = target.attack * (value / 100);
          break;
        case StatType.DEFENSE:
          actualValue = target.defense * (value / 100);
          break;
        case StatType.MAX_HP:
          actualValue = target.maxHp * (value / 100);
          break;
        default:
          break;
      }
    }

    switch (stat) {
      case StatType.ATTACK:
        target.attack += actualValue;
        break;
      case StatType.DEFENSE:
        target.defense += actualValue;
        break;
      case StatType.HP:
        target.hp = Math.min(target.hp + actualValue, target.maxHp);
        break;
      case StatType.MAX_HP:
        target.maxHp += actualValue;
        target.hp = Math.min(target.hp + actualValue, target.maxHp);
        break;
      case StatType.ATTACK_SPEED:
        target.attackSpeed = Math.max(0.1, target.attackSpeed + actualValue);
        break;
      case StatType.MOVE_SPEED:
        target.moveSpeed += actualValue;
        break;
      case StatType.CRIT_RATE:
        target.critRate = Math.min(1, Math.max(0, target.critRate + actualValue));
        break;
      case StatType.CRIT_DAMAGE:
        target.critDamage += actualValue;
        break;
      case StatType.DODGE_RATE:
        target.dodgeRate = Math.min(1, Math.max(0, target.dodgeRate + actualValue));
        break;
      case StatType.TOUGHNESS:
        target.toughness += actualValue;
        break;
      case StatType.RANGE:
        target.range += actualValue;
        break;
      default:
        break;
    }
  }
};

// ====== 治疗执行器 ======
export const healExecutor: EffectExecutor = (ctx, effect, qMult) => {
  const targets = selectTargets(effect.target, ctx);
  const amount = calcEffectValue(effect.values.amount, qMult, ctx);
  const isPercent = effect.values.isPercent?.base ?? 0;

  for (const target of targets) {
    if (!target.alive) continue;

    let healAmount = amount;
    if (isPercent) {
      healAmount = target.maxHp * (amount / 100);
    }

    const oldHp = target.hp;
    target.hp = Math.min(target.hp + healAmount, target.maxHp);
    const actualHeal = target.hp - oldHp;

    if (ctx.battleFX && actualHeal > 0) {
      ctx.battleFX.push({
        tp: 'dmg',
        x: target.bx,
        y: target.by - 20,
        v: `+${Math.round(actualHeal)}`,
        c: false,
        life: 0.8,
        ml: 0.8,
        heal: true,
      });
    }
  }
};

// ====== 伤害执行器 ======
export const damageExecutor: EffectExecutor = (ctx, effect, qMult) => {
  const targets = selectTargets(effect.target, ctx);
  const baseDamage = calcEffectValue(effect.values.damage, qMult, ctx);
  const isPercent = effect.values.isPercent?.base ?? 0;

  for (const target of targets) {
    if (!target.alive) continue;

    let dmg = baseDamage;
    if (isPercent && ctx.sourceUnit) {
      dmg = ctx.sourceUnit.attack * (baseDamage / 100);
    }

    const fakeAtk = { ...ctx.sourceUnit, attack: dmg };
    const result = calcDmg(fakeAtk as any, target);

    if (ctx.battleFX) {
      ctx.battleFX.push({
        tp: 'dmg',
        x: target.bx,
        y: target.by - 20,
        v: result.dmg,
        c: result.crit,
        life: 0.8,
        ml: 0.8,
      });
    }
  }
};

// ====== 执行器映射 ======
export const effectExecutors: Record<EffectType, EffectExecutor> = {
  [EffectType.STAT_MOD]: statModExecutor,
  [EffectType.HEAL]: healExecutor,
  [EffectType.DAMAGE]: damageExecutor,
  [EffectType.BUFF]: () => {}, // 待实现
  [EffectType.DEBUFF]: () => {}, // 待实现
  [EffectType.SUMMON]: () => {}, // 待实现
  [EffectType.TELEPORT]: () => {}, // 待实现
  [EffectType.SHIELD]: () => {}, // 待实现
  [EffectType.LIFESTEAL]: () => {}, // 待实现
  [EffectType.CUSTOM]: () => {}, // 待实现
};
