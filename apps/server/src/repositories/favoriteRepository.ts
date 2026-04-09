import { prisma } from '../lib/prisma';

const DEFAULT_PAGE_SIZE = 20;

export const addFavourite = async (userId: string, productId: string) => {
  return prisma.favorite.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });
};

export const removeFavourite = async (userId: string, productId: string) => {
  return prisma.favorite.deleteMany({
    where: { userId, productId },
  });
};

export const isFavourite = async (userId: string, productId: string): Promise<boolean> => {
  const fav = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  return fav != null;
};

export const isFavouriteByBarcode = async (
  userId: string,
  barcode: string,
): Promise<boolean> => {
  const product = await prisma.product.findUnique({
    where: { barcode },
    select: { id: true },
  });
  if (!product) return false;
  return isFavourite(userId, product.id);
};

export const getFavouriteProductIds = async (
  userId: string,
  productIds: string[],
): Promise<Set<string>> => {
  if (productIds.length === 0) return new Set();

  const favs = await prisma.favorite.findMany({
    where: { userId, productId: { in: productIds } },
    select: { productId: true },
  });

  return new Set(favs.map((f) => f.productId));
};

export const findFavouritesByUserId = async (
  userId: string,
  cursor?: string,
  limit?: number,
) => {
  const take = limit ?? DEFAULT_PAGE_SIZE;

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
          nutriscore_grade: true,
        },
      },
    },
  });

  const hasMore = favourites.length > take;
  const items = hasMore ? favourites.slice(0, take) : favourites;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
};

export const findLatestScansForProducts = async (
  userId: string,
  productIds: string[],
) => {
  if (productIds.length === 0) return new Map<string, {
    id: string;
    source: string;
    overallScore: number | null;
    overallRating: string | null;
    personalAnalysisStatus: string | null;
    personalResult: unknown;
    multiProfileResult: unknown;
    createdAt: Date;
  }>();

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

  const map = new Map<string, typeof scans[number]>();
  for (const scan of scans) {
    if (scan.productId) {
      map.set(scan.productId, scan);
    }
  }
  return map;
};
