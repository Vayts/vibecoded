import type { ProductAnalysisResult, PersonalAnalysisResult, MultiProfilePersonalAnalysisResult } from '@acme/shared';
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
  evaluation?: ProductAnalysisResult;
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
      evaluation: (input.evaluation as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      personalResult: Prisma.JsonNull,
    },
  });
};

export const updateScanPersonalResult = async (
  scanId: string,
  status: PersonalAnalysisStatus,
  result?: PersonalAnalysisResult,
  multiProfile?: MultiProfilePersonalAnalysisResult,
) => {
  return prisma.scan.update({
    where: { id: scanId },
    data: {
      personalAnalysisStatus: status,
      personalResult: result ? (result as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      multiProfileResult: multiProfile
        ? (multiProfile as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
};

const DEFAULT_PAGE_SIZE = 20;

export const findScansByUserId = async (userId: string, cursor?: string, limit?: number) => {
  const take = limit ?? DEFAULT_PAGE_SIZE;
  const scans = await prisma.scan.findMany({
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

  const hasMore = scans.length > take;
  const items = hasMore ? scans.slice(0, take) : scans;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
};

export const findScanById = async (scanId: string, userId: string) => {
  return prisma.scan.findFirst({
    where: { id: scanId, userId },
    include: {
      product: true,
    },
  });
};

export const findProductIdByBarcode = async (barcode: string): Promise<string | null> => {
  const product = await prisma.product.findUnique({
    where: { barcode },
    select: { id: true },
  });
  return product?.id ?? null;
};
