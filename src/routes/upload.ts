import { Router } from "express";
import multer from "multer";
import { env } from "../config.js";
import { verifyToken } from "../middleware/auth.js";

const r = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Challenge 3: image upload through ImgBB. The API key stays on the server.
r.post("/upload", verifyToken, upload.single("image"), async (req, res) => {
  if (!req.file) return void res.status(400).json({ message: "No image file received" });
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(req.file.mimetype)) return void res.status(400).json({ message: "Only PNG, JPG, WEBP or GIF images are allowed" });
  if (!env.imgbbKey) return void res.status(500).json({ message: "IMGBB_API_KEY is not configured" });
  const fd = new FormData();
  fd.append("image", req.file.buffer.toString("base64"));
  const r2 = await fetch(`https://api.imgbb.com/1/upload?key=${env.imgbbKey}`, { method: "POST", body: fd });
  const data: any = await r2.json().catch(() => ({}));
  if (!r2.ok || !data?.data?.url) return void res.status(502).json({ message: data?.error?.message || "ImgBB upload failed" });
  res.json({ url: data.data.display_url || data.data.url });
});

export default r;
