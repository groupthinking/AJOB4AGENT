'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
  id: number;
  job_id: string;
  platform: string;
  status: 'success' | 'failure';
  details: string;
  created_at: string;
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [stats, setStats] = useState({ total: 0, success: 0, failure: 0 });

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/applications');
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const data: LogEntry[] = await response.json();
        setLogs(data);
        setStats({
          total: data.length,
          success: data.filter(l => l.status === 'success').length,
          failure: data.filter(l => l.status === 'failure').length,
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsInitialLoad(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const getPlatformColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'linkedin': return '#0077B5';
      case 'glassdoor': return '#0CAA41';
      case 'wellfound': return '#CC0000';
      default: return '#666';
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#111' }}>
          Agent Application Dashboard
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Monitor your automated job application activities in real-time
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '20px', border: '1px solid #e9ecef' }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '4px' }}>Total Applications</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#111', margin: 0 }}>{stats.total}</p>
        </div>
        <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '20px', border: '1px solid #bbf7d0' }}>
          <p style={{ color: '#166534', fontSize: '14px', marginBottom: '4px' }}>Successful</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#16a34a', margin: 0 }}>{stats.success}</p>
        </div>
        <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '20px', border: '1px solid #fecaca' }}>
          <p style={{ color: '#991b1b', fontSize: '14px', marginBottom: '4px' }}>Failed</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#dc2626', margin: 0 }}>{stats.failure}</p>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '20px', border: '1px solid #bfdbfe' }}>
          <p style={{ color: '#1e40af', fontSize: '14px', marginBottom: '4px' }}>Success Rate</p>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#2563eb', margin: 0 }}>
            {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
          </p>
        </div>
      </div>

      {isInitialLoad && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>Loading application logs...</p>
        </div>
      )}

      {error && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <p style={{ color: '#856404', margin: 0 }}>
            <strong>Notice:</strong> Could not connect to monitoring service. {error}
          </p>
        </div>
      )}

      {/* Application Logs Table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Recent Applications</h2>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {!isInitialLoad && logs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  No application logs available yet.
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr key={log.id} style={{ borderBottom: index < logs.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      display: 'inline-block',
                      padding: '4px 10px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      color: 'white',
                      backgroundColor: getPlatformColor(log.platform)
                    }}>
                      {log.platform}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#374151' }}>
                    {log.job_id}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      color: log.status === 'success' ? '#166534' : '#991b1b',
                      backgroundColor: log.status === 'success' ? '#dcfce7' : '#fee2e2'
                    }}>
                      {log.status === 'success' ? '✓' : '✗'} {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#374151', fontSize: '14px' }}>
                    {log.details}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px', marginTop: '24px' }}>
        Auto-refreshing every 10 seconds
      </p>
    </div>
  );
}
