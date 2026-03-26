import { personalAnalysisJobResponseSchema, type PersonalAnalysisJobResponse } from '@acme/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/lib/client/client';

const POLLING_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 12;
const MAX_INGREDIENT_POLL_ATTEMPTS = 18;

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Unable to load personal analysis';
};

const fetchPersonalAnalysisJob = async (jobId: string): Promise<PersonalAnalysisJobResponse> => {
  const response = await apiFetch(`/api/scanner/personal-analysis/${jobId}`);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return personalAnalysisJobResponseSchema.parse(json);
};

export const getPersonalAnalysisQueryKey = (jobId?: string) => {
  return ['scanner', 'personal-analysis', jobId] as const;
};

export const usePersonalAnalysisQuery = (
  jobId?: string,
  initialStatus?: PersonalAnalysisJobResponse['status'],
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

      // Stop polling on terminal states or max attempts
      if (!jobId || status === 'failed' || attempts >= MAX_INGREDIENT_POLL_ATTEMPTS) {
        return false;
      }

      // Personal analysis still pending — keep polling
      if (status !== 'completed') {
        return attempts >= MAX_POLL_ATTEMPTS ? false : POLLING_INTERVAL_MS;
      }

      // Personal analysis completed — continue polling if ingredient analysis is pending
      const ingredientStatus = data?.ingredientAnalysisStatus;
      if (ingredientStatus === 'pending') {
        return POLLING_INTERVAL_MS;
      }

      return false;
    },
    retry: 0,
  });
};
