import { UnitTier, TIER_ORDER, PlayerUnit } from '@/types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function tierIndex(tier: UnitTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function tierAt(idx: number): UnitTier {
  return TIER_ORDER[Math.max(0, Math.min(idx, TIER_ORDER.length - 1))];
}

export function tierCSS(t: UnitTier): string {
  const map: Record<UnitTier, string> = {
    normal: 'var(--tier-normal)',
    scarce: 'var(--tier-scarce)',
    legendary: 'var(--tier-legendary)',
    mythical: 'var(--tier-mythical)',
  };
  return map[t] || 'var(--tier-normal)';
}

export function foldUnits(
  units: PlayerUnit[]
): { key: string; nm: string; tier: UnitTier; units: PlayerUnit[] }[] {
  const groups: Record<
    string,
    { key: string; nm: string; tier: UnitTier; units: PlayerUnit[] }
  > = {};
  for (const u of units) {
    const k = `${u.nm}_${u.tier}_${u.lv}`;
    if (!groups[k]) {
      groups[k] = { key: k, nm: u.nm, tier: u.tier, units: [] };
    }
    groups[k].units.push(u);
  }
  return Object.values(groups);
}

export function getTierQuality(tier: UnitTier): number {
  const map: Record<UnitTier, number> = {
    normal: 1,
    scarce: 2,
    legendary: 4,
    mythical: 8,
  };
  return map[tier] || 1;
}
