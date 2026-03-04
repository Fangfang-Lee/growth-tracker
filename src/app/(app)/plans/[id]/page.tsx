'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { ArrowLeft, Calendar, Clock, BarChart3, CheckCircle, Circle, Pencil } from 'lucide-react'
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns'

interface Plan {
  id: string
  name: string
  icon: string
  color: string
  targetType: string
  targetCount: number
  targetProgress: number
  frequencyType: string
  frequencyDays: number[] | null
  startDate: string
  endDate: string | null
  isActive: boolean
}

interface Instance {
  id: string
  weekStart: string
  weekEnd: string
  targetCount: number
  currentCount: number
  currentProgress: number
  status: string
  completedAt: string | null
}

export default function PlanDetailPage() {
  const params = useParams()
  const planId = params?.id as string

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user && planId) {
      fetchPlan()
    }
  }, [user, planId])

  async function fetchPlan() {
    try {
      const res = await fetch(`/api/plans/${planId}`)
      const data = await res.json()
      if (data.data) {
        setPlan(data.data)
        // Sort by week start descending
        const sorted = [...(data.data.weeklyInstances || [])].sort(
          (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
        )
        setInstances(sorted.slice(0, 8))
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error)
    } finally {
      setLoading(false)
    }
  }

  function getFrequencyText(plan: Plan) {
    if (plan.frequencyType === 'daily') return '每天'
    if (plan.frequencyType === 'weekly') return '每周'
    return '自定义'
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return <span className="text-green-600">已完成</span>
      case 'in_progress':
        return <span className="text-blue-600">进行中</span>
      case 'pending':
        return <span className="text-gray-500">待开始</span>
      default:
        return <span className="text-gray-500">{status}</span>
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>计划不存在</p>
      </div>
    )
  }

  const completedCount = instances.filter((i) => i.status === 'completed').length
  const totalWeeks = instances.length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/plans">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">计划详情</h1>
          </div>
          <Link href={`/plans/${planId}/edit`}>
            <Button variant="outline">
              <Pencil className="w-4 h-4 mr-2" />
              编辑
            </Button>
          </Link>
        </div>

        {/* Plan Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <span
                className="text-4xl w-16 h-16 flex items-center justify-center rounded-xl"
                style={{ backgroundColor: plan.color + '20' }}
              >
                {plan.icon}
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{plan.name}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className={`px-2 py-1 rounded ${plan.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {plan.isActive ? '进行中' : '已暂停'}
                  </span>
                  <span className="text-muted-foreground">
                    {plan.targetType === 'progress'
                      ? `进度型: ${plan.targetProgress}%`
                      : `次数型: ${plan.targetCount}次/周`}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>频率: {getFrequencyText(plan)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>开始: {format(new Date(plan.startDate), 'yyyy-MM-dd')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalWeeks}</p>
              <p className="text-sm text-muted-foreground">统计周数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-sm text-muted-foreground">已完成</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{totalWeeks > 0 ? Math.round((completedCount / totalWeeks) * 100) : 0}%</p>
              <p className="text-sm text-muted-foreground">完成率</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              历史记录
            </CardTitle>
          </CardHeader>
          <CardContent>
            {instances.length > 0 ? (
              <div className="space-y-3">
                {instances.map((instance) => (
                  <div key={instance.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      {instance.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300" />
                      )}
                      <div>
                        <p className="font-medium">
                          {format(new Date(instance.weekStart), 'MM/dd')} - {format(new Date(instance.weekEnd), 'MM/dd')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {instance.status === 'completed'
                            ? `${instance.currentCount}/${instance.targetCount} 次`
                            : getStatusBadge(instance.status)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(instance.status)}
                      {instance.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          完成于 {format(new Date(instance.completedAt), 'MM/dd HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">暂无历史记录</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
