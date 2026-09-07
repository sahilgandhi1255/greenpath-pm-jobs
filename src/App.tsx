import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Job, FilterState, JobStatus, MetricsStats } from './types/job';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { FilterBar } from './components/FilterBar';
import { JobTableView } from './components/JobTableView';
import { JobCardGrid } from './components/JobCardGrid';
import { JobDetailDrawer } from './components/JobDetailDrawer';
import { ApplicationTrackerModal } from './components/ApplicationTrackerModal';
import { Pagination } from './components/Pagination';
import { Toast } from './components/Toast';
import type { ToastProps } from './components/Toast';
import { Footer } from './components/Footer';

const STORAGE_KEYS = {
  BOOKMARKS: 'greenpath_pm_bookmarks_live',
  STATUSES: 'greenpath_pm_statuses_live',
  VIEW_MODE: 'greenpath_pm_view_mode_live',
};

const ITEMS_PER_PAGE = 20;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const INITIAL_FILTERS: FilterState = {
  searchQuery: '',
  roleCategory: 'all',
  source: 'all',
  location: 'all',
  workType: 'all',
  experienceLevel: 'all',
  status: 'all',
  remoteOnly: false,
  bookmarksOnly: false,
  featuredOnly: false,
  sortBy: 'newest',
};

export const App: React.FC = () => {
  // 1. Data & Persistence State (Starting clean with no demo data)
  const [rawJobs, setRawJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [toasts, setToasts] = useState<Omit<ToastProps, 'onClose'>[]>([]);

  // Load View Mode
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return saved === 'grid' ? 'grid' : 'table';
  });

  // Load Bookmarks (clean empty start)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Load Job Application Statuses (clean empty start)
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATUSES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Fetch dynamic scraped jobs from /data/jobs.json
  useEffect(() => {
    setIsLoading(true);
    fetch('/data/jobs.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch jobs feed');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setRawJobs(data);
        }
      })
      .catch((err) => {
        console.error('Error loading live jobs:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Auto-purge roles older than 30 days
  const jobs = useMemo(() => {
    const now = new Date().getTime();
    return rawJobs.filter((job) => {
      if (!job.datePosted) return true;
      const jobTime = new Date(job.datePosted).getTime();
      return (now - jobTime) <= THIRTY_DAYS_MS;
    });
  }, [rawJobs]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(Array.from(bookmarkedIds)));
  }, [bookmarkedIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(jobStatuses));
  }, [jobStatuses]);

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Toast Dispatcher Helper
  const addToast = useCallback((message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Toggle Bookmark
  const handleToggleBookmark = useCallback((job: Job, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(job.id)) {
        next.delete(job.id);
        addToast(`Removed "${job.title}" from saved jobs`, 'info');
      } else {
        next.add(job.id);
        addToast(`Saved "${job.title}" to bookmarks`, 'success');
      }
      return next;
    });
  }, [addToast]);

  // Copy Link
  const handleCopyLink = useCallback((job: Job, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(job.url);
      addToast(`Direct job link copied to clipboard`, 'success');
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = job.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      addToast(`Direct job link copied`, 'success');
    }
  }, [addToast]);

  // Manual Status Change
  const handleStatusChange = useCallback((jobId: string, status: JobStatus) => {
    setJobStatuses((prev) => ({
      ...prev,
      [jobId]: status,
    }));
    addToast(`Updated status to "${status}"`, 'success');
  }, [addToast]);

  // Automatic Apply Handler (Auto-sets status to "Applied" & opens source link)
  const handleApplyJob = useCallback((job: Job, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setJobStatuses((prev) => ({
      ...prev,
      [job.id]: 'Applied',
    }));
    addToast(`Applied to ${job.company}! Marked as "Applied"`, 'success');
    window.open(job.url, '_blank', 'noopener,noreferrer');
  }, [addToast]);

  const handleResetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    addToast(`All filters cleared`, 'info');
  }, [addToast]);

  // Export search and application data as JSON
  const handleExportData = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      activeRolesWindow: 'Last 30 Days',
      bookmarkedRoles: jobs.filter((j) => bookmarkedIds.has(j.id)),
      applicationStatuses: jobStatuses,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `greenpath-pm-jobs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Job intelligence data exported successfully', 'success');
  }, [jobs, bookmarkedIds, jobStatuses, addToast]);

  // Available unique cities
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.city) set.add(j.city);
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered & Sorted Jobs List
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchTitle = job.title.toLowerCase().includes(query);
        const matchCompany = job.company.toLowerCase().includes(query);
        const matchCity = job.city.toLowerCase().includes(query) || job.location.toLowerCase().includes(query);
        const matchTags = job.tags.some((t) => t.toLowerCase().includes(query));
        const matchSkills = job.keySkills?.some((s) => s.toLowerCase().includes(query));
        const matchDesc = job.descriptionSnippet.toLowerCase().includes(query);
        if (!matchTitle && !matchCompany && !matchCity && !matchTags && !matchSkills && !matchDesc) {
          return false;
        }
      }

      // Role Category
      if (filters.roleCategory !== 'all' && job.roleCategory !== filters.roleCategory) {
        return false;
      }

      // Portal Source
      if (filters.source !== 'all' && job.source !== filters.source) {
        return false;
      }

      // City / Location
      if (filters.location !== 'all' && job.city !== filters.location) {
        return false;
      }

      // Experience Level
      if (filters.experienceLevel !== 'all' && job.experienceLevel !== filters.experienceLevel) {
        return false;
      }

      // Status
      const jobStatus = jobStatuses[job.id] || 'New';
      if (filters.status !== 'all' && jobStatus !== filters.status) {
        return false;
      }

      // Remote Only
      if (filters.remoteOnly && job.workType !== 'Remote') {
        return false;
      }

      // Bookmarks Only
      if (filters.bookmarksOnly && !bookmarkedIds.has(job.id)) {
        return false;
      }

      // Featured / Hot Only
      if (filters.featuredOnly && !job.isFeatured && !job.isUrgent) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime();
      }
      if (filters.sortBy === 'company_asc') {
        return a.company.localeCompare(b.company);
      }
      if (filters.sortBy === 'experience_asc') {
        return a.experience.localeCompare(b.experience);
      }
      if (filters.sortBy === 'experience_desc') {
        return b.experience.localeCompare(a.experience);
      }
      if (filters.sortBy === 'salary_desc') {
        return (b.salary || '').localeCompare(a.salary || '');
      }
      return 0;
    });
  }, [jobs, filters, bookmarkedIds, jobStatuses]);

  // Paginated Slice (Maximum 20 jobs displayed per page)
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredJobs, currentPage]);

  // Compute Active Filter Count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.roleCategory !== 'all') count++;
    if (filters.source !== 'all') count++;
    if (filters.location !== 'all') count++;
    if (filters.experienceLevel !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.remoteOnly) count++;
    if (filters.bookmarksOnly) count++;
    if (filters.featuredOnly) count++;
    if (filters.sortBy !== 'newest') count++;
    return count;
  }, [filters]);

  // Status breakdown counts
  const statusCounts: Record<JobStatus, number> = useMemo(() => {
    const counts: Record<JobStatus, number> = {
      New: 0,
      Saved: 0,
      Applied: 0,
      Interviewing: 0,
      Offer: 0,
      Archived: 0,
    };
    jobs.forEach((j) => {
      const s = jobStatuses[j.id] || 'New';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [jobs, jobStatuses]);

  // Compute Live Metrics
  const stats: MetricsStats = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    let remoteCount = 0;
    let addedToday = 0;

    const now = new Date().getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const todayStr = new Date().toISOString().split('T')[0];

    jobs.forEach((j) => {
      sourceCounts[j.source] = (sourceCounts[j.source] || 0) + 1;
      if (j.workType === 'Remote' || j.workType === 'Hybrid') remoteCount++;
      const isToday = j.relativeDate === 'Today' || j.datePosted === todayStr;
      const isRecent = j.datePosted && !isNaN(new Date(j.datePosted).getTime()) && (now - new Date(j.datePosted).getTime()) <= ONE_DAY_MS;
      if (isToday || isRecent) {
        addedToday++;
      }
    });

    let topSource = { name: 'LinkedIn' as any, count: 0 };
    Object.entries(sourceCounts).forEach(([src, count]) => {
      if (count > topSource.count) {
        topSource = { name: src as any, count };
      }
    });

    return {
      totalJobs: jobs.length,
      addedToday,
      remoteCount,
      topSource,
      savedCount: bookmarkedIds.size,
      appliedCount: statusCounts.Applied + statusCounts.Interviewing + statusCounts.Offer,
    };
  }, [jobs, bookmarkedIds, statusCounts]);

  return (
    <div className="min-h-screen bg-[#090D0B] text-[#F3F4F6] flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      
      {/* Top Application Header */}
      <div>
        <Header
          viewMode={viewMode}
          setViewMode={setViewMode}
          bookmarksOnly={filters.bookmarksOnly}
          setBookmarksOnly={(val) => setFilters((prev) => ({ ...prev, bookmarksOnly: val }))}
          savedCount={bookmarkedIds.size}
          openPipelineModal={() => setIsPipelineModalOpen(true)}
          statusCounts={statusCounts}
        />

        {/* Main Feed Container */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Live Metric Statistics Bar */}
          <MetricsBar stats={stats} filteredCount={filteredJobs.length} />

          {/* Search & Multi-Filter Control */}
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            resetFilters={handleResetFilters}
            activeFilterCount={activeFilterCount}
            availableCities={availableCities}
          />

          {/* Feed Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                {filters.bookmarksOnly ? 'Saved Bookmarks' : 'Product Management Opportunities'}
              </h2>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-white/[0.04] text-slate-300 border border-white/[0.07] font-mono">
                {filteredJobs.length} {filteredJobs.length === 1 ? 'Role' : 'Roles'}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block">
              Click any row to view full details • Auto-tracks to Applied on click
            </div>
          </div>

          {/* Loading Skeleton State or Job Feed */}
          {isLoading ? (
            <div className="surface-card p-12 text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
              <p className="text-xs text-slate-400">Loading fresh scraped PM jobs feed...</p>
            </div>
          ) : viewMode === 'table' ? (
            <JobTableView
              jobs={paginatedJobs}
              jobStatuses={jobStatuses}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onCopyLink={handleCopyLink}
              onStatusChange={handleStatusChange}
              onSelectJob={(job) => setSelectedJob(job)}
              onApplyJob={handleApplyJob}
            />
          ) : (
            <JobCardGrid
              jobs={paginatedJobs}
              jobStatuses={jobStatuses}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onCopyLink={handleCopyLink}
              onStatusChange={handleStatusChange}
              onSelectJob={(job) => setSelectedJob(job)}
              onApplyJob={handleApplyJob}
            />
          )}

          {/* Pagination Controls (Max 20 per page) */}
          {!isLoading && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredJobs.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}

        </main>
      </div>

      {/* Footer */}
      <Footer />

      {/* Sliding Job Detail Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        jobStatus={selectedJob ? jobStatuses[selectedJob.id] || 'New' : 'New'}
        isBookmarked={selectedJob ? bookmarkedIds.has(selectedJob.id) : false}
        onToggleBookmark={(job) => handleToggleBookmark(job)}
        onCopyLink={(job) => handleCopyLink(job)}
        onStatusChange={handleStatusChange}
        onApplyJob={(job) => handleApplyJob(job)}
      />

      {/* Application Tracker Pipeline Modal */}
      <ApplicationTrackerModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
        jobs={jobs}
        jobStatuses={jobStatuses}
        onFilterByStatus={(status) => setFilters((prev) => ({ ...prev, status }))}
        onExportData={handleExportData}
      />

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={removeToast}
          />
        ))}
      </div>

    </div>
  );
};

export default App;
