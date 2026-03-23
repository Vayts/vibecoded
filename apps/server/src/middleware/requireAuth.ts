import type { MiddlewareHandler } from 'hono';
import { auth } from '../lib/auth';

export interface AuthVariables {
  userId: string;
}

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }
  c.set('userId', session.user.id);
  await next();
};
