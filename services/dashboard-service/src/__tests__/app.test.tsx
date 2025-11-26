import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid test output noise
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

// Import the component after mocking fetch
import Dashboard from '../app/page';

describe('Dashboard App', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should display loading state during initial fetch', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<Dashboard />);
    expect(screen.getByText('Loading application logs...')).toBeInTheDocument();
  });

  it('should display error state when API fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/The monitoring service is not currently available/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('should display empty state when no logs are available', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('No application logs available yet.')).toBeInTheDocument();
    });
  });

  it('should display logs when data is fetched successfully', async () => {
    const mockLogs = [
      {
        id: 1,
        job_id: 'job-123',
        platform: 'LinkedIn',
        status: 'success' as const,
        details: 'Application submitted',
        created_at: '2025-11-26T10:00:00Z'
      }
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLogs)
    });
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('job-123')).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText('Application submitted')).toBeInTheDocument();
    });
  });

  it('should not show loading indicator after initial fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading application logs...')).not.toBeInTheDocument();
    });
  });

  it('should handle HTTP error status codes', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    });
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch data: 500 Internal Server Error/)).toBeInTheDocument();
    });
  });

  it('should render the dashboard title and description', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<Dashboard />);
    
    expect(screen.getByText('Agent Application Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Monitor your automated job application activities in real-time')).toBeInTheDocument();
  });

  it('should render table headers correctly', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<Dashboard />);
    
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Job ID')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });
})