import { Router } from 'express';
import { users, tuitions, payments, oid } from '../db.js';
import { verifyAdmin } from '../middleware/auth.js';
import { s } from '../lib/validate.js';

const r = Router();

r.get('/admin/stats', ...verifyAdmin, async (_req, res) => {
  const [totalUsers, totalTutors, pending, approved, rev] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ role: 'tutor' }),
    tuitions.countDocuments({ approvalStatus: 'pending' }),
    tuitions.countDocuments({ approvalStatus: 'approved' }),
    payments
      .aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }])
      .toArray(),
  ]);
  res.json({
    totalUsers,
    totalTutors,
    pending,
    approved,
    revenue: rev[0]?.total || 0,
  });
});

r.get('/admin/users', ...verifyAdmin, async (_req, res) => {
  const list = await users
    .find(
      {},
      {
        projection: {
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          plan: 1,
          createdAt: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
});

r.patch('/admin/users/:id/role', ...verifyAdmin, async (req, res) => {
  const id = oid(req.params.id);
  const role = s(req.body?.role, 10);
  if (!id || !['student', 'tutor', 'admin'].includes(role))
    return void res.status(400).json({ message: 'Invalid role' });
  if (id.equals(req.user._id))
    return void res
      .status(400)
      .json({ message: 'You cannot change your own role' });
  const out = await users.updateOne({ _id: id }, { $set: { role } });
  if (!out.matchedCount)
    return void res.status(404).json({ message: 'User not found' });
  res.json({ role });
});

r.get('/admin/tuitions', ...verifyAdmin, async (req, res) => {
  const st = s(req.query.status, 10);
  res.json(
    await tuitions
      .find(
        ['pending', 'approved', 'rejected'].includes(st)
          ? { approvalStatus: st }
          : {},
      )
      .sort({ createdAt: -1 })
      .toArray(),
  );
});

r.patch('/admin/tuitions/:id/status', ...verifyAdmin, async (req, res) => {
  const id = oid(req.params.id);
  const status = s(req.body?.status, 10);
  if (!id || !['approved', 'rejected'].includes(status))
    return void res
      .status(400)
      .json({ message: 'Status must be approved or rejected' });
  const out = await tuitions.updateOne(
    { _id: id },
    { $set: { approvalStatus: status } },
  );
  if (!out.matchedCount)
    return void res.status(404).json({ message: 'Tuition not found' });
  res.json({ approvalStatus: status });
});

r.get('/admin/transactions', ...verifyAdmin, async (_req, res) => {
  res.json(await payments.find({}).sort({ paidAt: -1 }).toArray());
});

export default r;
