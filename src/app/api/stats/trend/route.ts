import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, subWeeks, format, eachWeekOfInterval, startOfDay, endOfDay } from 'date-fns'

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

    const now = new Date()
    const endDate = startOfWeek(now, { weekStartsOn: 1 })
    const startDate = startOfWeek(subWeeks(endDate, weeks - 1), { weekStartsOn: 1 })

    // 一次性获取所有数据
    const instances = await prisma.weeklyInstance.findMany({
      where: {
        userId: session,
        weekStart: { gte: startDate, lte: endDate },
      },
    })

    // 按周分组统计
    const weekStartDates = eachWeekOfInterval({
      start: startDate,
      end: endDate,
    }, { weekStartsOn: 1 })

    const trends = weekStartDates.map((weekStart) => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekInstances = instances.filter(
        (i) => i.weekStart.getTime() >= weekStart.getTime() && i.weekStart.getTime() <= weekEnd.getTime()
      )

      const total = weekInstances.length
      const completed = weekInstances.filter((i) => i.status === 'completed').length
      const inProgress = weekInstances.filter((i) => i.status === 'in_progress').length

      return {
        week: format(weekStart, 'yyyy-MM-dd'),
        label: format(weekStart, 'MM/dd'),
        total,
        completed,
        inProgress,
        pending: total - completed - inProgress,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      }
    })

    return NextResponse.json({ data: trends })
  } catch (error) {
    console.error('Get trend error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
