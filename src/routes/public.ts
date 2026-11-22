import { Router } from "express";
import { tuitions, users, applications, oid } from "../db.js";
import { s, esc } from "../lib/validate.js";

const r = Router();

// Challenge 1: server-side search, filter and pagination
r.get("/tuitions", async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page)) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(String(req.query.limit)) || 9));
  const q: any = { approvalStatus: "approved", isActive: true };
  const search = s(req.query.search, 80);
  if (search) q.$or = [{ title: { $regex: esc(search), $options: "i" } }, { subject: { $regex: esc(search), $options: "i" } }];
  for (const f of ["subject", "classLevel", "mode"] as const) {
    const v = s(req.query[f], 60);
    if (v) q[f] = v;
  }
  const [items, total] = await Promise.all([
    tuitions.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    tuitions.countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

r.get("/tuitions/:id", async (req, res) => {
  const id = oid(req.params.id);
  const t = id && (await tuitions.findOne({ _id: id, approvalStatus: "approved", isActive: true }));
  if (!t) return void res.status(404).json({ message: "Tuition not found" });
  res.json(t);
});

r.get("/stats", async (_req, res) => {
  const [students, tutors, tuitionCount, applicationCount] = await Promise.all([
    users.countDocuments({ role: "student" }),
    users.countDocuments({ role: "tutor" }),
    tuitions.countDocuments({ approvalStatus: "approved", isActive: true }),
    applications.countDocuments({}),
  ]);
  res.json({ students, tutors, tuitions: tuitionCount, applications: applicationCount });
});

export default r;
