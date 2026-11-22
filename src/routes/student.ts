import { Router } from 'express';
import { applications, tuitions, oid } from '../db.js';
import { verifyStudent } from '../middleware/auth.js';
import { s } from '../lib/validate.js';

const r = Router();

r.post('/applications', ...verifyStudent, async (req, res) => {
  const id = oid(s(req.body?.tuitionId, 40));
  const phone = s(req.body?.studentPhone, 20);
  const schedule = s(req.body?.preferredSchedule, 120);
  const note = s(req.body?.studentNote, 500);
  if (!id) return void res.status(400).json({ message: 'Invalid tuition' });
  if (!/^[0-9+\-\s]{7,20}$/.test(phone))
    return void res.status(400).json({ message: 'Enter a valid phone number' });
  if (!schedule)
    return void res
      .status(400)
      .json({ message: 'Preferred schedule is required' });
  const t = await tuitions.findOne({
    _id: id,
    approvalStatus: 'approved',
    isActive: true,
  });
  if (!t)
    return void res
      .status(404)
      .json({ message: 'This tuition is not available' });
  const dup = await applications.findOne({
    tuitionId: id.toString(),
    studentEmail: req.user.email,
  });
  if (dup)
    return void res
      .status(409)
      .json({ message: 'You have already applied for this tuition' });
  const doc = {
    tuitionId: id.toString(),
    tuitionTitle: t.title,
    subject: t.subject,
    monthlyFee: t.monthlyFee,
    tutorName: t.tutorName,
    tutorEmail: t.tutorEmail,
    studentName: req.user.name,
    studentEmail: req.user.email,
    studentPhone: phone,
    preferredSchedule: schedule,
    studentNote: note,
    status: 'pending',
    appliedAt: new Date(),
  };
  try {
    const out = await applications.insertOne(doc);
    res.status(201).json({ ...doc, _id: out.insertedId });
  } catch (e: any) {
    if (e.code === 11000)
      return void res
        .status(409)
        .json({ message: 'You have already applied for this tuition' });
    throw e;
  }
});

r.get('/applications/mine', ...verifyStudent, async (req, res) => {
  res.json(
    await applications
      .find({ studentEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .toArray(),
  );
});

r.delete('/applications/:id', ...verifyStudent, async (req, res) => {
  const id = oid(req.params.id);
  const out =
    id &&
    (await applications.deleteOne({
      _id: id,
      studentEmail: req.user.email,
      status: 'pending',
    }));
  if (!out?.deletedCount)
    return void res
      .status(400)
      .json({ message: 'Only your pending applications can be cancelled' });
  res.json({ ok: true });
});

r.get('/student/stats', ...verifyStudent, async (req, res) => {
  const mine = await applications
    .find({ studentEmail: req.user.email }, { projection: { status: 1 } })
    .toArray();
  const count = (st: string) => mine.filter(a => a.status === st).length;
  res.json({
    total: mine.length,
    accepted: count('accepted'),
    pending: count('pending'),
    plan: req.user.plan,
  });
});

export default r;
