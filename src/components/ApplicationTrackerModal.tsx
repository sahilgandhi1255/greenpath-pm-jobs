import React from 'react';
import { 
  X, 
  BarChart2, 
  Download
} from 'lucide-react';
import type { Job, JobStatus } from '../types/job';

interface ApplicationTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  jobStatuses: Record<string, JobStatus>;
  onFilterByStatus: (status: string) => void;
  onExportData: () => void;
}

export const ApplicationTrackerModal: React.FC<ApplicationTrackerModalProps> = ({
  isOpen,
  onClose,
  jobs,
  jobStatuses,
  onFilterByStatus,
  onExportData,
}) => {
  if (!isOpen) return null;

  const stageCounts: Record<JobStatus, number> = {
    New: 0,
    Saved: 0,
    Applied: 0,
    Interviewing: 0,
    Offer: 0,
    Archived: 0,
  };

  jobs.forEach((j) => {
    const s = jobStatuses[j.id] || 'New';
    stageCounts[s] = (stageCounts[s] || 0) + 1;
  });

  const stages: { label: string; key: JobStatus; desc: string }[] = [
    { label: 'Applied', key: 'Applied', desc: 'Resumes submitted & active' },
    { label: 'Interviewing', key: 'Interviewing', desc: 'Screening & case rounds' },
    { label: 'Offer Received', key: 'Offer', desc: 'Offer letters in negotiation' },
    { label: 'Saved / Shortlist', key: 'Saved', desc: 'Bookmarked for follow-up' },
    { label: 'Archived', key: 'Archived', desc: 'Closed or passed' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />

        {/* Modal Box */}
        <div className="relative surface-card p-6 max-w-lg w-full z-10 shadow-2xl animate-in zoom-in-95 duration-150">
          
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-emerald-400">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Application Pipeline
                </h2>
                <p className="text-xs text-slate-400">
                  Track your job search progress (auto-saved in localStorage)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pipeline Stage Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
            {stages.map((stage) => {
              const count = stageCounts[stage.key];
              return (
                <button
                  key={stage.key}
                  onClick={() => {
                    onFilterByStatus(stage.key);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-white/[0.07] text-left bg-[#080C0A] hover:bg-[#0E1511] hover:border-white/[0.14] transition-all flex items-center justify-between group"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">{stage.label}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{stage.desc}</p>
                  </div>
                  <span className="text-xl font-bold text-white font-mono">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Export & Actions */}
          <div className="pt-3.5 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[11px] text-slate-400">
              Synced with local storage
            </span>

            <button
              onClick={onExportData}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0E1511] hover:bg-[#131D18] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.14] transition-all font-medium"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Tracker (JSON)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
