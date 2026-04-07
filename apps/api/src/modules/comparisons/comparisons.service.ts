import { Injectable } from '@nestjs/common';
import type {
  ComparisonDetailResponse,
  ComparisonHistoryItem,
  ComparisonHistoryResponse,
} from '@acme/shared';
import { productComparisonResultSchema } from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
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
  ): Promise<ComparisonHistoryResponse> {
    const take = getValidLimit(limit) ?? DEFAULT_PAGE_SIZE;
    const comparisons = await prisma.comparison.findMany({
      where: { userId },
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

  private serializeHistoryItem(comparison: {
    id: string;
    createdAt: Date;
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
    };
  }
}
