import { NextResponse } from 'next/server';

// Mock data for demonstration - simulates job application logs
const mockLogs = [
  {
    id: 1,
    job_id: 'LI-2024-001',
    platform: 'LinkedIn',
    status: 'success',
    details: 'Applied to Senior Software Engineer at Google',
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 2,
    job_id: 'GD-2024-042',
    platform: 'Glassdoor',
    status: 'success',
    details: 'Applied to Full Stack Developer at Stripe',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 3,
    job_id: 'WF-2024-108',
    platform: 'Wellfound',
    status: 'success',
    details: 'Applied to Founding Engineer at AI Startup',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 4,
    job_id: 'LI-2024-002',
    platform: 'LinkedIn',
    status: 'failure',
    details: 'Application blocked - requires Easy Apply',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 5,
    job_id: 'LI-2024-003',
    platform: 'LinkedIn',
    status: 'success',
    details: 'Applied to Backend Engineer at Meta',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 6,
    job_id: 'GD-2024-043',
    platform: 'Glassdoor',
    status: 'success',
    details: 'Applied to DevOps Engineer at Netflix',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 7,
    job_id: 'WF-2024-109',
    platform: 'Wellfound',
    status: 'failure',
    details: 'Position closed before application submitted',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 8,
    job_id: 'LI-2024-004',
    platform: 'LinkedIn',
    status: 'success',
    details: 'Applied to ML Engineer at OpenAI',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 9,
    job_id: 'GD-2024-044',
    platform: 'Glassdoor',
    status: 'success',
    details: 'Applied to Platform Engineer at Vercel',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 10,
    job_id: 'LI-2024-005',
    platform: 'LinkedIn',
    status: 'success',
    details: 'Applied to Senior Frontend Engineer at Airbnb',
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
];

export async function GET() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return NextResponse.json(mockLogs);
}
