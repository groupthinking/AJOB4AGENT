'use client'

import { useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format, parseISO, startOfWeek, subWeeks } from 'date-fns'

interface LogEntry {
  id: number
  job_id: string
  platform: string
  status: string
  created_at: string
  message?: string
}

interface JobApplicationsChartProps {
  logs: LogEntry[]
}

export default function JobApplicationsChart({ logs }: JobApplicationsChartProps) {
  const chartData = useMemo(() => {
    if (!logs.length) return []

    // Get the last 4 weeks
    const weeks = Array.from({ length: 4 }, (_, i) => {
      const date = startOfWeek(subWeeks(new Date(), 3 - i))
      return {
        week: format(date, 'MMM dd'),
        weekStart: date,
        applications: 0,
        successful: 0
      }
    })

    // Count applications per week
    logs.forEach(log => {
      const logDate = parseISO(log.created_at)
      const weekIndex = weeks.findIndex(week => {
        const weekEnd = new Date(week.weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)
        return logDate >= week.weekStart && logDate < weekEnd
      })

      if (weekIndex !== -1) {
        weeks[weekIndex].applications++
        if (log.status === 'success' || log.status === 'interview') {
          weeks[weekIndex].successful++
        }
      }
    })

    return weeks
  }, [logs])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{`Week of ${label}`}</p>
          <p className="text-sm text-blue-600">
            Applications: {payload[0]?.value || 0}
          </p>
          <p className="text-sm text-green-600">
            Successful: {payload[1]?.value || 0}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Application Trends</span>
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </CardTitle>
        <CardDescription>
          Weekly application volume and success rates over the last 4 weeks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="week" 
              className="text-xs"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              className="text-xs"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="applications"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="successful"
              stroke="#10B981"
              strokeWidth={3}
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-blue-500 rounded-full" />
            <span className="text-sm text-gray-600">Total Applications</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-600">Successful</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}