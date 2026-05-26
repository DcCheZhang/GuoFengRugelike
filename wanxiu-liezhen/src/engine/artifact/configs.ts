import { ArtifactConfig, TriggerType, EffectType, TargetSelector, ConditionType, StatType } from './types';
import { ArtifactQuality, UnitType, ArtifactData } from '@/types';
import artifactsJson from '@/data/json/artifacts.json';

// ====== 具体精心设计的前50个神器效果 ======
export const artifactEffectConfigs: Record<number, ArtifactConfig> = {
  1: {
    id: 1,
    name: "迷魂香",
    type: "进攻",
    description: "毒修弟子获得暴击率加成",
    quality: ArtifactQuality.NORMAL,
    price: 200,
    effects: [{
      id: "mi-hun-xiang-crit",
      type: EffectType.STAT_MOD,
      trigger: TriggerType.ON_EQUIP,
      target: TargetSelector.SELF,
      condition: { type: ConditionType.UNIT_TYPE, params: { unitType: UnitType.SUPPORT } },
      values: { stat: { base: StatType.CRIT_RATE as any, perQuality: 0 }, value: { base: 0.05, perQuality: 0.02 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  },

  2: {
    id: 2,
    name: "照妖镜",
    type: "进攻",
    description: "毒雾可额外叠加层数",
    quality: ArtifactQuality.SCARCE,
    price: 500,
    effects: [{
      id: "zhao-yao-jing-damage",
      type: EffectType.STAT_MOD,
      trigger: TriggerType.ON_EQUIP,
      target: TargetSelector.SELF,
      condition: { type: ConditionType.UNIT_TYPE, params: { unitType: UnitType.SUPPORT } },
      values: { stat: { base: StatType.ATTACK as any, perQuality: 0 }, value: { base: 10, perQuality: 5 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  },

  3: {
    id: 3,
    name: "清泉露",
    type: "功能",
    description: "毒修弟子施毒雾时治疗队友",
    quality: ArtifactQuality.NORMAL,
    price: 300,
    effects: [{
      id: "qing-quan-lu-heal",
      type: EffectType.HEAL,
      trigger: TriggerType.ON_ATTACK,
      target: TargetSelector.ALLY_LOWEST_HP,
      condition: { type: ConditionType.UNIT_TYPE, params: { unitType: UnitType.SUPPORT } },
      values: { amount: { base: 30, perQuality: 15 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  },

  4: {
    id: 4,
    name: "招贤榜",
    type: "功能",
    description: "弟子返回时有概率带回新弟子",
    quality: ArtifactQuality.NORMAL,
    price: 0,
    effects: [] // 特殊效果，待实现
  },

  5: {
    id: 5,
    name: "护齿符",
    type: "进攻",
    description: "毒修弟子获得攻速加成",
    quality: ArtifactQuality.NORMAL,
    price: 200,
    effects: [{
      id: "hu-chi-fu-attack-speed",
      type: EffectType.STAT_MOD,
      trigger: TriggerType.ON_EQUIP,
      target: TargetSelector.SELF,
      condition: { type: ConditionType.UNIT_TYPE, params: { unitType: UnitType.SUPPORT } },
      values: { stat: { base: StatType.ATTACK_SPEED as any, perQuality: 0 }, value: { base: 0.05, perQuality: 0.02 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  },

  6: {
    id: 6,
    name: "折扣符",
    type: "功能",
    description: "商店法宝概率降价",
    quality: ArtifactQuality.NORMAL,
    price: 150,
    effects: [] // 商店特殊效果，待实现
  },

  7: {
    id: 7,
    name: "警报铃",
    type: "防御",
    description: "弟子被击倒时全队获韧性",
    quality: ArtifactQuality.SCARCE,
    price: 500,
    effects: [{
      id: "jing-bao-ling-toughness",
      type: EffectType.STAT_MOD,
      trigger: TriggerType.ON_KILL,
      target: TargetSelector.ALLY_ALL,
      values: { stat: { base: StatType.TOUGHNESS as any, perQuality: 0 }, value: { base: 5, perQuality: 3 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  },

  8: {
    id: 8,
    name: "万法通识",
    type: "进攻",
    description: "每种独特弟子类型增加全队伤害",
    quality: ArtifactQuality.LEGENDARY,
    price: 1500,
    effects: [{
      id: "wan-fa-tong-shi-attack",
      type: EffectType.STAT_MOD,
      trigger: TriggerType.ON_EQUIP,
      target: TargetSelector.ALLY_ALL,
      values: { stat: { base: StatType.ATTACK as any, perQuality: 0 }, value: { base: 8, perQuality: 5 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  },

  9: {
    id: 9,
    name: "召回符",
    type: "功能",
    description: "昏迷弟子概率苏醒",
    quality: ArtifactQuality.NORMAL,
    price: 200,
    effects: [] // 特殊效果，待实现
  },

  10: {
    id: 10,
    name: "百宝囊",
    type: "进攻",
    description: "石工傀儡投掷双石块",
    quality: ArtifactQuality.SCARCE,
    price: 500,
    effects: [{
      id: "bai-bao-nang-damage",
      type: EffectType.DAMAGE,
      trigger: TriggerType.ON_ATTACK,
      target: TargetSelector.TARGET,
      values: { damage: { base: 20, perQuality: 10 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  },

  18: {
    id: 18,
    name: "医祸",
    type: "特殊",
    description: "回春术对敌人造成伤害",
    quality: ArtifactQuality.SCARCE,
    price: 0,
    effects: [{
      id: "yi-huo-damage",
      type: EffectType.DAMAGE,
      trigger: TriggerType.ON_HIT,
      target: TargetSelector.TARGET,
      condition: { type: ConditionType.UNIT_TYPE, params: { unitType: UnitType.SUPPORT } },
      values: { damage: { base: 15, perQuality: 8 }, isPercent: { base: 0, perQuality: 0 } }
    }]
  }
};

// ====== 从 artifacts.json 构建完整的213个神器配置 ======
function buildArtifactConfigs(): Record<number, ArtifactConfig> {
  const configs: Record<number, ArtifactConfig> = {};

  (artifactsJson as any).artifacts.forEach((ad: ArtifactData) => {
    // 如果我们已经有精心设计的效果配置，优先使用
    if (artifactEffectConfigs[ad.id]) {
      configs[ad.id] = { ...artifactEffectConfigs[ad.id] };
      // 确保使用json中的最新价格和品质
      configs[ad.id].price = ad.price;
      return;
    }

    // 否则，根据类型生成基础效果
    let statKey = StatType.ATTACK;
    if (ad.tp === "防御") {
      statKey = StatType.DEFENSE;
    } else if (ad.tp === "功能") {
      statKey = StatType.ATTACK_SPEED;
    }

    let quality = ArtifactQuality.NORMAL;
    if (ad.q === "scarce") quality = ArtifactQuality.SCARCE;
    else if (ad.q === "legendary") quality = ArtifactQuality.LEGENDARY;

    configs[ad.id] = {
      id: ad.id,
      name: ad.nm,
      type: ad.tp,
      description: ad.desc,
      quality: quality,
      price: ad.price,
      effects: [{
        id: `artifact-${ad.id}`,
        type: EffectType.STAT_MOD,
        trigger: TriggerType.ON_EQUIP,
        target: TargetSelector.SELF,
        values: {
          stat: { base: statKey as any, perQuality: 0 },
          value: { base: ad.q === 'legendary' ? 20 : (ad.q === 'scarce' ? 12 : 6), perQuality: 5 },
          isPercent: { base: 0, perQuality: 0 }
        }
      }]
    };
  });

  return configs;
}

export const artifactConfigs = buildArtifactConfigs();

// 获取神器配置
export function getArtifactConfig(id: number): ArtifactConfig | null {
  return artifactConfigs[id] || null;
}

// 获取所有神器配置
export function getAllArtifactConfigs(): ArtifactConfig[] {
  return Object.values(artifactConfigs);
}
