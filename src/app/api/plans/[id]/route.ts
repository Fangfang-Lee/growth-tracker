import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取单个计划
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const plan = await prisma.recurringPlan.findFirst({
      where: { id: params.id, userId: session },
      include: {
        weeklyInstances: {
          orderBy: { weekStart: 'desc' },
          take: 10,
        },
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: { message: '计划不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: plan })
  } catch (error) {
    console.error('Get plan error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}

// 更新计划
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const existing = await prisma.recurringPlan.findFirst({
      where: { id: params.id, userId: session },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { message: '计划不存在', code: 'NOT_FOUND' } },
        { status: 404 }
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

    const plan = await prisma.recurringPlan.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(icon && { icon }),
        ...(color && { color }),
        ...(targetType && { targetType }),
        ...(targetCount && { targetCount }),
        ...(targetProgress !== undefined && { targetProgress }),
        ...(frequencyType && { frequencyType }),
        ...(frequencyDays !== undefined && { frequencyDays }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(reminderEnabled !== undefined && { reminderEnabled }),
        ...(reminderMinutes && { reminderMinutes }),
      },
    })

    return NextResponse.json({ data: plan })
  } catch (error) {
    console.error('Update plan error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}

// 删除计划
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const existing = await prisma.recurringPlan.findFirst({
      where: { id: params.id, userId: session },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { message: '计划不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    await prisma.recurringPlan.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}

// 暂停/恢复计划
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const existing = await prisma.recurringPlan.findFirst({
      where: { id: params.id, userId: session },
    })

    if (!existing) {
      return NextResponse.json(
        { error: { message: '计划不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const { isActive } = await request.json()

    const plan = await prisma.recurringPlan.update({
      where: { id: params.id },
      data: { isActive },
    })

    return NextResponse.json({ data: plan })
  } catch (error) {
    console.error('Toggle plan error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
