# 打卡日期时间弹窗 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 点击打卡按钮时弹出确认弹窗，允许用户指定打卡日期和时间（默认当前时间），确认后再提交打卡。

**Architecture:** 新增 `CheckInDialog` 组件，用 Tailwind 实现弹窗 UI，通过 `datetime-local` 原生输入框选择时间。修改 `this-week/page.tsx` 使打卡按钮打开弹窗，修改 API 接收可选的 `completedAt` 字段。

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS, Prisma

---

### Task 1: 修改 API 支持 completedAt 字段

**Files:**
- Modify: `src/app/api/instances/[id]/log/route.ts:19,36-44`

**Step 1: 修改 POST handler 解构出 completedAt**

在第 19 行，将：
```typescript
const { countValue, progress, note } = await request.json()
```
改为：
```typescript
const { countValue, progress, note, completedAt } = await request.json()
```

**Step 2: 在创建 Log 时使用 completedAt**

在第 36-44 行，将 `tx.log.create` 的 data 改为：
```typescript
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
```

**Step 3: 启动开发服务器验证无报错**

```bash
npm run dev
```
Expected: 服务器正常启动，无 TypeScript 错误

**Step 4: Commit**

```bash
git add src/app/api/instances/[id]/log/route.ts
git commit -m "feat(api): 支持打卡时传入自定义 completedAt 时间"
```

---

### Task 2: 新建 CheckInDialog 组件

**Files:**
- Create: `src/components/features/CheckInDialog.tsx`

**Step 1: 创建组件文件**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface CheckInDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (completedAt: string) => void
  planName: string
}

function formatLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function CheckInDialog({ isOpen, onClose, onConfirm, planName }: CheckInDialogProps) {
  const [datetime, setDatetime] = useState('')

  useEffect(() => {
    if (isOpen) {
      setDatetime(formatLocalDatetime(new Date()))
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleConfirm() {
    if (!datetime) return
    onConfirm(datetime)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-lg p-6 w-80 space-y-4">
        <h2 className="text-lg font-semibold">打卡确认</h2>
        <p className="text-sm text-muted-foreground">{planName}</p>
        <div className="space-y-2">
          <label className="text-sm font-medium">打卡时间</label>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            确认打卡
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: 确认文件无 TypeScript 错误**

```bash
npx tsc --noEmit
```
Expected: 无错误输出

**Step 3: Commit**

```bash
git add src/components/features/CheckInDialog.tsx
git commit -m "feat(ui): 新增 CheckInDialog 打卡时间确认弹窗组件"
```

---

### Task 3: 修改 this-week/page.tsx 使用弹窗

**Files:**
- Modify: `src/app/(app)/this-week/page.tsx`

**Step 1: 引入 CheckInDialog 组件**

在文件顶部 import 区域添加：
```typescript
import { CheckInDialog } from '@/components/features/CheckInDialog'
```

**Step 2: 添加弹窗状态**

在 `ThisWeekPage` 组件内，现有 state 定义下方添加：
```typescript
const [checkInDialog, setCheckInDialog] = useState<{ open: boolean; instance: Instance | null }>({
  open: false,
  instance: null,
})
```

**Step 3: 修改 handleCheckIn 为打开弹窗**

将现有的 `handleCheckIn` 函数替换为：
```typescript
function handleCheckIn(instance: Instance) {
  setCheckInDialog({ open: true, instance })
}

async function handleCheckInConfirm(completedAt: string) {
  const instance = checkInDialog.instance
  if (!instance) return
  try {
    const res = await fetch(`/api/instances/${instance.id}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countValue: 1, completedAt }),
    })
    if (res.ok) {
      fetchInstances()
    }
  } catch (error) {
    console.error('Failed to check in:', error)
  }
}
```

**Step 4: 在 JSX 中渲染 CheckInDialog**

在 `return` 的最外层 `<div>` 内末尾（`</div>` 前）添加：
```tsx
<CheckInDialog
  isOpen={checkInDialog.open}
  onClose={() => setCheckInDialog({ open: false, instance: null })}
  onConfirm={handleCheckInConfirm}
  planName={checkInDialog.instance?.plan.name ?? ''}
/>
```

**Step 5: 验证功能**

启动开发服务器，访问 `http://localhost:3002/this-week`，点击打卡按钮确认弹窗正常出现、默认时间正确、确认后打卡成功。

```bash
npm run dev
```

**Step 6: Commit**

```bash
git add src/app/(app)/this-week/page.tsx
git commit -m "feat(this-week): 打卡按钮改为弹窗确认，支持指定打卡时间"
```

---

### Task 4: 更新 CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

在 `[Unreleased]` 或最新版本下 `Added` 部分添加：
```markdown
### Added
- 打卡时弹出确认弹窗，支持指定打卡日期和时间，默认显示当前时间
```

**Commit:**

```bash
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG 记录打卡时间弹窗功能"
```
