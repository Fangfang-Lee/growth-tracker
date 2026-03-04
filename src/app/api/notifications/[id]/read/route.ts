import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 标记单条通知为已读
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

    const notification = await prisma.notification.findFirst({
      where: { id: params.id, userId: session },
    })

    if (!notification) {
      return NextResponse.json(
        { error: { message: '通知不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    await prisma.notification.update({
      where: { id: params.id },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
