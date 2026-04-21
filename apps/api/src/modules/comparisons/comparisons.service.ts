import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ComparisonFilters,
  ComparisonDetailResponse,
  ComparisonHistoryItem,
  ComparisonHistoryResponse,
} from '@acme/shared';
import { productComparisonResultSchema } from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import { buildProductSearchFilter, normalizeSearchQuery } from '../../shared/utils/product-search';
import { prisma } from '../product-analyze/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;
const FILTERED_BATCH_MULTIPLIER = 3;

type ComparisonProduct = {
  id: string;
  barcode: string;
  product_name: string | null;
  brands: string | null;
  image_url: string | null;
};

const serializeComparisonProduct = (product: ComparisonProduct) => ({
  id: product.id,
  barcode: product.barcode,
  product_name: product.product_name,
  brands: product.brands,
  image_url: product.image_url,
});

const getBestFitProfiles = (
  comparisonResult: unknown,
  winner: 'product1' | 'product2',
): ComparisonHistoryItem['product1BestFitProfiles'] => {
  const parsedResult = productComparisonResultSchema.safeParse(comparisonResult);

  if (!parsedResult.success) {
    return [];
  }

  return parsedResult.data.profiles
    .filter((profile) => profile.winner === winner)
    .map((profile) => ({
      profileId: profile.profileId,
      profileName: profile.profileName,
    }));
};

export const matchesComparisonFilters = (
  comparisonResult: unknown,
  filters: ComparisonFilters,
): boolean => {
  if (filters.profileIds.length === 0) {
    return true;
  }

  const profileIds = new Set(filters.profileIds);
  const parsedResult = productComparisonResultSchema.safeParse(comparisonResult);

  if (!parsedResult.success) {
    return false;
  }

  return parsedResult.data.profiles.some(
    (profile) =>
      profileIds.has(profile.profileId) &&
      (profile.winner === 'product1' || profile.winner === 'product2'),
  );
};

const getValidLimit = (limit?: string): number | undefined => {
  if (!limit) {
    return undefined;
  }

  const parsed = Number.parseInt(limit, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

@Injectable()
export class ComparisonsService {
  async getHistory(
    userId: string,
    cursor?: string,
    limit?: string,
    search?: string,
    filters: ComparisonFilters = { profileIds: [] },
  ): Promise<ComparisonHistoryResponse> {
    const take = getValidLimit(limit) ?? DEFAULT_PAGE_SIZE;
    const normalizedSearch = normalizeSearchQuery(search);
    const where: Prisma.ComparisonWhereInput = {
      userId,
      ...(normalizedSearch
        ? {
            OR: [
              {
                product1: {
                  is: buildProductSearchFilter(normalizedSearch),
                },
              },
              {
                product2: {
                  is: buildProductSearchFilter(normalizedSearch),
                },
              },
            ],
          }
        : {}),
    };

    const [comparisons, totalCount] = await Promise.all([
      filters.profileIds.length > 0
        ? this.findFilteredComparisons(where, cursor, take + 1, filters)
        : this.findComparisons(where, cursor, take + 1),
      this.countComparisons(where, filters),
    ]);

    const hasMore = comparisons.length > take;
    const items = hasMore ? comparisons.slice(0, take) : comparisons;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((comparison) => this.serializeHistoryItem(comparison)),
      nextCursor,
      totalCount,
    };
  }

  private async countComparisons(
    where: Prisma.ComparisonWhereInput,
    filters: ComparisonFilters,
  ): Promise<number> {
    if (filters.profileIds.length === 0) {
      return prisma.comparison.count({ where });
    }

    return this.countFilteredComparisons(where, filters);
  }

  private async countFilteredComparisons(
    where: Prisma.ComparisonWhereInput,
    filters: ComparisonFilters,
  ): Promise<number> {
    let totalCount = 0;
    let nextCursor: string | undefined;
    const batchSize = 100;

    while (true) {
      const comparisons = await prisma.comparison.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: batchSize,
        ...(nextCursor
          ? {
              cursor: { id: nextCursor },
              skip: 1,
            }
          : {}),
        select: {
          id: true,
          comparisonResult: true,
        },
      });

      if (comparisons.length === 0) {
        break;
      }

      totalCount += comparisons.filter((comparison) =>
        matchesComparisonFilters(comparison.comparisonResult, filters),
      ).length;

      if (comparisons.length < batchSize) {
        break;
      }

      nextCursor = comparisons[comparisons.length - 1]?.id;
    }

    return totalCount;
  }

  private async findComparisons(
    where: Prisma.ComparisonWhereInput,
    cursor: string | undefined,
    take: number,
  ) {
    return prisma.comparison.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        product1: {
          select: {
            id: true,
            barcode: true,
            product_name: true,
            brands: true,
            image_url: true,
          },
        },
        product2: {
          select: {
            id: true,
            barcode: true,
            product_name: true,
            brands: true,
            image_url: true,
          },
        },
      },
    });
  }

  private async findFilteredComparisons(
    where: Prisma.ComparisonWhereInput,
    cursor: string | undefined,
    take: number,
    filters: ComparisonFilters,
  ) {
    const matches: Array<{
      id: string;
      createdAt: Date;
      comparisonResult: unknown;
      product1: ComparisonProduct | null;
      product2: ComparisonProduct | null;
    }> = [];
    const batchSize = Math.max(take * FILTERED_BATCH_MULTIPLIER, DEFAULT_PAGE_SIZE);
    let nextCursor = cursor;

    while (matches.length < take) {
      const comparisons = await this.findComparisons(where, nextCursor, batchSize);

      if (comparisons.length === 0) {
        break;
      }

      for (const comparison of comparisons) {
        if (matchesComparisonFilters(comparison.comparisonResult, filters)) {
          matches.push(comparison);
        }

        if (matches.length >= take) {
          break;
        }
      }

      if (comparisons.length < batchSize) {
        break;
      }

      nextCursor = comparisons[comparisons.length - 1]?.id;
    }

    return matches;
  }

  async getDetail(userId: string, comparisonId: string): Promise<ComparisonDetailResponse> {
    const comparison = await prisma.comparison.findFirst({
      where: { id: comparisonId, userId },
      include: {
        product1: true,
        product2: true,
      },
    });

    if (!comparison) {
      throw ApiError.notFound('Comparison not found');
    }

    return {
      id: comparison.id,
      createdAt: comparison.createdAt.toISOString(),
      comparisonResult:
        productComparisonResultSchema.safeParse(comparison.comparisonResult).data ?? null,
    };
  }

  async deleteComparison(userId: string, comparisonId: string): Promise<void> {
    const comparison = await prisma.comparison.findFirst({
      where: { id: comparisonId, userId },
      select: { id: true },
    });

    if (!comparison) {
      throw ApiError.notFound('Comparison not found');
    }

    await prisma.comparison.delete({ where: { id: comparison.id } });
  }

  private serializeHistoryItem(comparison: {
    id: string;
    createdAt: Date;
    comparisonResult: unknown;
    product1: ComparisonProduct | null;
    product2: ComparisonProduct | null;
  }): ComparisonHistoryItem {
    return {
      id: comparison.id,
      createdAt: comparison.createdAt.toISOString(),
      product1: comparison.product1 ? serializeComparisonProduct(comparison.product1) : null,
      product2: comparison.product2 ? serializeComparisonProduct(comparison.product2) : null,
      product1BestFitProfiles: getBestFitProfiles(comparison.comparisonResult, 'product1'),
      product2BestFitProfiles: getBestFitProfiles(comparison.comparisonResult, 'product2'),
    };
  }
}
