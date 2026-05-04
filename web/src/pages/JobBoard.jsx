import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { useContract } from '../hooks/useContract';
import { MapPin, Briefcase, Search, Lock, Users, Clock, Coins, Wifi, Star, XCircle, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

function timeAgo(timestamp) {
  const diff = Math.floor((Date.now() / 1000) - timestamp);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getCompanyInitials(name) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function ReviewBadge({ reviewInfo }) {
  if (!reviewInfo || reviewInfo.reviewCount === 0) return null;

  const avg = reviewInfo.revealedAvg || 0;
  const count = reviewInfo.reviewCount;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 rounded border border-yellow-500/20 text-[10px] font-mono font-bold text-yellow-700 uppercase tracking-widest shadow-recessed">
      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
      {avg > 0 ? `${avg}/5` : '-'} · {count} {count === 1 ? 'review' : 'reviews'}
    </span>
  );
}

function JobCard({ job, reviewInfo, hasApplied }) {
  const hasLogo = job.logoUrl && job.logoUrl.trim().length > 0;
  const bountyPool = job.bountyPool ? (Number(job.bountyPool) / 1e6).toFixed(0) : '0';
  const bountyPerUnlock = job.bountyPerUnlock ? (Number(job.bountyPerUnlock) / 1e6).toFixed(0) : '0';
  const isClosed = !job.isActive;

  return (
    <div className={`card group ${isClosed ? 'opacity-70' : ''}`} id={`job-card-${job.id}`}>
      <div className="absolute top-4 left-4 card-screw" />
      <div className="absolute top-4 right-4 card-screw" />
      
      {/* Closed Badge */}
      {isClosed && (
        <div className="absolute top-3 right-12 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 rounded border border-red-500/30 text-[10px] font-mono font-bold text-red-600 uppercase tracking-widest shadow-recessed">
            <XCircle className="w-3 h-3" /> Closed
          </span>
        </div>
      )}

      {/* Header: Logo + Title + Company */}
      <div className="flex gap-4 items-start mb-4 border-b border-ink/10 pb-4">
        <div className="w-12 h-12 shrink-0 rounded-lg bg-chassis border border-white/40 shadow-floating flex items-center justify-center overflow-hidden">
          {hasLogo ? (
            <img
              src={job.logoUrl}
              alt={`${job.company} logo`}
              className="w-full h-full object-cover rounded-lg"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <span
            className="font-sans font-bold text-xl text-ink"
            style={{ display: hasLogo ? 'none' : 'flex' }}
          >
            {getCompanyInitials(job.company)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-sans font-bold text-lg text-ink leading-tight mb-1 truncate">{job.title}</h3>
          <div className="font-mono text-xs text-ink-muted uppercase tracking-wider">{job.company}</div>
        </div>
      </div>

      {/* Description */}
      {job.description && (
        <p className="text-sm text-ink-muted mb-4 line-clamp-2 leading-relaxed">
          {job.description}
        </p>
      )}

      {/* Tags Row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/20 rounded border border-accent/30 text-[10px] font-mono font-bold text-ink uppercase tracking-widest shadow-recessed">
          <Lock className="w-3.5 h-3.5 text-ink bg-accent rounded-sm shadow-sharp p-[1px]" /> Salary: Encrypted
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded border border-white/20 text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest shadow-recessed">
          <Briefcase className="w-3 h-3 text-ink-muted" /> {job.jobType}
        </span>
        <ReviewBadge reviewInfo={reviewInfo} />
      </div>

      {/* Location & Bounty */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded border border-white/20 text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest shadow-recessed">
          <MapPin className="w-3 h-3 text-ink-muted" /> {job.location}
        </span>
        {parseFloat(bountyPool) > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded border border-green-500/20 text-[10px] font-mono font-bold text-green-700 uppercase tracking-widest shadow-recessed">
            <Coins className="w-3 h-3" /> {bountyPool} <span className="normal-case">cUSDC</span> Pool
            {parseFloat(bountyPerUnlock) > 0 && <span className="text-green-600/60 ml-0.5">({bountyPerUnlock}/interview)</span>}
          </span>
        )}
      </div>

      {/* Footer: Stats + Apply Button */}
      <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg border border-ink/5">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ink-muted uppercase tracking-widest">
            <Users className="w-3 h-3" /> {job.applicationCount} Applicants
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ink-muted uppercase tracking-widest">
            <Clock className="w-3 h-3" /> {timeAgo(job.createdAt)}
          </span>
        </div>
        {isClosed ? (
          <span className="btn btn-secondary px-4 py-2 text-xs h-10 opacity-60 cursor-not-allowed">
            Closed
          </span>
        ) : hasApplied ? (
          <Link
            to="/dashboard/candidate"
            id={`applied-btn-${job.id}`}
            className="btn btn-secondary px-4 py-2 text-xs h-10 shadow-recessed text-green-700 border-green-500/30"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Applied
          </Link>
        ) : (
          <Link
            to={`/apply/${job.id}`}
            id={`apply-btn-${job.id}`}
            className="btn btn-primary px-4 py-2 text-xs h-10 shadow-floating"
          >
            Apply Now
          </Link>
        )}
      </div>
    </div>
  );
}

export default function JobBoard() {
  const { getAllJobs, getCompanyReviewInfo, checkIfApplied, account, isConnected } = useContract();
  const [jobs, setJobs] = useState([]);
  const [reviewMap, setReviewMap] = useState({});
  const [appliedMap, setAppliedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 9;

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const allJobs = await getAllJobs();
        // Sort: active first, then by createdAt descending
        allJobs.sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return b.createdAt - a.createdAt;
        });
        setJobs(allJobs);

        // Fetch review info for unique employers
        const uniqueEmployers = [...new Set(allJobs.map(j => j.employer))];
        const reviews = {};
        await Promise.all(
          uniqueEmployers.map(async (employer) => {
            try {
              reviews[employer] = await getCompanyReviewInfo(employer);
            } catch {
              reviews[employer] = { reviewCount: 0, revealedAvg: 0 };
            }
          })
        );
        setReviewMap(reviews);

        // Check which jobs the current user has applied to
        if (account) {
          const applied = {};
          await Promise.all(
            allJobs.map(async (job) => {
              try {
                applied[job.id] = await checkIfApplied(account, job.id);
              } catch {
                applied[job.id] = false;
              }
            })
          );
          setAppliedMap(applied);
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [getAllJobs, getCompanyReviewInfo, checkIfApplied, account]);

  const jobTypes = ['All', ...new Set(jobs.map(j => j.jobType))];
  const locations = ['All', ...new Set(jobs.map(j => j.location))];

  const filtered = jobs.filter(j => {
    const matchType = filterType === 'All' || j.jobType === filterType;
    const matchLoc = filterLocation === 'All' || j.location === filterLocation;
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || (filterStatus === 'Active' && j.isActive) || (filterStatus === 'Closed' && !j.isActive);
    return matchType && matchLoc && matchSearch && matchStatus;
  });

  const activeCount = jobs.filter(j => j.isActive).length;
  const closedCount = jobs.filter(j => !j.isActive).length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterLocation, filterStatus, search]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / JOBS_PER_PAGE);
  const paginatedJobs = filtered.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE
  );

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-[72rem] mx-auto px-6 md:px-12">
        <FadeIn>
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-chassis shadow-recessed rounded-full mb-6 border border-white/40">
              <span className="led led-green" />
              <span className="font-mono text-xs font-bold text-ink-muted uppercase tracking-widest">Job Board</span>
            </div>
            <h1 className="font-sans font-extrabold text-4xl md:text-5xl text-ink tracking-tight mb-4 drop-shadow-[0_1px_1px_#ffffff]">
              Browse Opportunities<br/>
              <span className="inline-block mt-2 px-4 py-1 bg-accent text-ink rounded-md shadow-floating border border-ink/10">Salaries Stay Private</span>
            </h1>
            <p className="text-ink-muted text-lg max-w-2xl">
              Every listing uses fully homomorphic encryption. Neither the employer's budget nor your expectation is ever visible onchain.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="bg-chassis p-4 rounded-xl shadow-card border border-white/40 mb-12 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
              <input
                id="job-search"
                type="text"
                className="form-input w-full pl-11 py-3 text-sm"
                placeholder="Search by title or company..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-4 flex-wrap">
              <select
                id="filter-job-type"
                className="form-input py-3 text-sm cursor-pointer appearance-none"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                {jobTypes.map(t => <option key={t}>{t === 'All' ? 'TYPE: ALL' : t}</option>)}
              </select>
              <select
                id="filter-location"
                className="form-input py-3 text-sm cursor-pointer appearance-none"
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
              >
                {locations.map(l => <option key={l}>{l === 'All' ? 'LOC: ALL' : l}</option>)}
              </select>
              <select
                id="filter-status"
                className="form-input py-3 text-sm cursor-pointer appearance-none"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="All">STATUS: ALL ({jobs.length})</option>
                <option value="Active">ACTIVE ({activeCount})</option>
                <option value="Closed">CLOSED ({closedCount})</option>
              </select>
            </div>
          </div>
        </FadeIn>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-ink-muted">
            <span className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4 shadow-glow"></span>
            <span className="font-mono text-xs uppercase tracking-widest font-bold">Loading jobs...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16 bg-muted/20">
            <Search className="w-12 h-12 text-ink-muted mx-auto mb-4" />
            <h3 className="font-sans font-bold text-xl text-ink mb-2">No jobs found</h3>
            <p className="text-ink-muted text-sm font-mono uppercase tracking-widest">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedJobs.map((job) => (
              <StaggerItem key={job.id}>
                <JobCard job={job} reviewInfo={reviewMap[job.employer]} hasApplied={appliedMap[job.id]} />
              </StaggerItem>
            ))}
          </StaggerContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12">
              <button
                className="btn btn-ghost h-10 w-10 p-0 disabled:opacity-30"
                onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`h-10 w-10 rounded-lg font-mono text-sm font-bold transition-all ${
                    page === currentPage
                      ? 'bg-accent text-ink shadow-floating border border-ink/10'
                      : 'bg-chassis text-ink-muted shadow-recessed border border-white/20 hover:shadow-card'
                  }`}
                  onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  {page}
                </button>
              ))}

              <button
                className="btn btn-ghost h-10 w-10 p-0 disabled:opacity-30"
                onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <span className="ml-4 font-mono text-xs text-ink-muted uppercase tracking-widest">
                {filtered.length} job{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          </>
        )}

        <div className="text-center mt-20">
          <p className="text-ink-muted font-mono text-xs uppercase tracking-widest font-bold mb-4">
            Looking to hire? Post a job listing
          </p>
          <Link to="/post-job" id="job-board-post-btn" className="btn btn-secondary shadow-floating">
            Post a Job
          </Link>
        </div>
      </div>
    </div>
  );
}
