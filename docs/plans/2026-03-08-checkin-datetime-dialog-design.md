# 打卡日期时间弹窗功能设计

**日期：** 2026-03-08
**状态：** 已批准

---

## 背景

当前打卡（check-in）功能点击按钮后直接调用 API，无法指定打卡时间。用户希望打卡时弹出确认弹窗，可以自定义打卡的日期和时间，默认显示当前时间。

---

## 需求

- 点击打卡按钮时，弹出确认弹窗
- 弹窗内有日期时间选择器，默认值为当前本地时间
- 用户可修改时间后确认打卡，或取消
- 不需要备注（note）字段

---

## 方案

使用浏览器原生 `<input type="datetime-local">` + Tailwind 弹窗，无额外依赖。

---

## 设计细节

### 新增组件

`src/components/features/CheckInDialog.tsx`

- Props：`instanceId`, `isOpen`, `onClose`, `onConfirm(completedAt: string)`
- 弹窗标题：「打卡确认」
- 包含 `datetime-local` 输入框，初始值为当前时间（`YYYY-MM-DDTHH:mm`）
- 按钮：「确认打卡」、「取消」

### 修改 this-week/page.tsx

- 引入 `CheckInDialog` 组件
- 用 state 管理弹窗开关及选中的 instance
- `handleCheckIn` 改为打开弹窗，弹窗确认后再调用 API 并传入 `completedAt`

### 修改 API

`src/app/api/instances/[id]/log/route.ts`

- 接收可选字段 `completedAt`（ISO 字符串）
- 创建 Log 时若有 `completedAt` 则覆盖默认的 `now()`

---

## 影响范围

| 文件 | 变更类型 |
|------|----------|
| `src/components/features/CheckInDialog.tsx` | 新增 |
| `src/app/(app)/this-week/page.tsx` | 修改 |
| `src/app/api/instances/[id]/log/route.ts` | 修改 |

---

## 数据流

```
用户点击打卡
  → 打开 CheckInDialog（默认当前时间）
  → 用户选择时间，点击「确认打卡」
  → POST /api/instances/[id]/log { countValue: 1, completedAt: "2026-03-08T14:30" }
  → API 创建 Log，completedAt 使用传入值
  → 刷新页面数据
```
