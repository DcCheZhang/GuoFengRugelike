import { PlayerUnit, EnemyUnit, ArtifactQuality } from '@/types';

// ====== 触发器事件类型 ======
export enum TriggerType {
  ON_EQUIP = 'onEquip',
  ON_UNEQUIP = 'onUnequip',
  ON_ATTACK = 'onAttack',
  ON_HIT = 'onHit',
  ON_CRIT = 'onCrit',
  ON_KILL = 'onKill',
  ON_DEATH = 'onDeath',
  ON_DAMAGE_TAKEN = 'onDamageTaken',
  ON_HEAL = 'onHeal',
  ON_BATTLE_START = 'onBattleStart',
  ON_BATTLE_END = 'onBattleEnd',
  ON_FRAME = 'onFrame',
  ON_SKILL_CAST = 'onSkillCast',
  ON_BUFF_APPLY = 'onBuffApply',
  ON_DEBUFF_APPLY = 'onDebuffApply',
}

// ====== 效果类型 ======
export enum EffectType {
  STAT_MOD = 'statMod',
  HEAL = 'heal',
  DAMAGE = 'damage',
  BUFF = 'buff',
  DEBUFF = 'debuff',
  SUMMON = 'summon',
  TELEPORT = 'teleport',
  SHIELD = 'shield',
  LIFESTEAL = 'lifesteal',
  CUSTOM = 'custom',
}

// ====== 目标选择器 ======
export enum TargetSelector {
  SELF = 'self',
  ALLY_LOWEST_HP = 'allyLowestHp',
  ALLY_RANDOM = 'allyRandom',
  ALLY_ALL = 'allyAll',
  ENEMY_NEAREST = 'enemyNearest',
  ENEMY_WEAKEST = 'enemyWeakest',
  ENEMY_RANDOM = 'enemyRandom',
  ENEMY_ALL = 'enemyAll',
  TARGET = 'target',
  KILLED_TARGET = 'killedTarget',
}

// ====== 统计类型 ======
export enum StatType {
  ATTACK = 'attack',
  DEFENSE = 'defense',
  HP = 'hp',
  MAX_HP = 'maxHp',
  ATTACK_SPEED = 'attackSpeed',
  MOVE_SPEED = 'moveSpeed',
  CRIT_RATE = 'critRate',
  CRIT_DAMAGE = 'critDamage',
  DODGE_RATE = 'dodgeRate',
  TOUGHNESS = 'toughness',
  RANGE = 'range',
}

// ====== 条件类型 ======
export enum ConditionType {
  UNIT_TYPE = 'unitType',
  HP_BELOW = 'hpBelow',
  HP_ABOVE = 'hpAbove',
  HAS_ARTIFACT = 'hasArtifact',
  RANDOM_CHANCE = 'randomChance',
  IS_CRIT = 'isCrit',
  IS_ALIVE = 'isAlive',
  AND = 'and',
  OR = 'or',
  NOT = 'not',
}

// ====== 数值配置 ======
export interface EffectValue {
  base: number;
  perQuality: number;
  scaling?: {
    stat?: StatType;
    ratio: number;
  };
}

// ====== 条件配置 ======
export interface Condition {
  type: ConditionType;
  params?: any;
  value?: EffectValue;
}

// ====== 效果配置 ======
export interface ArtifactEffect {
  id: string;
  type: EffectType;
  trigger: TriggerType;
  target: TargetSelector;
  condition?: Condition | Condition[];
  values: Record<string, EffectValue>;
  cooldown?: number;
}

// ====== 完整神器配置 ======
export interface ArtifactConfig {
  id: number;
  name: string;
  type: string;
  description: string;
  quality: ArtifactQuality;
  price: number;
  effects: ArtifactEffect[];
}

// ====== 触发器上下文 ======
export interface TriggerContext {
  artifactId: number;
  sourceUnit: PlayerUnit;
  targetUnit?: PlayerUnit | EnemyUnit;
  allies: PlayerUnit[];
  enemies: (PlayerUnit | EnemyUnit)[];
  damage?: number;
  isCrit?: boolean;
  isDodge?: boolean;
  isKill?: boolean;
  healAmount?: number;
  deltaTime?: number;
  battleTime?: number;
  [key: string]: any;
}

// ====== 效果执行器 ======
export type EffectExecutor = (
  context: TriggerContext,
  effect: ArtifactEffect,
  qualityMultiplier: number
) => void;
