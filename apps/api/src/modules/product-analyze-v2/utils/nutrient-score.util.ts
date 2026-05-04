export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreLowerIsBetter(
  value: number | null,
  best: number,
  worst: number,
): number | null {
  if (value === null || value === undefined) return null;
  if (worst === best) return 100;
  const ratio = (value - best) / (worst - best);
  return clampScore((1 - Math.max(0, Math.min(1, ratio))) * 100);
}

export function scoreHigherIsBetter(
  value: number | null,
  worst: number,
  best: number,
): number | null {
  if (value === null || value === undefined) return null;
  if (worst === best) return 100;
  const ratio = (value - worst) / (best - worst);
  return clampScore(Math.max(0, Math.min(1, ratio)) * 100);
}

export function weightedAverage(
  scores: Record<string, number | null>,
  weights: Record<string, number>,
): { score: number; missingMetrics: string[] } {
  const missingMetrics: string[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key];
    if (score === null || score === undefined) {
      missingMetrics.push(key);
      continue;
    }
    weightedSum += score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return { score: 50, missingMetrics };

  const normalized =
    (weightedSum / totalWeight) * (totalWeight / Object.values(weights).reduce((a, b) => a + b, 0));
  return { score: clampScore(normalized), missingMetrics };
}
