import { Router } from 'express';
import { users, tuitions, oid } from '../db.js';
import { verifyToken, verifyStudent } from '../middleware/auth.js';

const r = Router();

r.get('/users/me', verifyToken, (req, res) => {
  const {
    _id,
    name,
    email,
    image,
    role,
    phone,
    bio,
    plan,
    createdAt,
    bookmarks = [],
  } = req.user;
  res.json({
    id: _id.toString(),
    name,
    email,
    image,
    role,
    phone,
    bio,
    plan,
    createdAt,
    bookmarks,
  });
});

// Bookmarks (students): free plan max 5, pro unlimited
r.post('/bookmarks/:id', ...verifyStudent, async (req, res) => {
  const id = oid(req.params.id);
  const t =
    id && (await tuitions.findOne({ _id: id, approvalStatus: 'approved' }));
  if (!id || !t)
    return void res.status(404).json({ message: 'Tuition not found' });
  const key = id.toString();
  const list: string[] = req.user.bookmarks || [];
  if (list.includes(key)) {
    await users.updateOne({ _id: req.user._id }, {
      $pull: { bookmarks: key },
    } as any);
    return void res.json({ bookmarked: false });
  }
  if (req.user.plan !== 'pro' && list.length >= 5)
    return void res
      .status(403)
      .json({
        message: 'Free plan allows 5 bookmarks. Upgrade to Pro for unlimited.',
      });
  await users.updateOne(
    { _id: req.user._id },
    { $addToSet: { bookmarks: key } },
  );
  res.json({ bookmarked: true });
});

r.get('/bookmarks', ...verifyStudent, async (req, res) => {
  const ids = ((req.user.bookmarks || []) as string[]).map(oid).filter(Boolean);
  res.json(await tuitions.find({ _id: { $in: ids as any[] } }).toArray());
});

export default r;
