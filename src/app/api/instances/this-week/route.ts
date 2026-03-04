import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek } from 'date-fns'

// 获取本周所有实例
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

    // 并行获取活跃计划和本周实例
    const [plans, instances] = await Promise.all([
      prisma.recurringPlan.findMany({
        where: { userId: session, isActive: true },
      }),
      prisma.weeklyInstance.findMany({
        where: { userId: session, weekStart },
        include: {
          plan: true,
          logs: { orderBy: { completedAt: 'desc' } },
        },
      }),
    ])

    // 找出缺失的实例
    const existingPlanIds = new Set(instances.map((i) => i.planId))
    const missingPlans = plans.filter((p) => !existingPlanIds.has(p.id))

    // 批量创建缺失的实例
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

      // 获取新创建实例的完整数据
      if (newInstances.length > 0) {
        const newFullInstances = await prisma.weeklyInstance.findMany({
          where: {
            id: { in: newInstances.map((i) => i.id) },
          },
          include: { plan: true, logs: true },
        })
        instances.push(...newFullInstances)
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
