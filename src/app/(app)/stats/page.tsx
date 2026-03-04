'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { ArrowLeft, TrendingUp, Target, Calendar, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface WeekSummary {
  start: string
  end: string
  total: number
  completed: number
  inProgress: number
  pending: number
  completionRate: number
}

interface TodayStats {
  logsCount: number
}

interface AllTimeStats {
  completedWeeks: number
  totalLogs: number
}

interface TrendData {
  week: string
  label: string
  total: number
  completed: number
  inProgress: number
  pending: number
  completionRate: number
}

export default function StatsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{ week: WeekSummary; today: TodayStats; allTime: AllTimeStats } | null>(null)
  const [trends, setTrends] = useState<TrendData[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  async function fetchStats() {
    try {
      // 并行请求 summary 和 trends
      const [summaryRes, trendsRes] = await Promise.all([
        fetch('/api/stats/summary'),
        fetch('/api/stats/trend?weeks=8'),
      ])

      const [summaryData, trendsData] = await Promise.all([
        summaryRes.json(),
        trendsRes.json(),
      ])

      if (summaryData.data) {
        setSummary(summaryData.data)
      }
      if (trendsData.data) {
        setTrends(trendsData.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">数据统计</h1>
        </div>

        {/* Week Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{summary?.week.total || 0}</p>
              <p className="text-sm text-muted-foreground">本周计划</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-600">{summary?.week.completed || 0}</p>
              <p className="text-sm text-muted-foreground">已完成</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{summary?.week.completionRate || 0}%</p>
              <p className="text-sm text-muted-foreground">完成率</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">{summary?.today.logsCount || 0}</p>
              <p className="text-sm text-muted-foreground">今日打卡</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>本周进度</CardTitle>
          </CardHeader>
          <CardContent>
            {summary?.week.total && summary.week.total > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>总体进度</span>
                  <span>{summary.week.completed}/{summary.week.total} 完成</span>
                </div>
                <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                    style={{ width: `${summary.week.completionRate}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center text-sm">
                  <div>
                    <p className="text-green-600 font-medium">{summary.week.completed}</p>
                    <p className="text-muted-foreground">已完成</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium">{summary.week.inProgress}</p>
                    <p className="text-muted-foreground">进行中</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium">{summary.week.pending}</p>
                    <p className="text-muted-foreground">待开始</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">暂无本周计划数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend Chart */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>历史趋势 (过去8周)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 && trends.some(t => t.total > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      formatter={(value: number) => [`${value}%`, '完成率']}
                    />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: '#3B82F6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">暂无历史数据</p>
                <p className="text-sm text-muted-foreground">开始打卡后，这里会显示你的完成趋势</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>每周完成情况</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.length > 0 && trends.some(t => t.total > 0) ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          completed: '已完成',
                          inProgress: '进行中',
                          pending: '待开始'
                        }
                        return [value, labels[name] || name]
                      }}
                    />
                    <Bar dataKey="completed" stackId="a" fill="#22C55E" name="已完成" />
                    <Bar dataKey="inProgress" stackId="a" fill="#3B82F6" name="进行中" />
                    <Bar dataKey="pending" stackId="a" fill="#E5E7EB" name="待开始" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">暂无历史数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Time Stats */}
        {summary?.allTime && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>累计数据</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-blue-600">{summary.allTime.completedWeeks}</p>
                  <p className="text-sm text-muted-foreground">累计完成周数</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{summary.allTime.totalLogs}</p>
                  <p className="text-sm text-muted-foreground">累计打卡次数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
