import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteComparison } from '../api/comparisonsApi';
import { COMPARISONS_QUERY_KEY } from './useComparisonsQuery';

export const useDeleteComparisonMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (comparisonId: string) => deleteComparison(comparisonId),
    onSuccess: (_result, comparisonId) => {
      void queryClient.invalidateQueries({ queryKey: [...COMPARISONS_QUERY_KEY] });
      queryClient.removeQueries({ queryKey: ['comparisons', 'detail', comparisonId] });
    },
  });
};