# 进度型任务拖拽滑块 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将进度型任务的 +/- 按钮替换为原生 range 滑块，拖拽结束后弹出 CheckInDialog 确认打卡时间，取消时回滚进度。

**Architecture:** 仅修改 `this-week/page.tsx`：新增 `pendingProgress` 和 `progressDialog` state，移除 `progressInput` state 和 `handleProgressUpdate` 函数，新增 `handleProgressConfirm`，替换 JSX 中的 +/- 按钮为 range input，复用现有 `CheckInDialog`。

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Tailwind CSS

---

### Task 1: 替换 state 并重写进度处理逻辑

**Files:**
- Modify: `src/app/(app)/this-week/page.tsx`

**Step 1: 移除 `progressInput` state，新增两个 state**

找到第 39 行：
```typescript
const [progressInput, setProgressInput] = useState<Record<string, number>>({})
```

替换为：
```typescript
const [pendingProgress, setPendingProgress] = useState<Record<string, number>>({})
const [progressDialog, setProgressDialog] = useState<{
  open: boolean
  instance: Instance | null
  progress: number
}>({ open: false, instance: null, progress: 0 })
```

**Step 2: 移除 `handleProgressUpdate` 函数，新增 `handleProgressConfirm`**

找到并删除整个 `handleProgressUpdate` 函数（第 93-107 行）：
```typescript
async function handleProgressUpdate(instance: Instance, progress: number) {
  try {
    const res = await fetch(`/api/instances/${instance.id}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    })

    if (res.ok) {
      fetchInstances()
    }
  } catch (error) {
    console.error('Failed to update progress:', error)
  }
}
```

在其位置插入新函数：
```typescript
async function handleProgressConfirm(completedAt: string) {
  const { instance, progress } = progressDialog
  if (!instance) return
  const instanceId = instance.id
  try {
    const res = await fetch(`/api/instances/${instanceId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, completedAt }),
    })
    if (res.ok) {
      setProgressDialog({ open: false, instance: null, progress: 0 })
      fetchInstances()
    }
  } catch (error) {
    console.error('Failed to update progress:', error)
  }
}
```

**Step 3: 验证 TypeScript 无错误**

```bash
npx tsc --noEmit
```
Expected: 无错误输出

**Step 4: Commit**

```bash
git add src/app/(app)/this-week/page.tsx
git commit -m "refactor(this-week): 替换进度打卡 state 和处理函数为滑块弹窗模式"
```

---

### Task 2: 替换 JSX 中的 +/- 按钮为 range 滑块

**Files:**
- Modify: `src/app/(app)/this-week/page.tsx`

**Step 1: 移除 +/- 按钮，替换为 range input**

找到 `isProgress` 分支的 JSX（第 205-247 行）：
```tsx
{isProgress ? (
  <div>
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          handleProgressUpdate(
            instance,
            Math.max(0, instance.currentProgress - 10)
          )
        }
        disabled={instance.currentProgress >= 100}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <div className="flex-1">
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${instance.currentProgress}%`,
              backgroundColor: instance.plan.color,
            }}
          />
        </div>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          handleProgressUpdate(
            instance,
            Math.min(100, instance.currentProgress + 10)
          )
        }
        disabled={instance.currentProgress >= 100}
      >
        <Plus className="w-4 h-4" />
      </Button>
      <span className="w-12 text-center">{instance.currentProgress}%</span>
    </div>
  </div>
) : (
```

替换为：
```tsx
{isProgress ? (
  <div className="flex items-center gap-3">
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      value={pendingProgress[instance.id] ?? instance.currentProgress}
      disabled={instance.currentProgress >= 100}
      onChange={(e) =>
        setPendingProgress({
          ...pendingProgress,
          [instance.id]: Number(e.target.value),
        })
      }
      onMouseUp={() =>
        setProgressDialog({
          open: true,
          instance,
          progress: pendingProgress[instance.id] ?? instance.currentProgress,
        })
      }
      onTouchEnd={() =>
        setProgressDialog({
          open: true,
          instance,
          progress: pendingProgress[instance.id] ?? instance.currentProgress,
        })
      }
      className="flex-1 h-2 cursor-pointer"
      style={{ accentColor: instance.plan.color }}
    />
    <span className="w-12 text-center text-sm">
      {pendingProgress[instance.id] ?? instance.currentProgress}%
    </span>
  </div>
) : (
```

**Step 2: 移除 imports 中不再使用的图标**

找到第 8 行：
```typescript
import { ArrowLeft, Check, Plus, Minus, Trash2 } from 'lucide-react'
```

替换为：
```typescript
import { ArrowLeft, Check, Trash2 } from 'lucide-react'
```

**Step 3: 在 return 底部添加进度打卡弹窗**

找到现有的 `CheckInDialog`（第 298-303 行）：
```tsx
<CheckInDialog
  isOpen={checkInDialog.open}
  onClose={() => setCheckInDialog({ open: false, instance: null })}
  onConfirm={handleCheckInConfirm}
  planName={checkInDialog.instance?.plan.name ?? ''}
/>
```

在其后（`</div>` 前）添加：
```tsx
<CheckInDialog
  isOpen={progressDialog.open}
  onClose={() => {
    setPendingProgress({
      ...pendingProgress,
      [progressDialog.instance?.id ?? '']: progressDialog.instance?.currentProgress ?? 0,
    })
    setProgressDialog({ open: false, instance: null, progress: 0 })
  }}
  onConfirm={handleProgressConfirm}
  planName={progressDialog.instance?.plan.name ?? ''}
/>
```

**Step 4: 验证 TypeScript 无错误**

```bash
npx tsc --noEmit
```
Expected: 无错误输出

**Step 5: Commit**

```bash
git add src/app/(app)/this-week/page.tsx
git commit -m "feat(this-week): 进度型任务改为拖拽滑块打卡，支持指定打卡时间"
```

---

### Task 3: 更新 CHANGELOG

**Files:**
- Modify: `CHANGELOG.md`

在 `[Unreleased]` 的 `Added` 部分追加：
```markdown
- 进度型任务改为拖拽滑块打卡（精度 1%），拖拽结束后弹窗确认打卡时间，取消时回滚进度
```

**Commit:**
```bash
git add CHANGELOG.md
git commit -m "docs: 更新 CHANGELOG 记录进度滑块功能"
```
