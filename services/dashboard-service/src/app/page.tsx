'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime, getStatusColor } from '@/lib/utils'
import StatsCard from '@/components/dashboard/stats-card'
import JobApplicationsChart from '@/components/dashboard/applications-chart'
import RecentActivity from '@/components/dashboard/recent-activity'
import PlatformBreakdown from '@/components/dashboard/platform-breakdown'

interface LogEntry {
  id: number
  job_id: string
  platform: string
  status: string
  created_at: string
  message?: string
  job_title?: string
  company?: string
}

interface DashboardStats {
  totalApplications: number
  successfulApplications: number
  pendingApplications: number
  failedApplications: number
  interviewsScheduled: number
  responseRate: number
  avgResponseTime: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  }
}

export default function Dashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch application logs
      const logsResponse = await fetch('http://localhost:8001/api/application-logs')
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setLogs(logsData)
        
        // Calculate stats from logs
        const statsData = calculateStats(logsData)
        setStats(statsData)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (logs: LogEntry[]): DashboardStats => {
    const total = logs.length
    const successful = logs.filter(log => log.status === 'success').length
    const pending = logs.filter(log => log.status === 'pending').length
    const failed = logs.filter(log => log.status === 'failed').length
    const interviews = logs.filter(log => log.status === 'interview').length
    
    return {
      totalApplications: total,
      successfulApplications: successful,
      pendingApplications: pending,
      failedApplications: failed,
      interviewsScheduled: interviews,
      responseRate: total > 0 ? Math.round((successful + interviews) / total * 100) : 0,
      avgResponseTime: '2.3 days'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDashboardData} className="w-full">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  AJOB4AGENT
                </h1>
                <p className="text-xs text-gray-500">AI Job Application Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {formatRelativeTime(new Date().toISOString())}
              </div>
              <Button variant="gradient" size="sm">
                Start New Campaign
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="text-center py-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back! 👋
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Your AI agents are working around the clock to find and apply to the perfect jobs for you.
              Here's what they've accomplished recently.
            </p>
          </motion.div>

          {/* Stats Grid */}
          {stats && (
            <motion.div variants={itemVariants}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                  title="Total Applications"
                  value={stats.totalApplications.toString()}
                  icon={BriefcaseIcon}
                  trend="+12% from last week"
                  color="blue"
                />
                <StatsCard
                  title="Success Rate"
                  value={`${stats.responseRate}%`}
                  icon={ArrowTrendingUpIcon}
                  trend="+5% improvement"
                  color="green"
                />
                <StatsCard
                  title="Interviews"
                  value={stats.interviewsScheduled.toString()}
                  icon={UserGroupIcon}
                  trend="3 this week"
                  color="purple"
                />
                <StatsCard
                  title="Avg Response Time"
                  value={stats.avgResponseTime}
                  icon={ClockIcon}
                  trend="Faster than 80% of users"
                  color="orange"
                />
              </div>
            </motion.div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <JobApplicationsChart logs={logs} />
            </motion.div>
            <motion.div variants={itemVariants}>
              <PlatformBreakdown logs={logs} />
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <RecentActivity logs={logs.slice(0, 10)} />
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}