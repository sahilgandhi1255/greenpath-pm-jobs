import React, { useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Bookmark, 
  Share2, 
  MapPin, 
  Sparkles, 
  Flame, 
  CheckCircle2
} from 'lucide-react';
import type { Job, JobStatus } from '../types/job';

interface JobDetailDrawerProps {
  job: Job | null;
  onClose: () => void;
  jobStatus: JobStatus;
  isBookmarked: boolean;
  onToggleBookmark: (job: Job) => void;
  onCopyLink: (job: Job) => void;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onApplyJob: (job: Job) => void;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  job,
  onClose,
  jobStatus,
  isBookmarked,
  onToggleBookmark,
  onCopyLink,
  onStatusChange,
  onApplyJob,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-[#090D0B] border-l border-white/[0.08] shadow-2xl flex flex-col justify-between overflow-y-auto">
          
          {/* Header Bar */}
          <div className="p-5 border-b border-white/[0.07] bg-[#0C110E]/90 sticky top-0 z-10 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.06]">
                  {job.source}
                </span>
                {job.isUrgent && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-semibold rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    <Flame className="w-2.5 h-2.5 text-rose-400" /> Hot Opening
                  </span>
                )}
                {job.isFeatured && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-semibold rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" /> Featured
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Bookmark */}
                <button
                  onClick={() => onToggleBookmark(job)}
                  className={`p-1.5 rounded-lg border transition-all duration-150 ${
                    isBookmarked
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border-white/[0.06] hover:border-white/[0.14]'
                  }`}
                  title={isBookmarked ? 'Remove bookmark' : 'Bookmark job'}
                >
                  <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                </button>

                {/* Share Link */}
                <button
                  onClick={() => onCopyLink(job)}
                  className="p-1.5 rounded-lg bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.14] transition-all duration-150"
                  title="Copy job link"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Close Drawer */}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06] hover:border-white/[0.14] transition-all duration-150"
                  title="Close panel (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Title & Company Info */}
            <div className="flex items-start gap-3.5 mt-3.5">
              <div
                style={{ backgroundColor: job.companyColor }}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0 border border-white/10"
              >
                {job.companyInitials}
              </div>

              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  {job.title}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-300">
                  <span className="text-white font-semibold">{job.company}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>{job.location}</span>
                  </div>
                  <span>•</span>
                  <span className="text-slate-400">{job.relativeDate}</span>
                </div>
              </div>
            </div>

            {/* Badges Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-white/[0.06] text-xs">
              <div className="p-2 rounded-lg bg-[#080C0A] border border-white/[0.06]">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Experience</span>
                <span className="font-semibold text-white text-[11px]">{job.experience}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#080C0A] border border-white/[0.06]">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Work Mode</span>
                <span className="font-semibold text-white text-[11px]">{job.workType}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#080C0A] border border-white/[0.06]">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">Salary</span>
                <span className="font-semibold text-emerald-300 text-[11px] font-mono">{job.salary || 'Competitive'}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#080C0A] border border-white/[0.06]">
                <span className="text-[9px] text-slate-400 uppercase font-semibold block">My Status</span>
                <select
                  value={jobStatus}
                  onChange={(e) => onStatusChange(job.id, e.target.value as JobStatus)}
                  className="w-full mt-0.5 bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer text-[11px]"
                >
                  <option value="New" className="bg-[#0C110E] text-white">New</option>
                  <option value="Saved" className="bg-[#0C110E] text-amber-300">Saved</option>
                  <option value="Applied" className="bg-[#0C110E] text-emerald-300">Applied</option>
                  <option value="Interviewing" className="bg-[#0C110E] text-purple-300">Interviewing</option>
                  <option value="Offer" className="bg-[#0C110E] text-emerald-200">Offer</option>
                  <option value="Archived" className="bg-[#0C110E] text-slate-500">Archived</option>
                </select>
              </div>
            </div>

          </div>

          {/* Drawer Body Content */}
          <div className="p-5 space-y-5">
            
            {/* Overview */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Role Overview
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {job.fullDescription || job.descriptionSnippet}
              </p>
            </div>

            {/* Responsibilities */}
            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Key Responsibilities
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {job.responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Requirements & Qualifications
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {job.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Skills */}
            <div className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Key Skills & Domains
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {job.keySkills?.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-white/[0.04] text-slate-300 border border-white/[0.07]"
                  >
                    {skill}
                  </span>
                ))}
                {job.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-[11px] text-slate-400 bg-white/[0.02] border border-white/[0.05]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Source Info */}
            <div className="p-3 rounded-lg bg-[#0C110E] border border-white/[0.06] text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between items-center">
                <span>Original Platform:</span>
                <span className="text-white font-medium">{job.source}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Date Added:</span>
                <span>{job.datePosted}</span>
              </div>
            </div>

          </div>

          {/* Sticky Bottom Apply Action */}
          <div className="p-4 border-t border-white/[0.07] bg-[#0C110E]/95 sticky bottom-0 z-10 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block">External Posting</span>
              <span className="text-xs font-bold text-white">
                {job.company} • {job.source}
              </span>
            </div>

            <button
              onClick={() => onApplyJob(job)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all duration-150 shadow-sm"
            >
              <span>Apply on {job.source}</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-100" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
