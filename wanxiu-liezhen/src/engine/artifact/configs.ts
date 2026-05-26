import { ArtifactConfig, TriggerType, EffectType, TargetSelector, ConditionType, StatType } from './types';
import { ArtifactQuality } from '@/types';

// ====== 示例神器配置 ======
export const artifactConfigs: Record<number, ArtifactConfig> = {
  1: {
    id: 1,
    name: '迷魂香',
    type: '进攻',
    description: '毒修弟子获得暴击率加成',
    quality: ArtifactQuality.NORMAL,
    price: 200,
    effects: [
      {
        id: 'mihunxiang-crit',
        type: EffectType.STAT_MOD,
        trigger: TriggerType.ON_EQUIP,
        target: TargetSelector.SELF,
        condition: {
          type: ConditionType.UNIT_TYPE,
          params: { unitType: 'support' },
        },
        values: {
          stat: { base: StatType.CRIT_RATE as any, perQuality: 0 },
          value: { base: 0.02, perQuality: 0.01 },
          isPercent: { base: 0, perQuality: 0 },
        },
      },
    ],
  },

  7: {
    id: 7,
    name: '警报铃',
    type: '防御',
    description: '当任意非召唤类弟子被击倒时，所有弟子获得韧性',
    quality: ArtifactQuality.SCARCE,
    price: 500,
    effects: [
      {
        id: 'jingbaoling-toughness',
        type: EffectType.STAT_MOD,
        trigger: TriggerType.ON_KILL,
        target: TargetSelector.ALLY_ALL,
        values: {
          stat: { base: StatType.TOUGHNESS as any, perQuality: 0 },
          value: { base: 2, perQuality: 1 },
          isPercent: { base: 0, perQuality: 0 },
        },
      },
    ],
  },

  18: {
    id: 18,
    name: '医祸',
    type: '特殊',
    description: '医修弟子的回春术现在还会对一名敌人造成伤害',
    quality: ArtifactQuality.SCARCE,
    price: 0,
    effects: [
      {
        id: 'yihuo-damage',
        type: EffectType.DAMAGE,
        trigger: TriggerType.ON_ATTACK,
        target: TargetSelector.ENEMY_WEAKEST,
        condition: {
          type: ConditionType.UNIT_TYPE,
          params: { unitType: 'support' },
        },
        values: {
          damage: { base: 50, perQuality: 25 },
          isPercent: { base: 1, perQuality: 0 },
        },
      },
    ],
  },
};

// 获取神器配置
export function getArtifactConfig(id: number): ArtifactConfig | undefined {
  return artifactConfigs[id];
}

// 所有神器配置
export function getAllArtifactConfigs(): ArtifactConfig[] {
  return Object.values(artifactConfigs);
}
