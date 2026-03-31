import type {
  BarcodeLookupRequest,
  BarcodeLookupResponse,
  BarcodeLookupSuccessResponse,
  ProductLookupRequest,
  ProductLookupResponse,
  CompareProductsRequest,
  CompareProductsResponse,
} from '@acme/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  submitBarcodeScan,
  lookupProduct,
  compareProducts,
  submitPhotoScan,
  type PhotoScanRequest,
} from '../api/scannerMutations';
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

export const useProductLookupMutation = () => {
  return useMutation<ProductLookupResponse, Error, ProductLookupRequest>({
    mutationFn: lookupProduct,
  });
};

export const useCompareProductsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<CompareProductsResponse, Error, CompareProductsRequest>({
    mutationFn: compareProducts,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
  });
};

export const usePhotoScanMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<BarcodeLookupSuccessResponse, Error, PhotoScanRequest>({
    mutationFn: submitPhotoScan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    },
  });
};
