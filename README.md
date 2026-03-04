# Growth Tracker

个人成长追踪工具，帮助用户规划、追踪和复盘个人成长计划。

## 功能特性

- 📋 **计划管理** - 创建和管理个人成长计划
- ✅ **每日打卡** - 追踪每日习惯养成
- 📊 **数据统计** - 查看完成率、趋势分析
- 🤖 **AI 洞察** - 基于打卡数据生成个性化建议
- 📱 **响应式设计** - 支持移动端和桌面端

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router), React, TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | PostgreSQL (Neon) + Prisma ORM |
| 认证 | Session Cookie + bcrypt |
| AI | Minimax API |
| 图表 | Recharts |
| 部署 | Vercel |

## 文档

- [📖 项目指南](./CLAUDE.md) - 开发规范、代码规范、目录结构
- [📋 产品需求文档](./PRD.md) - 功能需求、用户故事
- [⚙️ 技术设计文档](./TECH.md) - 架构设计、数据库设计
- [📝 更新日志](./CHANGELOG.md) - 版本变更记录

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 数据库

### 安装步骤

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 配置数据库连接

# 3. 同步数据库
npx prisma db push

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3002

### 环境变量

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/db_name"

# Minimax AI (可选)
MINIMAX_API_KEY=your_api_key
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证页面
│   │   ├── login/
│   │   └── register/
│   ├── (app)/             # 需要登录的页面
│   │   ├── plans/         # 计划管理
│   │   ├── this-week/     # 本周打卡
│   │   ├── stats/         # 统计页面
│   │   └── settings/      # 设置
│   └── api/               # API 路由
├── components/            # React 组件
├── lib/                   # 工具函数
├── hooks/                 # 自定义 Hooks
└── context/               # React Context
```

## 主要页面

- `/` - 首页仪表盘
- `/plans` - 计划列表
- `/plans/new` - 新建计划
- `/this-week` - 本周打卡
- `/stats` - 数据统计
- `/login` - 登录
- `/register` - 注册

## 部署

### Vercel 部署

```bash
# 构建生产版本
npm run build

# 或者使用 Vercel CLI
vercel deploy
```

### Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d
```

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (http://localhost:3002)

# 构建
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 代码质量
npm run lint            # 代码检查
npm run format          # 代码格式化

# 数据库
npx prisma studio       # 打开数据库管理
npx prisma db push      # 同步数据库结构

# 测试
npm run test            # 运行测试
```

## 相关资源

### 技术文档
- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Recharts 文档](https://recharts.org/)

### 数据库
- [Neon - Serverless PostgreSQL](https://neon.tech)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

## 许可证

MIT License
