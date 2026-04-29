import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '../components/Animations';
import { useContract } from '../hooks/useContract';

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

const LOGO_COLORS = [
  'linear-gradient(135deg,#7C3AED,#5B21B6)',
  'linear-gradient(135deg,#06B6D4,#0891B2)',
  'linear-gradient(135deg,#7C3AED,#06B6D4)',
  'linear-gradient(135deg,#8B5CF6,#EC4899)',
  'linear-gradient(135deg,#10B981,#059669)',
];



function JobCard({ job, index }) {
  const gradient = LOGO_COLORS[index % LOGO_COLORS.length];

  return (
    <div className="card" id={`job-card-${job.id}`}>
      <div className="job-card-header">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1 }}>
          <div
            className="job-card-company-logo"
            style={{ background: gradient }}
          >
            {getCompanyInitials(job.company)}
          </div>
          <div>
            <div className="job-card-title">{job.title}</div>
            <div className="job-card-company">{job.company}</div>
          </div>
        </div>
      </div>

      <div className="job-card-tags">
        <span className="badge badge-confidential">Salary: Confidential</span>
        <span className="badge badge-violet">{job.jobType}</span>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--white-70)', border: '1px solid var(--border)' }}>
          📍 {job.location}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--white-50)' }}>
          {job.applicationCount} applicants · {timeAgo(job.createdAt)}
        </div>
        <Link
          to={`/apply/${job.id}`}
          id={`apply-btn-${job.id}`}
          className="btn btn-primary btn-sm"
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
    <div className="page-wrapper">
      <div className="container">
        <FadeIn>
          <div className="job-board-header">
            <span className="section-label">Open Positions</span>
            <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '0.5rem' }}>
              Browse Jobs — <span className="gradient-text">All Salaries Private</span>
            </h1>
            <p style={{ color: 'var(--white-70)' }}>
              Every listing uses FHE encryption. Neither salary is ever visible on-chain.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <input
              id="job-search"
              type="text"
              className="form-input"
              placeholder="Search by title or company..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 2 }}
            />
            <select
              id="filter-job-type"
              className="form-input"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              {jobTypes.map(t => <option key={t}>{t}</option>)}
            </select>
            <select
              id="filter-location"
              className="form-input"
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
            >
              {locations.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </FadeIn>

        {loading ? (
          <div className="flex-center" style={{ minHeight: 300 }}>
            <div className="tx-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No jobs match your filters</h3>
            <p>Try clearing the filters or check back later.</p>
          </div>
        ) : (
          <StaggerContainer className="jobs-grid">
            {filtered.map((job, i) => (
              <StaggerItem key={job.id}>
                <JobCard job={job} index={i} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: 'var(--white-50)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Are you hiring? Post your job confidentially.
          </p>
          <Link to="/post-job" id="job-board-post-btn" className="btn btn-primary">
            Post a Job →
          </Link>
        </div>
      </div>
    </div>
  );
}
