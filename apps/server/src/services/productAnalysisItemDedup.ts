import type { ProductAnalysisItem } from '@acme/shared';

interface DedupeOptions {
  preferredKeys?: Set<string>;
}

const getPriority = (item: ProductAnalysisItem, options?: DedupeOptions): number => {
  const preferredBoost = options?.preferredKeys?.has(item.key) ? 10 : 0;
  const coveragePriority = item.key.endsWith('-coverage') ? 1 : 2;

  return preferredBoost + coveragePriority;
};

export const dedupeAnalysisItemsByLabel = <T extends ProductAnalysisItem>(
  items: T[],
  options?: DedupeOptions,
): T[] => {
  const deduped = new Map<string, T>();

  for (const item of items) {
    const existing = deduped.get(item.label);

    if (!existing || getPriority(item, options) > getPriority(existing, options)) {
      deduped.set(item.label, item);
    }
  }

  return Array.from(deduped.values());
};
