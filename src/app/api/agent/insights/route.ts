import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取习惯洞察
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    // Get user plans with recent logs for insights
    const plans = await prisma.recurringPlan.findMany({
      where: { userId: session },
    })

    // Get recent activity data for insights
    const recentLogs = await prisma.log.findMany({
      where: {
        userId: session,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        instance: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate stats per plan
    const planStats = new Map<string, { count: number; days: Set<number> }>()

    recentLogs.forEach((log) => {
      const planId = log.instance?.planId
      if (!planId) return

      const existing = planStats.get(planId) || { count: 0, days: new Set<number>() }
      existing.count++
      existing.days.add(new Date(log.createdAt).getDay())
      planStats.set(planId, existing)
    })

    // Generate insights from plan data
    const insights = plans.map((plan) => {
      const stats = planStats.get(plan.id)
      const days = stats ? Array.from(stats.days) : []
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

      return {
        planId: plan.id,
        planName: plan.name,
        planIcon: plan.icon,
        bestDays: days.length > 0 ? days : null,
        bestDaysText: days.length > 0 ? days.map((d) => dayNames[d]).join('、') : null,
        totalLogs: stats?.count || 0,
        confidence: stats && stats.count >= 10 ? 0.8 : stats && stats.count >= 5 ? 0.5 : 0.2,
        tip: generateTip(stats?.count || 0),
      }
    })

    // Generate recommendations
    const recommendations: Array<{ planId: string; message: string }> = []

    if (recentLogs.length === 0) {
      recommendations.push({
        planId: '',
        message: '开始打卡以获取个性化习惯洞察',
      })
    } else {
      planStats.forEach((stats, planId) => {
        if (stats.count < 5) {
          const plan = plans.find((p) => p.id === planId)
          recommendations.push({
            planId,
            message: `${plan?.name || '计划'}需要更多数据来生成洞察，当前有 ${stats.count} 条记录`,
          })
        }
      })
    }

    // Get activity by day of week
    const activityByDay = new Array(7).fill(0)
    recentLogs.forEach((log) => {
      activityByDay[new Date(log.createdAt).getDay()]++
    })

    return NextResponse.json({
      data: {
        insights,
        recommendations,
        stats: {
          totalLogs: recentLogs.length,
          activePlans: plans.length,
          activityByDay,
        },
      },
    })
  } catch (error) {
    console.error('Get insights error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}

function generateTip(count: number): string {
  if (count === 0) {
    return '开始打卡以获取个性化洞察'
  }
  if (count < 5) {
    return '继续坚持打卡，数据越多洞察越准确'
  }
  if (count < 10) {
    return '你已经养成了一些习惯，继续保持！'
  }

  return '你已经有足够的数据来分析习惯了'
}
