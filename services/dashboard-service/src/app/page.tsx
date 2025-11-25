'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

// Define the type for a single log entry
interface LogEntry {
  id: number;
  job_id: string;
  platform: string;
  status: 'success' | 'failure';
  details: string;
  created_at: string;
}

// The API URL for the monitoring service
const API_URL = 'http://localhost:8001/api/logs';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const fetchLogs = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data: LogEntry[] = await response.json();
        setLogs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    fetchLogs();
    // Optional: Set up polling to refresh data periodically
    const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AJOB4AGENT</h1>
          <p className="text-gray-600 mb-6">Please sign in to access your dashboard.</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agent Application Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            Welcome, {session?.user?.name || session?.user?.email}
          </span>
          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
            {(session?.user as any)?.plan || 'PILOT'}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Platform</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Job ID</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Timestamp</th>
            <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'left' }}>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No application logs yet. Start applying for jobs to see activity here.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id}>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.platform}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.job_id}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd', color: log.status === 'success' ? 'green' : 'red' }}>
                  {log.status}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{new Date(log.created_at).toLocaleString()}</td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.details}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}