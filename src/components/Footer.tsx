import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-[#0F1D15] bg-[#020504] py-8 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#08140D] border border-[#14261C] flex items-center justify-center text-emerald-400 font-bold text-xs">
              GP
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-300">GreenPath PM Jobs</p>
              <p className="text-[11px] text-slate-400">
                Static Product Management job feed • Auto-purged after 30 days
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#060D09] border border-[#122218] text-slate-400 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Netlify Jamstack Ready</span>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};
