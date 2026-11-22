import { Router } from "express";
import { applications, tuitions, oid } from "../db.js";
import { verifyTutor } from "../middleware/auth.js";
import { parseTuition, s } from "../lib/validate.js";

const r = Router();
const FREE_LIMIT = 2;

r.post("/tutor/tuitions", ...verifyTutor, async (req, res) => {
  const { data, error } = parseTuition(req.body);
  if (error) return void res.status(400).json({ message: error });
  if (req.user.plan !== "pro" && (await tuitions.countDocuments({ tutorEmail: req.user.email })) >= FREE_LIMIT)
    return void res.status(403).json({ message: `Free plan allows ${FREE_LIMIT} tuition posts. Upgrade to Pro for unlimited posts.` });
  const doc = { ...data, tutorName: req.user.name, tutorEmail: req.user.email, tutorImage: req.user.image || "", approvalStatus: "pending", isActive: true, createdAt: new Date() };
  const out = await tuitions.insertOne(doc);
  res.status(201).json({ ...doc, _id: out.insertedId });
});

r.get("/tutor/tuitions", ...verifyTutor, async (req, res) => {
  res.json(await tuitions.find({ tutorEmail: req.user.email }).sort({ createdAt: -1 }).toArray());
});

// Editing sends the post back to admin review
r.patch("/tutor/tuitions/:id", ...verifyTutor, async (req, res) => {
  const id = oid(req.params.id);
  const { data, error } = parseTuition(req.body);
  if (error) return void res.status(400).json({ message: error });
  const out = id && (await tuitions.updateOne({ _id: id, tutorEmail: req.user.email }, { $set: { ...data, approvalStatus: "pending", updatedAt: new Date() } }));
  if (!out?.matchedCount) return void res.status(404).json({ message: "Tuition not found" });
  res.json({ ok: true });
});

r.patch("/tutor/tuitions/:id/toggle", ...verifyTutor, async (req, res) => {
  const id = oid(req.params.id);
  const t = id && (await tuitions.findOne({ _id: id, tutorEmail: req.user.email }));
  if (!id || !t) return void res.status(404).json({ message: "Tuition not found" });
  await tuitions.updateOne({ _id: id }, { $set: { isActive: !t.isActive } });
  res.json({ isActive: !t.isActive });
});

r.delete("/tutor/tuitions/:id", ...verifyTutor, async (req, res) => {
  const id = oid(req.params.id);
  const out = id && (await tuitions.deleteOne({ _id: id, tutorEmail: req.user.email }));
  if (!id || !out?.deletedCount) return void res.status(404).json({ message: "Tuition not found" });
  await applications.deleteMany({ tuitionId: id.toString() });
  res.json({ ok: true });
});

r.get("/tutor/applicants", ...verifyTutor, async (req, res) => {
  res.json(await applications.find({ tutorEmail: req.user.email }).sort({ appliedAt: -1 }).toArray());
});

r.patch("/tutor/applicants/:id", ...verifyTutor, async (req, res) => {
  const id = oid(req.params.id);
  const status = s(req.body?.status, 10);
  if (!["accepted", "rejected"].includes(status)) return void res.status(400).json({ message: "Status must be accepted or rejected" });
  const out = id && (await applications.updateOne({ _id: id, tutorEmail: req.user.email }, { $set: { status } }));
  if (!out?.matchedCount) return void res.status(404).json({ message: "Application not found" });
  res.json({ status });
});

r.get("/tutor/stats", ...verifyTutor, async (req, res) => {
  const mine = await tuitions.find({ tutorEmail: req.user.email }, { projection: { approvalStatus: 1, isActive: 1 } }).toArray();
  res.json({
    total: mine.length,
    active: mine.filter((t) => t.approvalStatus === "approved" && t.isActive).length,
    applicants: await applications.countDocuments({ tutorEmail: req.user.email }),
    plan: req.user.plan,
  });
});

export default r;
