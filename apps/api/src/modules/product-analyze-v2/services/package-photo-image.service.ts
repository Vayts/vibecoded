import type { NormalizedProduct } from '@acme/shared';
import { processProductImage } from '../../../shared/lib/image-processing.js';
import { uploadProductImage } from '../../../shared/lib/storage.js';
import { resolveCanonicalProductImageUrl } from '../../../shared/utils/product-image.js';
import type { UploadedPhotoFileV2 } from '../types/analyze-photo-v2.types.js';
import { attachPhotoImagePathV2 } from '../utils/attach-photo-image-path.util.js';
import {
  createProductAnalyzeV2Logger,
  getErrorStack,
} from '../utils/product-analyze-v2-logger.util.js';

const logger = createProductAnalyzeV2Logger('package-photo-image');

interface PackagePhotoMetadataEntry {
  index: number;
  step?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parsePackagePhotoMetadata = (metadata: unknown): PackagePhotoMetadataEntry[] => {
  const parsedMetadata =
    typeof metadata === 'string' ? (JSON.parse(metadata) as unknown) : metadata;

  if (!Array.isArray(parsedMetadata)) {
    return [];
  }

  return parsedMetadata.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.index !== 'number' || !Number.isInteger(entry.index)) {
      return [];
    }

    return [
      {
        index: entry.index,
        ...(typeof entry.step === 'string' ? { step: entry.step } : {}),
      },
    ];
  });
};

const resolveFrontPackagePhoto = (
  files: UploadedPhotoFileV2[],
  metadata: unknown,
): UploadedPhotoFileV2 | undefined => {
  try {
    const frontEntry = parsePackagePhotoMetadata(metadata).find((entry) => entry.step === 'front');

    if (frontEntry) {
      return files[frontEntry.index];
    }
  } catch {
    // Ignore malformed metadata and fall back to the first uploaded image.
  }

  return files[0];
};

const hasValidImage = (product: NormalizedProduct): boolean => {
  return resolveCanonicalProductImageUrl(product.image_url, product.images) !== null;
};

export const attachFrontPackagePhotoImage = async (input: {
  files: UploadedPhotoFileV2[];
  metadata: unknown;
  product: NormalizedProduct;
}): Promise<NormalizedProduct> => {
  if (hasValidImage(input.product)) {
    return input.product;
  }

  const frontPhoto = resolveFrontPackagePhoto(input.files, input.metadata);

  if (!frontPhoto?.buffer?.length) {
    return input.product;
  }

  try {
    const processed = await processProductImage(frontPhoto.buffer);
    const photoImagePath = await uploadProductImage(processed.buffer);

    return attachPhotoImagePathV2(input.product, photoImagePath);
  } catch (error) {
    logger.error('Image processing/upload failed', getErrorStack(error));
    return input.product;
  }
};
