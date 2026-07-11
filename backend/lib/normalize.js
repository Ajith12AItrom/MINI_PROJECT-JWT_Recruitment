/**
 * Every job source returns different field names and shapes. This module
 * maps each source's raw output into one common schema so the rest of the
 * app never has to think about where a job came from.
 *
 * Normalized shape:
 * {
 *   id: string            (stable id, prefixed by source so ids never collide)
 *   title: string
 *   company: string
 *   companyLogo: string|null
 *   location: string      ("Remote" or a region like "Remote (US)")
 *   tags: string[]         (lowercase, deduped)
 *   salaryMin: number|null
 *   salaryMax: number|null
 *   currency: string|null
 *   url: string
 *   postedAt: string       (ISO date)
 *   source: string         (e.g. "remoteok", "remotive", "remotecom")
 * }
 */

function cleanTags(rawTags = []) {
  const tags = Array.isArray(rawTags) ? rawTags : String(rawTags || "").split(",");
  return [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
}

function toIso(dateLike) {
  if (!dateLike) return new Date().toISOString();
  const d = new Date(dateLike);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// --- Per-source mappers -----------------------------------------------

export function normalizeRemoteOk(raw) {
  return {
    id: `remoteok-${raw.id ?? raw.slug ?? raw.url}`,
    title: raw.position || raw.title,
    company: raw.company,
    companyLogo: raw.company_logo || raw.logo || null,
    location: raw.location || "Remote",
    tags: cleanTags(raw.tags),
    salaryMin: raw.salary_min ?? null,
    salaryMax: raw.salary_max ?? null,
    currency: raw.salary_min ? "USD" : null,
    url: raw.url || raw.apply_url,
    postedAt: toIso(raw.date),
    source: "remoteok",
  };
}

export function normalizeRemotive(raw) {
  return {
    id: `remotive-${raw.id}`,
    title: raw.title,
    company: raw.company_name,
    companyLogo: raw.company_logo || raw.company_logo_url || null,
    location: raw.candidate_required_location || "Remote",
    tags: cleanTags(raw.tags || raw.category),
    salaryMin: null,
    salaryMax: null,
    currency: null,
    url: raw.url,
    postedAt: toIso(raw.publication_date),
    source: "remotive",
  };
}

export function normalizeRemoteCom(raw) {
  return {
    id: `remotecom-${raw.id ?? raw.jobUrl}`,
    title: raw.jobTitle || raw.title,
    company: raw.companyName || raw.company,
    companyLogo: raw.companyLogo || raw.logo || null,
    location: raw.location || "Remote",
    tags: cleanTags(raw.skills || raw.tags),
    salaryMin: raw.salaryMin ?? null,
    salaryMax: raw.salaryMax ?? null,
    currency: raw.currency ?? null,
    url: raw.jobUrl || raw.url,
    postedAt: toIso(raw.postedDate),
    source: "remotecom",
  };
}

// Map source key -> normalizer, so lib/apify.js can dispatch by Actor name.
export const NORMALIZERS = {
  remoteok: normalizeRemoteOk,
  remotive: normalizeRemotive,
  remotecom: normalizeRemoteCom,
};

/** De-duplicate jobs across sources by (title + company), case-insensitive. */
export function dedupe(jobs) {
  const seen = new Map();
  for (const job of jobs) {
    const key = `${job.title}::${job.company}`.toLowerCase();
    if (!seen.has(key)) seen.set(key, job);
  }
  return [...seen.values()];
}
