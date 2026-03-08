# 进度型任务拖拽滑块设计

**日期：** 2026-03-08
**状态：** 已批准

---

## 背景

当前进度型任务使用 +/- 按钮调整进度，每次步进 10%。用户希望改为拖拽滑块，精度 1%，拖拽结束后弹出打卡时间确认弹窗（复用现有 CheckInDialog）。

---

## 需求

- 移除 +/- 按钮（Minus/Plus）
- 用原生 `<input type="range" min=0 max=100 step=1>` 替换
- 拖拽过程中实时预览进度
- 拖拽结束后弹出 CheckInDialog 确认打卡时间
- 用户取消时进度回滚到上次 API 确认的值
- 进度已达 100% 时禁用滑块

---

## 方案

原生 `<input type="range">`，零依赖，配合 Tailwind 样式。

---

## 设计细节

### state 变更

在 `ThisWeekPage` 中新增：

```typescript
// 拖拽中的临时进度（key: instanceId）
const [pendingProgress, setPendingProgress] = useState<Record<string, number>>({})

// 进度打卡弹窗状态
const [progressDialog, setProgressDialog] = useState<{
  open: boolean
  instance: Instance | null
  progress: number
}>({ open: false, instance: null, progress: 0 })
```

移除已有的 `progressInput` state（不再需要）。

### 交互逻辑

```
onChange  → setPendingProgress({ ...prev, [id]: value })  // 实时预览
onMouseUp / onTouchEnd → 打开 progressDialog
```

取消：`setPendingProgress({ ...prev, [id]: instance.currentProgress })`
确认：调用 API，成功后关闭弹窗并刷新

### handleProgressUpdate 修改

新增 `completedAt` 参数：

```typescript
async function handleProgressConfirm(completedAt: string) {
  const { instance, progress } = progressDialog
  if (!instance) return
  const instanceId = instance.id
  const res = await fetch(`/api/instances/${instanceId}/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress, completedAt }),
  })
  if (res.ok) {
    setProgressDialog({ open: false, instance: null, progress: 0 })
    fetchInstances()
  }
}
```

### JSX 变更

进度型卡片区域替换为：

```tsx
<div className="flex items-center gap-3">
  <input
    type="range"
    min={0}
    max={100}
    step={1}
    value={pendingProgress[instance.id] ?? instance.currentProgress}
    disabled={instance.currentProgress >= 100}
    onChange={(e) => setPendingProgress({ ...pendingProgress, [instance.id]: Number(e.target.value) })}
    onMouseUp={() => setProgressDialog({ open: true, instance, progress: pendingProgress[instance.id] ?? instance.currentProgress })}
    onTouchEnd={() => setProgressDialog({ open: true, instance, progress: pendingProgress[instance.id] ?? instance.currentProgress })}
    className="flex-1 accent-[color]"
    style={{ accentColor: instance.plan.color }}
  />
  <span className="w-12 text-center text-sm">
    {pendingProgress[instance.id] ?? instance.currentProgress}%
  </span>
</div>
```

在 return 底部复用 CheckInDialog：

```tsx
<CheckInDialog
  isOpen={progressDialog.open}
  onClose={() => {
    setPendingProgress({ ...pendingProgress, [progressDialog.instance?.id ?? '']: progressDialog.instance?.currentProgress ?? 0 })
    setProgressDialog({ open: false, instance: null, progress: 0 })
  }}
  onConfirm={handleProgressConfirm}
  planName={progressDialog.instance?.plan.name ?? ''}
/>
```

---

## 影响范围

| 文件 | 变更类型 |
|------|----------|
| `src/app/(app)/this-week/page.tsx` | 修改 |

`CheckInDialog` 组件无需修改。
