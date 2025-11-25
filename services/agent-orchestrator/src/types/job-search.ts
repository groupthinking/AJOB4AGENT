// Job search types for MCP integration
export interface JobSearchParams {
  searchTerm: string;
  location: string;
  platforms: string[];
  experienceLevel?: 'entry' | 'mid' | 'senior';
  remoteOnly?: boolean;
  salaryMin?: number;
  datePosted?: 'today' | 'week' | 'month';
}

export interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  url: string;
  platform: string;
  datePosted: string;
  experienceLevel?: string;
  remote?: boolean;
  metadata?: Record<string, unknown>;
}

export interface JobSearchResponse {
  jobs: JobResult[];
  totalCount: number;
  platform: string;
  searchParams: JobSearchParams;
  timestamp: string;
}