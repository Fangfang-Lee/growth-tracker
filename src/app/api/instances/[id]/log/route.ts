import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 打卡（次数型）或更新进度（进度型）
export async function POST(
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

    // Check instance exists and belongs to user
    const instance = await prisma.weeklyInstance.findFirst({
      where: { id: params.id, userId: session },
      include: {
        plan: true,
      },
    })

    if (!instance) {
      return NextResponse.json(
        { error: { message: '实例不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const { countValue, progress, note } = await request.json()
    const isProgress = instance.plan.targetType === 'progress'

    // Create log
    const log = await prisma.log.create({
      data: {
        instanceId: params.id,
        userId: session,
        countValue: countValue || 1,
        progress: isProgress ? progress : null,
        note: note || null,
      },
    })

    // Update instance
    if (isProgress) {
      await prisma.weeklyInstance.update({
        where: { id: params.id },
        data: {
          currentProgress: progress,
          status: progress >= 100 ? 'completed' : 'in_progress',
          completedAt: progress >= 100 ? new Date() : null,
        },
      })
    } else {
      const newCount = instance.currentCount + (countValue || 1)
      await prisma.weeklyInstance.update({
        where: { id: params.id },
        data: {
          currentCount: newCount,
          status: newCount >= instance.targetCount ? 'completed' : 'in_progress',
          completedAt: newCount >= instance.targetCount ? new Date() : null,
        },
      })
    }

    return NextResponse.json({ success: true, log })
  } catch (error) {
    console.error('Log error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
