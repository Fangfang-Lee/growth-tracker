import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 删除打卡记录并回退数据
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

    const logId = params.id

    // 使用事务确保原子性
    await prisma.$transaction(async (tx) => {
      // 查找打卡记录
      const log = await tx.log.findFirst({
        where: { id: logId, userId: session },
        include: { instance: { include: { plan: true } } },
      })

      if (!log) {
        throw new Error('NOT_FOUND')
      }

      const instance = log.instance

      // 回退数据
      if (instance.plan.targetType === 'progress') {
        // 进度型：回退 progress
        const newProgress = Math.max(0, (instance.currentProgress || 0) - (log.progress || 0))

        // 计算剩余的 progress 总和
        const remainingLogs = await tx.log.aggregate({
          where: {
            instanceId: instance.id,
            id: { not: logId },
          },
          _sum: { progress: true },
        })

        const remainingProgress = remainingLogs._sum.progress || 0

        await tx.weeklyInstance.update({
          where: { id: instance.id },
          data: {
            currentProgress: remainingProgress,
            status: remainingProgress >= 100 ? 'completed' : remainingProgress > 0 ? 'in_progress' : 'pending',
            completedAt: remainingProgress >= 100 ? new Date() : null,
          },
        })
      } else {
        // 次数型：回退 count
        const newCount = Math.max(0, instance.currentCount - log.countValue)

        // 计算剩余的 count 总和
        const remainingLogs = await tx.log.aggregate({
          where: {
            instanceId: instance.id,
            id: { not: logId },
          },
          _sum: { countValue: true },
        })

        const remainingCount = remainingLogs._sum.countValue || 0

        await tx.weeklyInstance.update({
          where: { id: instance.id },
          data: {
            currentCount: remainingCount,
            status: remainingCount >= instance.targetCount ? 'completed' : remainingCount > 0 ? 'in_progress' : 'pending',
            completedAt: remainingCount >= instance.targetCount ? new Date() : null,
          },
        })
      }

      // 删除打卡记录
      await tx.log.delete({ where: { id: logId } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete log error:', error)

    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { message: '打卡记录不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
