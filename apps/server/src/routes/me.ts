import { Hono } from 'hono';
import { onboardingRequestSchema } from '@acme/shared';
import type { AuthVariables } from '../middleware/requireAuth';
import { requireAuth } from '../middleware/requireAuth';
import { getUserOnboarding, upsertUserOnboarding } from '../services/onboarding';

export const meRoute = new Hono<{ Variables: AuthVariables }>();

meRoute.get('/onboarding', requireAuth, async (c) => {
  const userId = c.get('userId');
  const onboarding = await getUserOnboarding(userId);

  return c.json(onboarding);
});

meRoute.post('/onboarding', requireAuth, async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);
  }

  const parsed = onboardingRequestSchema.safeParse(body);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return c.json(
      { error: issue?.message ?? 'Invalid onboarding payload', code: 'VALIDATION_ERROR' },
      400,
    );
  }

  const onboarding = await upsertUserOnboarding(c.get('userId'), parsed.data);

  return c.json(onboarding);
});
