'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui'
import { ArrowLeft, Check, Plus, Minus, Trash2 } from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { CheckInDialog } from '@/components/features/CheckInDialog'

interface Instance {
  id: string
  targetCount: number
  currentCount: number
  currentProgress: number
  status: string
  plan: {
    name: string
    icon: string
    color: string
    targetType: string
    targetProgress: number
  }
  logs: Array<{
    id: string
    countValue: number
    progress: number | null
    note: string | null
    completedAt: string
  }>
}

export default function ThisWeekPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [progressInput, setProgressInput] = useState<Record<string, number>>({})
  const [checkInDialog, setCheckInDialog] = useState<{ open: boolean; instance: Instance | null }>({
    open: false,
    instance: null,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchInstances()
    }
  }, [user])

  async function fetchInstances() {
    try {
      const res = await fetch('/api/instances/this-week')
      const data = await res.json()
      if (data.data) {
        setInstances(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch instances:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleCheckIn(instance: Instance) {
    setCheckInDialog({ open: true, instance })
  }

  async function handleCheckInConfirm(completedAt: string) {
    const instance = checkInDialog.instance
    if (!instance) return
    try {
      const res = await fetch(`/api/instances/${instance.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countValue: 1, completedAt }),
      })
      if (res.ok) {
        fetchInstances()
      }
    } catch (error) {
      console.error('Failed to check in:', error)
    }
  }

  async function handleProgressUpdate(instance: Instance, progress: number) {
    try {
      const res = await fetch(`/api/instances/${instance.id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      })

      if (res.ok) {
        fetchInstances()
      }
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  async function handleDeleteLog(logId: string) {
    if (!confirm('确定要删除这条打卡记录吗？')) return

    try {
      const res = await fetch(`/api/logs/${logId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchInstances()
      }
    } catch (error) {
      console.error('Failed to delete log:', error)
    }
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    )
  }

  const completedCount = instances.filter((i) => i.status === 'completed').length
  const totalCount = instances.length

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">本周打卡</h1>
            <p className="text-muted-foreground">
              {format(weekStart, 'M月d日')} - {format(weekEnd, 'M月d日')}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span>完成率</span>
            <span>
              {completedCount}/{totalCount} ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {instances.map((instance) => {
            const isProgress = instance.plan.targetType === 'progress'
            const isCompleted = instance.status === 'completed'

            return (
              <Card key={instance.id} className={isCompleted ? 'border-green-500' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="text-2xl w-12 h-12 flex items-center justify-center rounded-lg"
                        style={{ backgroundColor: instance.plan.color + '20' }}
                      >
                        {instance.plan.icon}
                      </span>
                      <div>
                        <p className="font-medium">{instance.plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {isProgress
                            ? `进度型: ${instance.currentProgress}%`
                            : `次数型: ${instance.currentCount}/${instance.targetCount}`}
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        已完成
                      </span>
                    )}
                  </div>

                  {isProgress ? (
                    <div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleProgressUpdate(
                              instance,
                              Math.max(0, instance.currentProgress - 10)
                            )
                          }
                          disabled={instance.currentProgress >= 100}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1">
                          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${instance.currentProgress}%`,
                                backgroundColor: instance.plan.color,
                              }}
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleProgressUpdate(
                              instance,
                              Math.min(100, instance.currentProgress + 10)
                            )
                          }
                          disabled={instance.currentProgress >= 100}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center">{instance.currentProgress}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCheckIn(instance)}
                        disabled={instance.currentCount >= instance.targetCount}
                        className="flex-1"
                        style={{ backgroundColor: instance.plan.color }}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        打卡 ({instance.currentCount}/{instance.targetCount})
                      </Button>
                    </div>
                  )}

                  {instance.logs.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-2">打卡记录</p>
                      <div className="space-y-1">
                        {instance.logs.slice(0, 5).map((log) => (
                          <div key={log.id} className="flex items-center justify-between text-sm group">
                            <span>
                              {format(new Date(log.completedAt), 'MM/dd HH:mm')}
                              {log.note && ` - ${log.note}`}
                            </span>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {instances.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">本周还没有计划</p>
              <Link href="/plans/new">
                <Button>创建计划</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      <CheckInDialog
        isOpen={checkInDialog.open}
        onClose={() => setCheckInDialog({ open: false, instance: null })}
        onConfirm={handleCheckInConfirm}
        planName={checkInDialog.instance?.plan.name ?? ''}
      />
    </div>
  )
}
