import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ComparisonDetailResponse,
  ComparisonHistoryItem,
  ComparisonHistoryResponse,
} from '@acme/shared';
import { productComparisonResultSchema } from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import {
  buildProductSearchFilter,
  normalizeSearchQuery,
} from '../../shared/utils/product-search';
import { prisma } from '../product-analyze/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;

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

    const comparisons = await prisma.comparison.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
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

    const hasMore = comparisons.length > take;
    const items = hasMore ? comparisons.slice(0, take) : comparisons;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return {
      items: items.map((comparison) => this.serializeHistoryItem(comparison)),
      nextCursor,
    };
  }

  async getDetail(
    userId: string,
    comparisonId: string,
  ): Promise<ComparisonDetailResponse> {
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
        productComparisonResultSchema.safeParse(comparison.comparisonResult)
          .data ?? null,
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
      product1: comparison.product1
        ? serializeComparisonProduct(comparison.product1)
        : null,
      product2: comparison.product2
        ? serializeComparisonProduct(comparison.product2)
        : null,
      product1BestFitProfiles: getBestFitProfiles(comparison.comparisonResult, 'product1'),
      product2BestFitProfiles: getBestFitProfiles(comparison.comparisonResult, 'product2'),
    };
  }
}
