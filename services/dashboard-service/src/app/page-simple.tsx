'use client'

import { useState, useEffect } from 'react'

interface LogEntry {
  id: number
  job_id: string
  platform: string
  status: string
  created_at: string
  message?: string
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/application-logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data)
      }
      setError(null)
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  AJOB4AGENT
                </h1>
                <p className="text-xs text-gray-500">AI Job Application Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last updated: just now
              </span>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                Start New Campaign
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center py-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back! 👋
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your AI agents are working around the clock to find and apply to the perfect jobs for you.
            Here's what they've accomplished recently.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Applications</h3>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">📄</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
            <p className="text-xs text-green-600">+12% from last week</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">✅</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {logs.length > 0 ? Math.round((logs.filter(l => l.status === 'success').length / logs.length) * 100) : 0}%
            </div>
            <p className="text-xs text-green-600">+5% improvement</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Interviews</h3>
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">👥</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {logs.filter(l => l.status === 'interview').length}
            </div>
            <p className="text-xs text-purple-600">3 this week</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Avg Response Time</h3>
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <span className="text-orange-600 text-lg">⏱️</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">2.3 days</div>
            <p className="text-xs text-gray-500">Faster than 80% of users</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm text-gray-500">{logs.length} total applications</span>
            </div>
          </div>
          <div className="p-6">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activity yet</h3>
                <p className="text-gray-500">Your AI agents will start working once you create a campaign.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.slice(0, 10).map((log, index) => (
                  <div key={log.id} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      log.status === 'success' ? 'bg-green-500' :
                      log.status === 'pending' ? 'bg-yellow-500' :
                      log.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                    }`}>
                      {log.status === 'success' ? '✓' : 
                       log.status === 'pending' ? '⏳' :
                       log.status === 'failed' ? '✗' : '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {log.status === 'success' ? 'Successfully applied' :
                           log.status === 'pending' ? 'Application pending' :
                           log.status === 'failed' ? 'Application failed' : 'Unknown status'}
                        </p>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span className="font-medium">{log.platform}</span>
                        <span>•</span>
                        <span>Job #{log.job_id.substring(0, 8)}</span>
                      </div>
                      {log.message && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{log.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}