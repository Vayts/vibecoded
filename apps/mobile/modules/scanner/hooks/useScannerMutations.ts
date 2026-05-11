import type {
  BarcodeLookupRequest,
  CompareProductsResponse,
} from '@acme/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitBarcodeScan,
  compareProducts,
  type ScannerAnalysisResponse,
  type CompareProductsRequest,
} from '../api/scannerMutations';
import { COMPARISONS_QUERY_KEY } from '../../scans/hooks/useComparisonsQuery';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';

export const useScanBarcodeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<ScannerAnalysisResponse, Error, BarcodeLookupRequest>({
    mutationFn: submitBarcodeScan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
  });
};

export const useCompareProductsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<CompareProductsResponse, Error, CompareProductsRequest>({
    mutationFn: compareProducts,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [...COMPARISONS_QUERY_KEY] });
    },
  });
};
