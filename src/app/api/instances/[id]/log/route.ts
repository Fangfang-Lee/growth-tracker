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

    const { countValue, progress, note, completedAt } = await request.json()

    if (completedAt !== undefined) {
      const parsed = new Date(completedAt)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: { message: '无效的打卡时间格式', code: 'INVALID_COMPLETED_AT' } },
          { status: 400 }
        )
      }
    }

    // 使用事务确保原子性
    const result = await prisma.$transaction(async (tx) => {
      // Check instance exists and belongs to user
      const instance = await tx.weeklyInstance.findFirst({
        where: { id: params.id, userId: session },
        include: { plan: true },
      })

      if (!instance) {
        throw new Error('NOT_FOUND')
      }

      const isProgress = instance.plan.targetType === 'progress'

      // Create log
      const log = await tx.log.create({
        data: {
          instanceId: params.id,
          userId: session,
          countValue: countValue || 1,
          progress: isProgress ? progress : null,
          note: note || null,
          ...(completedAt ? { completedAt: new Date(completedAt) } : {}),
        },
      })

      // Update instance
      let updateData
      if (isProgress) {
        updateData = {
          currentProgress: progress,
          status: progress >= 100 ? 'completed' : 'in_progress',
          completedAt: progress >= 100 ? new Date() : null,
        }
      } else {
        const newCount = instance.currentCount + (countValue || 1)
        updateData = {
          currentCount: newCount,
          status: newCount >= instance.targetCount ? 'completed' : 'in_progress',
          completedAt: newCount >= instance.targetCount ? new Date() : null,
        }
      }

      await tx.weeklyInstance.update({
        where: { id: params.id },
        data: updateData,
      })

      return log
    })

    return NextResponse.json({ success: true, log: result })
  } catch (error) {
    console.error('Log error:', error)

    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { message: '实例不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
