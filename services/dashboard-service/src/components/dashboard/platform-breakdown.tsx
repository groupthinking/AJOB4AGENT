'use client'

import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

interface LogEntry {
  id: number
  job_id: string
  platform: string
  status: string
  created_at: string
}

interface PlatformBreakdownProps {
  logs: LogEntry[]
}

const PLATFORM_COLORS = {
  LinkedIn: '#0077B5',
  Glassdoor: '#0CAA41', 
  Wellfound: '#F26522',
  Indeed: '#003A9B',
  Other: '#64748B'
}

export default function PlatformBreakdown({ logs }: PlatformBreakdownProps) {
  const platformData = useMemo(() => {
    if (!logs.length) return []

    const platformCounts = logs.reduce((acc, log) => {
      const platform = log.platform || 'Other'
      acc[platform] = (acc[platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      count,
      percentage: Math.round((count / logs.length) * 100),
      color: PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS] || PLATFORM_COLORS.Other
    })).sort((a, b) => b.count - a.count)
  }, [logs])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{data.platform}</p>
          <p className="text-sm text-gray-600">
            {data.count} applications ({data.percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null // Don't show label if less than 5%
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle>Platform Distribution</CardTitle>
        <CardDescription>
          Application breakdown across job platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={platformData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
            >
              {platformData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        
        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {platformData.map((platform, index) => (
            <div key={platform.platform} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: platform.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {platform.platform}
                </p>
                <p className="text-xs text-gray-500">
                  {platform.count} ({platform.percentage}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}