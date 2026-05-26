import { ArtifactData, ArtifactQuality } from '@/types';
import aData from '@/data/json/artifacts.json';

export const AD: ArtifactData[] = (aData.artifacts as any[]).map((a) => ({
  id: a.id,
  nm: a.nm,
  tp: a.tp,
  desc: a.desc,
  q: a.q as ArtifactQuality,
  price: a.price,
}));
