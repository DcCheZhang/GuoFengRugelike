// ====== Enums ======
export enum UnitTier {
  NORMAL = 'normal',
  SCARCE = 'scarce',
  LEGENDARY = 'legendary',
  MYTHICAL = 'mythical',
}

export enum UnitType {
  WARRIOR = 'warrior',
  MAGE = 'mage',
  TANK = 'tank',
  ASSASSIN = 'assassin',
  SUMMONER = 'summoner',
  SUPPORT = 'support',
  CONTROL = 'control',
}

export enum EnemyClass {
  NORMAL = 'normal',
  ELITE = 'elite',
  BOSS = 'boss',
  SPECIAL = 'special',
}

export enum RoundType {
  NORMAL = 'normal',
  RELIC = 'relic',
  SHOP = 'shop',
  BOSS = 'boss',
}

export enum ArtifactType {
  ATTACK = '进攻',
  DEFENSE = '防御',
  FUNCTION = '功能',
  SPECIAL = '特殊',
}

export enum ArtifactQuality {
  NORMAL = 'normal',
  SCARCE = 'scarce',
  LEGENDARY = 'legendary',
  MYTHICAL = 'mythical',
}

// ====== Interfaces ======
export interface UnitAttributes {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackSpeed: number;
  moveSpeed: number;
  range: number;
  critRate: number;
  critDamage: number;
  dodgeRate: number;
  toughness: number;
}

export interface UnitData {
  id: number;
  nm: string;
  tp: UnitType;
  min: UnitTier;
  t: Partial<Record<UnitTier, UnitStats>>;
}

export interface UnitStats {
  hp: number;
  at: number;
  df: number;
  as: number;
  ms: number;
  rg: number;
  cr: number;
  cd: number;
  dr: number;
  tg: number;
}

export interface PlayerUnit extends UnitAttributes {
  uid: number;
  did: number;
  nm: string;
  tp: UnitType;
  tier: UnitTier;
  lv: number;
  alive: boolean;
  rcd: number;
  arts: ArtifactInstance[];
  bx: number;
  by: number;
  acd: number;
  tgt: PlayerUnit | EnemyUnit | null;
  dd: number;
  dt: number;
  hd: number;
  kills?: number;
  isPlayer: boolean;
  vx: number;
  vy: number;
  walkAngle: number;
  idleTimer: number;
  idleDx: number;
  idleDy: number;
  _deathT: number;
  _isSummon?: boolean;
  slowUntil?: number;
  origMs?: number;
  _83last?: number;
  _157bonus?: number;
  _pactDmg?: number;
  _112applied?: number;
  _28stacks?: number;
}

export interface EnemyUnit extends UnitAttributes {
  uid: number;
  did: number;
  nm: string;
  ct: EnemyClass;
  tier?: UnitTier;
  lv?: number;
  alive: boolean;
  rcd: number;
  bx: number;
  by: number;
  acd: number;
  tgt: PlayerUnit | EnemyUnit | null;
  dd: number;
  dt: number;
  hd: number;
  kills?: number;
  isPlayer: boolean;
  vx: number;
  vy: number;
  walkAngle: number;
  idleTimer: number;
  idleDx: number;
  idleDy: number;
  _deathT: number;
  bossSize?: number;
  bossHpW?: number;
  slowUntil?: number;
  origMs?: number;
}

export interface EnemyData {
  id: number;
  nm: string;
  ct: EnemyClass;
  hp: number;
  at: number;
  df: number;
  as: number;
  ms: number;
  rg: number;
  cr: number;
  cd: number;
  dr: number;
  tg: number;
}

export interface ArtifactData {
  id: number;
  nm: string;
  tp: string;
  desc: string;
  q: ArtifactQuality;
  price: number;
}

export interface ArtifactEffects {
  at?: number;
  df?: number;
  cr?: number;
  mhp?: number;
  tg?: number;
  as?: number;
  ms?: number;
}

export interface ArtifactInstance extends ArtifactData {
  iid: number;
  effects: ArtifactEffects;
  onEquip: (unit: PlayerUnit) => void;
  onUnequip: (unit: PlayerUnit) => void;
}

export interface DamageResult {
  dmg: number;
  crit: boolean;
  dodge: boolean;
  kill: boolean;
  dmgDealt?: number;
}

export interface BattlePlayerUnit extends PlayerUnit {
  bx: number;
  by: number;
  acd: number;
  tgt: BattlePlayerUnit | BattleEnemyUnit | null;
  dd: number;
  dt: number;
  hd: number;
  kills: number;
  alive: boolean;
  vx: number;
  vy: number;
  walkAngle: number;
  idleTimer: number;
  idleDx: number;
  idleDy: number;
  isPlayer: true;
  _deathT: number;
  _isSummon?: boolean;
  slowUntil?: number;
  origMs?: number;
  _83last?: number;
  _157bonus?: number;
  _pactDmg?: number;
  _112applied?: number;
  _28stacks?: number;
}

export interface BattleEnemyUnit extends EnemyUnit {
  bx: number;
  by: number;
  acd: number;
  tgt: BattlePlayerUnit | BattleEnemyUnit | null;
  dd: number;
  dt: number;
  hd: number;
  kills: number;
  alive: boolean;
  vx: number;
  vy: number;
  walkAngle: number;
  idleTimer: number;
  idleDx: number;
  idleDy: number;
  isPlayer: false;
  _deathT: number;
  bossSize?: number;
  bossHpW?: number;
  slowUntil?: number;
  origMs?: number;
}

export interface BattleFX {
  tp: 'dmg' | 'miss' | 'kill' | 'line' | 'death';
  x: number;
  y: number;
  v?: number | string;
  c?: boolean;
  life: number;
  ml: number;
  heal?: boolean;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color?: string;
}

export interface DialogueSet {
  idle: string[];
  atk: string;
  hit: string;
  death: string;
}

export interface GameState {
  cv: string;
  gold: number;
  spirit: number;
  round: number;
  units: PlayerUnit[];
  arts: ArtifactInstance[];
  dead: PlayerUnit[];
  rerolls: number;
  bspeed: number;
  bpaused: boolean;
  chapter: number;
  cycle: number;
}

export interface ShopItem {
  tp: 'unit' | 'artifact';
  data: UnitData | ArtifactData;
  tier?: UnitTier;
  price: number;
}

export interface SynthGroup {
  did: number;
  tier: UnitTier;
  lv: number;
  units: PlayerUnit[];
}

export interface BattleResult {
  result: 'win' | 'lose';
}

export const TIER_ORDER: UnitTier[] = [UnitTier.NORMAL, UnitTier.SCARCE, UnitTier.LEGENDARY, UnitTier.MYTHICAL];
export const TIER_NAMES: Record<UnitTier, string> = {
  normal: '普通',
  scarce: '稀少',
  legendary: '传奇',
  mythical: '神话',
};
export const TYPE_NAMES: Record<UnitType, string> = {
  warrior: '战士',
  mage: '法师',
  tank: '坦克',
  assassin: '刺客',
  summoner: '召唤',
  support: '辅助',
  control: '控制',
};
export const TIER_QUALITY_MAP: Record<string, number> = {
  normal: 1,
  scarce: 2,
  legendary: 4,
  mythical: 8,
};
