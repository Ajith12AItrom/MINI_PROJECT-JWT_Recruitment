import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db.js";
import { requireAuth } from "../lib/auth.js";
import { annotateVerification } from "../lib/verify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBS_PATH = path.join(__dirname, "..", "data", "jobs.json");

const router = Router();
router.use(requireAuth); // every route below requires a logged-in user

// GET /api/saved-jobs — full job objects the current user has saved
router.get("/", async (req, res) => {
  const rows = db
    .prepare("SELECT job_id, saved_at FROM saved_jobs WHERE user_id = ? ORDER BY saved_at DESC")
    .all(req.user.id);

  const allJobs = annotateVerification(JSON.parse(await fs.readFile(JOBS_PATH, "utf-8")));
  const jobsById = new Map(allJobs.map((j) => [j.id, j]));

  const saved = rows
    .map((r) => jobsById.get(r.job_id))
    .filter(Boolean); // a saved job might no longer be in the current dataset

  res.json({ count: saved.length, jobs: saved });
});

// POST /api/saved-jobs  { jobId }
router.post("/", (req, res) => {
  const { jobId } = req.body || {};
  if (!jobId) return res.status(400).json({ error: "jobId is required" });

  db.prepare("INSERT OR IGNORE INTO saved_jobs (user_id, job_id) VALUES (?, ?)").run(
    req.user.id,
    jobId
  );
  res.status(201).json({ saved: true });
});

// DELETE /api/saved-jobs/:jobId
router.delete("/:jobId", (req, res) => {
  db.prepare("DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?").run(
    req.user.id,
    req.params.jobId
  );
  res.json({ saved: false });
});

export default router;
