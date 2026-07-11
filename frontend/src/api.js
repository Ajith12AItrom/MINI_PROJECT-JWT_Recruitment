const BASE = "/api/jobs";

import { withAuth } from "./auth.js";

export async function fetchSavedJobs() {
  const res = await fetch("/api/saved-jobs", withAuth());
  if (!res.ok) throw new Error("Failed to fetch saved jobs");
  return res.json();
}

export async function saveJob(jobId) {
  const res = await fetch(
    "/api/saved-jobs",
    withAuth({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    })
  );
  if (!res.ok) throw new Error("Failed to save job");
  return res.json();
}

export async function unsaveJob(jobId) {
  const res = await fetch(`/api/saved-jobs/${encodeURIComponent(jobId)}`, withAuth({ method: "DELETE" }));
  if (!res.ok) throw new Error("Failed to unsave job");
  return res.json();
}

export async function fetchJobs({
  search = "",
  tag = "",
  source = "",
  sort = "newest",
  verifiedOnly = false,
} = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (tag) params.set("tag", tag);
  if (source) params.set("source", source);
  if (sort) params.set("sort", sort);
  if (verifiedOnly) params.set("verifiedOnly", "true");

  const res = await fetch(`${BASE}?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchAllowlist() {
  const res = await fetch(`${BASE}/allowlist`);
  if (!res.ok) throw new Error("Failed to fetch allowlist");
  return res.json();
}

export async function fetchTags() {
  const res = await fetch(`${BASE}/tags`);
  if (!res.ok) throw new Error("Failed to fetch tags");
  return res.json();
}

export async function fetchSources() {
  const res = await fetch(`${BASE}/sources`);
  if (!res.ok) throw new Error("Failed to fetch sources");
  return res.json();
}
