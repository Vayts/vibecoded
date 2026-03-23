import { Hono } from 'hono';
import type { AuthVariables } from '../middleware/requireAuth';
import { requireAuth } from '../middleware/requireAuth';

export const analyticsRoute = new Hono<{ Variables: AuthVariables }>();

analyticsRoute.post('/event', requireAuth, async (c) => {
  const body = await c.req.json<{ event: string; properties?: Record<string, unknown> }>();
  if (process.env.NODE_ENV === 'production') {
    console.error(`[analytics] ${body.event}`, body.properties ?? {});
  }
  return c.json({ ok: true });
});
