import { Router, type RequestHandler } from 'express';
import Stripe from 'stripe';
import { env } from '../config.js';
import { users, payments } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { s } from '../lib/validate.js';

const r = Router();
const stripe = () => {
  if (!env.stripeKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(env.stripeKey);
};

// Shared by the webhook and by /payments/verify. Idempotent: safe to run twice for one session.
async function fulfill(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return null;
  const email = session.metadata?.email;
  const user = email ? await users.findOne({ email }) : null;
  if (!user) return null;
  const doc = {
    userEmail: user.email,
    userName: user.name,
    userRole: user.role,
    planName: session.metadata?.planName || 'MentorLagbe Pro',
    amount: (session.amount_total || 0) / 100,
    currency: session.currency || 'usd',
    transactionId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.id,
    stripeSessionId: session.id,
    paymentStatus: 'paid',
    paidAt: new Date(),
  };
  await payments.updateOne(
    { stripeSessionId: session.id },
    { $setOnInsert: doc },
    { upsert: true },
  );
  await users.updateOne({ _id: user._id }, { $set: { plan: 'pro' } });
  return payments.findOne({ stripeSessionId: session.id });
}

r.post('/payments/checkout', verifyToken, async (req, res) => {
  const u = req.user;
  if (u.role === 'admin')
    return void res.status(403).json({ message: 'Admins do not need a plan' });
  if (u.plan === 'pro')
    return void res
      .status(400)
      .json({ message: 'You are already on the Pro plan' });
  const amount = u.role === 'tutor' ? 15 : 10;
  const planName = `MentorLagbe Pro ${u.role === 'tutor' ? 'Tutor' : 'Student'} Plan`;
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    customer_email: u.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: amount * 100,
          product_data: { name: planName },
        },
      },
    ],
    metadata: { email: u.email, role: u.role, planName },
    success_url: `${env.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/payment/cancel`,
  });
  res.json({ url: session.url });
});

r.post('/payments/verify', verifyToken, async (req, res) => {
  const id = s(req.body?.sessionId, 200);
  if (!id.startsWith('cs_'))
    return void res.status(400).json({ message: 'Invalid session' });
  const session = await stripe().checkout.sessions.retrieve(id);
  if (session.metadata?.email !== req.user.email)
    return void res
      .status(403)
      .json({ message: 'This payment belongs to another account' });
  const payment = await fulfill(session);
  if (!payment)
    return void res.status(402).json({ message: 'Payment not completed' });
  res.json({ ok: true, payment });
});

// Mounted in app.ts with express.raw() BEFORE express.json()
export const webhook: RequestHandler = async (req, res) => {
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      req.body,
      String(req.headers['stripe-signature']),
      env.stripeWebhook,
    );
  } catch {
    return void res.status(400).send('Webhook signature verification failed');
  }
  if (event.type === 'checkout.session.completed')
    await fulfill(event.data.object as Stripe.Checkout.Session);
  res.json({ received: true });
};

export default r;
