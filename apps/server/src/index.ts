import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { authRoute } from './routes/auth';
import { analyticsRoute } from './routes/analytics';
import { familyMembersRoute } from './routes/familyMembers';
import { favouritesRoute } from './routes/favourites';
import { healthRoute } from './routes/health';
import { meRoute } from './routes/me';
import { scannerRoute } from './routes/scanner';
import { scannerPhotoRoute } from './routes/scanner-photo';
import { scansRoute } from './routes/scans';
import { userRoute } from './routes/user';
import dotenv from 'dotenv';
import http from 'http';

dotenv.config();

const app = new Hono();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['set-auth-token'],
  }),
);

app.route('/health', healthRoute);
app.route('/api/auth', authRoute);
app.route('/api/analytics', analyticsRoute);
app.route('/api/family-members', familyMembersRoute);
app.route('/api/favourites', favouritesRoute);
app.route('/api/me', meRoute);
app.route('/api/scanner', scannerRoute);
app.route('/api/scanner', scannerPhotoRoute);
app.route('/api/scans', scansRoute);
app.route('/api/user', userRoute);

app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
});

const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT ?? '3000', 10);

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`Server running on http://${hostname}:${info.port}`);
}) as unknown as http.Server;

const shutdown = () => {
  server.closeAllConnections();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
