# MentorLagbe Server

REST API for **MentorLagbe**, a smart tuition and mentorship platform (Students, Tutors, Admins).

- **Purpose:** moderated tuition listings, student applications, role dashboards, Stripe Pro plans
- **Live URL (client):** `<add your client link>`
- **Live URL (server):** `<add your server link>`
- **Client repo:** `<add link>`

## Admin and test credentials

Created by `npm run seed` (password is `SEED_PASSWORD`, default `Mentor@123`):

| Role | Email |
| ------ | ------- |
| Admin | <admin@mentorlagbe.com> |
| Tutor (Pro) | <tutor@mentorlagbe.com> |
| Student | <student@mentorlagbe.com> |

Replace these with your own admin credentials in the submission form if you change the seed.

## Key features

- BetterAuth (email and password) with MongoDB adapter, role chosen at sign-up (student or tutor), admin only from DB
- JWT issued from the BetterAuth session, verified by Express middlewares: `verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`
- Server-side search, filter (subject, class level, mode) and pagination (`.skip()` / `.limit()`)
- Tutor CRUD for tuitions (free plan: 2 posts, pro: unlimited), approve/reject flow for admins
- Duplicate-safe applications (unique index on `tuitionId + studentEmail`)
- Bookmarks (free: 5, pro: unlimited)
- Stripe Checkout (Tutor $15, Student $10) with webhook and `/payments/verify` fallback, both idempotent
- ImgBB image upload through the server (API key never reaches the browser)
- Seed script with 15 connected tuitions, applications and payments

## Collections

`users`, `tuitions`, `applications`, `payments`. BetterAuth also creates its own `session`, `account` and `verification` collections (required by the library).

## Setup

```bash
npm install
cp .env.example .env     # fill in your values
npm run seed             # optional demo data (resets tuitions, applications, payments)
npm run dev              # http://localhost:5000
```

Production: `npm run build && npm start`.

### Stripe webhook

Add an endpoint `https://<server>/api/payments/webhook` for the event `checkout.session.completed` and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:5000/api/payments/webhook`.

### Deploy

- **Render / Railway:** build `npm install && npm run build`, start `npm start`, add the env variables.
- **Vercel:** `api/index.ts` and `vercel.json` are included. Set `CLIENT_URL` to your client domain. After the first deploy open the server URL, it must return `{"status":"ok"}`.

`CLIENT_URL` must be your deployed client URL (no trailing slash). It drives CORS, BetterAuth origin checks and Stripe redirects.

## npm packages

better-auth, express, cors, dotenv, jsonwebtoken, mongodb, multer, stripe, typescript, tsx
