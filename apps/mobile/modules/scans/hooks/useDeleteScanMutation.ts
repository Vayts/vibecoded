import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteScan } from '../api/scansApi';
import { FAVOURITES_QUERY_KEY } from './useFavouritesQuery';
import { SCAN_HISTORY_QUERY_KEY } from './useScanHistoryQuery';

export const useDeleteScanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scanId: string) => deleteScan(scanId),
    onSuccess: (_result, scanId) => {
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
      void queryClient.invalidateQueries({ queryKey: [...FAVOURITES_QUERY_KEY] });
      queryClient.removeQueries({ queryKey: ['scans', 'detail', scanId] });
    },
  });
};