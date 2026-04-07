import type { ProductComparisonResult } from '@acme/shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface CreateComparisonInput {
  userId: string;
  product1Id?: string;
  product2Id?: string;
  barcode1: string;
  barcode2: string;
  comparisonResult: ProductComparisonResult;
}

export const createComparison = async (input: CreateComparisonInput) => {
  return prisma.comparison.create({
    data: {
      userId: input.userId,
      product1Id: input.product1Id ?? null,
      product2Id: input.product2Id ?? null,
      barcode1: input.barcode1,
      barcode2: input.barcode2,
      comparisonResult: input.comparisonResult as unknown as Prisma.InputJsonValue,
    },
  });
};

const DEFAULT_PAGE_SIZE = 20;

export const findComparisonsByUserId = async (
  userId: string,
  cursor?: string,
  limit?: number,
) => {
  const take = limit ?? DEFAULT_PAGE_SIZE;
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

  return { items, nextCursor };
};

export const findComparisonById = async (comparisonId: string, userId: string) => {
  return prisma.comparison.findFirst({
    where: { id: comparisonId, userId },
    include: {
      product1: true,
      product2: true,
    },
  });
};
