import { Hono } from 'hono';
import { INITIAL_FREE_GENERATIONS, MONTHLY_FREE_GENERATIONS } from '@acme/shared';

export const healthRoute = new Hono();

healthRoute.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    initialFreeGenerations: INITIAL_FREE_GENERATIONS,
    monthlyFreeGenerations: MONTHLY_FREE_GENERATIONS,
  });
});
