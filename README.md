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
| 数据库 | PostgreSQL (Prisma ORM) |
| 认证 | Session-based Auth |
| AI | Minimax API |
| 图表 | Recharts |

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

## 许可证

MIT License
