export default function FilterBar({
  search,
  onSearchChange,
  tag,
  onTagChange,
  allTags,
  sourceCounts,
  activeSource,
  onSourceChange,
  sort,
  onSortChange,
  verifiedOnly,
  onVerifiedOnlyChange,
}) {
  return (
    <div className="filter-bar">
      <input
        className="filter-search"
        type="text"
        placeholder="Search title or company…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <select className="filter-select" value={tag} onChange={(e) => onTagChange(e.target.value)}>
        <option value="">All tags</option>
        {allTags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <div className="filter-sources">
        <button
          className={`source-pill ${activeSource === "" ? "source-pill--active" : ""}`}
          onClick={() => onSourceChange("")}
        >
          All ({Object.values(sourceCounts).reduce((a, b) => a + b, 0)})
        </button>
        {Object.entries(sourceCounts).map(([source, count]) => (
          <button
            key={source}
            className={`source-pill ${activeSource === source ? "source-pill--active" : ""}`}
            onClick={() => onSourceChange(source)}
          >
            {source} ({count})
          </button>
        ))}
      </div>

      <select className="filter-select" value={sort} onChange={(e) => onSortChange(e.target.value)}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>

      <button
        className={`verified-toggle ${verifiedOnly ? "verified-toggle--active" : ""}`}
        onClick={() => onVerifiedOnlyChange(!verifiedOnly)}
        title="Only show jobs from companies on your certified allowlist"
      >
        ✓ Verified companies only
      </button>
    </div>
  );
}
