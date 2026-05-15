import {
  productLookupRequestSchema,
  productLookupResponseSchema,
  type ProductLookupRequest,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';
import { z } from 'zod';
import type { CapturedProductPhoto } from '../types/productPhotoCapture';

export type BarcodeScannerLookupResponse = z.infer<typeof productLookupResponseSchema>;

const packagePhotosUploadResponseSchema = z.object({
  success: z.literal(true),
  photoCount: z.number().int().nonnegative(),
});

export type PackagePhotosUploadResponse = z.infer<typeof packagePhotosUploadResponseSchema>;

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


