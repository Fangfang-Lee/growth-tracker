'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Button, Input, Card, CardContent, CardFooter, Label, Select } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'

const ICONS = ['📚', '💪', '🏃', '🎨', '🎵', '💻', '📝', '🧘', '🌅', '💤', '🍎', '💧']
const COLORS = [
  '#3B82F6', '#22C55E', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1',
]

export default function EditPlanPage() {
  const params = useParams()
  const planId = params?.id as string

  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    icon: '📚',
    color: '#3B82F6',
    targetType: 'count',
    targetCount: 1,
    targetProgress: 100,
    frequencyType: 'weekly',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (planId) {
      fetchPlan()
    }
  }, [planId])

  async function fetchPlan() {
    try {
      const res = await fetch(`/api/plans/${planId}`)
      const data = await res.json()
      if (data.data) {
        const p = data.data
        setFormData({
          name: p.name || '',
          icon: p.icon || '📚',
          color: p.color || '#3B82F6',
          targetType: p.targetType || 'count',
          targetCount: p.targetCount || 1,
          targetProgress: p.targetProgress || 100,
          frequencyType: p.frequencyType || 'weekly',
          startDate: p.startDate ? p.startDate.split('T')[0] : '',
          endDate: p.endDate ? p.endDate.split('T')[0] : '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.startDate) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          icon: formData.icon,
          color: formData.color,
          targetType: formData.targetType,
          targetCount: formData.targetCount,
          targetProgress: formData.targetProgress,
          frequencyType: formData.frequencyType,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error?.message || '更新失败')
        return
      }

      router.push(`/plans/${planId}`)
    } catch (error) {
      console.error('Failed to update plan:', error)
      alert('更新失败')
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
          <Link href={`/plans/${planId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">编辑计划</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">计划名称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>目标类型</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetType: 'count' })}
                    className={`p-3 rounded-lg border-2 ${
                      formData.targetType === 'count' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    次数型
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, targetType: 'progress' })}
                    className={`p-3 rounded-lg border-2 ${
                      formData.targetType === 'progress' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    进度型
                  </button>
                </div>
              </div>

              {formData.targetType === 'count' ? (
                <div className="space-y-2">
                  <Label>每周目标次数</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.targetCount}
                    onChange={(e) => setFormData({ ...formData, targetCount: parseInt(e.target.value) || 1 })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>每周目标进度 (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.targetProgress}
                    onChange={(e) => setFormData({ ...formData, targetProgress: parseInt(e.target.value) || 100 })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>频次</Label>
                <Select
                  value={formData.frequencyType}
                  onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value })}
                >
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>结束日期（可选）</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>图标</Label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg ${
                        formData.icon === icon ? 'bg-blue-100 ring-2 ring-blue-500' : 'bg-gray-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>颜色</Label>
                <div className="grid grid-cols-8 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2">
              <Link href={`/plans/${planId}`}>
                <Button variant="outline" type="button">取消</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? '保存中...' : '保存'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  )
}
