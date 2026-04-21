import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FavouriteItem, FavouritesResponse, SharedScanFilters } from '@acme/shared';
import { addFavouriteRequestSchema } from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import { resolveCanonicalProductImageUrl } from '../../shared/utils/product-image';
import { buildProductSearchFilter, normalizeSearchQuery } from '../../shared/utils/product-search';
import { prisma } from '../product-analyze/lib/prisma';
import { buildHistoryAnalysisSummary, matchesSharedScanFilters } from './scan-history-analysis';

const DEFAULT_PAGE_SIZE = 20;
const FILTERED_BATCH_MULTIPLIER = 3;

type FavouriteProduct = {
  id: string;
  barcode: string;
  product_name: string | null;
  brands: string | null;
  image_url: string | null;
  images: unknown;
  nutriscore_grade: string | null;
};

type LatestScanRecord = {
  id: string;
  source: 'barcode' | 'photo';
  overallScore: number | null;
  overallRating: string | null;
  personalAnalysisStatus: 'pending' | 'completed' | 'failed' | null;
  personalResult: unknown;
  multiProfileResult: unknown;
  createdAt: Date;
};

const getValidLimit = (limit?: string): number | undefined => {
  if (!limit) {
    return undefined;
  }

  const parsed = Number.parseInt(limit, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const serializeProduct = (product: FavouriteProduct) => ({
  id: product.id,
  barcode: product.barcode,
  product_name: product.product_name,
  brands: product.brands,
  image_url: resolveCanonicalProductImageUrl(product.image_url, product.images),
  nutriscore_grade: product.nutriscore_grade,
});

const hasSharedScanFilters = (filters: SharedScanFilters): boolean =>
  filters.profileIds.length > 0 || filters.fitBuckets.length > 0;

@Injectable()
export class FavouritesService {
  async getFavourites(
    userId: string,
    cursor?: string,
    limit?: string,
    search?: string,
    filters: SharedScanFilters = { profileIds: [], fitBuckets: [] },
  ): Promise<FavouritesResponse> {
    await this.cleanupOrphanedFavourites(userId);

    const take = getValidLimit(limit) ?? DEFAULT_PAGE_SIZE;
    const normalizedSearch = normalizeSearchQuery(search);
    const where: Prisma.FavoriteWhereInput = {
      userId,
      ...(normalizedSearch
        ? {
            product: {
              is: buildProductSearchFilter(normalizedSearch),
            },
          }
        : {}),
    };

    const [favourites, totalCount] = await Promise.all([
      hasSharedScanFilters(filters)
        ? this.findFilteredFavourites(where, userId, cursor, take + 1, filters)
        : this.findFavourites(where, cursor, take + 1),
      this.countFavourites(where, userId, filters),
    ]);

    const hasMore = favourites.length > take;
    const items = hasMore ? favourites.slice(0, take) : favourites;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    const productIds = items
      .map((favourite) => favourite.product?.id)
      .filter((productId): productId is string => productId != null);
    const latestScansByProductId = await this.findLatestScansForProducts(userId, productIds);

    return {
      items: items.map((favourite) => {
        const scan = favourite.product
          ? latestScansByProductId.get(favourite.product.id)
          : undefined;
        return this.serializeFavouriteItem(favourite, scan);
      }),
      nextCursor,
      totalCount,
    };
  }

  private async countFavourites(
    where: Prisma.FavoriteWhereInput,
    userId: string,
    filters: SharedScanFilters,
  ): Promise<number> {
    if (!hasSharedScanFilters(filters)) {
      return prisma.favorite.count({ where });
    }

    let totalCount = 0;
    let nextCursor: string | undefined;
    const batchSize = 100;

    while (true) {
      const favourites = await this.findFavourites(where, nextCursor, batchSize);

      if (favourites.length === 0) {
        break;
      }

      const productIds = favourites
        .map((favourite) => favourite.product?.id)
        .filter((productId): productId is string => productId != null);
      const latestScansByProductId = await this.findLatestScansForProducts(userId, productIds);

      totalCount += favourites.filter((favourite) => {
        const scan = favourite.product
          ? latestScansByProductId.get(favourite.product.id)
          : undefined;
        const summary = buildHistoryAnalysisSummary(scan?.personalResult, scan?.multiProfileResult);
        return matchesSharedScanFilters(summary, filters);
      }).length;

      if (favourites.length < batchSize) {
        break;
      }

      nextCursor = favourites[favourites.length - 1]?.id;
    }

    return totalCount;
  }

  private async findFavourites(
    where: Prisma.FavoriteWhereInput,
    cursor: string | undefined,
    take: number,
  ) {
    return prisma.favorite.findMany({
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
          },
        },
      },
    });
  }

  private async findFilteredFavourites(
    where: Prisma.FavoriteWhereInput,
    userId: string,
    cursor: string | undefined,
    take: number,
    filters: SharedScanFilters,
  ) {
    const matches: Array<{
      id: string;
      createdAt: Date;
      product: FavouriteProduct | null;
    }> = [];
    const batchSize = Math.max(take * FILTERED_BATCH_MULTIPLIER, DEFAULT_PAGE_SIZE);
    let nextCursor = cursor;

    while (matches.length < take) {
      const favourites = await this.findFavourites(where, nextCursor, batchSize);

      if (favourites.length === 0) {
        break;
      }

      const productIds = favourites
        .map((favourite) => favourite.product?.id)
        .filter((productId): productId is string => productId != null);
      const latestScansByProductId = await this.findLatestScansForProducts(userId, productIds);

      for (const favourite of favourites) {
        const scan = favourite.product
          ? latestScansByProductId.get(favourite.product.id)
          : undefined;
        const summary = buildHistoryAnalysisSummary(scan?.personalResult, scan?.multiProfileResult);

        if (matchesSharedScanFilters(summary, filters)) {
          matches.push(favourite);
        }

        if (matches.length >= take) {
          break;
        }
      }

      if (favourites.length < batchSize) {
        break;
      }

      nextCursor = favourites[favourites.length - 1]?.id;
    }

    return matches;
  }

  async addFavourite(userId: string, body: unknown): Promise<{ success: true }> {
    const parsed = addFavouriteRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(parsed.error.issues[0]?.message ?? 'Invalid payload');
    }

    await prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId,
          productId: parsed.data.productId,
        },
      },
      create: {
        userId,
        productId: parsed.data.productId,
      },
      update: {},
    });

    return { success: true };
  }

  async removeFavourite(userId: string, productId: string): Promise<{ success: true }> {
    await prisma.favorite.deleteMany({
      where: { userId, productId },
    });

    return { success: true };
  }

  async getFavouriteStatus(userId: string, productId: string): Promise<{ isFavourite: boolean }> {
    const favourite = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    return { isFavourite: favourite != null };
  }

  private async cleanupOrphanedFavourites(userId: string): Promise<void> {
    const result = await prisma.favorite.deleteMany({
      where: {
        userId,
        product: {
          scans: {
            none: {
              userId,
              type: 'product',
            },
          },
        },
      },
    });

    if (result.count > 0) {
      console.log(`[favourites] Removed ${result.count} orphaned favourite(s) for user=${userId}`);
    }
  }

  private serializeFavouriteItem(
    favourite: {
      id: string;
      createdAt: Date;
      product: FavouriteProduct | null;
    },
    scan?: LatestScanRecord,
  ): FavouriteItem {
    const analysisSummary = buildHistoryAnalysisSummary(
      scan?.personalResult,
      scan?.multiProfileResult,
    );

    return {
      favouriteId: favourite.id,
      id: scan?.id ?? favourite.id,
      type: 'product',
      createdAt: (scan?.createdAt ?? favourite.createdAt).toISOString(),
      source: scan?.source ?? 'barcode',
      overallScore: scan?.overallScore ?? null,
      overallRating: scan?.overallRating ?? null,
      personalScore: analysisSummary.personalScore,
      personalRating: analysisSummary.personalRating,
      personalAnalysisStatus: scan?.personalAnalysisStatus ?? null,
      mainUserHasDietConflict: analysisSummary.mainUserHasDietConflict,
      isFavourite: true,
      profileChips: analysisSummary.profileChips,
      product: favourite.product ? serializeProduct(favourite.product) : null,
    };
  }

  private async findLatestScansForProducts(
    userId: string,
    productIds: string[],
  ): Promise<Map<string, LatestScanRecord>> {
    if (productIds.length === 0) {
      return new Map();
    }

    const scans = await prisma.scan.findMany({
      where: {
        userId,
        type: 'product',
        productId: { in: productIds },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['productId'],
      select: {
        id: true,
        productId: true,
        source: true,
        overallScore: true,
        overallRating: true,
        personalAnalysisStatus: true,
        personalResult: true,
        multiProfileResult: true,
        createdAt: true,
      },
    });

    const scansByProductId = new Map<string, LatestScanRecord>();
    for (const scan of scans) {
      if (scan.productId) {
        scansByProductId.set(scan.productId, {
          id: scan.id,
          source: scan.source,
          overallScore: scan.overallScore,
          overallRating: scan.overallRating,
          personalAnalysisStatus: scan.personalAnalysisStatus,
          personalResult: scan.personalResult,
          multiProfileResult: scan.multiProfileResult,
          createdAt: scan.createdAt,
        });
      }
    }

    return scansByProductId;
  }
}
