export type RoleCategory = 
  | 'Associate Product Manager'
  | 'Product Manager'
  | 'Senior Product Manager'
  | 'Technical Product Manager'
  | 'Product Owner'
  | 'AI & Growth PM'
  | 'Product Lead / Director';

export type PortalSource = 
  | 'LinkedIn'
  | 'Naukri'
  | 'Wellfound'
  | 'IIMJobs'
  | 'Indeed'
  | 'Instahyre';

export type WorkType = 'Remote' | 'Hybrid' | 'On-site';

export type ExperienceLevel = '0-2 yrs' | '2-5 yrs' | '5-8 yrs' | '8+ yrs';

export type JobStatus = 'New' | 'Saved' | 'Applied' | 'Interviewing' | 'Offer' | 'Archived';

export interface Job {
  id: string;
  title: string;
  company: string;
  companyInitials: string;
  companyColor: string; // Tailwind background or hex
  companyLogoUrl?: string;
  roleCategory: RoleCategory;
  shortRoleType: 'APM' | 'PM' | 'SPM' | 'TPM' | 'PO' | 'Lead' | 'AI PM';
  experience: string;
  experienceLevel: ExperienceLevel;
  location: string;
  city: string;
  workType: WorkType;
  source: PortalSource;
  url: string;
  datePosted: string; // ISO date or display string
  relativeDate: string; // e.g. "2h ago", "Today", "1d ago"
  salary?: string;
  tags: string[];
  descriptionSnippet: string;
  fullDescription?: string;
  responsibilities: string[];
  requirements: string[];
  keySkills: string[];
  isFeatured?: boolean;
  isUrgent?: boolean;
  applicantCount?: number;
}

export interface FilterState {
  searchQuery: string;
  roleCategory: string; // 'all' or specific
  source: string; // 'all' or specific
  location: string; // 'all' or specific
  workType: string; // 'all' or specific
  experienceLevel: string; // 'all' or specific
  status: string; // 'all' or specific
  remoteOnly: boolean;
  bookmarksOnly: boolean;
  featuredOnly: boolean;
  sortBy: 'newest' | 'experience_asc' | 'experience_desc' | 'company_asc' | 'salary_desc';
}

export interface MetricsStats {
  totalJobs: number;
  addedToday: number;
  remoteCount: number;
  topSource: { name: PortalSource; count: number };
  savedCount: number;
  appliedCount: number;
}
