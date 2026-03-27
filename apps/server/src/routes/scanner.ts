import { Hono } from 'hono';
import { barcodeLookupRequestSchema } from '@acme/shared';
import { auth } from '../lib/auth';
import { lookupProductByBarcode, OpenFoodFactsLookupError } from '../services/openFoodFacts';
import { getPersonalAnalysisJob } from '../services/personalAnalysisJobs';
import { lookupProductByPhoto, ProductPhotoLookupError } from '../services/productPhotoLookup';
import { isFavouriteByBarcode } from '../services/favoriteRepository';
import { findProductIdByBarcode } from '../services/scanRepository';

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

    if (response.success && session?.user?.id) {
      const [isFav, productId] = await Promise.all([
        isFavouriteByBarcode(session.user.id, response.barcode),
        findProductIdByBarcode(response.barcode),
      ]);
      return c.json({ ...response, isFavourite: isFav, productId: productId ?? undefined });
    }

    if (response.success) {
      const productId = await findProductIdByBarcode(response.barcode);
      return c.json({ ...response, productId: productId ?? undefined });
    }

    return c.json(response);
  } catch (error) {
    if (error instanceof OpenFoodFactsLookupError) {
      return c.json({ error: error.message, code: error.code }, 502);
    }

    throw error;
  }
});

scannerRoute.post('/photo', async (c) => {
  let formData: FormData;

  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'Invalid multipart form data', code: 'VALIDATION_ERROR' }, 400);
  }

  const upload = formData.get('photo') ?? formData.get('image') ?? formData.get('file');

  if (!(upload instanceof File)) {
    return c.json({ error: 'Photo upload is required', code: 'VALIDATION_ERROR' }, 400);
  }

  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const response = await lookupProductByPhoto(upload, session?.user?.id);

    if (response.success && session?.user?.id) {
      const [isFav, productId] = await Promise.all([
        isFavouriteByBarcode(session.user.id, response.barcode),
        findProductIdByBarcode(response.barcode),
      ]);
      return c.json({ ...response, isFavourite: isFav, productId: productId ?? undefined });
    }

    if (response.success) {
      const productId = await findProductIdByBarcode(response.barcode);
      return c.json({ ...response, productId: productId ?? undefined });
    }

    return c.json(response);
  } catch (error) {
    if (error instanceof ProductPhotoLookupError) {
      const status = error.code === 'INVALID_UPLOAD' ? 400 : 502;
      return c.json({ error: error.message, code: error.code }, status);
    }

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
