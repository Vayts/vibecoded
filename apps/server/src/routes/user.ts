import { Hono } from 'hono';
import type { AuthVariables } from '../middleware/requireAuth';
import { requireAuth } from '../middleware/requireAuth';
import { prisma } from '../lib/prisma';

export const userRoute = new Hono<{ Variables: AuthVariables }>();

userRoute.patch('/', requireAuth, async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json<{ name?: string }>();

  if (!body.name?.trim()) {
    return c.json({ error: 'Name is required', code: 'VALIDATION_ERROR' }, 400);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: body.name.trim() },
  });

  return c.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

userRoute.get('/subscription', requireAuth, async (c) => {
  const userId = c.get('userId');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      subscriptionPlan: true,
      subscriptionExpiry: true,
      freeGenerationsBalance: true,
    },
  });

  if (!user) return c.json({ error: 'User not found', code: 'NOT_FOUND' }, 404);

  return c.json({
    subscriptionStatus: user.subscriptionStatus,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionExpiry: user.subscriptionExpiry?.toISOString() ?? null,
    isPro: user.subscriptionStatus === 'active',
    freeGenerationsBalance: user.freeGenerationsBalance,
  });
});

userRoute.delete('/', requireAuth, async (c) => {
  const userId = c.get('userId');

  // All related records (sessions, accounts, decks, cards, reviewLogs,
  // generationLogs) are cascade-deleted at the database level.
  await prisma.user.delete({ where: { id: userId } });

  return c.json({ success: true });
});
