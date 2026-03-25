import type { BarcodeLookupRequest, BarcodeLookupResponse } from '@acme/shared';
import { useMutation } from '@tanstack/react-query';
import { submitBarcodeScan, submitPhotoCapture } from '../api/scannerMutations';
import type { PhotoCaptureInput } from '../types/scanner';

export const useScanBarcodeMutation = () => {
  return useMutation<BarcodeLookupResponse, Error, BarcodeLookupRequest>({
    mutationFn: submitBarcodeScan,
  });
};

export const useScanPhotoMutation = () => {
  return useMutation<BarcodeLookupResponse, Error, PhotoCaptureInput>({
    mutationFn: submitPhotoCapture,
  });
};
