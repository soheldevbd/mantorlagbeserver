import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { db } from './db.js';
import { env } from './config.js';

export const auth = betterAuth({
  // The browser talks to /api/auth through the Next.js rewrite, so the public base URL is the client URL.
  baseURL: env.clientUrl,
  secret: env.authSecret,
  database: mongodbAdapter(db),
  trustedOrigins: [env.clientUrl, 'http://localhost:3000'],
  emailAndPassword: { enabled: true, minPasswordLength: 6 },
  user: {
    modelName: 'users',
    additionalFields: {
      role: { type: 'string', defaultValue: 'student', input: true },
      plan: { type: 'string', defaultValue: 'free', input: false },
      phone: { type: 'string', required: false },
      bio: { type: 'string', required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Anyone can sign up as student or tutor only. Admin is assigned from the DB / seed script.
        before: async (user: any) => ({
          data: {
            ...user,
            role: user.role === 'tutor' ? 'tutor' : 'student',
            plan: 'free',
          },
        }),
      },
      update: {
        // Users must never change their own role/plan through updateUser.
        before: async (data: any) => {
          const { role, plan, ...rest } = data;
          return { data: rest };
        },
      },
    },
  },
});
