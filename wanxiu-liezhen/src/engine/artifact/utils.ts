import {
  EffectValue,
  Condition,
  ConditionType,
  TriggerContext,
  TargetSelector,
  StatType,
} from './types';
import { PlayerUnit, EnemyUnit, TIER_QUALITY_MAP } from '@/types';
import { R } from '@/utils/random';
import { findWeakestEnemy, findNearestEnemies } from '@/engine/combat';

// ====== 数值计算 ======
export function calcEffectValue(
  value: EffectValue,
  qualityMultiplier: number,
  context?: TriggerContext
): number {
  let result = value.base + value.perQuality * qualityMultiplier;

  if (value.scaling && context?.sourceUnit) {
    const unit = context.sourceUnit;
    let statValue = 0;
    switch (value.scaling.stat) {
      case StatType.ATTACK:
        statValue = unit.attack;
        break;
      case StatType.DEFENSE:
        statValue = unit.defense;
        break;
      case StatType.MAX_HP:
        statValue = unit.maxHp;
        break;
      case StatType.HP:
        statValue = unit.hp;
        break;
      case StatType.CRIT_RATE:
        statValue = unit.critRate;
        break;
      case StatType.ATTACK_SPEED:
        statValue = unit.attackSpeed;
        break;
      default:
        break;
    }
    result += statValue * value.scaling.ratio;
  }

  return result;
}

// ====== 条件判断 ======
export function evaluateCondition(
  condition: Condition,
  context: TriggerContext,
  qualityMultiplier: number
): boolean {
  switch (condition.type) {
    case ConditionType.UNIT_TYPE:
      return context.sourceUnit.tp === condition.params?.unitType;

    case ConditionType.HP_BELOW:
      if (!condition.value) return false;
      const threshold = calcEffectValue(condition.value, qualityMultiplier, context);
      return context.sourceUnit.hp < context.sourceUnit.maxHp * (threshold / 100);

    case ConditionType.HP_ABOVE:
      if (!condition.value) return false;
      const threshold2 = calcEffectValue(condition.value, qualityMultiplier, context);
      return context.sourceUnit.hp > context.sourceUnit.maxHp * (threshold2 / 100);

    case ConditionType.HAS_ARTIFACT:
      return context.sourceUnit.arts?.some((a: any) => a.id === condition.params?.artifactId) ?? false;

    case ConditionType.RANDOM_CHANCE:
      if (!condition.value) return false;
      const chance = calcEffectValue(condition.value, qualityMultiplier, context);
      return Math.random() < chance / 100;

    case ConditionType.IS_CRIT:
      return context.isCrit ?? false;

    case ConditionType.IS_ALIVE:
      return context.sourceUnit.alive;

    case ConditionType.AND:
      const andConditions = condition.params?.conditions as Condition[];
      return andConditions?.every((c) => evaluateCondition(c, context, qualityMultiplier)) ?? true;

    case ConditionType.OR:
      const orConditions = condition.params?.conditions as Condition[];
      return orConditions?.some((c) => evaluateCondition(c, context, qualityMultiplier)) ?? false;

    case ConditionType.NOT:
      const notCondition = condition.params?.condition as Condition;
      return !evaluateCondition(notCondition, context, qualityMultiplier);

    default:
      return true;
  }
}

export function evaluateConditions(
  conditions: Condition | Condition[],
  context: TriggerContext,
  qualityMultiplier: number
): boolean {
  const condList = Array.isArray(conditions) ? conditions : [conditions];
  return condList.every((c) => evaluateCondition(c, context, qualityMultiplier));
}

// ====== 目标选择 ======
export function selectTargets(
  selector: TargetSelector,
  context: TriggerContext
): (PlayerUnit | EnemyUnit)[] {
  const source = context.sourceUnit;
  const allies = context.allies;
  const enemies = context.enemies;

  switch (selector) {
    case TargetSelector.SELF:
      return [source];

    case TargetSelector.TARGET:
      return context.targetUnit ? [context.targetUnit] : [];

    case TargetSelector.KILLED_TARGET:
      return context.targetUnit && context.isKill ? [context.targetUnit] : [];

    case TargetSelector.ALLY_LOWEST_HP:
      const lowestHp = allies
        .filter((a) => a.alive && a.hp < a.maxHp)
        .sort((a, b) => a.hp - b.hp)[0];
      return lowestHp ? [lowestHp] : [];

    case TargetSelector.ALLY_RANDOM:
      const aliveAllies = allies.filter((a) => a.alive);
      return aliveAllies.length > 0 ? [R.pick(aliveAllies)] : [];

    case TargetSelector.ALLY_ALL:
      return allies.filter((a) => a.alive);

    case TargetSelector.ENEMY_NEAREST:
      const aliveEnemies = enemies.filter((e) => e.alive);
      if (aliveEnemies.length === 0) return [];
      return findNearestEnemies(source, aliveEnemies, 1000).slice(0, 1);

    case TargetSelector.ENEMY_WEAKEST:
      const weakest = findWeakestEnemy(enemies);
      return weakest ? [weakest] : [];

    case TargetSelector.ENEMY_RANDOM:
      const aliveE = enemies.filter((e) => e.alive);
      return aliveE.length > 0 ? [R.pick(aliveE)] : [];

    case TargetSelector.ENEMY_ALL:
      return enemies.filter((e) => e.alive);

    default:
      return [];
  }
}

// ====== 品质乘数 ======
export function getQualityMultiplier(quality: string): number {
  return TIER_QUALITY_MAP[quality] ?? 1;
}
