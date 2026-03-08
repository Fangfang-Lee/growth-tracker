# 历史周打卡与日志过滤 设计文档

**日期：** 2026-03-09
**状态：** 已批准

---

## 背景

1. **Bug：** 本周打卡页面会显示历史周的打卡记录，因为 `include logs` 没有按当前周日期过滤。
2. **新功能：** 支持进入历史周界面补打，入口为顶部翻页箭头（← →）。

---

## 需求

- 修复：本周打卡记录只显示本周范围内的日志
- 功能：顶部加 ← → 翻页，可切换到任意历史周（无追溯限制）
- 历史周支持次数型和进度型两种任务补打
- 不能前进到未来（`→` 在本周时禁用）
- URL 参数 `weekOffset` 记录当前偏移量（0=本周，-1=上周，以此类推）

---

## 方案

URL 参数驱动：`/this-week?weekOffset=-1`，API 接收 `weekOffset` 参数，用 `addWeeks` 偏移计算目标周。

---

## 设计细节

### API 改造（`src/app/api/instances/this-week/route.ts`）

1. 读取 `request.nextUrl.searchParams.get('weekOffset')`，默认 `0`
2. 用 `addWeeks(new Date(), weekOffset)` 作为基准日期计算 `weekStart/weekEnd`
3. `include logs` 加日期过滤：
   ```typescript
   logs: {
     where: { completedAt: { gte: weekStart, lte: weekEnd } },
     orderBy: { completedAt: 'desc' }
   }
   ```
4. 历史周不自动创建缺失实例（只查已有的），只有 `weekOffset === 0` 时才自动创建
5. 新建实例时的 `include logs` 也加相同过滤

### 页面改造（`src/app/(app)/this-week/page.tsx`）

1. 用 `useSearchParams` 读取 `weekOffset`，默认 `0`
2. API 请求改为 `/api/instances/this-week?weekOffset=${weekOffset}`
3. 翻页函数：
   ```typescript
   function goToPrevWeek() {
     router.push(`/this-week?weekOffset=${weekOffset - 1}`)
   }
   function goToNextWeek() {
     if (weekOffset < 0) router.push(`/this-week?weekOffset=${weekOffset + 1}`)
   }
   ```
4. 标题区域改为：
   ```tsx
   <Button onClick={goToPrevWeek} variant="ghost" size="icon"><ChevronLeft /></Button>
   <div>
     <h1>{ weekOffset === 0 ? '本周打卡' : '历史补打' }</h1>
     <p>M月d日 - M月d日</p>
   </div>
   <Button onClick={goToNextWeek} disabled={weekOffset >= 0} variant="ghost" size="icon"><ChevronRight /></Button>
   ```
5. `weekStart/weekEnd` 计算改为基于 `weekOffset`：
   ```typescript
   const baseDate = addWeeks(new Date(), weekOffset)
   const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 })
   const weekEnd = endOfWeek(baseDate, { weekStartsOn: 1 })
   ```

---

## 影响范围

| 文件 | 变更类型 |
|------|----------|
| `src/app/api/instances/this-week/route.ts` | 修改（bug 修复 + weekOffset 支持） |
| `src/app/(app)/this-week/page.tsx` | 修改（翻页 UI + weekOffset 读取） |
