import type { PersonalAnalysisJob } from '@acme/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';

export const getPersonalAnalysisQueryKey = (analysisId?: string) => {
  return ['scanner', 'personal-analysis', analysisId ?? 'local'] as const;
};

export const usePersonalAnalysisQuery = (
  initialAnalysis?: PersonalAnalysisJob,
) => {
  const analysisId = initialAnalysis?.analysisId;
  const queryKey = useMemo(
    () => getPersonalAnalysisQueryKey(analysisId),
    [analysisId],
  );

  return useQuery({
    queryKey,
    enabled: false,
    queryFn: async () => initialAnalysis,
    initialData: initialAnalysis,
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
  });
};
