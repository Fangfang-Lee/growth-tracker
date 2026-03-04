import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Password reset request
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: { message: '邮箱不能为空', code: 'VALIDATION_ERROR' } },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({
        data: { message: '如果邮箱存在，将收到重置链接' },
      })
    }

    // Generate reset token (in production, store this in database with expiry)
    const resetToken = randomBytes(32).toString('hex')

    // In a real app, you would:
    // 1. Store reset token in database with expiry
    // 2. Send email with reset link
    // For now, we'll just return success

    // TODO: Store reset token in database
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: {
    //     resetToken,
    //     resetTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
    //   },
    // })

    // Log for development
    console.log(`Password reset token for ${email}: ${resetToken}`)

    return NextResponse.json({
      data: { message: '如果邮箱存在，将收到重置链接' },
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
