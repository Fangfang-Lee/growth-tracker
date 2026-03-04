import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, subWeeks, format } from 'date-fns'

// 获取趋势数据 - 过去 N 周的完成情况
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const weeks = parseInt(searchParams.get('weeks') || '8')

    // Get data for past N weeks
    const trends = []
    const now = new Date()

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      // Get instances for this week
      const instances = await prisma.weeklyInstance.findMany({
        where: {
          userId: session,
          weekStart: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          plan: true,
        },
      })

      // Calculate stats
      const total = instances.length
      const completed = instances.filter((i) => i.status === 'completed').length
      const inProgress = instances.filter((i) => i.status === 'in_progress').length

      trends.push({
        week: format(weekStart, 'yyyy-MM-dd'),
        label: format(weekStart, 'MM/dd'),
        total,
        completed,
        inProgress,
        pending: total - completed - inProgress,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      })
    }

    return NextResponse.json({ data: trends })
  } catch (error) {
    console.error('Get trend error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
