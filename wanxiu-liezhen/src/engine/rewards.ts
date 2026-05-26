import { UnitTier, ArtifactQuality, RoundType } from '@/types';
import { GS, addGold } from '@/state/GameState';
import { UD } from '@/data/units';
import { AD } from '@/data/artifacts';
import { getRoundType } from '@/data/enemies';
import { R } from '@/utils/random';
import { tierIndex } from '@/utils/helpers';
import { createUnit } from '@/engine/synthesis';
import { createArtifactInstance } from '@/engine/artifact';
import { BE } from '@/engine/battle';
import rData from '@/data/json/rewards.json';

const rewardRules = rData;

export interface BattleRewards {
  gold: number;
  artifact: any | null;
  recruits: any[];
  mvp: any | null;
}

export function generateRewards(): BattleRewards {
  const rt = getRoundType(GS.round);
  const goldRange = rewardRules.goldByRoundType[rt] || [80, 150];
  let gold = R.i(goldRange[0], goldRange[1]);

  let artifact: any = null;
  const isBossOrRelic = rt === RoundType.BOSS || rt === RoundType.RELIC;
  const artRule = isBossOrRelic
    ? rewardRules.artifactByRoundType.relic
    : rewardRules.artifactByRoundType.other;
  if (R.ch(artRule.chance)) {
    const qr = R.w(artRule.weights) as { quality: string; weight: number };
    const pool = AD.filter((a) => a.q === qr.quality);
    if (pool.length > 0) {
      artifact = createArtifactInstance(R.pick(pool));
    }
  }

  const recruits: any[] = [];
  for (let i = 0; i < rewardRules.recruitCount; i++) {
    const d = R.pick(UD);
    const tier = (R.w(rewardRules.recruitTierWeights) as { tier: string; weight: number }).tier as UnitTier;
    const ti = tierIndex(tier);
    const mi = tierIndex(d.min);
    const ft = ti >= mi ? tier : d.min;
    const u = createUnit(d.id, ft, 1);
    if (u) recruits.push(u);
  }

  let mvp: any = null;
  if (BE.pu.length > 0) {
    let best: any = null;
    for (const u of BE.pu) {
      if ((u.dd || 0) > (best ? best.dd : 0)) best = u;
    }
    if (best) mvp = best;
  }

  return { gold, artifact, recruits, mvp };
}
