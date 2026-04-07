import { Injectable } from '@nestjs/common';
import type { FavouriteItem, FavouritesResponse } from '@acme/shared';
import {
  addFavouriteRequestSchema,
  profileProductScoreSchema,
} from '@acme/shared';
import { ApiError } from '../../shared/errors/api-error';
import { prisma } from '../product-analyze/lib/prisma';

const DEFAULT_PAGE_SIZE = 20;

type FavouriteProduct = {
  id: string;
  barcode: string;
  product_name: string | null;
  brands: string | null;
  image_url: string | null;
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
  image_url: product.image_url,
});

@Injectable()
export class FavouritesService {
  async getFavourites(
    userId: string,
    cursor?: string,
    limit?: string,
  ): Promise<FavouritesResponse> {
    const take = getValidLimit(limit) ?? DEFAULT_PAGE_SIZE;

    const favourites = await prisma.favorite.findMany({
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
        product: {
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

    const hasMore = favourites.length > take;
    const items = hasMore ? favourites.slice(0, take) : favourites;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    const productIds = items
      .map((favourite) => favourite.product?.id)
      .filter((productId): productId is string => productId != null);
    const latestScansByProductId = await this.findLatestScansForProducts(
      userId,
      productIds,
    );

    return {
      items: items.map((favourite) => {
        const scan = favourite.product
          ? latestScansByProductId.get(favourite.product.id)
          : undefined;
        return this.serializeFavouriteItem(favourite, scan);
      }),
      nextCursor,
    };
  }

  async addFavourite(
    userId: string,
    body: unknown,
  ): Promise<{ success: true }> {
    const parsed = addFavouriteRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw ApiError.badRequest(
        parsed.error.issues[0]?.message ?? 'Invalid payload',
      );
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

  async removeFavourite(
    userId: string,
    productId: string,
  ): Promise<{ success: true }> {
    await prisma.favorite.deleteMany({
      where: { userId, productId },
    });

    return { success: true };
  }

  async getFavouriteStatus(
    userId: string,
    productId: string,
  ): Promise<{ isFavourite: boolean }> {
    const favourite = await prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    return { isFavourite: favourite != null };
  }

  private serializeFavouriteItem(
    favourite: {
      id: string;
      createdAt: Date;
      product: FavouriteProduct | null;
    },
    scan?: LatestScanRecord,
  ): FavouriteItem {
    const rawPersonalResult = scan?.personalResult as {
      profiles?: Array<{ score?: number; fitLabel?: string }>;
    } | null;
    const firstProfile = rawPersonalResult?.profiles?.[0];

    let profileChips: FavouriteItem['profileChips'];
    if (
      scan?.multiProfileResult &&
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
      favouriteId: favourite.id,
      id: scan?.id ?? favourite.id,
      type: 'product',
      createdAt: (scan?.createdAt ?? favourite.createdAt).toISOString(),
      source: scan?.source ?? 'barcode',
      overallScore: scan?.overallScore ?? null,
      overallRating: scan?.overallRating ?? null,
      personalScore: firstProfile?.score ?? null,
      personalRating: (firstProfile?.fitLabel ??
        null) as FavouriteItem['personalRating'],
      personalAnalysisStatus: scan?.personalAnalysisStatus ?? null,
      isFavourite: true,
      profileChips,
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
