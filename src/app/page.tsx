'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { ClipboardList, BarChart3, Bell, Settings, LogOut, ArrowRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'

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
}

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  async function fetchData() {
    try {
      const res = await fetch('/api/instances/this-week')
      const data = await res.json()
      if (data.data) {
        setInstances(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Growth Tracker</h1>
          <p className="text-muted-foreground">正在加载...</p>
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  const pendingInstances = instances.filter((i) => i.status !== 'completed')
  const completedCount = instances.filter((i) => i.status === 'completed').length

  const features = [
    {
      icon: ClipboardList,
      title: '我的计划',
      description: '管理你的每周计划',
      href: '/plans',
      color: 'text-blue-500',
    },
    {
      icon: BarChart3,
      title: '数据统计',
      description: '查看完成趋势',
      href: '/stats',
      color: 'text-green-500',
    },
    {
      icon: Bell,
      title: '通知中心',
      description: '查看提醒',
      href: '/notifications',
      color: 'text-orange-500',
    },
    {
      icon: Settings,
      title: '个人设置',
      description: '修改个人信息',
      href: '/settings',
      color: 'text-gray-500',
    },
  ]

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              你好，{user.nickname || '朋友'} 👋
            </h1>
            <p className="text-muted-foreground">
              {format(weekStart, 'M月d日')} - {format(weekEnd, 'M月d日')}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Week Progress */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-medium">本周进度</span>
              <span className="text-muted-foreground">
                {completedCount}/{instances.length} 完成
              </span>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all"
                style={{
                  width: `${instances.length > 0 ? (completedCount / instances.length) * 100 : 0}%`,
                }}
              />
            </div>
            <Link href="/this-week">
              <Button className="w-full">
                立即打卡 <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        {pendingInstances.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">待完成</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInstances.slice(0, 3).map((instance) => (
                  <Link key={instance.id} href="/this-week">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xl w-10 h-10 flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: instance.plan.color + '20' }}
                        >
                          {instance.plan.icon}
                        </span>
                        <div>
                          <p className="font-medium">{instance.plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {instance.plan.targetType === 'progress'
                              ? `${instance.currentProgress}%`
                              : `${instance.currentCount}/${instance.targetCount}`}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
                {pendingInstances.length > 3 && (
                  <Link href="/this-week">
                    <p className="text-center text-sm text-muted-foreground">
                      还有 {pendingInstances.length - 3} 项...
                    </p>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <feature.icon className={`w-8 h-8 mb-2 ${feature.color}`} />
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
