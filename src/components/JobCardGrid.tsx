import React from 'react';
import { 
  ExternalLink, 
  Bookmark, 
  Share2, 
  MapPin, 
  Sparkles, 
  Flame, 
  Briefcase
} from 'lucide-react';
import type { Job, JobStatus } from '../types/job';

interface JobCardGridProps {
  jobs: Job[];
  jobStatuses: Record<string, JobStatus>;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (job: Job, e: React.MouseEvent) => void;
  onCopyLink: (job: Job, e: React.MouseEvent) => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onSelectJob: (job: Job) => void;
  onApplyJob: (job: Job, e: React.MouseEvent) => void;
}

export const JobCardGrid: React.FC<JobCardGridProps> = ({
  jobs,
  jobStatuses,
  bookmarkedIds,
  onToggleBookmark,
  onCopyLink,
  onStatusChange,
  onSelectJob,
  onApplyJob,
}) => {
  if (jobs.length === 0) {
    return (
      <div className="surface-card p-12 text-center">
        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-slate-400">
          <Briefcase className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No Matching PM Roles</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Try adjusting your search terms or relaxing some active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {jobs.map((job) => {
        const currentStatus = jobStatuses[job.id] || 'New';
        const isBookmarked = bookmarkedIds.has(job.id);

        return (
          <div
            key={job.id}
            onClick={() => onSelectJob(job)}
            className="surface-card surface-card-hover p-4.5 flex flex-col justify-between cursor-pointer group"
          >
            <div>
              {/* Top Meta: Source Badge, Badges, Bookmark & Share */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                  {job.source}
                </span>

                <div className="flex items-center gap-1.5">
                  {job.isUrgent && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-semibold rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      <Flame className="w-2.5 h-2.5 text-rose-400" /> Hot
                    </span>
                  )}
                  {job.isFeatured && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-semibold rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                      <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Featured
                    </span>
                  )}

                  {/* Bookmark Button */}
                  <button
                    onClick={(e) => onToggleBookmark(job, e)}
                    className={`p-1.5 rounded-lg border transition-all duration-150 ${
                      isBookmarked
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.06] hover:border-white/[0.14]'
                    }`}
                    title={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                  </button>

                  {/* Copy Link Button */}
                  <button
                    onClick={(e) => onCopyLink(job, e)}
                    className="p-1.5 rounded-lg bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.14] transition-all duration-150"
                    title="Copy job link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Company & Role Header */}
              <div className="flex items-start gap-2.5 mb-2.5">
                <div
                  style={{ backgroundColor: job.companyColor }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-xs shrink-0 border border-white/10"
                >
                  {job.companyInitials}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 font-medium">
                    <span className="text-slate-200">{job.company}</span>
                    <span>•</span>
                    <span>{job.experience}</span>
                  </div>
                </div>
              </div>

              {/* Location & Salary Chips */}
              <div className="flex items-center gap-1.5 flex-wrap mb-2.5 text-xs">
                <div className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{job.city}</span>
                </div>
                <span className="px-1.5 py-0.2 rounded text-[10px] text-slate-400 bg-white/[0.03] border border-white/[0.06]">
                  {job.workType}
                </span>
                {job.salary && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 font-mono">
                    {job.salary}
                  </span>
                )}
              </div>

              {/* Description Snippet */}
              <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                {job.descriptionSnippet}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-1 flex-wrap mb-3.5">
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-slate-400 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-auto">
              
              {/* Status Dropdown */}
              <div onClick={(e) => e.stopPropagation()}>
                <select
                  value={currentStatus}
                  onChange={(e) => onStatusChange(job.id, e.target.value as JobStatus)}
                  className="px-2 py-1 rounded text-xs font-medium bg-[#080C0A] text-slate-300 border border-white/[0.08] cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  <option value="New" className="bg-[#0C110E] text-white">New</option>
                  <option value="Saved" className="bg-[#0C110E] text-amber-300">Saved</option>
                  <option value="Applied" className="bg-[#0C110E] text-emerald-300">Applied</option>
                  <option value="Interviewing" className="bg-[#0C110E] text-purple-300">Interviewing</option>
                  <option value="Offer" className="bg-[#0C110E] text-emerald-200">Offer</option>
                  <option value="Archived" className="bg-[#0C110E] text-slate-500">Archived</option>
                </select>
              </div>

              {/* Apply Button */}
              <button
                onClick={(e) => onApplyJob(job, e)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-all duration-150"
              >
                <span>Apply</span>
                <ExternalLink className="w-3 h-3 text-emerald-100" />
              </button>

            </div>

          </div>
        );
      })}
    </div>
  );
};
