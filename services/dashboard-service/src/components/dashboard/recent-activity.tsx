'use client'

import { motion } from 'framer-motion'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  EyeIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatRelativeTime, getStatusColor } from '@/lib/utils'

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

interface RecentActivityProps {
  logs: LogEntry[]
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'success':
    case 'applied':
      return CheckCircleIcon
    case 'failed':
    case 'error':
      return XCircleIcon
    case 'pending':
    case 'processing':
      return ClockIcon
    case 'interview':
      return EyeIcon
    default:
      return BriefcaseIcon
  }
}

const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'success':
      return 'Successfully applied'
    case 'failed':
      return 'Application failed'
    case 'pending':
      return 'Application pending'
    case 'processing':
      return 'Processing application'
    case 'interview':
      return 'Interview scheduled'
    default:
      return status
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  }
}

export default function RecentActivity({ logs }: RecentActivityProps) {
  const recentLogs = logs.slice(0, 8) // Show only recent 8 activities

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Recent Activity</span>
          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
        </CardTitle>
        <CardDescription>
          Latest job application updates from your AI agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentLogs.length === 0 ? (
          <div className="text-center py-8">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your AI agents will start working once you create a campaign.
            </p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            {recentLogs.map((log, index) => {
              const StatusIcon = getStatusIcon(log.status)
              const statusColor = getStatusColor(log.status)
              
              return (
                <motion.div
                  key={log.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01, x: 5 }}
                  className="flex items-start space-x-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
                >
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    statusColor
                  )}>
                    <StatusIcon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {getStatusText(log.status)}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                      <span className="font-medium">{log.platform}</span>
                      <span>•</span>
                      <span>Job #{log.job_id.substring(0, 8)}</span>
                      {log.job_title && (
                        <>\n                          <span>•</span>\n                          <span className="truncate max-w-xs">{log.job_title}</span>\n                        </>\n                      )}\n                    </div>\n                    \n                    {log.message && (\n                      <p className=\"mt-1 text-xs text-gray-600 line-clamp-2\">\n                        {log.message}\n                      </p>\n                    )}\n                    \n                    {log.company && (\n                      <div className=\"mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700\">\n                        {log.company}\n                      </div>\n                    )}\n                  </div>\n                  \n                  {/* Activity indicator */}\n                  <div className=\"flex-shrink-0\">\n                    {index < 2 && (\n                      <div className=\"h-2 w-2 bg-green-500 rounded-full animate-pulse\" />\n                    )}\n                  </div>\n                </motion.div>\n              )\n            })}\n          </motion.div>\n        )}\n        \n        {recentLogs.length > 0 && (\n          <div className=\"mt-6 text-center\">\n            <button className=\"text-sm text-blue-600 hover:text-blue-500 font-medium\">\n              View all activity →\n            </button>\n          </div>\n        )}\n      </CardContent>\n    </Card>\n  )\n}