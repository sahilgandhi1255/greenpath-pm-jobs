import React from 'react';
import { 
  Briefcase, 
  Clock, 
  Globe2, 
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import type { MetricsStats } from '../types/job';

interface MetricsBarProps {
  stats: MetricsStats;
  filteredCount: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ stats, filteredCount }) => {
  const remotePercentage = Math.round((stats.remoteCount / (stats.totalJobs || 1)) * 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-5">
      
      {/* KPI 1: Active PM Roles */}
      <div className="surface-card surface-card-hover p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Active PM Roles
          </span>
          <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {stats.totalJobs}
            </span>
            {filteredCount !== stats.totalJobs && (
              <span className="text-xs font-semibold text-emerald-400 font-mono">
                / {filteredCount} matched
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-400/90 font-medium">
            <ArrowUpRight className="w-3 h-3" />
            <span>+8% this week</span>
          </div>
        </div>
      </div>

      {/* KPI 2: Added Today */}
      <div className="surface-card surface-card-hover p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Added Today
          </span>
          <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              +{stats.addedToday}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            new opportunities tracked
          </p>
        </div>
      </div>

      {/* KPI 3: Remote & Hybrid */}
      <div className="surface-card surface-card-hover p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Remote & Hybrid
          </span>
          <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
            <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono">
              {stats.remoteCount}
            </span>
            <span className="text-xs font-semibold text-slate-400 font-mono">
              ({remotePercentage}%)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            flexible workplace policy
          </p>
        </div>
      </div>

      {/* KPI 4: Top Portal */}
      <div className="surface-card surface-card-hover p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Top Portal Source
          </span>
          <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>
        
        <div className="mt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {stats.topSource.name}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {stats.topSource.count} active roles aggregated
          </p>
        </div>
      </div>

    </div>
  );
};
