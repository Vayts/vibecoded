import type { ProductLookupRequest } from '@acme/shared';
import { useMutation } from '@tanstack/react-query';
import {
  submitBarcodeLookup,
  submitPackagePhotosCoverage,
  submitPackagePhotos,
  type BarcodeScannerLookupResponse,
  type PackagePhotoCoverageResponse,
  type PackagePhotosUploadResponse,
} from '../api/barcodeScannerMutations';
import type { CapturedProductPhoto } from '../types/productPhotoCapture';

export const useBarcodeScannerLookupMutation = () => {
  return useMutation<BarcodeScannerLookupResponse, Error, ProductLookupRequest>({
    mutationFn: submitBarcodeLookup,
  });
};

export const usePackagePhotosUploadMutation = () => {
  return useMutation<
    PackagePhotosUploadResponse,
    Error,
    { barcode: string; photos: CapturedProductPhoto[] }
  >({
    mutationFn: submitPackagePhotos,
  });
};

export const usePackagePhotosCoverageMutation = () => {
  return useMutation<
    PackagePhotoCoverageResponse,
    Error,
    { barcode: string; photos: CapturedProductPhoto[] }
  >({
    mutationFn: submitPackagePhotosCoverage,
  });
};
