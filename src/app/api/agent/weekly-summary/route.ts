import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWeeklySummary } from '@/lib/minimax'
import { startOfWeek, endOfWeek } from 'date-fns'

// 获取 AI 周总结
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
    })

    const total = instances.length
    const completed = instances.filter((i) => i.status === 'completed').length
    const inProgress = instances.filter((i) => i.status === 'in_progress').length

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

    const weekData = {
      total,
      completed,
      inProgress,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }

    const allTimeStats = {
      completedWeeks: allTimeCompleted,
      totalLogs,
    }

    // Generate AI summary using Minimax
    let aiSummary = ''

    try {
      const aiResult = await generateWeeklySummary(weekData, allTimeStats)
      const parsed = JSON.parse(aiResult)
      aiSummary = parsed.summary || ''
    } catch (aiError) {
      console.error('AI summary error:', aiError)
      // Fallback summary
      if (weekData.completionRate >= 80) {
        aiSummary = '本周表现非常出色！继续保持这种状态，你正在养成良好的习惯。'
      } else if (weekData.completionRate >= 50) {
        aiSummary = '本周完成不错，下周继续努力！坚持就是胜利。'
      } else if (weekData.completionRate > 0) {
        aiSummary = '本周有进步空间，每天坚持一点点，习惯就会自然养成。'
      } else {
        aiSummary = '新的一周又开始了，从今天开始建立你的习惯吧！'
      }
    }

    return NextResponse.json({
      data: {
        week: weekData,
        allTime: allTimeStats,
        aiSummary,
      },
    })
  } catch (error) {
    console.error('Get weekly summary error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
