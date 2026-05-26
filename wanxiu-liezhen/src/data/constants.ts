import { UnitTier } from '@/types';
import cfg from '@/data/json/battle_config.json';

export const GC = {
  GOLD_CAP: cfg.goldCap,
  INIT_SPIRIT: cfg.initialSpirit,
  INIT_GOLD: cfg.initialGold,
  REROLL_COST: cfg.rerollCost,
  REROLL_MAX: cfg.rerollMax,
  SHOP_REFRESH: cfg.shopRefresh,
  SELL_RET: cfg.sellReturn,
  UNIT_CAP: cfg.unitCap,
  REVIVE_TURNS: cfg.reviveTurns,
  REVIVE_HP: cfg.reviveHp,
  DEF_F: cfg.defenseFactor,
  SKILL_C: cfg.skillCoefficient,
  RMIN: cfg.randomMin,
  RMAX: cfg.randomMax,
  OPEN_PCT: cfg.openPct,
  MAX_LV: cfg.maxLevel,
  CW: cfg.canvasWidth,
  CH: cfg.canvasHeight,
  FIXED_TICK: cfg.fixedTickRate,
  TIER_P: cfg.tierWeights as { tier: UnitTier; weight: number }[],
  CHAPTERS: [
    '凡间', '幽冥', '妖界', '龙宫',
    '天庭外围', '蟠桃园', '南天门', '凌霄殿', '混沌',
  ],
} as const;
