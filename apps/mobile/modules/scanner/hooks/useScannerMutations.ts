import type { BarcodeLookupRequest, BarcodeLookupResponse } from '@acme/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitBarcodeScan, submitPhotoCapture } from '../api/scannerMutations';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';
import type { PhotoCaptureInput } from '../types/scanner';

export const useScanBarcodeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<BarcodeLookupResponse, Error, BarcodeLookupRequest>({
    mutationFn: submitBarcodeScan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
  });
};

export const useScanPhotoMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<BarcodeLookupResponse, Error, PhotoCaptureInput>({
    mutationFn: submitPhotoCapture,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
  });
};
