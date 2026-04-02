import {
  analysisJobResponseSchema,
  type AnalysisJobResponse,
} from '@acme/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiFetch } from '../../../shared/lib/client/client';
import { SCAN_HISTORY_QUERY_KEY } from '../../scans/hooks/useScanHistoryQuery';

const POLLING_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 20;

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Unable to load personal analysis';
};

const fetchPersonalAnalysisJob = async (
  jobId: string,
): Promise<AnalysisJobResponse> => {
  const response = await apiFetch(`/api/scanner/personal-analysis/${jobId}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return analysisJobResponseSchema.parse(json);
};

export const getPersonalAnalysisQueryKey = (jobId?: string) => {
  return ['scanner', 'personal-analysis', jobId] as const;
};

export const usePersonalAnalysisQuery = (
  jobId?: string,
  initialStatus?: AnalysisJobResponse['status'],
) => {
  const queryClient = useQueryClient();
  const hasInvalidatedRef = useRef(false);

  const query = useQuery({
    queryKey: getPersonalAnalysisQueryKey(jobId),
    queryFn: () => fetchPersonalAnalysisJob(jobId as string),
    enabled: Boolean(jobId),
    initialData: jobId
      ? {
          jobId,
          status: initialStatus ?? 'pending',
        }
      : undefined,
    refetchInterval: (q) => {
      const data = q.state.data;
      const status = data?.status;
      const attempts = q.state.dataUpdateCount;

      if (!jobId || status === 'failed' || attempts >= MAX_POLL_ATTEMPTS) {
        return false;
      }

      if (status === 'completed' && data?.result) {
        return false;
      }

      return POLLING_INTERVAL_MS;
    },
    retry: 0,
  });

  // When analysis transitions to completed/failed, invalidate history so rows update
  useEffect(() => {
    const status = query.data?.status;
    if (!hasInvalidatedRef.current && (status === 'completed' || status === 'failed')) {
      hasInvalidatedRef.current = true;
      void queryClient.invalidateQueries({ queryKey: [...SCAN_HISTORY_QUERY_KEY] });
    }
  }, [query.data?.status, queryClient]);

  return query;
};
