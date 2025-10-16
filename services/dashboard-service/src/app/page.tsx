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
const API_URL = 'http://localhost:8001/api/logs';

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>Agent Application Dashboard</h1>
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
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.platform}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.job_id}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd', color: log.status === 'success' ? 'green' : 'red' }}>
                {log.status}
              </td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{new Date(log.created_at).toLocaleString()}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}