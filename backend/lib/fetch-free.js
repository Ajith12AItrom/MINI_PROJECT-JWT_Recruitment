// Pulls live job listings directly from Remotive's free, public, no-key-needed
// API, normalizes them, and writes data/jobs.json — no Apify account required.
//
// This is the easiest way to get real data (with real, clickable apply links)
// without setting up Apify at all.
//
// Run with: npm run fetch-jobs-free

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import { normalizeRemotive, dedupe } from "./normalize.js";
import { annotateVerification } from "./verify.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "data", "jobs.json");

// Narrow results with query params if you want, e.g. &search=react
// Full docs: https://github.com/remotive-com/remote-jobs-api
const REMOTIVE_URL = "https://remotive.com/api/remote-jobs?category=software-dev";

async function main() {
  console.log("Fetching live jobs from Remotive (free, no API key needed)...");

  const res = await fetch(REMOTIVE_URL);
  if (!res.ok) {
    throw new Error(`Remotive API request failed: ${res.status} ${res.statusText}`);
  }
  const { jobs: rawJobs } = await res.json();

  const normalized = rawJobs.map(normalizeRemotive).filter((j) => j.title && j.company);
  const deduped = dedupe(normalized).sort(
    (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
  );

  // Keep it to a reasonable number for a demo/portfolio project.
  const trimmed = deduped.slice(0, 40);

  const annotated = annotateVerification(trimmed);
  const lowTrust = annotated.filter((j) => j.trustScore < 60);
  if (lowTrust.length > 0) {
    console.warn(`\n${lowTrust.length} listing(s) scored below 60 trust:`);
    for (const j of lowTrust) {
      console.warn(`  - [${j.trustScore}] "${j.title}" @ ${j.company} — ${j.flags.join(", ")}`);
    }
  }

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(trimmed, null, 2));
  console.log(`\nWrote ${trimmed.length} real, live jobs (with real apply links) to ${OUTPUT_PATH}`);
  console.log("Restart the backend (Ctrl+C, then npm start again) and refresh the frontend to see them.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
