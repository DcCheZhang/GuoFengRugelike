import { UnitAttributes, PlayerUnit, EnemyUnit, DamageResult } from '@/types';
import { GC } from '@/data/constants';

export function calcDmg(
  atk: UnitAttributes & { kills?: number },
  def: UnitAttributes & { alive: boolean }
): DamageResult {
  if (Math.random() < def.dodgeRate) {
    return { dmg: 0, crit: false, dodge: true, kill: false };
  }

  const ecr = Math.max(0, atk.critRate - def.toughness * 0.01);
  const crit = Math.random() < ecr;
  const rf = GC.RMIN + Math.random() * (GC.RMAX - GC.RMIN);
  let dmg = (atk.attack - def.defense * GC.DEF_F) * GC.SKILL_C * rf;
  if (crit) dmg *= atk.critDamage;
  dmg = Math.max(1, Math.round(dmg));
  const actualDmg = Math.min(dmg, def.hp);
  def.hp = Math.max(0, def.hp - actualDmg);
  const kill = def.hp <= 0;
  if (kill) {
    (def as any).alive = false;
    if ((atk as any).kills !== undefined) (atk as any).kills++;
  }
  return { dmg: actualDmg, crit, dodge: false, kill };
}

export function findWeakestEnemy(
  enemies: (PlayerUnit | EnemyUnit)[]
): (PlayerUnit | EnemyUnit) | null {
  let best: (PlayerUnit | EnemyUnit) | null = null;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (!best || e.hp < best.hp) best = e;
  }
  return best;
}

export function findNearestEnemies(
  unit: PlayerUnit | EnemyUnit,
  enemies: (PlayerUnit | EnemyUnit)[],
  radius: number
): (PlayerUnit | EnemyUnit)[] {
  const result: (PlayerUnit | EnemyUnit)[] = [];
  for (const e of enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.bx - unit.bx, e.by - unit.by);
    if (d <= radius) result.push(e);
  }
  return result;
}

export function countFamily(
  units: PlayerUnit[],
  u: PlayerUnit
): number {
  let c = 0;
  for (const other of units) {
    if (other.alive && other.nm === u.nm) c++;
  }
  return c;
}
