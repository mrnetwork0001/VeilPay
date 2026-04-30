import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { useContract } from '../hooks/useContract';
import { MapPin, Briefcase, Search, Lock, Users, Clock } from 'lucide-react';

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

function JobCard({ job }) {
  return (
    <div className="card group" id={`job-card-${job.id}`}>
      <div className="absolute top-4 left-4 card-screw" />
      <div className="absolute top-4 right-4 card-screw" />
      
      <div className="flex gap-4 items-start mb-6 border-b border-ink/10 pb-4">
        <div className="w-12 h-12 shrink-0 rounded-lg bg-chassis border border-white/40 shadow-floating flex items-center justify-center font-sans font-bold text-xl text-ink">
          {getCompanyInitials(job.company)}
        </div>
        <div>
          <h3 className="font-sans font-bold text-lg text-ink leading-tight mb-1">{job.title}</h3>
          <div className="font-mono text-xs text-ink-muted uppercase tracking-wider">{job.company}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded border border-white/20 text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest shadow-recessed">
          <Lock className="w-3.5 h-3.5 text-ink bg-accent rounded-sm shadow-sharp p-[1px]" /> Salary: Encrypted
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded border border-white/20 text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest shadow-recessed">
          <Briefcase className="w-3 h-3 text-ink-muted" /> {job.jobType}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 rounded border border-white/20 text-[10px] font-mono font-bold text-ink-muted uppercase tracking-widest shadow-recessed">
          <MapPin className="w-3 h-3 text-ink-muted" /> {job.location}
        </span>
      </div>

      <div className="flex justify-between items-center bg-muted/20 p-3 rounded-lg border border-ink/5">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ink-muted uppercase tracking-widest">
            <Users className="w-3 h-3" /> {job.applicationCount} Applicants
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-ink-muted uppercase tracking-widest">
            <Clock className="w-3 h-3" /> {timeAgo(job.createdAt)}
          </span>
        </div>
        <Link
          to={`/apply/${job.id}`}
          id={`apply-btn-${job.id}`}
          className="btn btn-primary px-4 py-2 text-xs h-10 shadow-floating"
        >
          Apply Now
        </Link>
      </div>
    </div>
  );
}

export default function JobBoard() {
  const { getActiveJobs } = useContract();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const liveJobs = await getActiveJobs();
        setJobs(liveJobs);
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, [getActiveJobs]);

  const jobTypes = ['All', ...new Set(jobs.map(j => j.jobType))];
  const locations = ['All', ...new Set(jobs.map(j => j.location))];

  const filtered = jobs.filter(j => {
    const matchType = filterType === 'All' || j.jobType === filterType;
    const matchLoc = filterLocation === 'All' || j.location === filterLocation;
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    return matchType && matchLoc && matchSearch;
  });

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
              Every listing uses fully homomorphic encryption. Neither the employer's budget nor your expectation is ever visible on-chain.
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
            <div className="flex gap-4">
              <select
                id="filter-job-type"
                className="form-input py-3 text-sm cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%234a5568\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.5em_1.5em] appearance-none"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                {jobTypes.map(t => <option key={t}>{t === 'All' ? 'TYPE: ALL' : t}</option>)}
              </select>
              <select
                id="filter-location"
                className="form-input py-3 text-sm cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%234a5568\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'m6 8 4 4 4-4\'/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.5em_1.5em] appearance-none"
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
              >
                {locations.map(l => <option key={l}>{l === 'All' ? 'LOC: ALL' : l}</option>)}
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
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((job) => (
              <StaggerItem key={job.id}>
                <JobCard job={job} />
              </StaggerItem>
            ))}
          </StaggerContainer>
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
