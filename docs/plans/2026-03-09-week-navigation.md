# 历史周打卡与日志过滤 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复本周日志显示历史数据的 bug，并支持通过 URL 参数 `weekOffset` 切换到历史周补打。

**Architecture:** 两个改动：(1) API 加 `weekOffset` 参数和 log 日期过滤；(2) 页面读取 `weekOffset`、传给 API、顶部加翻页箭头 UI。历史周不自动创建缺失实例，只有本周才自动创建。

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma, date-fns, lucide-react

---

### Task 1: 修复 API — 日志过滤 + 支持 weekOffset

**Files:**
- Modify: `src/app/api/instances/this-week/route.ts`

当前文件完整内容：
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

    const [plans, instances] = await Promise.all([
      prisma.recurringPlan.findMany({
        where: { userId: session, isActive: true },
      }),
      prisma.weeklyInstance.findMany({
        where: { userId: session, weekStart },
        include: {
          plan: true,
          logs: { orderBy: { completedAt: 'desc' } },
        },
      }),
    ])

    const existingPlanIds = new Set(instances.map((i) => i.planId))
    const missingPlans = plans.filter((p) => !existingPlanIds.has(p.id))

    if (missingPlans.length > 0) {
      const newInstances = await prisma.weeklyInstance.createManyAndReturn({
        data: missingPlans.map((plan) => ({
          planId: plan.id,
          userId: session,
          weekStart,
          weekEnd,
          targetCount: plan.targetCount,
          currentCount: 0,
          currentProgress: 0,
          status: 'pending',
        })),
      })

      if (newInstances.length > 0) {
        const newFullInstances = await prisma.weeklyInstance.findMany({
          where: { id: { in: newInstances.map((i) => i.id) } },
          include: { plan: true, logs: true },
        })
        instances.push(...newFullInstances)
      }
    }

    return NextResponse.json({ data: instances })
  } catch (error) {
    console.error('Get this week error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
```

**Step 1: 替换整个文件为以下内容**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = request.cookies.get('session')?.value
    if (!session) {
      return NextResponse.json(
        { error: { message: '未登录', code: 'NOT_AUTHENTICATED' } },
        { status: 401 }
      )
    }

    const weekOffsetParam = request.nextUrl.searchParams.get('weekOffset')
    const weekOffset = weekOffsetParam ? parseInt(weekOffsetParam, 10) : 0
    const isCurrentWeek = weekOffset === 0

    const baseDate = addWeeks(new Date(), weekOffset)
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })

    const logFilter = {
      where: { completedAt: { gte: weekStart, lte: weekEnd } },
      orderBy: { completedAt: 'desc' } as const,
    }

    const instances = await prisma.weeklyInstance.findMany({
      where: { userId: session, weekStart },
      include: { plan: true, logs: logFilter },
    })

    // 只有本周才自动创建缺失实例
    if (isCurrentWeek) {
      const plans = await prisma.recurringPlan.findMany({
        where: { userId: session, isActive: true },
      })

      const existingPlanIds = new Set(instances.map((i) => i.planId))
      const missingPlans = plans.filter((p) => !existingPlanIds.has(p.id))

      if (missingPlans.length > 0) {
        const newInstances = await prisma.weeklyInstance.createManyAndReturn({
          data: missingPlans.map((plan) => ({
            planId: plan.id,
            userId: session,
            weekStart,
            weekEnd,
            targetCount: plan.targetCount,
            currentCount: 0,
            currentProgress: 0,
            status: 'pending',
          })),
        })

        if (newInstances.length > 0) {
          const newFullInstances = await prisma.weeklyInstance.findMany({
            where: { id: { in: newInstances.map((i) => i.id) } },
            include: { plan: true, logs: logFilter },
          })
          instances.push(...newFullInstances)
        }
      }
    }

    return NextResponse.json({ data: instances })
  } catch (error) {
    console.error('Get this week error:', error)
    return NextResponse.json(
      { error: { message: '服务器错误', code: 'SERVER_ERROR' } },
      { status: 500 }
    )
  }
}
```

**Step 2: 验证 TypeScript 无错误**

```bash
npx tsc --noEmit
```
Expected: 无错误

**Step 3: Commit**

```bash
git add src/app/api/instances/this-week/route.ts
git commit -m "fix(api): 修复日志日期过滤并支持 weekOffset 参数查询历史周"
```

---

### Task 2: 页面改造 — 翻页 UI + weekOffset

**Files:**
- Modify: `src/app/(app)/this-week/page.tsx`

**Step 1: 在 import 区域追加需要的引入**

找到：
```typescript
import { ArrowLeft, Check, Trash2 } from 'lucide-react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
```

替换为：
```typescript
import { ArrowLeft, Check, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns'
import { useSearchParams } from 'next/navigation'
```

**Step 2: 在组件内读取 weekOffset**

找到：
```typescript
export default function ThisWeekPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [instances, setInstances] = useState<Instance[]>([])
```

在 `const router = useRouter()` 下方添加：
```typescript
  const searchParams = useSearchParams()
  const weekOffset = parseInt(searchParams.get('weekOffset') ?? '0', 10)
```

**Step 3: 更新 weekStart/weekEnd 计算**

找到：
```typescript
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
```

替换为：
```typescript
  const baseDate = addWeeks(new Date(), weekOffset)
  const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })
```

**Step 4: 更新 fetchInstances 携带 weekOffset**

找到：
```typescript
  async function fetchInstances() {
    try {
      const res = await fetch('/api/instances/this-week')
```

替换为：
```typescript
  async function fetchInstances() {
    try {
      const res = await fetch(`/api/instances/this-week?weekOffset=${weekOffset}`)
```

**Step 5: 在 useEffect 中添加 weekOffset 依赖**

找到：
```typescript
  useEffect(() => {
    if (user) {
      fetchInstances()
    }
  }, [user])
```

替换为：
```typescript
  useEffect(() => {
    if (user) {
      fetchInstances()
    }
  }, [user, weekOffset])
```

**Step 6: 替换顶部标题区翻页 UI**

找到：
```tsx
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">本周打卡</h1>
            <p className="text-muted-foreground">
              {format(weekStart, 'M月d日')} - {format(weekEnd, 'M月d日')}
            </p>
          </div>
        </div>
```

替换为：
```tsx
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/this-week?weekOffset=${weekOffset - 1}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold">
                {weekOffset === 0 ? '本周打卡' : '历史补打'}
              </h1>
              <p className="text-muted-foreground">
                {format(weekStart, 'M月d日')} - {format(weekEnd, 'M月d日')}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/this-week?weekOffset=${weekOffset + 1}`)}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
```

**Step 7: 验证 TypeScript 无错误**

```bash
npx tsc --noEmit
```
Expected: 无错误

**Step 8: 验证功能**

启动开发服务器，访问 `http://localhost:3002/this-week`，点击 `←` 切换到上周，确认 URL 变为 `?weekOffset=-1`，打卡记录只显示上周范围内的数据。

**Step 9: Commit**

```bash
git add src/app/(app)/this-week/page.tsx
git commit -m "feat(this-week): 支持翻页切换历史周补打"
```

---

### Task 3: 更新 CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

在 `[Unreleased]` 的 `Fixed` 部分添加：
```markdown
### Fixed
- 修复本周打卡界面显示历史周打卡记录的问题
```

在 `Added` 部分追加：
```markdown
- 打卡界面支持通过翻页箭头切换历史周，方便补打忘记的打卡
```

**Commit:**
```bash
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG 记录历史周补打功能"
```
