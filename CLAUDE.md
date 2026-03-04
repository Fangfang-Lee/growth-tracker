# Growth Tracker 项目指南

---

## 1. 项目概述

**Growth Tracker** - 个人成长追踪工具，帮助用户规划、追踪和复盘个人成长计划。

---

## 2. 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router), React, TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | PostgreSQL (Docker 本地 / Neon 云端) |
| ORM | Prisma |
| 认证 | Session Cookie + bcrypt |
| AI | Minimax API |
| 状态 | TanStack Query + React Context |
| 表单 | React Hook Form + Zod |
| 部署 | Vercel |

---

## 3. 开发环境

### 3.1 环境变量

创建 `.env.local` 文件：

```env
# 本地数据库 (Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/growth_tracker"

# 云端数据库 (Neon) - 生产环境使用
# DATABASE_URL="postgresql://neondb_owner:xxx@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Minimax
MINIMAX_API_KEY=
```

### 3.2 启动命令

```bash
# 1. 启动本地数据库
docker-compose up -d

# 2. 安装依赖
npm install

# 3. 生成 Prisma Client
npx prisma generate

# 4. 同步数据库表结构
npx prisma db push

# 5. 启动开发服务器
npm run dev              # 运行在 http://localhost:3002
```
> **注意**: 项目配置使用端口 3002，避免与其他服务冲突

---

## 4. 代码规范

### 4.1 TypeScript

- 启用严格模式
- 使用 `interface` 定义数据结构
- 避免使用 `any`

### 4.2 React

- 组件使用函数式组件 + Hooks
- 优先使用 TanStack Query 进行服务端状态管理
- 组件文件使用 `.tsx` 扩展名

### 4.3 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证相关页面
│   │   ├── login/
│   │   └── register/
│   ├── (app)/             # 需要登录的页面
│   │   ├── plans/
│   │   ├── this-week/
│   │   ├── categories/
│   │   ├── stats/
│   │   ├── notifications/
│   │   └── settings/
│   └── api/               # API 路由
│
├── components/
│   ├── ui/               # 基础 UI 组件
│   ├── forms/            # 表单组件
│   ├── features/         # 功能组件
│   └── layouts/          # 布局组件
│
├── lib/                  # 工具函数
│   ├── prisma/          # Prisma 客户端
│   └── utils/
│
├── hooks/                # 自定义 Hooks
├── types/                # TypeScript 类型
└── context/              # React Context
```

### 4.4 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `PlanCard.tsx` |
| Hooks | camelCase | `useAuth.ts` |
| 工具函数 | camelCase | `dateUtils.ts` |
| API 路由 | kebab-case | `api/plans/route.ts` |
| 数据库模型 | PascalCase | `User`, `Category` |

---

## 5. 数据库

### 5.1 开发环境

- **本地开发**: 使用 Docker 运行 PostgreSQL
- **生产环境**: 使用 [Neon](https://neon.tech) 云端 PostgreSQL
- 修改 `DATABASE_URL` 切换数据库

### 5.2 Neon 云端数据库

1. 注册 [Neon](https://neon.tech) 账号
2. 创建项目，获取连接字符串
3. 在 Vercel 环境变量中添加 `DATABASE_URL`

### 5.3 Prisma 操作

```bash
# 生成 Prisma Client
npx prisma generate

# 同步表结构到数据库
npx prisma db push

# 打开 Prisma Studio (数据库可视化)
npx prisma studio

# 创建迁移
npx prisma migrate dev --name init
```

### 5.3 注意事项

- 修改 `prisma/schema.prisma` 后需运行 `npx prisma generate`
- 生产环境修改数据库需使用 `migrate` 而非 `db push`

---

## 6. API 设计

### 6.1 RESTful 规范

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/xxx` | 获取列表 |
| GET | `/api/xxx/[id]` | 获取单个 |
| POST | `/api/xxx` | 创建 |
| PUT | `/api/xxx/[id]` | 更新 |
| DELETE | `/api/xxx/[id]` | 删除 |

### 6.2 响应格式

```typescript
// 成功
{ "data": { ... } }

// 错误
{ "error": { "message": "错误信息", "code": "ERROR_CODE" } }
```

---

## 7. Git 规范

### 7.1 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type 类型**：

| type | 说明 |
|------|------|
| feat | 新功能 |
| fix | Bug 修复 |
| docs | 文档更新 |
| style | 代码格式 |
| refactor | 重构 |
| test | 测试 |
| chore | 构建/工具 |

**示例**：

```
feat(plans): 添加循环计划创建功能

- 支持设置打卡类型
- 支持设置提醒

Closes #123
```

### 7.2 分支策略

| 分支 | 用途 |
|------|------|
| main | 生产分支 |
| develop | 开发分支 |
| feature/* | 新功能开发 |
| bugfix/* | Bug 修复 |
| hotfix/* | 紧急修复 |

---

## 8. 版本规范

### 8.1 项目版本

使用语义化版本 `vMajor.Minor.Patch`

### 8.2 文档版本

- `PRD.md` - 产品需求文档
- `TECH.md` - 技术设计文档

---

## 9. 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (http://localhost:3002)
npm run build            # 构建生产版本
npm run start           # 启动生产服务器

# 代码质量
npm run lint            # 代码检查
npm run format          # 代码格式化

# 数据库
docker-compose up -d    # 启动数据库
docker-compose down    # 停止数据库
npx prisma studio      # 打开数据库管理

# 测试
npm run test            # 运行测试
npm run test:watch     # 监听模式
```

---

## 10. 注意事项

1. **不要直接操作数据库**，始终通过 Prisma ORM
2. **敏感信息放环境变量**，不要提交到 Git
3. **先设计后开发**，参照 PRD 和 TECH 文档
4. **组件要职责单一**，复杂逻辑抽离到 hooks
5. **提交前检查代码**，确保通过 lint
6. **每次改动都需要更新版本并记录到 CHANGELOG.md**：
   - 按照 [Keep a Changelog](https://keepachangelog.com/) 格式
   - 在 `[Unreleased]` 下添加变更内容
   - 提交时使用合适的 commit type (feat/fix/docs/refactor 等)
   - 推送后 Vercel 会自动部署新版本

---

## 11. 依赖说明

### 生产依赖

| 类别 | 依赖 | 用途 |
|------|------|------|
| 框架 | next, react, react-dom | Next.js 框架 |
| 数据库 | @prisma/client | Prisma ORM 客户端 |
| 认证 | bcryptjs | 密码哈希 |
| 状态 | @tanstack/react-query | 服务端状态管理 |
| 表单 | react-hook-form, @hookform/resolvers | 表单处理 |
| 验证 | zod | 数据验证 |
| UI | tailwind-merge, clsx | 类名处理 |
| UI | lucide-react | 图标库 |
| UI | recharts | 图表库 |
| 工具 | date-fns | 日期处理 |

### 开发依赖

| 依赖 | 用途 |
|------|------|
| prisma | ORM 工具 |
| typescript | TypeScript |
| tailwindcss, autoprefixer, postcss | CSS 工具 |
| eslint, eslint-config-next | 代码检查 |
| prettier | 代码格式化 |

---

*此文件为项目开发规范，所有开发人员请遵循*
