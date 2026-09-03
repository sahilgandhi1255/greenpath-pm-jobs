import React, { useRef, useEffect } from 'react';
import { 
  Search, 
  X, 
  RotateCcw, 
  Check, 
  Sparkles,
  ChevronDown
} from 'lucide-react';
import type { FilterState, PortalSource } from '../types/job';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  activeFilterCount: number;
  availableCities: string[];
}

export const PORTAL_SOURCES: PortalSource[] = [
  'LinkedIn',
  'Naukri',
  'Wellfound',
  'IIMJobs',
  'Indeed',
  'Instahyre',
];

export const ROLE_CATEGORIES: { label: string; value: string }[] = [
  { label: 'All Roles', value: 'all' },
  { label: 'APM (Associate)', value: 'Associate Product Manager' },
  { label: 'Product Manager (PM)', value: 'Product Manager' },
  { label: 'Senior PM (SPM)', value: 'Senior Product Manager' },
  { label: 'Technical PM (TPM)', value: 'Technical Product Manager' },
  { label: 'Product Owner (PO)', value: 'Product Owner' },
  { label: 'AI & Growth PM', value: 'AI & Growth PM' },
  { label: 'Lead / Director', value: 'Product Lead / Director' },
];

export const EXPERIENCE_LEVELS: { label: string; value: string }[] = [
  { label: 'All Levels', value: 'all' },
  { label: '0-2 Years (Entry / APM)', value: '0-2 yrs' },
  { label: '2-5 Years (Mid-level)', value: '2-5 yrs' },
  { label: '5-8 Years (Senior)', value: '5-8 yrs' },
  { label: '8+ Years (Lead / Director)', value: '8+ yrs' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  resetFilters,
  activeFilterCount,
  availableCities,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut handler for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div className="surface-card p-4 sm:p-5 mb-5 space-y-4">
      
      {/* 1. Command / Search Input */}
      <div className="flex flex-col lg:flex-row gap-3">
        
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search roles, companies, skills, locations..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-10 pr-20 py-2.5 rounded-lg command-input text-xs sm:text-sm text-white placeholder-slate-500 font-medium"
          />
          
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {filters.searchQuery ? (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/[0.05] border border-white/[0.08] rounded shadow-xs">
                {isMac ? '⌘K' : 'Ctrl K'}
              </kbd>
            )}
          </div>
        </div>

        {/* Quick Toggles & Reset */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          
          {/* Remote Only Toggle */}
          <button
            onClick={() => setFilters((prev) => ({ ...prev, remoteOnly: !prev.remoteOnly }))}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 border ${
              filters.remoteOnly
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-semibold'
                : 'bg-[#0E1511] text-slate-300 hover:text-white border-white/[0.08] hover:border-white/[0.14]'
            }`}
          >
            <span>Remote Only</span>
            {filters.remoteOnly && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Featured Toggle */}
          <button
            onClick={() => setFilters((prev) => ({ ...prev, featuredOnly: !prev.featuredOnly }))}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 border ${
              filters.featuredOnly
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-semibold'
                : 'bg-[#0E1511] text-slate-300 hover:text-white border-white/[0.08] hover:border-white/[0.14]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Featured</span>
            {filters.featuredOnly && <Check className="w-3.5 h-3.5 text-emerald-400" />}
          </button>

          {/* Clear Filters (rendered only when filters active) */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.16] transition-all duration-150 whitespace-nowrap"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Clear filters ({activeFilterCount})</span>
            </button>
          )}

        </div>

      </div>

      {/* 2. Structured Intelligence Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-white/[0.06]">
        
        {/* Track */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Role Track
          </label>
          <div className="relative">
            <select
              value={filters.roleCategory}
              onChange={(e) => setFilters((prev) => ({ ...prev, roleCategory: e.target.value }))}
              className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-[#080C0A] border border-white/[0.08] text-xs text-white cursor-pointer hover:border-white/[0.14] focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {ROLE_CATEGORIES.map((role) => (
                <option key={role.value} value={role.value} className="bg-[#0C110E] text-white">
                  {role.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Source Portal
          </label>
          <div className="relative">
            <select
              value={filters.source}
              onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}
              className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-[#080C0A] border border-white/[0.08] text-xs text-white cursor-pointer hover:border-white/[0.14] focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="all" className="bg-[#0C110E] text-white">All Portals (6)</option>
              {PORTAL_SOURCES.map((portal) => (
                <option key={portal} value={portal} className="bg-[#0C110E] text-white">
                  {portal}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Location
          </label>
          <div className="relative">
            <select
              value={filters.location}
              onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
              className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-[#080C0A] border border-white/[0.08] text-xs text-white cursor-pointer hover:border-white/[0.14] focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="all" className="bg-[#0C110E] text-white">All Locations</option>
              {availableCities.map((city) => (
                <option key={city} value={city} className="bg-[#0C110E] text-white">
                  {city}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Experience */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Experience
          </label>
          <div className="relative">
            <select
              value={filters.experienceLevel}
              onChange={(e) => setFilters((prev) => ({ ...prev, experienceLevel: e.target.value }))}
              className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-[#080C0A] border border-white/[0.08] text-xs text-white cursor-pointer hover:border-white/[0.14] focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {EXPERIENCE_LEVELS.map((exp) => (
                <option key={exp.value} value={exp.value} className="bg-[#0C110E] text-white">
                  {exp.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            My Status
          </label>
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-[#080C0A] border border-white/[0.08] text-xs text-white cursor-pointer hover:border-white/[0.14] focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="all" className="bg-[#0C110E] text-white">All Statuses</option>
              <option value="New" className="bg-[#0C110E] text-white">New Only</option>
              <option value="Saved" className="bg-[#0C110E] text-white">Saved</option>
              <option value="Applied" className="bg-[#0C110E] text-white">Applied</option>
              <option value="Interviewing" className="bg-[#0C110E] text-white">Interviewing</option>
              <option value="Offer" className="bg-[#0C110E] text-white">Offer</option>
              <option value="Archived" className="bg-[#0C110E] text-white">Archived</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Sort Order
          </label>
          <div className="relative">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-lg bg-[#080C0A] border border-white/[0.08] text-xs text-white cursor-pointer hover:border-white/[0.14] focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="newest" className="bg-[#0C110E] text-white">Newest First</option>
              <option value="experience_asc" className="bg-[#0C110E] text-white">Exp: Low to High</option>
              <option value="experience_desc" className="bg-[#0C110E] text-white">Exp: High to Low</option>
              <option value="company_asc" className="bg-[#0C110E] text-white">Company: A to Z</option>
              <option value="salary_desc" className="bg-[#0C110E] text-white">Salary: High to Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>

      </div>

      {/* 3. Refined Portal Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 scrollbar-none text-xs">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1">
          Portals:
        </span>
        
        <button
          onClick={() => setFilters((prev) => ({ ...prev, source: 'all' }))}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap border ${
            filters.source === 'all'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-semibold'
              : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
          }`}
        >
          All Portals
        </button>

        {PORTAL_SOURCES.map((portal) => {
          const isSelected = filters.source === portal;
          return (
            <button
              key={portal}
              onClick={() => setFilters((prev) => ({ ...prev, source: isSelected ? 'all' : portal }))}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 border whitespace-nowrap ${
                isSelected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 font-semibold'
                  : 'bg-white/[0.03] text-slate-400 border-white/[0.06] hover:text-white hover:border-white/[0.12]'
              }`}
            >
              {portal}
            </button>
          );
        })}
      </div>

    </div>
  );
};
