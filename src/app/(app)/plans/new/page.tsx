'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Input, Card, CardContent, CardFooter, Label, Select } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'

const ICONS = ['📚', '💪', '🏃', '🎨', '🎵', '💻', '📝', '🧘', '🌅', '💤', '🍎', '💧']
const COLORS = [
  '#3B82F6', // 蓝色
  '#22C55E', // 绿色
  '#F59E0B', // 橙色
  '#EF4444', // 红色
  '#8B5CF6', // 紫色
  '#EC4899', // 粉色
  '#14B8A6', // 青色
  '#6366F1', // 靛蓝
]

export default function NewPlanPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    icon: '📚',
    color: '#3B82F6',
    targetType: 'count',
    targetCount: 1,
    targetProgress: 100,
    frequencyType: 'weekly',
    startDate: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.startDate) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error?.message || '创建失败')
        return
      }

      router.push('/plans')
    } catch (error) {
      console.error('Failed to create plan:', error)
      alert('创建失败')
    } finally {
      setSubmitting(false)
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
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/plans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">新建计划</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* 计划名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">计划名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：每天刷算法题"
                  required
                />
              </div>

              {/* 类型选择 */}
              <div className="space-y-2">
                <Label>目标类型</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetType: 'count' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.targetType === 'count'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">次数型</p>
                    <p className="text-xs text-muted-foreground">如：刷5道题</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetType: 'progress' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.targetType === 'progress'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium">进度型</p>
                    <p className="text-xs text-muted-foreground">如：背单词80%</p>
                  </button>
                </div>
              </div>

              {/* 目标值 */}
              {formData.targetType === 'count' ? (
                <div className="space-y-2">
                  <Label htmlFor="targetCount">每周目标次数</Label>
                  <Input
                    id="targetCount"
                    type="number"
                    min="1"
                    value={formData.targetCount}
                    onChange={(e) =>
                      setFormData({ ...formData, targetCount: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="targetProgress">每周目标进度 (%)</Label>
                  <Input
                    id="targetProgress"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.targetProgress}
                    onChange={(e) =>
                      setFormData({ ...formData, targetProgress: parseInt(e.target.value) || 100 })
                    }
                  />
                </div>
              )}

              {/* 频次 */}
              <div className="space-y-2">
                <Label htmlFor="frequencyType">频次</Label>
                <Select
                  id="frequencyType"
                  value={formData.frequencyType}
                  onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value })}
                >
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                </Select>
              </div>

              {/* 开始日期 */}
              <div className="space-y-2">
                <Label htmlFor="startDate">开始日期</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              {/* 图标选择 */}
              <div className="space-y-2">
                <Label>图标</Label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-colors ${
                        formData.icon === icon
                          ? 'bg-blue-100 ring-2 ring-blue-500'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* 颜色选择 */}
              <div className="space-y-2">
                <Label>颜色</Label>
                <div className="grid grid-cols-8 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              <Link href="/plans">
                <Button variant="outline" type="button">
                  取消
                </Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? '创建中...' : '创建'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
