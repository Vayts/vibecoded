import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
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
import { buildProductSearchFilter, normalizeSearchQuery } from '../../shared/utils/product-search';
import { prisma } from '../product-analyze/lib/prisma';
import { buildHistoryAnalysisSummary, matchesSharedScanFilters } from './scan-history-analysis';

const DEFAULT_PAGE_SIZE = 20;
const FILTERED_BATCH_MULTIPLIER = 3;

type HistoryProduct = {
  id: string;
  barcode: string;
  product_name: string | null;
  brands: string | null;
  image_url: string | null;
  nutriscore_grade: string | null;
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

const serializeHistoryProduct = (product: HistoryProduct) => ({
  id: product.id,
  barcode: product.barcode,
  product_name: product.product_name,
  brands: product.brands,
  image_url: product.image_url,
  nutriscore_grade: product.nutriscore_grade,
});

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
            nutriscore_grade: true,
          },
        },
        product2: {
          select: {
            id: true,
            barcode: true,
            product_name: true,
            brands: true,
            image_url: true,
            nutriscore_grade: true,
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

    const product = scan.product
      ? (normalizedProductSchema.safeParse({
          code: scan.product.code,
          product_name: scan.product.product_name,
          brands: scan.product.brands,
          image_url: scan.product.image_url,
          ingredients_text: scan.product.ingredients_text,
          nutriscore_grade: scan.product.nutriscore_grade,
          categories: scan.product.categories,
          quantity: scan.product.quantity,
          serving_size: scan.product.serving_size,
          ingredients: scan.product.ingredients,
          allergens: scan.product.allergens,
          additives: scan.product.additives,
          additives_count: scan.product.additives_count,
          traces: scan.product.traces,
          countries: scan.product.countries,
          category_tags: scan.product.category_tags,
          images: scan.product.images,
          nutrition: scan.product.nutrition,
          scores: scan.product.scores,
        }).data ?? null)
      : null;

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
      select: { id: true },
    });

    if (!scan) {
      throw ApiError.notFound('History entry not found');
    }

    await prisma.scan.delete({ where: { id: scan.id } });
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
