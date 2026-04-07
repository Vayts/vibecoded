import type { ProductAnalysisResult } from '@acme/shared';
import { Prisma } from '@prisma/client';
import type { ScanSource, PersonalAnalysisStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getScanSummary } from '../services/analysis-state';

interface CreateScanInput {
  userId: string;
  productId?: string;
  barcode?: string;
  source: ScanSource;
  analysisId: string;
  personalAnalysisStatus: PersonalAnalysisStatus;
  result?: ProductAnalysisResult;
  photoImagePath?: string | null;
}

interface PrepareScanForAnalysisInput {
  productId?: string;
  barcode?: string;
  source: ScanSource;
  analysisId: string;
  personalAnalysisStatus: PersonalAnalysisStatus;
  result?: ProductAnalysisResult;
  photoImagePath?: string | null;
}

const toJsonResult = (result?: ProductAnalysisResult) =>
  result
    ? (result as unknown as Prisma.InputJsonValue)
    : Prisma.JsonNull;

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
  const summary = getScanSummary(input.result);

  return prisma.scan.create({
    data: {
      userId: input.userId,
      productId: input.productId ?? null,
      barcode: input.barcode ?? null,
      source: input.source,
      overallScore: summary.overallScore,
      overallRating: summary.overallRating,
      personalAnalysisStatus: input.personalAnalysisStatus,
      personalAnalysisJobId: input.analysisId,
      evaluation: Prisma.JsonNull,
      personalResult: toJsonResult(input.result),
      multiProfileResult: toJsonResult(input.result),
      photoImagePath: input.photoImagePath ?? null,
    },
  });
};

export const prepareScanForAnalysis = async (
  scanId: string,
  input: PrepareScanForAnalysisInput,
) => {
  const summary = getScanSummary(input.result);

  return prisma.scan.update({
    where: { id: scanId },
    data: {
      productId: input.productId ?? null,
      barcode: input.barcode ?? null,
      source: input.source,
      overallScore: summary.overallScore,
      overallRating: summary.overallRating,
      personalAnalysisStatus: input.personalAnalysisStatus,
      personalAnalysisJobId: input.analysisId,
      personalResult: toJsonResult(input.result),
      multiProfileResult: toJsonResult(input.result),
      photoImagePath: input.photoImagePath ?? null,
    },
  });
};

/**
 * Update scan with analysis result (product facts + profile scores).
 */
export const updateScanAnalysisState = async (
  scanId: string,
  input: {
    status: PersonalAnalysisStatus;
    analysisId?: string;
    result?: ProductAnalysisResult;
  },
) => {
  const summary = getScanSummary(input.result);

  return prisma.scan.update({
    where: { id: scanId },
    data: {
      personalAnalysisStatus: input.status,
      ...(input.analysisId ? { personalAnalysisJobId: input.analysisId } : {}),
      ...(input.result
        ? {
            overallScore: summary.overallScore,
            overallRating: summary.overallRating,
            personalResult: input.result as unknown as Prisma.InputJsonValue,
            multiProfileResult: input.result as unknown as Prisma.InputJsonValue,
          }
        : {}),
    },
  });
};

export const findScanByAnalysisIdForUser = async (
  userId: string,
  analysisId: string,
) => {
  return prisma.scan.findFirst({
    where: {
      userId,
      personalAnalysisJobId: analysisId,
    },
    select: {
      id: true,
      productId: true,
      barcode: true,
      personalAnalysisStatus: true,
      personalResult: true,
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
