import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const weekOffsetParam = request.nextUrl.searchParams.get('weekOffset')
    const weekOffset = weekOffsetParam ? parseInt(weekOffsetParam, 10) : 0
    if (isNaN(weekOffset)) {
      return NextResponse.json(
        { error: { message: '无效的 weekOffset 参数', code: 'INVALID_PARAM' } },
        { status: 400 }
      )
    }
    const isCurrentWeek = weekOffset === 0

    const baseDate = addWeeks(new Date(), weekOffset)
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })

    const logFilter = {
      where: { completedAt: { gte: weekStart, lte: weekEnd } },
      orderBy: { completedAt: 'desc' } as const,
    }

    const instances = await prisma.weeklyInstance.findMany({
      where: { userId: session, weekStart },
      include: { plan: true, logs: logFilter },
    })

    // 只有本周才自动创建缺失实例
    if (isCurrentWeek) {
      const plans = await prisma.recurringPlan.findMany({
        where: { userId: session, isActive: true },
      })

      const existingPlanIds = new Set(instances.map((i) => i.planId))
      const missingPlans = plans.filter((p) => !existingPlanIds.has(p.id))

      if (missingPlans.length > 0) {
        const newInstances = await prisma.weeklyInstance.createManyAndReturn({
          data: missingPlans.map((plan) => ({
            planId: plan.id,
            userId: session,
            weekStart,
            weekEnd,
            targetCount: plan.targetCount,
            currentCount: 0,
            currentProgress: 0,
            status: 'pending',
          })),
        })

        if (newInstances.length > 0) {
          const newFullInstances = await prisma.weeklyInstance.findMany({
            where: { id: { in: newInstances.map((i) => i.id) } },
            include: { plan: true, logs: logFilter },
          })
          instances.push(...newFullInstances)
        }
      }
    }

    return NextResponse.json({ data: instances })
  } catch (error) {
    console.error('Get this week error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
