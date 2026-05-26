import { ShopItem, UnitTier } from '@/types';
import { UD } from '@/data/units';
import { AD } from '@/data/artifacts';
import { R } from '@/utils/random';
import { tierIndex } from '@/utils/helpers';

export function genShop(): ShopItem[] {
  const items: ShopItem[] = [];

  const availableUnits = UD.filter(
    (d) => tierIndex(d.min) <= tierIndex(UnitTier.SCARCE)
  );

  const unitPrices: Record<string, number> = { normal: 100, scarce: 300, legendary: 1000 };

  for (let i = 0; i < 3; i++) {
    const d = R.pick(availableUnits);
    const tr = R.w([
      { tier: UnitTier.NORMAL, weight: 50 },
      { tier: UnitTier.SCARCE, weight: 35 },
      { tier: UnitTier.LEGENDARY, weight: 15 },
    ]);
    const tier = tr.tier;
    const ti = tierIndex(tier);
    const mi = tierIndex(d.min);
    if (ti >= mi) {
      items.push({
        tp: 'unit',
        data: d,
        tier,
        price: unitPrices[tier] ?? 100,
      });
    }
  }

  const availableArts = AD.filter((a) => a.q !== 'mythical');
  for (let i = 0; i < 3; i++) {
    const a = R.pick(availableArts);
    items.push({ tp: 'artifact', data: a, price: a.price || 300 });
  }

  return items;
}
