import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek } from 'date-fns'

// 获取本周统计摘要
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    // Get this week's instances
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

    // Calculate summary
    const total = instances.length
    const completed = instances.filter((i) => i.status === 'completed').length
    const inProgress = instances.filter((i) => i.status === 'in_progress').length
    const pending = total - completed - inProgress

    // Get today's logs
    const todayLogs = await prisma.log.findMany({
      where: {
        userId: session,
        createdAt: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
        },
      },
    })

    // Get all-time stats
    const allTimeCompleted = await prisma.weeklyInstance.count({
      where: {
        userId: session,
        status: 'completed',
      },
    })

    const totalLogs = await prisma.log.count({
      where: {
        userId: session,
      },
    })

    return NextResponse.json({
      data: {
        week: {
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          total,
          completed,
          inProgress,
          pending,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
        today: {
          logsCount: todayLogs.length,
        },
        allTime: {
          completedWeeks: allTimeCompleted,
          totalLogs,
        },
      },
    })
  } catch (error) {
    console.error('Get summary error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
