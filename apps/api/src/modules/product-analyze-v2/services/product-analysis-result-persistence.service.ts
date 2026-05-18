import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/lib/prisma.js';
import { findProductIdByBarcode } from '../../product-domain/repositories/scanRepository.js';
import type { AnalyzeBarcodeV2Response } from '../types/analyze-product-v2.types.js';
import type { PersistProductAnalyzeV2ScanInput } from './compare-products-v2.service.js';

const getFavouriteState = async (
  userId: string,
  productId?: string,
): Promise<boolean | undefined> => {
  if (!productId) {
    return undefined;
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    select: { id: true },
  });

  return Boolean(favorite);
};

export async function buildProductAnalyzeV2ResultMetadata(input: {
  userId: string;
  barcode: string;
  scanId?: string;
  productId?: string;
}): Promise<Pick<AnalyzeBarcodeV2Response, 'scanId' | 'productId' | 'isFavourite'>> {
  const resolvedProductId =
    input.productId ?? (await findProductIdByBarcode(input.barcode)) ?? undefined;
  const isFavourite = await getFavouriteState(input.userId, resolvedProductId);

  return {
    ...(input.scanId ? { scanId: input.scanId } : {}),
    ...(resolvedProductId ? { productId: resolvedProductId } : {}),
    ...(isFavourite !== undefined ? { isFavourite } : {}),
  };
}

export async function persistProductAnalyzeV2Scan(
  input: PersistProductAnalyzeV2ScanInput,
): Promise<string> {
  const productId = input.productId ?? (await findProductIdByBarcode(input.barcode)) ?? undefined;
  const mainProfile =
    input.result.profiles.find((profile) => profile.type === 'user') ?? input.result.profiles[0];

  const scan = await prisma.scan.create({
    data: {
      userId: input.userId,
      type: 'product',
      productId: productId ?? null,
      barcode: input.barcode,
      source: input.source,
      overallScore: mainProfile?.analysis.overall.score ?? null,
      overallRating: mainProfile?.analysis.overall.rating ?? null,
      personalAnalysisStatus: 'completed',
      personalAnalysisJobId: randomUUID(),
      evaluation: Prisma.JsonNull,
      personalResult: input.result as unknown as Prisma.InputJsonValue,
      multiProfileResult: input.result as unknown as Prisma.InputJsonValue,
    },
  });

  return scan.id;
}
