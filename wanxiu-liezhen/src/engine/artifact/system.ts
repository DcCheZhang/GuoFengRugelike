import {
  ArtifactConfig,
  TriggerType,
  TriggerContext,
  ArtifactEffect,
} from './types';
import { ArtifactInstance, PlayerUnit, EnemyUnit } from '@/types';
import { getArtifactConfig } from './configs';
import { evaluateConditions, getQualityMultiplier } from './utils';
import { effectExecutors } from './executors';
import { nextUID } from '@/state/GameState';

// ====== 神器实例 ======
export class ArtifactSystemInstance implements ArtifactInstance {
  id: number;
  iid: number;
  config: ArtifactConfig;
  effectCooldowns: Record<string, { lastTrigger: number }> = {};
  cachedStats: any = {};

  constructor(config: ArtifactConfig) {
    this.id = config.id;
    this.iid = nextUID();
    this.config = config;
  }

  get nm() {
    return this.config.name;
  }

  get tp() {
    return this.config.type;
  }

  get desc() {
    return this.config.description;
  }

  get q() {
    return this.config.quality;
  }

  get price() {
    return this.config.price;
  }

  get effects() {
    return {} as any;
  }

  // 获取品质乘数
  private getQualityMultiplier(): number {
    return getQualityMultiplier(this.config.quality);
  }

  // 装备时触发
  onEquip(unit: PlayerUnit): void {
    const qMult = this.getQualityMultiplier();
    const context: TriggerContext = {
      artifactId: this.id,
      sourceUnit: unit,
      allies: [],
      enemies: [],
    };
    this.triggerEffects(TriggerType.ON_EQUIP, context, qMult);
  }

  // 卸下时触发
  onUnequip(unit: PlayerUnit): void {
    const qMult = this.getQualityMultiplier();
    const context: TriggerContext = {
      artifactId: this.id,
      sourceUnit: unit,
      allies: [],
      enemies: [],
    };
    this.triggerEffects(TriggerType.ON_UNEQUIP, context, qMult);
  }

  // 触发效果
  triggerEffects(
    triggerType: TriggerType,
    context: TriggerContext,
    qMult: number
  ): void {
    const effects = this.config.effects.filter((e) => e.trigger === triggerType);

    for (const effect of effects) {
      // 检查冷却
      if (effect.cooldown) {
        const lastTrigger = this.effectCooldowns[effect.id]?.lastTrigger || 0;
        const now = Date.now();
        if (now - lastTrigger < effect.cooldown * 1000) {
          continue;
        }
      }

      // 检查条件
      if (effect.condition) {
        if (!evaluateConditions(effect.condition, context, qMult)) {
          continue;
        }
      }

      // 执行效果
      const executor = effectExecutors[effect.type];
      if (executor) {
        executor(context, effect, qMult);
      }

      // 更新冷却时间
      if (effect.cooldown) {
        this.effectCooldowns[effect.id] = { lastTrigger: Date.now() };
      }
    }
  }
}

// ====== 神器管理器 ======
export class ArtifactSystem {
  private static instance: ArtifactSystem;

  private constructor() {}

  static getInstance(): ArtifactSystem {
    if (!ArtifactSystem.instance) {
      ArtifactSystem.instance = new ArtifactSystem();
    }
    return ArtifactSystem.instance;
  }

  // 创建神器实例
  createArtifact(artifactId: number): ArtifactSystemInstance | null {
    const config = getArtifactConfig(artifactId);
    if (!config) {
      console.warn(`Artifact config not found for id: ${artifactId}`);
      return null;
    }
    return new ArtifactSystemInstance(config);
  }

  // 战斗中触发事件
  triggerEvent(
    triggerType: TriggerType,
    context: Omit<TriggerContext, 'artifactId'>,
    units: PlayerUnit[]
  ): void {
    for (const unit of units) {
      if (!unit.arts) continue;

      for (const art of unit.arts) {
        if (art instanceof ArtifactSystemInstance) {
          const qMult = getQualityMultiplier(art.config.quality);
          const fullContext: TriggerContext = {
            ...context,
            artifactId: art.id,
            sourceUnit: unit,
            allies: context.allies || [],
            enemies: context.enemies || [],
          };
          art.triggerEffects(triggerType, fullContext, qMult);
        }
      }
    }
  }
}

// 导出单例
export const artifactSystem = ArtifactSystem.getInstance();
