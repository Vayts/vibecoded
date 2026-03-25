import type {
  BarcodeLookupProduct,
  PersonalAnalysisJob,
  PersonalAnalysisJobResponse,
  PersonalAnalysisResult,
} from '@acme/shared';
import { randomUUID } from 'node:crypto';

import { getUserOnboarding } from './onboarding';
import { buildPersonalProductAnalysis } from './personalProductAnalysis';

const JOB_TTL_MS = 10 * 60 * 1000;
const jobs = new Map<string, PersonalAnalysisJobResponse>();

const scheduleCleanup = (jobId: string): void => {
  setTimeout(() => {
    jobs.delete(jobId);
  }, JOB_TTL_MS);
};

const runPersonalAnalysisJob = async (
  jobId: string,
  product: BarcodeLookupProduct,
  userId?: string,
): Promise<void> => {
  try {
    const onboarding = userId ? await getUserOnboarding(userId) : undefined;
    const result: PersonalAnalysisResult = buildPersonalProductAnalysis(product, onboarding);
    jobs.set(jobId, {
      jobId,
      status: 'completed',
      result,
    });
  } catch {
    jobs.set(jobId, {
      jobId,
      status: 'failed',
    });
  }
};

export const createPersonalAnalysisJob = (
  product: BarcodeLookupProduct,
  userId?: string,
): PersonalAnalysisJob => {
  const jobId = randomUUID();
  const job: PersonalAnalysisJob = {
    jobId,
    status: 'pending',
  };

  jobs.set(jobId, job);
  scheduleCleanup(jobId);
  void runPersonalAnalysisJob(jobId, product, userId);

  return job;
};

export const getPersonalAnalysisJob = (jobId: string): PersonalAnalysisJobResponse | null => {
  return jobs.get(jobId) ?? null;
};
