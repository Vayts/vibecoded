import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  ScanDetailResponse,
  ScanHistoryItem,
  ScanHistoryResponse,
} from '@acme/shared';
import {
  normalizedProductSchema,
  productAnalysisResultSchema,
  productComparisonResultSchema,
  profileProductScoreSchema,
} from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import {
  buildProductSearchFilter,
  normalizeSearchQuery,
} from '../../shared/utils/product-search';
import { prisma } from '../product-analyze/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;

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

@Injectable()
export class ScansService {
  async getHistory(
    userId: string,
    cursor?: string,
    limit?: string,
    search?: string,
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

    const scans = await prisma.scan.findMany({
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
    };
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
      ? (productAnalysisResultSchema.safeParse(scan.personalResult).data ??
        null)
      : null;

    const comparisonResult =
      scan.type === 'comparison' && scan.comparisonResult
        ? (productComparisonResultSchema.safeParse(scan.comparisonResult)
            .data ?? null)
        : null;

    const isFavourite = scan.productId
      ? await this.isFavourite(userId, scan.productId)
      : false;

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

  private serializeHistoryItem(
    scan: ProductScanHistoryRecord,
    favouriteSet: Set<string>,
  ): ScanHistoryItem {
    const rawPersonalResult = scan.personalResult as {
      profiles?: Array<{ score?: number; fitLabel?: string }>;
    } | null;
    const firstProfile = rawPersonalResult?.profiles?.[0];

    let profileChips: ScanHistoryItem['profileChips'];
    if (
      scan.multiProfileResult &&
      typeof scan.multiProfileResult === 'object'
    ) {
      const multiProfileResult = scan.multiProfileResult as {
        profiles?: unknown[];
      };
      if (Array.isArray(multiProfileResult.profiles)) {
        const parsedProfiles = multiProfileResult.profiles
          .map((profile) => {
            const parsed = profileProductScoreSchema.safeParse(profile);
            if (!parsed.success) {
              return null;
            }

            return {
              profileId: parsed.data.profileId,
              name: parsed.data.name,
              score: parsed.data.score,
              fitLabel: parsed.data.fitLabel,
            };
          })
          .filter(
            (profile): profile is NonNullable<typeof profile> =>
              profile != null,
          );

        if (parsedProfiles.length > 0) {
          profileChips = parsedProfiles;
        }
      }
    }

    return {
      id: scan.id,
      type: scan.type,
      analysisId: scan.personalAnalysisJobId ?? null,
      createdAt: scan.createdAt.toISOString(),
      source: scan.source,
      overallScore: scan.overallScore,
      overallRating: scan.overallRating,
      personalScore: firstProfile?.score ?? null,
      personalRating: (firstProfile?.fitLabel ??
        null) as ScanHistoryItem['personalRating'],
      personalAnalysisStatus: scan.personalAnalysisStatus,
      isFavourite: scan.product ? favouriteSet.has(scan.product.id) : false,
      profileChips,
      product: scan.product ? serializeHistoryProduct(scan.product) : null,
      product2: scan.product2 ? serializeHistoryProduct(scan.product2) : null,
    };
  }

  private async isFavourite(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const favourite = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    return favourite != null;
  }

  private async getFavouriteProductIds(
    userId: string,
    productIds: string[],
  ): Promise<Set<string>> {
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
