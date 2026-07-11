import { useState } from "react";

const SOURCE_LABELS = {
  remoteok: "REMOTE OK",
  remotive: "REMOTIVE",
  remotecom: "REMOTE.CO",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "just posted";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatSalary(job) {
  if (!job.salaryMin && !job.salaryMax) return null;
  const fmt = (n) => `${Math.round(n / 1000)}k`;
  const cur = job.currency || "";
  if (job.salaryMin && job.salaryMax) {
    return `${cur} ${fmt(job.salaryMin)}–${fmt(job.salaryMax)}`;
  }
  return `${cur} ${fmt(job.salaryMin || job.salaryMax)}`;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Simple deterministic color pick so the same company always gets the same
// fallback color, without needing to store one.
const AVATAR_COLORS = ["#f2a93b", "#4fb0a5", "#e2574c", "#8b7fd6", "#5da8e0"];
function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function CompanyAvatar({ company, logo }) {
  const [failed, setFailed] = useState(false);

  if (logo && !failed) {
    return (
      <img
        className="company-avatar"
        src={logo}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="company-avatar company-avatar--fallback" style={{ background: colorFor(company) }}>
      {initials(company)}
    </span>
  );
}

export default function JobRow({ job, index, onTagClick, isSaved, onToggleSave, isAuthed }) {
  const salary = formatSalary(job);
  const isLowTrust = job.trustScore < 60;

  return (
    <a
      className={`job-row ${isLowTrust ? "job-row--warning" : ""}`}
      href={job.url}
      target="_blank"
      rel="noreferrer"
      style={{ animationDelay: `${Math.min(index * 28, 400)}ms` }}
      title={isLowTrust ? `Flagged: ${job.flags.join(", ")}` : undefined}
    >
      <span className="job-row__index">{String(index + 1).padStart(2, "0")}</span>

      <span className="job-row__main">
        <CompanyAvatar company={job.company} logo={job.companyLogo} />
        <span className="job-row__main-text">
          <span className="job-row__title">
            {job.title}
            {job.verified && <span className="verified-badge" title="Certified company">✓ verified</span>}
            {isLowTrust && <span className="warning-badge" title={job.flags.join(", ")}>⚠ review</span>}
          </span>
          <span className="job-row__company">{job.company}</span>
        </span>
      </span>

      <span className="job-row__tags">
        {job.tags.slice(0, 3).map((t) => (
          <button
            key={t}
            className="tag-chip"
            onClick={(e) => {
              e.preventDefault();
              onTagClick(t);
            }}
          >
            {t}
          </button>
        ))}
      </span>

      <span className="job-row__location">{job.location}</span>

      {salary && <span className="job-row__salary">{salary}</span>}

      <span className="job-row__meta">
        <span className={`source-dot source-dot--${job.source}`} />
        {SOURCE_LABELS[job.source] || job.source}
      </span>

      <span className="job-row__time">{timeAgo(job.postedAt)}</span>

      <button
        className={`save-button ${isSaved ? "save-button--saved" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          onToggleSave(job.id);
        }}
        title={isAuthed ? (isSaved ? "Remove from saved jobs" : "Save this job") : "Log in to save jobs"}
      >
        {isSaved ? "★" : "☆"}
      </button>
    </a>
  );
}
