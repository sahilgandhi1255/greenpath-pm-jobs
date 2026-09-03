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

interface JobTableViewProps {
  jobs: Job[];
  jobStatuses: Record<string, JobStatus>;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (job: Job, e: React.MouseEvent) => void;
  onCopyLink: (job: Job, e: React.MouseEvent) => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onSelectJob: (job: Job) => void;
  onApplyJob: (job: Job, e: React.MouseEvent) => void;
}

export const JobTableView: React.FC<JobTableViewProps> = ({
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
          Try clearing search keywords or resetting your active portal and track filters.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-table overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-200 border-collapse">
          
          {/* Table Header */}
          <thead className="bg-[#080C0A] text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/[0.06] sticky top-0 z-10">
            <tr>
              <th scope="col" className="py-3 pl-4 pr-2">Role Title</th>
              <th scope="col" className="py-3 px-3">Company</th>
              <th scope="col" className="py-3 px-2 text-center">Track</th>
              <th scope="col" className="py-3 px-2 text-center">Experience</th>
              <th scope="col" className="py-3 px-3">Location</th>
              <th scope="col" className="py-3 px-2.5">Portal</th>
              <th scope="col" className="py-3 px-2.5">Posted</th>
              <th scope="col" className="py-3 px-3 text-center">My Status</th>
              <th scope="col" className="py-3 pr-4 pl-2 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/[0.04]">
            {jobs.map((job) => {
              const currentStatus = jobStatuses[job.id] || 'New';
              const isBookmarked = bookmarkedIds.has(job.id);

              return (
                <tr
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="surface-row group cursor-pointer"
                >
                  
                  {/* 1. Role Title & Highlights */}
                  <td className="py-3.5 pl-4 pr-2 max-w-xs sm:max-w-sm">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                          {job.title}
                        </span>
                        
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
                      </div>

                      {/* Tags & Salary */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {job.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-slate-400 font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                        {job.salary && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium font-mono">
                            {job.salary}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* 2. Company */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        style={{ backgroundColor: job.companyColor }}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0 border border-white/10"
                      >
                        {job.companyInitials}
                      </div>
                      <span className="font-medium text-slate-200">{job.company}</span>
                    </div>
                  </td>

                  {/* 3. Short Track */}
                  <td className="py-3.5 px-2 text-center whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.07]">
                      {job.shortRoleType}
                    </span>
                  </td>

                  {/* 4. Experience */}
                  <td className="py-3.5 px-2 text-center whitespace-nowrap text-slate-400 text-xs">
                    {job.experience}
                  </td>

                  {/* 5. Location */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 text-slate-300 text-xs">
                        <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{job.city}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        {job.workType}
                      </span>
                    </div>
                  </td>

                  {/* 6. Source Portal */}
                  <td className="py-3.5 px-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.03] text-slate-300 border border-white/[0.06]">
                      {job.source}
                    </span>
                  </td>

                  {/* 7. Posted */}
                  <td className="py-3.5 px-2.5 whitespace-nowrap text-slate-400 text-xs">
                    {job.relativeDate}
                  </td>

                  {/* 8. My Status Dropdown */}
                  <td className="py-3.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={currentStatus}
                      onChange={(e) => onStatusChange(job.id, e.target.value as JobStatus)}
                      className={`px-2 py-1 rounded text-xs font-medium border cursor-pointer bg-[#080C0A] focus:outline-none focus:border-emerald-500 transition-colors ${
                        currentStatus === 'Applied'
                          ? 'border-emerald-500/50 text-emerald-300 font-semibold bg-emerald-500/10'
                          : currentStatus === 'Interviewing'
                          ? 'border-purple-500/50 text-purple-300 bg-purple-500/10'
                          : currentStatus === 'Offer'
                          ? 'border-emerald-400 text-emerald-200 font-bold bg-emerald-500/20'
                          : currentStatus === 'Saved'
                          ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                          : 'border-white/[0.08] text-slate-400'
                      }`}
                    >
                      <option value="New" className="bg-[#0C110E] text-white">New</option>
                      <option value="Saved" className="bg-[#0C110E] text-amber-300">Saved</option>
                      <option value="Applied" className="bg-[#0C110E] text-emerald-300">Applied</option>
                      <option value="Interviewing" className="bg-[#0C110E] text-purple-300">Interviewing</option>
                      <option value="Offer" className="bg-[#0C110E] text-emerald-200">Offer</option>
                      <option value="Archived" className="bg-[#0C110E] text-slate-500">Archived</option>
                    </select>
                  </td>

                  {/* 9. Actions (Bookmark, Share, Apply) */}
                  <td className="py-3.5 pr-4 pl-2 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      
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

                      {/* Primary Apply Action */}
                      <button
                        onClick={(e) => onApplyJob(job, e)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all duration-150 shadow-xs hover:shadow-sm"
                        title={`Apply on ${job.source} (automatically marks as Applied)`}
                      >
                        <span>Apply</span>
                        <ExternalLink className="w-3 h-3 text-emerald-100" />
                      </button>

                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>

        </table>
      </div>
    </div>
  );
};
