import { UnitData, UnitType, UnitTier } from '@/types';
import uData from '@/data/json/units.json';

export const UD: UnitData[] = (uData.units as any[]).map((u) => ({
  id: u.id,
  nm: u.nm,
  tp: u.tp as UnitType,
  min: u.min as UnitTier,
  t: u.tiers as any,
}));
