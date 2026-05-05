import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { productAnalyzeV2CompareGraph } from '../langgraph/product-analyze-v2.graph.js';
import type {
  AnalyzeBarcodeV2Response,
  CompareProductV2Result,
  CompareProductV2Source,
  CompareProductsV2Response,
} from '../types/analyze-product-v2.types.js';
import type { UploadedPhotoFileV2 } from '../types/analyze-photo-v2.types.js';
import { ApiError } from '../../../shared/errors/api-error.js';
import { prisma } from '../../product-analyze/lib/prisma.js';
import { buildCompareProfileResults } from '../utils/build-compare-profile-results.util.js';
import { parsePhotoRequestV2 } from '../utils/parse-photo-request-v2.util.js';

const compareProductsRequestSchema = z
  .object({
    barcodeA: z.string().trim().min(1, 'First barcode is required'),
    barcodeB: z.string().trim().min(1, 'Second barcode is required'),
  })
  .strict();

const compareProductSourceRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('barcode'),
    barcode: z.string().trim().min(1, 'Barcode is required'),
  }),
  z.object({
    type: z.literal('photo'),
    imageBase64: z.string().optional(),
    ocr: z.unknown().optional(),
  }),
]);

type CompareProductSourceRequest = z.infer<typeof compareProductSourceRequestSchema>;

export interface CompareProductsV2UploadedFiles {
  photoA?: UploadedPhotoFileV2[];
  photoB?: UploadedPhotoFileV2[];
}

export interface PersistProductAnalyzeV2ScanInput {
  userId: string;
  barcode: string;
  source: 'barcode' | 'photo';
  result: AnalyzeBarcodeV2Response;
  productId?: string;
}

export type PersistProductAnalyzeV2Scan = (
  input: PersistProductAnalyzeV2ScanInput,
) => Promise<string>;

const createComparisonRecord = async (input: {
  barcodeA: string;
  barcodeB: string;
  product1Id?: string;
  product2Id?: string;
  userId: string;
}) => {
  return prisma.comparison.create({
    data: {
      userId: input.userId,
      product1Id: input.product1Id ?? null,
      product2Id: input.product2Id ?? null,
      barcode1: input.barcodeA,
      barcode2: input.barcodeB,
      comparisonResult: {} as Prisma.InputJsonValue,
    },
  });
};

const updateComparisonRecord = async (
  comparisonId: string,
  comparisonResult: CompareProductsV2Response,
) => {
  await prisma.comparison.update({
    where: { id: comparisonId },
    data: {
      comparisonResult: comparisonResult as unknown as Prisma.InputJsonValue,
    },
  });
};

const parseMaybeJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const getBodyObject = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== 'object') {
    return {};
  }

  return body as Record<string, unknown>;
};

const parseSourceRequest = (value: unknown, label: string): CompareProductSourceRequest => {
  const parsed = compareProductSourceRequestSchema.safeParse(parseMaybeJson(value));

  if (!parsed.success) {
    throw ApiError.badRequest(`${label} is invalid`);
  }

  return parsed.data;
};

const parseCompareSources = (input: {
  body: unknown;
  files?: CompareProductsV2UploadedFiles;
}): [CompareProductV2Source, CompareProductV2Source] => {
  const body = getBodyObject(input.body);
  const legacyParsed = compareProductsRequestSchema.safeParse(input.body);

  if (legacyParsed.success) {
    return [
      { type: 'barcode', barcode: legacyParsed.data.barcodeA },
      { type: 'barcode', barcode: legacyParsed.data.barcodeB },
    ];
  }

  const productA = parseSourceRequest(body.productA, 'First product');
  const productB = parseSourceRequest(body.productB, 'Second product');

  return [
    productA.type === 'barcode'
      ? { type: 'barcode', barcode: productA.barcode }
      : {
          type: 'photo',
          ...parsePhotoRequestV2(productA, input.files?.photoA?.[0]),
        },
    productB.type === 'barcode'
      ? { type: 'barcode', barcode: productB.barcode }
      : {
          type: 'photo',
          ...parsePhotoRequestV2(productB, input.files?.photoB?.[0]),
        },
  ];
};

const getPersistSource = (source: CompareProductV2Source): 'barcode' | 'photo' => source.type;

export async function compareProductsV2(input: {
  body: unknown;
  files?: CompareProductsV2UploadedFiles;
  userId: string;
  persistScanResult: PersistProductAnalyzeV2Scan;
}): Promise<CompareProductsV2Response> {
  const [productA, productB] = parseCompareSources({ body: input.body, files: input.files });
  if (
    productA.type === 'barcode' &&
    productB.type === 'barcode' &&
    productA.barcode === productB.barcode
  ) {
    throw ApiError.badRequest('Products for comparison must be different');
  }

  const finalState = await productAnalyzeV2CompareGraph.invoke({
    productA,
    productB,
    userId: input.userId,
  });

  if (!finalState.products || finalState.products.length !== 2) {
    throw ApiError.unprocessable('Comparison failed to produce a result', 'ANALYSIS_FAILED');
  }

  const products = (await Promise.all(
    finalState.products.map(async (analyzedProduct, index) => {
      const scanId = analyzedProduct.reusedExistingAnalysis
        ? analyzedProduct.scanId
        : await input.persistScanResult({
            userId: input.userId,
            barcode: analyzedProduct.barcode,
            source: getPersistSource(index === 0 ? productA : productB),
            result: analyzedProduct.result,
            productId: analyzedProduct.productId,
          });

      return {
        barcode: analyzedProduct.barcode,
        ...analyzedProduct.result,
        ...(analyzedProduct.productId ? { productId: analyzedProduct.productId } : {}),
        ...(scanId ? { scanId } : {}),
      };
    }),
  )) as [CompareProductV2Result, CompareProductV2Result];

  if (products[0].barcode === products[1].barcode) {
    throw ApiError.badRequest('Products for comparison must be different');
  }

  const comparison = await createComparisonRecord({
    userId: input.userId,
    barcodeA: products[0].barcode,
    barcodeB: products[1].barcode,
    product1Id: products[0].productId,
    product2Id: products[1].productId,
  });

  const response: CompareProductsV2Response = {
    comparisonId: comparison.id,
    products,
    profileResults: buildCompareProfileResults(products),
  };

  await updateComparisonRecord(comparison.id, response);

  return response;
}
