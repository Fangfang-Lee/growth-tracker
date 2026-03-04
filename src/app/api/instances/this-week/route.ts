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

    // Get all active plans
    const plans = await prisma.recurringPlan.findMany({
      where: { userId: session, isActive: true },
    })

    // Get this week's instances
    const instances = await prisma.weeklyInstance.findMany({
      where: {
        userId: session,
        weekStart,
      },
      include: {
        plan: true,
        logs: {
          orderBy: { completedAt: 'desc' },
        },
      },
    })

    // Create missing instances
    for (const plan of plans) {
      const exists = instances.find((i) => i.planId === plan.id)
      if (!exists) {
        const newInstance = await prisma.weeklyInstance.create({
          data: {
            planId: plan.id,
            userId: session,
            weekStart,
            weekEnd,
            targetCount: plan.targetCount,
            currentCount: 0,
            currentProgress: 0,
            status: 'pending',
          },
          include: {
            plan: true,
            logs: true,
          },
        })
        instances.push(newInstance)
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
