import { EnemyData, EnemyClass, RoundType } from '@/types';
import { GC } from '@/data/constants';
import { R } from '@/utils/random';
import eData from '@/data/json/enemies.json';

const rawEnemies = eData.enemies as any[];
const rawBosses = eData.extraBosses as any[];
const chapterPools: number[][] = eData.chapterPools;
const chapterBossIds: number[] = eData.chapterBosses;

function parseEnemy(e: any): EnemyData {
  return { id: e.id, nm: e.nm, ct: e.ct as EnemyClass, hp: e.hp, at: e.at, df: e.df, as: e.as, ms: e.ms, rg: e.rg, cr: e.cr, cd: e.cd, dr: e.dr, tg: e.tg };
}

export const ED: EnemyData[] = rawEnemies.map(parseEnemy);
const EB: EnemyData[] = rawBosses.map(parseEnemy);

export function getRoundTypeByIndex(idx: number): RoundType {
  if (idx <= 4) return RoundType.NORMAL;
  if (idx === 5) return RoundType.RELIC;
  if (idx <= 9) return RoundType.NORMAL;
  if (idx === 10) return RoundType.SHOP;
  if (idx <= 13) return RoundType.NORMAL;
  if (idx === 14) return RoundType.RELIC;
  if (idx <= 16) return RoundType.NORMAL;
  if (idx === 17) return RoundType.SHOP;
  if (idx <= 19) return RoundType.NORMAL;
  return RoundType.BOSS;
}

export function getRoundType(round: number): RoundType {
  const m = (round - 1) % 20 + 1;
  return getRoundTypeByIndex(m);
}

function getDiffInRound(r: number): number {
  if (r <= 5) return 1 + (r - 1) * 0.02;
  if (r <= 10) return 1.1 + (r - 6) * 0.02;
  if (r <= 15) return 1.2 + (r - 11) * 0.04;
  if (r <= 19) return 1.4 + (r - 16) * 0.05;
  return 1.75;
}

export function getDifficulty(round: number): number {
  const chapter = Math.floor((round - 1) / 20) + 1;
  const ri = (round - 1) % 20 + 1;
  return Math.pow(1.2, chapter - 1) * getDiffInRound(ri);
}

function getEnemyById(id: number): EnemyData | undefined {
  return ED.find((e) => e.id === id) || EB.find((e) => e.id === id);
}

function createEnemyUnit(eid: number, dm: number): EnemyData | null {
  const base = getEnemyById(eid);
  if (!base) return null;
  return {
    id: base.id, nm: base.nm, ct: base.ct,
    hp: Math.round(base.hp * dm), at: Math.round(base.at * dm),
    df: Math.round(base.df * dm), as: base.as, ms: base.ms, rg: base.rg,
    cr: base.cr, cd: base.cd, dr: base.dr, tg: Math.round(base.tg * dm),
  };
}

export function genEnemies(round: number): any[] {
  const chapter = Math.min(Math.floor((round - 1) / 20), 8);
  const ri = (round - 1) % 20 + 1;
  const dm = getDifficulty(round);
  const rt = getRoundType(round);
  const pool = chapterPools[chapter] || [];
  const enemies: any[] = [];

  if (rt === RoundType.BOSS) {
    const bid = chapterBossIds[chapter] || 22;
    const boss = createEnemyUnit(bid, dm * 1.5);
    if (boss) enemies.push(boss);
    const mc = 12 + Math.floor(chapter / 2);
    for (let i = 0; i < mc && pool.length > 0; i++) {
      const eid = R.pick(pool);
      const e = createEnemyUnit(eid, dm);
      if (e) enemies.push(e);
    }
  } else {
    let bc = 6 + Math.floor(ri / 5);
    const ro = R.i(-1, 2);
    let c = bc + ro;
    if (rt === RoundType.RELIC) c += 3;
    if (rt === RoundType.SHOP) c += 2;
    for (let i = 0; i < c && pool.length > 0; i++) {
      const eid = R.pick(pool);
      const e = createEnemyUnit(eid, dm);
      if (e) enemies.push(e);
    }
  }
  return enemies;
}
