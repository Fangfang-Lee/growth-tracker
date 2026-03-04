import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek } from 'date-fns'

// 获取当前用户的所有循环计划
export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const plans = await prisma.recurringPlan.findMany({
      where: { userId: session },
      include: {
        weeklyInstances: {
          where: {
            weekStart: {
              gte: startOfWeek(new Date(), { weekStartsOn: 1 }),
              lte: endOfWeek(new Date(), { weekStartsOn: 1 }),
            },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: plans })
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}

// 创建新循环计划
export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const {
      name,
      icon,
      color,
      targetType,
      targetCount,
      targetProgress,
      frequencyType,
      frequencyDays,
      startDate,
      endDate,
      reminderEnabled,
      reminderMinutes,
    } = await request.json()

    if (!name || !startDate) {
      return NextResponse.json(
        { error: { message: '缺少必要参数', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    // Check for duplicate plan name
    const existingPlan = await prisma.recurringPlan.findFirst({
      where: { userId: session, name },
    })

    if (existingPlan) {
      return NextResponse.json(
        { error: { message: '计划名称已存在', code: 'PLAN_EXISTS' } },
        { status: 400 }
      )
    }

    // Create plan
    const plan = await prisma.recurringPlan.create({
      data: {
        userId: session,
        name,
        icon: icon || '📌',
        color: color || '#3B82F6',
        targetType: targetType || 'count',
        targetCount: targetCount || 1,
        targetProgress: targetProgress || 100,
        frequencyType: frequencyType || 'weekly',
        frequencyDays: frequencyDays || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        reminderEnabled: reminderEnabled || false,
        reminderMinutes: reminderMinutes || 15,
      },
    })

    // Generate this week's instance
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

    await prisma.weeklyInstance.create({
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
    })

    return NextResponse.json({ data: plan })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
