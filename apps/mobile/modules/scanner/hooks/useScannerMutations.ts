import type { BarcodeLookupRequest, BarcodeLookupResponse } from '@acme/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitBarcodeScan } from '../api/scannerMutations';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';

export const useScanBarcodeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<BarcodeLookupResponse, Error, BarcodeLookupRequest>({
    mutationFn: submitBarcodeScan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
  });
};
