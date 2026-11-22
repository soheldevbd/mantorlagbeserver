import 'dotenv/config';
const req = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing environment variable: ${k}`);
  return v;
};
export const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: req('MONGODB_URI'),
  dbName: process.env.DB_NAME || 'mentorlagbe',
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  ),
  authSecret: req('BETTER_AUTH_SECRET'),
  jwtSecret: req('JWT_SECRET'),
  stripeKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET || '',
  imgbbKey: process.env.IMGBB_API_KEY || '',
};
