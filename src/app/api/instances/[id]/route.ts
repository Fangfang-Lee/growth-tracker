import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 获取单个实例详情
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

    const instance = await prisma.weeklyInstance.findFirst({
      where: { id: params.id, userId: session },
      include: {
        plan: true,
        logs: { orderBy: { completedAt: 'desc' } },
      },
    })

    if (!instance) {
      return NextResponse.json(
        { error: { message: '实例不存在', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: instance })
  } catch (error) {
    console.error('Get instance error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
