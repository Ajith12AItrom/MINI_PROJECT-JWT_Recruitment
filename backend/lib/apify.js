// Pulls the latest dataset items from your configured Apify Actors,
// normalizes them, de-dupes across sources, and writes the result to
// data/jobs.json — which server.js serves from.
//
// Run manually with: npm run fetch-jobs
// In production, put this behind a cron job / scheduled Actor run.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { NORMALIZERS, dedupe } from "./normalize.js";
import { annotateVerification } from "./verify.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "data", "jobs.json");

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTORS = (process.env.APIFY_ACTORS || "")
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);

// Which normalizer to use per Actor. Extend this as you add more sources.
function pickNormalizer(actorId) {
  if (actorId.includes("remoteok")) return NORMALIZERS.remoteok;
  if (actorId.includes("remotive")) return NORMALIZERS.remotive;
  if (actorId.includes("remote-com")) return NORMALIZERS.remotecom;
  return null;
}

async function runActorAndGetItems(actorId) {
  // Apify's "run Actor synchronously and get dataset items" endpoint.
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(
    actorId
  )}/run-sync-get-dataset-items?token=${APIFY_TOKEN}`;

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Apify Actor ${actorId} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  if (!APIFY_TOKEN) {
    console.error(
      "Missing APIFY_TOKEN. Copy .env.example to .env and add your token from Apify Console."
    );
    process.exit(1);
  }
  if (ACTORS.length === 0) {
    console.error("No Actors configured. Set APIFY_ACTORS in .env (comma-separated).");
    process.exit(1);
  }

  const allJobs = [];

  for (const actorId of ACTORS) {
    const normalize = pickNormalizer(actorId);
    if (!normalize) {
      console.warn(`No normalizer mapped for "${actorId}" — skipping.`);
      continue;
    }
    try {
      console.log(`Fetching from ${actorId}...`);
      const items = await runActorAndGetItems(actorId);
      const normalized = items.map(normalize).filter((j) => j.title && j.company);
      console.log(`  -> ${normalized.length} jobs`);
      allJobs.push(...normalized);
    } catch (err) {
      console.error(`  ! ${err.message}`);
    }
  }

  const deduped = dedupe(allJobs).sort(
    (a, b) => new Date(b.postedAt) - new Date(a.postedAt)
  );

  // Verification is also (re)computed at read time in routes/jobs.js, but
  // we check it here too so you see warnings immediately after a fetch.
  const annotated = annotateVerification(deduped);
  const lowTrust = annotated.filter((j) => j.trustScore < 60);
  if (lowTrust.length > 0) {
    console.warn(`\n${lowTrust.length} listing(s) scored below 60 trust — review before publishing:`);
    for (const j of lowTrust) {
      console.warn(`  - [${j.trustScore}] "${j.title}" @ ${j.company} — ${j.flags.join(", ")}`);
    }
  }
  const unverifiedCount = annotated.filter((j) => !j.verified).length;
  console.log(
    `\n${annotated.length - unverifiedCount} of ${annotated.length} jobs are from allowlisted companies.`
  );
  console.log(
    `Add trusted companies to backend/data/company-allowlist.json to mark more as verified.`
  );

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(deduped, null, 2));
  console.log(`Wrote ${deduped.length} jobs to ${OUTPUT_PATH}`);
}

main();
