import type { ProductAnalysisResult } from '@acme/shared';
import { Prisma } from '@prisma/client';
import type { ScanSource, PersonalAnalysisStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface CreateScanInput {
  userId: string;
  productId?: string;
  barcode?: string;
  source: ScanSource;
  overallScore?: number;
  overallRating?: string;
  personalAnalysisStatus?: PersonalAnalysisStatus;
  photoImagePath?: string;
}

export const findRecentScanByBarcode = async (
  userId: string,
  barcode: string,
  withinMs = 4 * 60 * 60 * 1000,
) => {
  const cutoff = new Date(Date.now() - withinMs);
  return prisma.scan.findFirst({
    where: { userId, barcode, createdAt: { gte: cutoff } },
    orderBy: { createdAt: 'desc' },
  });
};

export const createScan = async (input: CreateScanInput) => {
  return prisma.scan.create({
    data: {
      userId: input.userId,
      productId: input.productId ?? null,
      barcode: input.barcode ?? null,
      source: input.source,
      overallScore: input.overallScore ?? null,
      overallRating: input.overallRating ?? null,
      personalAnalysisStatus: input.personalAnalysisStatus ?? null,
      evaluation: Prisma.JsonNull,
      personalResult: Prisma.JsonNull,
      photoImagePath: input.photoImagePath ?? null,
    },
  });
};

/**
 * Update scan with analysis result (product facts + profile scores).
 */
export const updateScanAnalysisResult = async (
  scanId: string,
  status: PersonalAnalysisStatus,
  result?: ProductAnalysisResult,
) => {
  return prisma.scan.update({
    where: { id: scanId },
    data: {
      personalAnalysisStatus: status,
      personalResult: result
        ? (result as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      multiProfileResult: result
        ? (result as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
};

const DEFAULT_PAGE_SIZE = 20;

export const findProductIdByBarcode = async (
  barcode: string,
): Promise<string | null> => {
  const product = await prisma.product.findUnique({
    where: { barcode },
    select: { id: true },
  });
  return product?.id ?? null;
};
