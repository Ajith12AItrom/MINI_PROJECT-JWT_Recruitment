/**
 * Job scam / fake-company protection.
 *
 * There is no reliable way to auto-confirm a company is "real" without a
 * paid verification API (e.g. company registries, Clearbit) or a manual
 * review process. So this module does two things, layered:
 *
 * 1. RED-FLAG SCORING (automatic): scans title/description/company/url for
 *    common scam patterns (upfront fees, "no interview", personal email
 *    domains, wire-transfer language, etc.) and produces a trustScore.
 *
 * 2. ALLOWLIST (manual, authoritative): companies you've personally vetted
 *    go in company-allowlist.json. A job from an allowlisted company is
 *    marked verified: true regardless of its trust score. Everything else
 *    is verified: false, however clean it scores — the allowlist is the
 *    only thing that gives a "certified" badge.
 *
 * This means: the UI's "Verified only" filter shows ONLY jobs from
 * companies you've explicitly added to the allowlist. The red-flag score
 * is a separate, softer signal to help you triage the rest.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = path.join(__dirname, "..", "data", "company-allowlist.json");

function loadAllowlist() {
  try {
    const raw = fs.readFileSync(ALLOWLIST_PATH, "utf-8");
    return new Set(JSON.parse(raw).map((c) => c.trim().toLowerCase()));
  } catch {
    return new Set();
  }
}

// Common scam-posting red flags. Each match subtracts from trustScore.
const RED_FLAGS = [
  { pattern: /\b(registration|processing|starter kit|training)\s+fee\b/i, weight: 40, label: "asks for upfront fee" },
  { pattern: /\bwire transfer\b/i, weight: 35, label: "mentions wire transfer" },
  { pattern: /\bno interview (needed|required)\b/i, weight: 30, label: "no interview required" },
  { pattern: /\bsend (your )?(bank|routing) (details|number)\b/i, weight: 45, label: "asks for bank details" },
  { pattern: /\bWhatsApp (only|interview)\b/i, weight: 20, label: "WhatsApp-only contact" },
  { pattern: /\$\d{3,}\s*\/\s*(day|hour)\b/i, weight: 15, label: "unusually high pay for scope" },
  { pattern: /\bgmail\.com|yahoo\.com|hotmail\.com\b/i, weight: 20, label: "contact uses a personal email domain" },
  { pattern: /\bpay(check|ment) before (start|training)\b/i, weight: 40, label: "payment required before starting" },
];

function scoreListing(job) {
  const haystack = `${job.title} ${job.company} ${job.url} ${job.description || ""}`;
  let score = 100;
  const flags = [];

  for (const { pattern, weight, label } of RED_FLAGS) {
    if (pattern.test(haystack)) {
      score -= weight;
      flags.push(label);
    }
  }

  // No company URL / uses a generic job-board redirect only -> minor flag.
  if (!job.url || job.url.includes("bit.ly") || job.url.includes("tinyurl")) {
    score -= 15;
    flags.push("uses a shortened/generic link instead of a company page");
  }

  return { trustScore: Math.max(0, score), flags };
}

/**
 * Annotates each normalized job with:
 *   - verified: boolean   (true only if company is in the manual allowlist)
 *   - trustScore: number  (0-100, heuristic red-flag score)
 *   - flags: string[]     (reasons trustScore was reduced)
 */
export function annotateVerification(jobs) {
  const allowlist = loadAllowlist();
  return jobs.map((job) => {
    const { trustScore, flags } = scoreListing(job);
    const verified = allowlist.has(job.company.trim().toLowerCase());
    return { ...job, verified, trustScore, flags };
  });
}

export function getAllowlist() {
  return [...loadAllowlist()];
}
