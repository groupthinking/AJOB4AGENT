'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { cn } from '../../lib/utils'

interface StatsCardProps {
  title: string
  value: string
  icon: React.ComponentType<any>
  trend?: string
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    icon: 'text-blue-600 dark:text-blue-400',
    accent: 'border-blue-200 dark:border-blue-800'
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950',
    icon: 'text-green-600 dark:text-green-400',
    accent: 'border-green-200 dark:border-green-800'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950',
    icon: 'text-purple-600 dark:text-purple-400',
    accent: 'border-purple-200 dark:border-purple-800'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950',
    icon: 'text-orange-600 dark:text-orange-400',
    accent: 'border-orange-200 dark:border-orange-800'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950',
    icon: 'text-red-600 dark:text-red-400',
    accent: 'border-red-200 dark:border-red-800'
  }
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue' 
}: StatsCardProps) {
  const colors = colorClasses[color]

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-2 transition-all duration-300",
        colors.accent,
        "hover:shadow-lg hover:shadow-black/5"
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn(
            "p-2 rounded-lg",
            colors.bg
          )}>
            <Icon className={cn("h-4 w-4", colors.icon)} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">{value}</div>
          {trend && (
            <p className="text-xs text-muted-foreground flex items-center">
              <span className={cn(
                "text-xs font-medium mr-1",
                trend.includes('+') ? 'text-green-600' : 
                trend.includes('-') ? 'text-red-600' : 
                'text-gray-600'
              )}>
                {trend}
              </span>
            </p>
          )}
          
          {/* Subtle background decoration */}
          <div 
            className={cn(
              "absolute -bottom-2 -right-2 w-16 h-16 rounded-full opacity-10",
              colors.bg
            )} 
          />
        </CardContent>
      </Card>
    </motion.div>
  )
}