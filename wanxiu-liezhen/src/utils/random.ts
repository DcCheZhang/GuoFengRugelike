import { UnitTier } from '@/types';

export const R = {
  fl: (a: number, b: number): number => a + Math.random() * (b - a),

  i: (a: number, b: number): number =>
    Math.floor(a + Math.random() * (b - a + 1)),

  pick: <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)],

  ch: (p: number): boolean => Math.random() < p,

  w: <T extends { weight: number }>(items: T[]): T => {
    const total = items.reduce((s, it) => s + it.weight, 0);
    let r = Math.random() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return items[items.length - 1];
  },

  weightedTier: (): UnitTier => {
    const r = Math.random() * 100;
    if (r < 60) return UnitTier.NORMAL;
    if (r < 90) return UnitTier.SCARCE;
    return UnitTier.LEGENDARY;
  },
};
