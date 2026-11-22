import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { toNodeHandler, fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { env } from './config.js';
import { ensureIndexes } from './db.js';
import publicRoutes from './routes/public.js';
import userRoutes from './routes/user.js';
import studentRoutes from './routes/student.js';
import tutorRoutes from './routes/tutor.js';
import adminRoutes from './routes/admin.js';
import paymentRoutes, { webhook } from './routes/payments.js';
import uploadRoutes from './routes/upload.js';

const app = express();
ensureIndexes();

app.use(
  cors({ origin: [env.clientUrl, 'http://localhost:3000'], credentials: true }),
);

// Stripe needs the raw body, so this goes before express.json()
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  webhook,
);

// Turns a valid BetterAuth session into a short-lived JWT for the protected API
app.get('/api/auth/get-jwt', async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) return void res.status(401).json({ message: 'Not signed in' });
  res.json({
    token: jwt.sign({ email: session.user.email }, env.jwtSecret, {
      expiresIn: '1h',
    }),
  });
});
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.get(
  '/',
  (_req, res) => void res.json({ name: 'MentorLagbe API', status: 'ok' }),
);
app.use(
  '/api',
  publicRoutes,
  userRoutes,
  studentRoutes,
  tutorRoutes,
  adminRoutes,
  paymentRoutes,
  uploadRoutes,
);

app.use(
  (_req, res) => void res.status(404).json({ message: 'Route not found' }),
);
const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err?.message || 'Internal server error' });
};
app.use(onError);

export default app;
