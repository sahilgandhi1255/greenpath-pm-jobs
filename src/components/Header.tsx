import React from 'react';
import { 
  Bookmark, 
  LayoutGrid, 
  Table as TableIcon, 
  BarChart2
} from 'lucide-react';
import type { JobStatus } from '../types/job';

interface HeaderProps {
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  bookmarksOnly: boolean;
  setBookmarksOnly: (val: boolean) => void;
  savedCount: number;
  openPipelineModal: () => void;
  statusCounts: Record<JobStatus, number>;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  bookmarksOnly,
  setBookmarksOnly,
  savedCount,
  openPipelineModal,
  statusCounts,
}) => {
  const activeApplications = (statusCounts['Applied'] || 0) + (statusCounts['Interviewing'] || 0) + (statusCounts['Offer'] || 0);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-[#090D0B]/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        {/* Left: Brand Identity & Live Status Signal */}
        <div className="flex items-center gap-3.5">
          {/* Refined Geometric Logo */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#0E1511] border border-white/[0.09] shadow-sm shrink-0">
            <img src="/logo.svg" alt="GreenPath" className="w-4.5 h-4.5" />
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold tracking-tight text-white">
                GreenPath
              </span>
              <span className="text-sm font-medium tracking-tight text-emerald-400">
                PM Jobs
              </span>
            </div>

            {/* Live Product Signal with subtle pulse */}
            <div className="hidden sm:flex items-center gap-1.5 pl-2.5 border-l border-white/[0.08] text-[11px] font-medium text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Feed</span>
            </div>
          </div>
        </div>

        {/* Right: Actions & View Switcher */}
        <div className="flex items-center gap-2">
          
          {/* Pipeline Tracker Modal Button */}
          <button
            onClick={openPipelineModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0E1511] hover:bg-[#131D18] border border-white/[0.08] hover:border-white/[0.14] text-slate-300 hover:text-white text-xs font-medium transition-all duration-150 shadow-xs"
            title="View application pipeline"
          >
            <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Pipeline</span>
            {activeApplications > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 text-[10px] rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold font-mono">
                {activeApplications}
              </span>
            )}
          </button>

          {/* Bookmarks Toggle Button */}
          <button
            onClick={() => setBookmarksOnly(!bookmarksOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
              bookmarksOnly
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'bg-[#0E1511] hover:bg-[#131D18] text-slate-300 hover:text-white border-white/[0.08] hover:border-white/[0.14]'
            }`}
            title="Filter bookmarked jobs"
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarksOnly ? 'fill-emerald-400 text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Saved</span>
            {savedCount > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.2 text-[10px] rounded font-semibold font-mono ${
                bookmarksOnly
                  ? 'bg-emerald-400 text-[#090D0B]'
                  : 'bg-white/[0.06] text-slate-300 border border-white/[0.06]'
              }`}>
                {savedCount}
              </span>
            )}
          </button>

          {/* View Mode Segmented Switcher (Table / Grid) */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#080C0A] border border-white/[0.07]">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === 'table'
                  ? 'bg-[#141E18] text-white border border-white/[0.08] shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dense Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Table</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                viewMode === 'grid'
                  ? 'bg-[#141E18] text-white border border-white/[0.08] shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
};
