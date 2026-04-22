import { Injectable } from '@nestjs/common';
import { Prisma, type Product } from '@prisma/client';
import type {
  BarcodeLookupProduct,
  ScanDetailResponse,
  ScanHistoryItem,
  ScanHistoryResponse,
  SharedScanFilters,
} from '@acme/shared';
import {
  normalizedProductSchema,
  productAnalysisResultSchema,
  productComparisonResultSchema,
} from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import {
  getProductImageUrl,
  resolveCanonicalProductImageUrl,
} from '../../shared/utils/product-image';
import { buildProductSearchFilter, normalizeSearchQuery } from '../../shared/utils/product-search';
import { prisma } from '../product-analyze/lib/prisma';
import { productFactsAiOutputSchema } from '../product-analyze/domain/product-facts/schema';
import { toBarcodeLookupProduct } from '../product-analyze/utils/analysis-response.utils';
import { buildHistoryAnalysisSummary, matchesSharedScanFilters } from './scan-history-analysis';

const DEFAULT_PAGE_SIZE = 20;
const FILTERED_BATCH_MULTIPLIER = 3;

type HistoryProduct = {
  id: string;
  barcode: string;
  product_name: string | null;
  brands: string | null;
  image_url: string | null;
  images: unknown;
  nutriscore_grade: string | null;
  classificationCache: Prisma.JsonValue | null;
};

type ProductScanHistoryRecord = {
  id: string;
  type: 'product' | 'comparison';
  personalAnalysisJobId: string | null;
  createdAt: Date;
  source: 'barcode' | 'photo';
  overallScore: number | null;
  overallRating: string | null;
  personalAnalysisStatus: 'pending' | 'completed' | 'failed' | null;
  personalResult: unknown;
  multiProfileResult: unknown;
  product: HistoryProduct | null;
  product2: HistoryProduct | null;
};

const serializeHistoryProduct = (product: HistoryProduct) => {
  const classification = productFactsAiOutputSchema.safeParse(product.classificationCache).data;

  return {
    id: product.id,
    barcode: product.barcode,
    product_name: product.product_name,
    brands: product.brands,
    image_url: resolveCanonicalProductImageUrl(product.image_url, product.images),
    nutriscore_grade: product.nutriscore_grade,
    dietCompatibility: classification?.dietCompatibility,
  };
};

const serializeDetailProduct = (
  product: Product,
  analysisResult?: Prisma.JsonValue | null,
): BarcodeLookupProduct | null => {
  const canonicalImageUrl = resolveCanonicalProductImageUrl(product.image_url, product.images);
  const classification = productFactsAiOutputSchema.safeParse(product.classificationCache).data;
  const parsedAnalysisResult = analysisResult
    ? productAnalysisResultSchema.safeParse(analysisResult).data
    : undefined;

  const parsedProduct = normalizedProductSchema.safeParse({
    code: product.code,
    product_name: product.product_name,
    brands: product.brands,
    image_url: canonicalImageUrl,
    ingredients_text: product.ingredients_text,
    nutriscore_grade: product.nutriscore_grade,
    categories: product.categories,
    quantity: product.quantity,
    serving_size: product.serving_size,
    ingredients: product.ingredients,
    allergens: product.allergens,
    additives: product.additives,
    additives_count: product.additives_count,
    traces: product.traces,
    countries: product.countries,
    category_tags: product.category_tags,
    images: {
      front_url: canonicalImageUrl,
      ingredients_url: getProductImageUrl(product.images, 'ingredients_url'),
      nutrition_url: getProductImageUrl(product.images, 'nutrition_url'),
    },
    nutrition: product.nutrition,
    scores: product.scores,
  });

  return parsedProduct.success
    ? toBarcodeLookupProduct(
        parsedProduct.data,
        classification?.dietCompatibility ?? parsedAnalysisResult?.productFacts.dietCompatibility,
      )
    : null;
};

