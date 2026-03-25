import type { BarcodeLookupRequest, BarcodeLookupResponse } from '@acme/shared';
import { useMutation } from '@tanstack/react-query';
import { submitBarcodeScan, submitMockPhotoCapture } from '../api/scannerMutations';
import type { PhotoCaptureInput, PhotoCaptureResponse } from '../types/scanner';

export const useScanBarcodeMutation = () => {
  return useMutation<BarcodeLookupResponse, Error, BarcodeLookupRequest>({
    mutationFn: submitBarcodeScan,
  });
};

export const useMockScanPhotoMutation = () => {
  return useMutation<PhotoCaptureResponse, Error, PhotoCaptureInput>({
    mutationFn: submitMockPhotoCapture,
  });
};
