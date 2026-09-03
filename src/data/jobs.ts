import type { Job } from '../types/job';

// Clean initial empty state. Jobs are dynamically populated by scraper at /data/jobs.json
export const INITIAL_JOBS: Job[] = [];
