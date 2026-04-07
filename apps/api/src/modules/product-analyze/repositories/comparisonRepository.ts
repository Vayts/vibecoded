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
      comparisonResult:
        input.comparisonResult as unknown as Prisma.InputJsonValue,
    },
  });
};
