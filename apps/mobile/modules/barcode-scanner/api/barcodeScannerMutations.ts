import {
  productLookupRequestSchema,
  productLookupResponseSchema,
  type ProductLookupRequest,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';
import { z } from 'zod';
import type { CapturedProductPhoto } from '../types/productPhotoCapture';

export type BarcodeScannerLookupResponse = z.infer<typeof productLookupResponseSchema>;

const packagePhotoNutritionSchema = z.object({
  fat_100g: z.number().nullable(),
  salt_100g: z.number().nullable(),
  fiber_100g: z.number().nullable(),
  sodium_100g: z.number().nullable(),
  sugars_100g: z.number().nullable(),
  proteins_100g: z.number().nullable(),
  energy_kcal_100g: z.number().nullable(),
  carbohydrates_100g: z.number().nullable(),
  saturated_fat_100g: z.number().nullable(),
});

const packagePhotoExtractionSchema = z.object({
  productName: z.string().nullable(),
  productNameEnglish: z.string().nullable(),
  productBrand: z.string().nullable(),
  productRole: z.string().nullable(),
  ingredients: z.array(z.string()),
  ingredientsEnglish: z.array(z.string().nullable()),
  nutrition: packagePhotoNutritionSchema,
});

const packagePhotosUploadResponseSchema = z.object({
  success: z.literal(true),
  photoCount: z.number().int().nonnegative(),
  extraction: packagePhotoExtractionSchema,
});

const packagePhotoCoverageResponseSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export type PackagePhotosUploadResponse = z.infer<typeof packagePhotosUploadResponseSchema>;
export type PackagePhotoExtraction = z.infer<typeof packagePhotoExtractionSchema>;
export type PackagePhotoCoverageResponse = z.infer<typeof packagePhotoCoverageResponseSchema>;

interface ReactNativeFile {
  uri: string;
  name: string;
  type: string;
}

interface ApiErrorPayload {
  error?: string;
  code?: string;
}

export class BarcodeScannerApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'BarcodeScannerApiError';
  }
}

const getErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  return (await response.json().catch(() => null)) as ApiErrorPayload | null;
};

const throwBarcodeScannerApiError = async (
  response: Response,
  fallbackMessage: string,
): Promise<never> => {
  const payload = await getErrorPayload(response);
  throw new BarcodeScannerApiError(payload?.error ?? fallbackMessage, payload?.code, response.status);
};

export const submitBarcodeLookup = async (
  payload: ProductLookupRequest,
): Promise<BarcodeScannerLookupResponse> => {
  const parsedPayload = productLookupRequestSchema.parse(payload);

  const response = await apiFetch('/product-analysis/barcode/lookup', {
    method: 'POST',
    body: JSON.stringify(parsedPayload),
  });

  if (!response.ok) {
    await throwBarcodeScannerApiError(response, 'Unable to fetch barcode data');
  }

  const json = await response.json();
  return productLookupResponseSchema.parse(json);
};

const buildPackagePhotosFormData = (photos: CapturedProductPhoto[]): FormData => {
  const formData = new FormData();

  photos.forEach((photo, index) => {
    const photoFile: ReactNativeFile = {
      uri: photo.uri,
      name: `package-photo-${index + 1}-${photo.step}.jpg`,
      type: 'image/jpeg',
    };

    formData.append('photos', photoFile as unknown as Blob);
  });

  formData.append(
    'metadata',
    JSON.stringify(
      photos.map((photo, index) => ({
        index,
        step: photo.step,
        width: photo.width,
        height: photo.height,
      })),
    ),
  );

  return formData;
};

const buildPackagePhotoCoverageFormData = (photo: CapturedProductPhoto): FormData => {
  const formData = new FormData();
  const photoFile: ReactNativeFile = {
    uri: photo.uri,
    name: `package-photo-coverage-${photo.step}.jpg`,
    type: 'image/jpeg',
  };

  formData.append('photo', photoFile as unknown as Blob);
  formData.append(
    'metadata',
    JSON.stringify({ height: photo.height, step: photo.step, width: photo.width }),
  );

  return formData;
};

export const submitPackagePhotoCoverage = async (
  photo: CapturedProductPhoto,
): Promise<PackagePhotoCoverageResponse> => {
  const response = await apiFetch('/product-analysis/package-photos/coverage', {
    method: 'POST',
    body: buildPackagePhotoCoverageFormData(photo),
  });

  if (!response.ok) {
    await throwBarcodeScannerApiError(response, 'Unable to check product photo');
  }

  const json = await response.json();
  return packagePhotoCoverageResponseSchema.parse(json);
};

export const submitPackagePhotos = async (
  photos: CapturedProductPhoto[],
): Promise<PackagePhotosUploadResponse> => {
  const response = await apiFetch('/product-analysis/package-photos', {
    method: 'POST',
    body: buildPackagePhotosFormData(photos),
  });

  if (!response.ok) {
    await throwBarcodeScannerApiError(response, 'Unable to upload product photos');
  }

  const json = await response.json();
  return packagePhotosUploadResponseSchema.parse(json);
};


