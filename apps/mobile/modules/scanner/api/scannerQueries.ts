import {
  analysisJobResponseSchema,
  type AnalysisJobResponse,
} from '@acme/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/lib/client/client';

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
  return useQuery({
    queryKey: getPersonalAnalysisQueryKey(jobId),
    queryFn: () => fetchPersonalAnalysisJob(jobId as string),
    enabled: Boolean(jobId),
    initialData: jobId
      ? {
          jobId,
          status: initialStatus ?? 'pending',
        }
      : undefined,
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = data?.status;
      const attempts = query.state.dataUpdateCount;

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
};
