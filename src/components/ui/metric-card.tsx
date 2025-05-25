
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    period: string
  }
  className?: string
  icon?: React.ReactNode
  format?: 'number' | 'currency' | 'percentage'
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  className, 
  icon,
  format = 'number'
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val)
      case 'percentage':
        return `${val}%`
      default:
        return val.toLocaleString()
    }
  }

  const getTrendIcon = () => {
    if (!change) return null
    if (change.value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (change.value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getTrendColor = () => {
    if (!change) return ""
    if (change.value > 0) return "text-green-600"
    if (change.value < 0) return "text-red-600"
    return "text-gray-500"
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change && (
          <div className={cn("flex items-center text-xs", getTrendColor())}>
            {getTrendIcon()}
            <span className="ml-1">
              {Math.abs(change.value)}% from {change.period}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
