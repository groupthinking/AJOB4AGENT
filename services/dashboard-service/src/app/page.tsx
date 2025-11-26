'use client';

import { useState, useEffect } from 'react';

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
const API_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/logs`
  : '/api/logs';

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        const data: LogEntry[] = await response.json();
        setLogs(data);
        if (error !== null) setError(null);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsInitialLoad(false);
      }
    };

    fetchLogs();
    // Optional: Set up polling to refresh data periodically
    const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [error]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>Agent Application Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Monitor your automated job application activities in real-time
      </p>
      
      {isInitialLoad && <p>Loading application logs...</p>}
      
      {error && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '20px' 
        }}>
          <p style={{ color: '#856404', margin: 0 }}>
            <strong>Notice:</strong> The monitoring service is not currently available. 
            This is expected if the backend services are not running. {error}
          </p>
        </div>
      )}
      
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
          {!isInitialLoad && logs.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                {error ? 'Unable to load application logs.' : 'No application logs available yet.'}
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