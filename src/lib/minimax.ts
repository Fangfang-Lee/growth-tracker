import { NextRequest, NextResponse } from 'next/server'

const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_pro'
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY

export async function callMinimax(prompt: string): Promise<string> {
  if (!MINIMAX_API_KEY) {
    throw new Error('MINIMAX_API_KEY not configured')
  }

  const response = await fetch(MINIMAX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MINIMAX_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'abab6.5s-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的个人成长顾问，擅长分析用户的习惯数据并提供智能建议。请用中文回复。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Minimax API error: ${error}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || '无法生成分析结果'
}

export async function generateHabitInsights(
  categoryName: string,
  logs: any[],
  bestDays: number[],
  confidence: number
): Promise<string> {
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const bestDaysStr = bestDays.map(d => dayNames[d]).join('、')

  const prompt = `
请分析以下习惯数据并提供智能建议：

习惯名称: ${categoryName}
最佳打卡日: ${bestDaysStr || '数据不足'}
数据置信度: ${Math.round(confidence * 100)}%
总打卡次数: ${logs.length}

请提供：
1. 一个简短的习惯分析（50字内）
2. 一条具体的改进建议（50字内）

请用JSON格式回复：
{
  "analysis": "分析内容",
  "suggestion": "建议内容"
}
`

  return callMinimax(prompt)
}

export async function generateWeeklySummary(
  weekData: any,
  allTimeStats: any
): Promise<string> {
  const prompt = `
请为用户生成一份本周习惯总结：

本周完成率: ${weekData.completionRate}%
本周完成次数: ${weekData.completed}
本周总计划: ${weekData.total}

历史累计:
- 累计完成周数: ${allTimeStats.completedWeeks}
- 累计打卡次数: ${allTimeStats.totalLogs}

请生成一段鼓励性的周总结（100字内），用JSON格式：
{
  "summary": "总结内容"
}
`

  return callMinimax(prompt)
}
