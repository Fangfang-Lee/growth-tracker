'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Plus, Pause, Play, Trash2, ArrowLeft } from 'lucide-react'

interface Plan {
  id: string
  name: string
  icon: string
  color: string
  targetType: string
  targetCount: number
  targetProgress: number
  frequencyType: string
  isActive: boolean
  weeklyInstances: Array<{
    id: string
    currentCount: number
    currentProgress: number
    status: string
  }>
}

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchPlans()
    }
  }, [user])

  async function fetchPlans() {
    try {
      const res = await fetch('/api/plans')
      const data = await res.json()
      if (data.data) {
        setPlans(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    } finally {
      setLoading(false)
    }
  }

  async function togglePlan(id: string, isActive: boolean) {
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        fetchPlans()
      }
    } catch (error) {
      console.error('Failed to toggle plan:', error)
    }
  }

  async function deletePlan(id: string) {
    if (!confirm('确定要删除这个计划吗？')) return

    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchPlans()
      }
    } catch (error) {
      console.error('Failed to delete plan:', error)
    }
  }

  function getProgress(plan: Plan) {
    if (!plan.weeklyInstances.length) return { current: 0, total: plan.targetCount, percent: 0 }

    const instance = plan.weeklyInstances[0]
    const total = plan.targetType === 'progress' ? plan.targetProgress : plan.targetCount

    if (plan.targetType === 'progress') {
      return {
        current: instance.currentProgress,
        total: plan.targetProgress,
        percent: instance.currentProgress,
      }
    }

    return {
      current: instance.currentCount,
      total: plan.targetCount,
      percent: Math.min(100, Math.round((instance.currentCount / total) * 100)),
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
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">我的计划</h1>
          </div>
          <Link href="/plans/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新建计划
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => {
            const progress = getProgress(plan)

            return (
              <Link key={plan.id} href={`/plans/${plan.id}`}>
                <Card className={!plan.isActive ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-2xl w-10 h-10 flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: plan.color + '20' }}
                        >
                          {plan.icon}
                        </span>
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {plan.targetType === 'progress'
                              ? `进度型: ${progress.current}%`
                              : `次数型: ${progress.current}/${progress.total}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            togglePlan(plan.id, plan.isActive)
                          }}
                        >
                          {plan.isActive ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            deletePlan(plan.id)
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>本周进度</span>
                        <span>{progress.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progress.percent}%`,
                            backgroundColor: plan.color,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {plans.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">还没有创建任何计划</p>
              <Link href="/plans/new">
                <Button>创建第一个计划</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
