import type { MiddlewareHandler } from 'hono';
import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';

export interface AuthVariables {
  userId: string;
}

export const requireAuth: MiddlewareHandler<{ Variables: AuthVariables }> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user?.id) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!user) {
    return c.json(
      {
        error: 'The authenticated user no longer exists. Please sign in again.',
        code: 'SESSION_USER_NOT_FOUND',
      },
      401,
    );
  }

  c.set('userId', user.id);
  await next();
};
