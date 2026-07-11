import { Router } from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { annotateVerification, getAllowlist } from "../lib/verify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, "..", "data", "jobs.json");

const router = Router();

async function loadJobs() {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  const jobs = JSON.parse(raw);
  return annotateVerification(jobs);
}

// GET /api/jobs?search=&tag=&source=&sort=newest&verifiedOnly=true&minTrust=0
router.get("/", async (req, res) => {
  try {
    let jobs = await loadJobs();
    const { search, tag, source, sort, verifiedOnly, minTrust } = req.query;

    if (search) {
      const q = String(search).toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q)
      );
    }

    if (tag) {
      const q = String(tag).toLowerCase();
      jobs = jobs.filter((j) => j.tags.includes(q));
    }

    if (source) {
      jobs = jobs.filter((j) => j.source === source);
    }

    if (verifiedOnly === "true") {
      jobs = jobs.filter((j) => j.verified);
    }

    if (minTrust) {
      const threshold = Number(minTrust);
      if (!Number.isNaN(threshold)) {
        jobs = jobs.filter((j) => j.trustScore >= threshold);
      }
    }

    if (sort === "oldest") {
      jobs = [...jobs].sort((a, b) => new Date(a.postedAt) - new Date(b.postedAt));
    } else {
      // default: newest first
      jobs = [...jobs].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    }

    res.json({ count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ error: "Failed to load jobs", detail: err.message });
  }
});

// GET /api/jobs/tags — all distinct tags, for building filter UI
router.get("/tags", async (req, res) => {
  const jobs = await loadJobs();
  const tags = [...new Set(jobs.flatMap((j) => j.tags))].sort();
  res.json({ tags });
});

// GET /api/jobs/sources — distinct sources + counts
router.get("/sources", async (req, res) => {
  const jobs = await loadJobs();
  const counts = jobs.reduce((acc, j) => {
    acc[j.source] = (acc[j.source] || 0) + 1;
    return acc;
  }, {});
  res.json({ sources: counts });
});

// GET /api/jobs/allowlist — companies certified via the manual allowlist
router.get("/allowlist", async (req, res) => {
  res.json({ companies: getAllowlist() });
});

export default router;
