import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateHabitInsights } from '@/lib/minimax'

// 触发习惯分析
export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value

    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    // Get all plans for the user
    const plans = await prisma.recurringPlan.findMany({
      where: { userId: session },
    })

    const results: Array<{
      planId: string
      planName: string
      success: boolean
      message: string
      aiAnalysis?: string
      aiSuggestion?: string
    }> = []

    for (const plan of plans) {
      try {
        // Get logs for this plan
        const logs = await prisma.log.findMany({
          where: {
            userId: session,
            instance: {
              planId: plan.id,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        })

        if (logs.length < 3) {
          results.push({
            planId: plan.id,
            planName: plan.name,
            success: false,
            message: `数据不足（${logs.length}条），需要至少3条记录`,
          })
          continue
        }

        // Analyze best days
        const dayCounts = new Array(7).fill(0)
        logs.forEach((log) => {
          const day = new Date(log.createdAt).getDay()
          dayCounts[day]++
        })

        // Find best days (days with most logs)
        const maxCount = Math.max(...dayCounts)
        const bestDays = dayCounts
          .map((count, day) => ({ day, count }))
          .filter((d) => d.count >= maxCount * 0.7)
          .map((d) => d.day)

        // Analyze best time (hour)
        const hourCounts = new Array(24).fill(0)
        logs.forEach((log) => {
          const hour = new Date(log.createdAt).getHours()
          hourCounts[hour]++
        })

        const maxHourCount = Math.max(...hourCounts)
        const bestHour = hourCounts.indexOf(maxHourCount)

        // Calculate confidence based on data points
        const confidence = Math.min(1, logs.length / 20)

        // Determine time range
        const bestTimeStart = `${String(bestHour).padStart(2, '0')}:00`
        const bestTimeEnd = `${String(Math.min(23, bestHour + 2)).padStart(2, '0')}:00`

        // Generate AI insights using Minimax
        let aiAnalysis = ''
        let aiSuggestion = ''

        try {
          const aiResult = await generateHabitInsights(
            plan.name,
            logs,
            bestDays,
            confidence
          )

          // Parse JSON from response
          const parsed = JSON.parse(aiResult)
          aiAnalysis = parsed.analysis || ''
          aiSuggestion = parsed.suggestion || ''
        } catch (aiError) {
          console.error('AI analysis error:', aiError)
          // Use default tips if AI fails
          const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
          const bestDaysStr = bestDays.map(d => dayNames[d]).join('、')
          aiAnalysis = `你通常在${bestDaysStr}完成这个习惯，保持下去！`
          aiSuggestion = '继续坚持，培养更好的习惯'
        }

        results.push({
          planId: plan.id,
          planName: plan.name,
          success: true,
          message: `分析完成，基于 ${logs.length} 条记录`,
          aiAnalysis,
          aiSuggestion,
        })
      } catch (error) {
        console.error(`Analyze error for plan ${plan.id}:`, error)
        results.push({
          planId: plan.id,
          planName: plan.name,
          success: false,
          message: '分析失败',
        })
      }
    }

    // Generate notification
    const successfulCount = results.filter((r) => r.success).length
    if (successfulCount > 0) {
      await prisma.notification.create({
        data: {
          userId: session,
          type: 'habit_tip',
          title: 'AI 习惯分析完成',
          message: `已分析 ${successfulCount} 个计划的 AI 习惯数据`,
        },
      })
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
