import type { ProductLookupRequest } from '@acme/shared';
import { useMutation } from '@tanstack/react-query';
import {
  submitBarcodeLookup,
  submitPackagePhotos,
  type BarcodeScannerLookupResponse,
  type PackagePhotosUploadResponse,
} from '../api/barcodeScannerMutations';
import type { CapturedProductPhoto } from '../types/productPhotoCapture';

export const useBarcodeScannerLookupMutation = () => {
  return useMutation<BarcodeScannerLookupResponse, Error, ProductLookupRequest>({
    mutationFn: submitBarcodeLookup,
  });
};

export const usePackagePhotosUploadMutation = () => {
  return useMutation<PackagePhotosUploadResponse, Error, CapturedProductPhoto[]>({
    mutationFn: submitPackagePhotos,
  });
};


