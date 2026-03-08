'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, CardContent } from '@/components/ui'
import { ArrowLeft, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns'
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

function ThisWeekContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawOffset = parseInt(searchParams.get('weekOffset') ?? '0', 10)
  const weekOffset = isNaN(rawOffset) ? 0 : rawOffset
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingProgress, setPendingProgress] = useState<Record<string, number>>({})
  const [progressDialog, setProgressDialog] = useState<{
    open: boolean
    instance: Instance | null
    progress: number
  }>({ open: false, instance: null, progress: 0 })
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
  }, [user, weekOffset])

  async function fetchInstances() {
    try {
      const res = await fetch(`/api/instances/this-week?weekOffset=${weekOffset}`)
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
    const instanceId = checkInDialog.instance?.id
    if (!instanceId) return
    try {
      const res = await fetch(`/api/instances/${instanceId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countValue: 1, completedAt }),
      })
      if (res.ok) {
        setCheckInDialog({ open: false, instance: null })
        fetchInstances()
      }
    } catch (error) {
      console.error('Failed to check in:', error)
    }
  }

  async function handleProgressConfirm(completedAt: string) {
    const { instance, progress } = progressDialog
    if (!instance) return
    const instanceId = instance.id
    try {
      const res = await fetch(`/api/instances/${instanceId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress, completedAt }),
      })
      if (res.ok) {
        setProgressDialog({ open: false, instance: null, progress: 0 })
        setPendingProgress((prev) => {
          const next = { ...prev }
          delete next[instanceId]
          return next
        })
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

  const baseDate = addWeeks(new Date(), weekOffset)
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })

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
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/this-week?weekOffset=${weekOffset - 1}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold">
                {weekOffset === 0 ? '本周打卡' : '历史补打'}
              </h1>
              <p className="text-muted-foreground">
                {format(weekStart, 'M月d日')} - {format(weekEnd, 'M月d日')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/this-week?weekOffset=${weekOffset + 1}`)}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
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
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={pendingProgress[instance.id] ?? instance.currentProgress}
                        disabled={instance.currentProgress >= 100}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setPendingProgress((prev) => ({ ...prev, [instance.id]: v }))
                        }}
                        onMouseUp={() => {
                          const value = pendingProgress[instance.id] ?? instance.currentProgress
                          if (value !== instance.currentProgress) {
                            setProgressDialog({ open: true, instance, progress: value })
                          }
                        }}
                        onTouchEnd={() => {
                          const value = pendingProgress[instance.id] ?? instance.currentProgress
                          if (value !== instance.currentProgress) {
                            setProgressDialog({ open: true, instance, progress: value })
                          }
                        }}
                        className="flex-1 h-2 cursor-pointer"
                        style={{ accentColor: instance.plan.color }}
                      />
                      <span className="w-12 text-center text-sm">
                        {pendingProgress[instance.id] ?? instance.currentProgress}%
                      </span>
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
              <p className="text-muted-foreground mb-4">
                {weekOffset === 0 ? '本周还没有计划' : '该周没有打卡记录'}
              </p>
              {weekOffset === 0 && (
                <Link href="/plans/new">
                  <Button>创建计划</Button>
                </Link>
              )}
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
      <CheckInDialog
        isOpen={progressDialog.open}
        onClose={() => {
          const inst = progressDialog.instance
          if (inst) {
            setPendingProgress((prev) => ({
              ...prev,
              [inst.id]: inst.currentProgress,
            }))
          }
          setProgressDialog({ open: false, instance: null, progress: 0 })
        }}
        onConfirm={handleProgressConfirm}
        planName={progressDialog.instance?.plan.name ?? ''}
      />
    </div>
  )
}

export default function ThisWeekPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>加载中...</p></div>}>
      <ThisWeekContent />
    </Suspense>
  )
}
