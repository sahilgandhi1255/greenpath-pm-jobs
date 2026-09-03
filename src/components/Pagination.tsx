import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-white/[0.06] text-xs text-slate-400">
      
      {/* Items count summary */}
      <div>
        Showing <span className="font-semibold text-white font-mono">{startItem}</span>–
        <span className="font-semibold text-white font-mono">{endItem}</span> of{' '}
        <span className="font-semibold text-white font-mono">{totalItems}</span> jobs
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1.5">
        
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0C110E] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.14] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 text-xs font-medium"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {/* Page Number Chips */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all duration-150 border font-mono ${
              currentPage === page
                ? 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs'
                : 'bg-[#0C110E] border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.14]'
            }`}
          >
            {page}
          </button>
        ))}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0C110E] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/[0.14] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 text-xs font-medium"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

      </div>

    </div>
  );
};