const getValidLimit = (limit?: string): number | undefined => {
  if (!limit) {
    return undefined;
  }

  const parsed = Number.parseInt(limit, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const hasSharedScanFilters = (filters: SharedScanFilters): boolean =>
  filters.profileIds.length > 0 || filters.fitBuckets.length > 0;

@Injectable()
export class ScansService {
  async getHistory(
    userId: string,
    cursor?: string,
    limit?: string,
    search?: string,
    filters: SharedScanFilters = { profileIds: [], fitBuckets: [] },
  ): Promise<ScanHistoryResponse> {
    const take = getValidLimit(limit) ?? DEFAULT_PAGE_SIZE;
    const normalizedSearch = normalizeSearchQuery(search);
    const where: Prisma.ScanWhereInput = {
      userId,
      type: 'product',
      ...(normalizedSearch
        ? {
            product: {
              is: buildProductSearchFilter(normalizedSearch),
            },
          }
        : {}),
    };

    const [scans, totalCount] = await Promise.all([
      hasSharedScanFilters(filters)
        ? this.findFilteredHistoryScans(where, cursor, take + 1, filters)
        : this.findHistoryScans(where, cursor, take + 1),
      this.countHistory(where, filters),
    ]);

    const hasMore = scans.length > take;
    const items = hasMore ? scans.slice(0, take) : scans;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    const productIds = items
      .map((scan) => scan.product?.id)
      .filter((productId): productId is string => productId != null);
    const favouriteSet = await this.getFavouriteProductIds(userId, productIds);

    return {
      items: items.map((scan) => this.serializeHistoryItem(scan, favouriteSet)),
      nextCursor,
      totalCount,
    };
  }

  private async countHistory(
    where: Prisma.ScanWhereInput,
    filters: SharedScanFilters,
  ): Promise<number> {
    if (!hasSharedScanFilters(filters)) {
      return prisma.scan.count({ where });
    }

    let totalCount = 0;
    let nextCursor: string | undefined;
    const batchSize = 100;

    while (true) {
      const scans = await prisma.scan.findMany({
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
          personalResult: true,
          multiProfileResult: true,
        },
      });

      if (scans.length === 0) {
        break;
      }

      totalCount += scans.filter((scan) => {
        const summary = buildHistoryAnalysisSummary(scan.personalResult, scan.multiProfileResult);
        return matchesSharedScanFilters(summary, filters);
      }).length;

      if (scans.length < batchSize) {
        break;
      }

      nextCursor = scans[scans.length - 1]?.id;
    }

    return totalCount;
  }

  private async findHistoryScans(
    where: Prisma.ScanWhereInput,
    cursor: string | undefined,
    take: number,
  ): Promise<ProductScanHistoryRecord[]> {
    return prisma.scan.findMany({
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
        product: {
          select: {
            id: true,
            barcode: true,
            product_name: true,
            brands: true,
            image_url: true,
            images: true,
            nutriscore_grade: true,
            classificationCache: true,
          },
        },
        product2: {
          select: {
            id: true,
            barcode: true,
            product_name: true,
            brands: true,
            image_url: true,
            images: true,
            nutriscore_grade: true,
            classificationCache: true,
          },
        },
      },
    });
  }

  private async findFilteredHistoryScans(
    where: Prisma.ScanWhereInput,
    cursor: string | undefined,
    take: number,
    filters: SharedScanFilters,
  ): Promise<ProductScanHistoryRecord[]> {
    const matches: ProductScanHistoryRecord[] = [];
    const batchSize = Math.max(take * FILTERED_BATCH_MULTIPLIER, DEFAULT_PAGE_SIZE);
    let nextCursor = cursor;

    while (matches.length < take) {
      const scans = await this.findHistoryScans(where, nextCursor, batchSize);

      if (scans.length === 0) {
        break;
      }

      for (const scan of scans) {
        const summary = buildHistoryAnalysisSummary(scan.personalResult, scan.multiProfileResult);

        if (matchesSharedScanFilters(summary, filters)) {
          matches.push(scan);
        }

        if (matches.length >= take) {
          break;
        }
      }

      if (scans.length < batchSize) {
        break;
      }

      nextCursor = scans[scans.length - 1]?.id;
    }

    return matches;
  }

  async getDetail(userId: string, scanId: string): Promise<ScanDetailResponse> {
    const scan = await prisma.scan.findFirst({
      where: { id: scanId, userId },
      include: {
        product: true,
        product2: true,
      },
    });

    if (!scan) {
      throw ApiError.notFound('Scan not found');
    }

    const product = scan.product ? serializeDetailProduct(scan.product, scan.personalResult) : null;

    const analysisResult = scan.personalResult
      ? (productAnalysisResultSchema.safeParse(scan.personalResult).data ?? null)
      : null;

    const comparisonResult =
      scan.type === 'comparison' && scan.comparisonResult
        ? (productComparisonResultSchema.safeParse(scan.comparisonResult).data ?? null)
        : null;

    const isFavourite = scan.productId ? await this.isFavourite(userId, scan.productId) : false;

    return {
      id: scan.id,
      type: scan.type,
      analysisId: scan.personalAnalysisJobId ?? null,
      createdAt: scan.createdAt.toISOString(),
      source: scan.source,
      overallScore: scan.overallScore,
      overallRating: scan.overallRating,
      personalAnalysisStatus: scan.personalAnalysisStatus,
      barcode: scan.barcode,
      productId: scan.productId ?? null,
      isFavourite,
      product,
      analysisResult,
      comparisonResult,
    };
  }

  async deleteScan(userId: string, scanId: string): Promise<void> {
    const scan = await prisma.scan.findFirst({
      where: { id: scanId, userId },
      select: {
        id: true,
        type: true,
        productId: true,
      },
    });

    if (!scan) {
      throw ApiError.notFound('History entry not found');
    }

    await prisma.scan.delete({ where: { id: scan.id } });

    if (scan.type !== 'product' || !scan.productId) {
      return;
    }

    const remainingProductScanCount = await prisma.scan.count({
      where: {
        userId,
        type: 'product',
        productId: scan.productId,
      },
    });

    if (remainingProductScanCount > 0) {
      return;
    }

    await prisma.favorite.deleteMany({
      where: {
        userId,
        productId: scan.productId,
      },
    });

    console.log(
      `[scans] Removed favourite for productId=${scan.productId} after deleting the last product scan`,
    );
  }

  private serializeHistoryItem(
    scan: ProductScanHistoryRecord,
    favouriteSet: Set<string>,
  ): ScanHistoryItem {
    const analysisSummary = buildHistoryAnalysisSummary(
      scan.personalResult,
      scan.multiProfileResult,
    );

    return {
      id: scan.id,
      type: scan.type,
      analysisId: scan.personalAnalysisJobId ?? null,
      createdAt: scan.createdAt.toISOString(),
      source: scan.source,
      overallScore: scan.overallScore,
      overallRating: scan.overallRating,
      personalScore: analysisSummary.personalScore,
      personalRating: analysisSummary.personalRating,
      personalAnalysisStatus: scan.personalAnalysisStatus,
      mainUserHasDietConflict: analysisSummary.mainUserHasDietConflict,
      mainUserHasAllergenConflict: analysisSummary.mainUserHasAllergenConflict,
      isFavourite: scan.product ? favouriteSet.has(scan.product.id) : false,
      profileChips: analysisSummary.profileChips,
      product: scan.product ? serializeHistoryProduct(scan.product) : null,
      product2: scan.product2 ? serializeHistoryProduct(scan.product2) : null,
    };
  }

  private async isFavourite(userId: string, productId: string): Promise<boolean> {
    const favourite = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    return favourite != null;
  }

  private async getFavouriteProductIds(userId: string, productIds: string[]): Promise<Set<string>> {
    if (productIds.length === 0) {
      return new Set();
    }

    const favourites = await prisma.favorite.findMany({
      where: { userId, productId: { in: productIds } },
      select: { productId: true },
    });

    return new Set(favourites.map((favourite) => favourite.productId));
  }
}
