import { useEffect, useState, useCallback } from "react";
import { fetchJobs, fetchTags, fetchSources, fetchSavedJobs, saveJob, unsaveJob } from "./api.js";
import { getStoredUser, logout } from "./auth.js";
import JobRow from "./components/JobRow.jsx";
import FilterBar from "./components/FilterBar.jsx";
import AuthModal from "./components/AuthModal.jsx";

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [sourceCounts, setSourceCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState("newest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  const [user, setUser] = useState(getStoredUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (savedOnly) {
        const savedRes = await fetchSavedJobs();
        setJobs(savedRes.jobs);
        setSourceCounts({}); // saved view doesn't need the source pill counts
      } else {
        const [jobsRes, tagsRes, sourcesRes] = await Promise.all([
          fetchJobs({ search, tag, source, sort, verifiedOnly }),
          fetchTags(),
          fetchSources(),
        ]);
        setJobs(jobsRes.jobs);
        setAllTags(tagsRes.tags);
        setSourceCounts(sourcesRes.sources);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, tag, source, sort, verifiedOnly, savedOnly]);

  useEffect(() => {
    const t = setTimeout(load, 200); // light debounce on search typing
    return () => clearTimeout(t);
  }, [load]);

  // Keep track of which job IDs are saved, so the star icon reflects state
  // even outside the "Saved only" view.
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }
    fetchSavedJobs()
      .then((res) => setSavedIds(new Set(res.jobs.map((j) => j.id))))
      .catch(() => {});
  }, [user, jobs]);

  async function handleToggleSave(jobId) {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    const isSaved = savedIds.has(jobId);
    try {
      if (isSaved) {
        await unsaveJob(jobId);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        if (savedOnly) setJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        await saveJob(jobId);
        setSavedIds((prev) => new Set(prev).add(jobId));
      }
    } catch {
      // Non-critical UI action — fail silently rather than interrupting the user.
    }
  }

  function handleAuthenticated(newUser) {
    setUser(newUser);
    setShowAuthModal(false);
  }

  function handleLogout() {
    logout();
    setUser(null);
    setSavedOnly(false);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="header__mark">OUTBOUND</span>
          <span className="header__tagline">every remote board, one feed</span>
        </div>

        <div className="header__auth">
          <div className="header__stats">
            <span>{jobs.length} listings</span>
            <span className="header__dot">·</span>
            <span>{Object.keys(sourceCounts).length} sources</span>
          </div>

          {user ? (
            <>
              <span className="header__auth-email">{user.email}</span>
              <button
                className="header__auth-button"
                onClick={() => setSavedOnly((v) => !v)}
              >
                {savedOnly ? "All jobs" : "★ Saved"}
              </button>
              <button className="header__auth-button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <button className="header__auth-button" onClick={() => setShowAuthModal(true)}>
              Log in / Sign up
            </button>
          )}
        </div>
      </header>

      {!savedOnly && (
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          tag={tag}
          onTagChange={setTag}
          allTags={allTags}
          sourceCounts={sourceCounts}
          activeSource={source}
          onSourceChange={setSource}
          sort={sort}
          onSortChange={setSort}
          verifiedOnly={verifiedOnly}
          onVerifiedOnlyChange={setVerifiedOnly}
        />
      )}

      <div className="board">
        <div className="board__columns">
          <span>#</span>
          <span>Role</span>
          <span>Tags</span>
          <span>Location</span>
          <span>Salary</span>
          <span>Source</span>
          <span>Posted</span>
          <span />
        </div>

        {loading && <div className="board__state">Loading listings…</div>}
        {error && <div className="board__state board__state--error">{error}</div>}
        {!loading && !error && jobs.length === 0 && savedOnly && (
          <div className="board__state">No saved jobs yet — click the ☆ on any listing.</div>
        )}
        {!loading && !error && jobs.length === 0 && !savedOnly && (
          <div className="board__state">No jobs match those filters. Try clearing one.</div>
        )}

        {!loading &&
          !error &&
          jobs.map((job, i) => (
            <JobRow
              key={job.id}
              job={job}
              index={i}
              onTagClick={setTag}
              isSaved={savedIds.has(job.id)}
              onToggleSave={handleToggleSave}
              isAuthed={!!user}
            />
          ))}
      </div>

      <footer className="footer">
        Data aggregated from Remote OK, Remotive, and Remote.co via Apify Actors.
      </footer>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}
