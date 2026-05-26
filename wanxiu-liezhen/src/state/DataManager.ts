import { UnitData, UnitTier, UnitType, EnemyData, EnemyClass, ArtifactData, ArtifactQuality } from '@/types';

interface BattleConfig {
  goldCap: number;
  initialSpirit: number;
  initialGold: number;
  rerollCost: number;
  rerollMax: number;
  shopRefresh: number;
  sellReturn: number;
  unitCap: number;
  reviveTurns: number;
  reviveHp: number;
  defenseFactor: number;
  skillCoefficient: number;
  randomMin: number;
  randomMax: number;
  openPct: number;
  maxLevel: number;
  canvasWidth: number;
  canvasHeight: number;
  fixedTickRate: number;
  tierWeights: { tier: string; weight: number }[];
}

interface UnitTierStats {
  hp: number; at: number; df: number; as: number; ms: number; rg: number;
  cr: number; cd: number; dr: number; tg: number;
}

interface JSONUnit {
  id: number; nm: string; tp: string; min: string;
  tiers: Record<string, UnitTierStats>;
}

interface JSONEnemy {
  id: number; nm: string; ct: string;
  hp: number; at: number; df: number; as: number; ms: number; rg: number;
  cr: number; cd: number; dr: number; tg: number;
}

interface RewardRule {
  goldByRoundType: Record<string, number[]>;
  artifactByRoundType: Record<string, { chance: number; weights: { quality: string; weight: number }[] }>;
  recruitCount: number;
  recruitTierWeights: { tier: string; weight: number }[];
}

export class DataManager {
  private static _units: UnitData[] = [];
  private static _enemies: EnemyData[] = [];
  private static _extraBosses: EnemyData[] = [];
  private static _artifacts: ArtifactData[] = [];
  private static _battleConfig: BattleConfig | null = null;
  private static _rewards: RewardRule | null = null;
  private static _loaded = false;
  private static _chapterEnemyPools: number[][] = [];
  private static _chapterBosses: number[] = [];

  static async load(): Promise<void> {
    if (this._loaded) return;
    try {
      const [unitJson, enemyJson, artJson, configJson, rewardJson] = await Promise.all([
        this.fetchJSON('/src/data/json/units.json'),
        this.fetchJSON('/src/data/json/enemies.json'),
        this.fetchJSON('/src/data/json/artifacts.json'),
        this.fetchJSON('/src/data/json/battle_config.json'),
        this.fetchJSON('/src/data/json/rewards.json'),
      ]);
      this._units = (unitJson.units as JSONUnit[]).map((u: JSONUnit) => ({
        id: u.id,
        nm: u.nm,
        tp: u.tp as UnitType,
        min: u.min as UnitTier,
        t: u.tiers as any,
      }));
      this._enemies = (enemyJson.enemies as JSONEnemy[]).map((e: JSONEnemy) => ({
        id: e.id, nm: e.nm, ct: e.ct as EnemyClass,
        hp: e.hp, at: e.at, df: e.df, as: e.as, ms: e.ms, rg: e.rg,
        cr: e.cr, cd: e.cd, dr: e.dr, tg: e.tg,
      }));
      this._extraBosses = (enemyJson.extraBosses as JSONEnemy[] || []).map((e: JSONEnemy) => ({
        id: e.id, nm: e.nm, ct: e.ct as EnemyClass,
        hp: e.hp, at: e.at, df: e.df, as: e.as, ms: e.ms, rg: e.rg,
        cr: e.cr, cd: e.cd, dr: e.dr, tg: e.tg,
      }));
      this._artifacts = artJson.artifacts as ArtifactData[];
      this._battleConfig = configJson as BattleConfig;
      this._rewards = rewardJson as RewardRule;
      this._chapterEnemyPools = enemyJson.chapterPools as number[][];
      this._chapterBosses = enemyJson.chapterBosses as number[];
      this._loaded = true;
    } catch (e) {
      console.error('DataManager load failed, using fallback', e);
      this._loaded = false;
    }
  }

  private static async fetchJSON(path: string): Promise<any> {
    const resp = await fetch(path);
    return resp.json();
  }

  static get units(): UnitData[] { return this._units; }
  static get enemies(): EnemyData[] { return this._enemies; }
  static get extraBosses(): EnemyData[] { return this._extraBosses; }
  static get artifacts(): ArtifactData[] { return this._artifacts; }
  static get rewards(): RewardRule | null { return this._rewards; }
  static get battleConfig(): BattleConfig | null { return this._battleConfig; }
  static get chapterEnemyPools(): number[][] { return this._chapterEnemyPools; }
  static get chapterBosses(): number[] { return this._chapterBosses; }
  static get loaded(): boolean { return this._loaded; }

  static getUnitById(id: number): UnitData | undefined {
    return this._units.find((u) => u.id === id);
  }

  static getEnemyById(id: number): EnemyData | undefined {
    const e = this._enemies.find((en) => en.id === id);
    if (e) return e;
    return this._extraBosses.find((en) => en.id === id);
  }

  static getArtifactById(id: number): ArtifactData | undefined {
    return this._artifacts.find((a) => a.id === id);
  }

  static getChapterPool(chapter: number): number[] {
    const idx = Math.min(Math.max(0, chapter - 1), this._chapterEnemyPools.length - 1);
    return this._chapterEnemyPools[idx] || [];
  }

  static getChapterBoss(chapter: number): number {
    const idx = Math.min(Math.max(0, chapter - 1), this._chapterBosses.length - 1);
    return this._chapterBosses[idx] || 22;
  }
}
