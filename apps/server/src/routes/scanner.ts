import { Hono } from 'hono';
import { barcodeLookupRequestSchema } from '@acme/shared';
import { auth } from '../lib/auth';
import { lookupProductByBarcode, OpenFoodFactsLookupError } from '../services/openFoodFacts';
import { getPersonalAnalysisJob } from '../services/personalAnalysisJobs';

export const scannerRoute = new Hono();

scannerRoute.post('/barcode', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = barcodeLookupRequestSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid barcode payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const response = await lookupProductByBarcode(parsed.data.barcode, session?.user?.id);
    return c.json(response);
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      return c.json({ error: error.message, code: error.code }, 502);
    }

    throw error;
  }
});

scannerRoute.get('/personal-analysis/:jobId', (c) => {
  const jobId = c.req.param('jobId');
  const job = getPersonalAnalysisJob(jobId);

  if (!job) {
    return c.json({ error: 'Personal analysis job not found', code: 'NOT_FOUND' }, 404);
  }

  return c.json(job);
});
