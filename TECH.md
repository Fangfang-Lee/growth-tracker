# Growth Tracker 技术设计文档

---

## 1. 数据库设计

### 1.1 数据库架构

```
┌─────────────────────────────────────────────────────────┐
│                    数据库架构                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   开发环境                 生产环境                     │
│   ┌───────────┐           ┌───────────┐               │
│   │  Docker   │  ──────▶  │ Supabase  │               │
│   │ PostgreSQL│  同步脚本  │ (云端)    │               │
│   └───────────┘           └───────────┘               │
│                                                         │
│   • 本地开发使用                                     │
│   • Docker Compose 管理                               │
│   • 开发完成后同步到 Supabase                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 本地开发 - Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgis/postgis:15-3.4
    container_name: growth-tracker-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: growth_tracker
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**启动命令**：
```bash
# 启动数据库
docker-compose up -d

# 查看日志
docker-compose logs -f postgres

# 停止数据库
docker-compose down
```

**连接字符串**：
```
postgresql://postgres:postgres@localhost:5432/growth_tracker
```

### 1.3 生产环境 - Supabase

| 配置项 | 值 |
|--------|-----|
| 类型 | PostgreSQL |
| 位置 | 云端（可选区域） |
| 认证 | Supabase Auth |

**连接方式**：通过 Supabase 提供的连接字符串或 API。

> **注意**：开发时使用本地 Docker，生产时使用 Supabase。两个环境使用相同的表结构，通过手动同步或迁移脚本保持一致。

### 1.4 ER 关系图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   users    │     │categories   │     │  recurring_plans   │
├─────────────┤     ├─────────────┤     ├─────────────────────┤
│ id (PK)    │◄────│ user_id     │     │ id (PK)             │
│ email      │     │ id (PK)     │◄────│ category_id (FK)    │
│ password   │     │ name        │     │ user_id (FK)        │
│ nickname   │     │ icon        │     │ name                │
│ created_at │     │ color       │     │ target_count        │
│ updated_at │     │ target_type │     │ frequency_type      │
└─────────────┘     │ created_at │     │ frequency_days      │
                    │ updated_at │     │ start_date          │
                    └─────────────┘     │ end_date           │
                                        │ is_active          │
┌─────────────┐                          │ created_at         │
│notifications│                          │ updated_at         │
├─────────────┤                          └─────────┬───────────┘
│ id (PK)    │                                    │
│ user_id(FK)│                                    │
│ type       │                          ┌───────────▼───────────┐
│ title      │                          │  weekly_instances    │
│ message    │                          ├─────────────────────┤
│ is_read    │                          │ id (PK)             │
│ created_at │                          │ plan_id (FK)        │
└─────────────┘                          │ week_start         │
                                          │ week_end           │
┌─────────────┐                          │ target_count       │
│ user_habits │                          │ current_count      │
├─────────────┤                          │ status             │
│ id (PK)    │                          │ created_at         │
│ user_id(FK)│                          │ updated_at         │
│ category_id│                          └───────────▲───────────┘
│ best_days  │                                      │
│best_time   │                          ┌─────────────▼───────────┐
│confidence  │                          │      logs              │
│ data_points│                          ├─────────────────────┤
│ created_at │                          │ id (PK)              │
│ updated_at │                          │ instance_id (FK)     │
└─────────────┘                          │ user_id (FK)        │
                                          │ progress            │
                                          │ note                │
                                          │ completed_at        │
                                          │ created_at          │
                                          └─────────────────────┘
```

---

### 1.2 详细表结构

#### 1.2.1 users - 用户表

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  nickname text,
  week_start_day int default 1,  -- 1=周一, 0=周日
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS 策略
alter table users enable row level security;

create policy "Users can view own data"
  on users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on users for update
  using (auth.uid() = id);
```

#### 1.2.2 categories - 分类表

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  icon text default '📌',
  color text default '#3B82F6',
  target_type text not null check (target_type in ('count', 'progress')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint unique_category_per_user unique (user_id, name)
);

-- RLS
alter table categories enable row level security;

create policy "Users can manage own categories"
  on categories for all
  using (auth.uid() = user_id);
```

#### 1.2.3 recurring_plans - 循环计划表

```sql
create table recurring_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  name text not null,
  target_count int not null default 1,  -- 目标次数

  -- 频次设置
  frequency_type text not null default 'weekly'
    check (frequency_type in ('daily', 'weekly', 'custom')),
  frequency_days jsonb,  -- [1,2,3,4,5] 表示周一到周五, null 表示每天

  -- 循环设置
  start_date date not null default current_date,
  end_date date,

  -- 提醒设置
  reminder_enabled boolean default false,
  reminder_minutes_before int default 15,

  -- 状态
  is_active boolean default true,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint unique_active_plan_per_category unique (user_id, category_id, is_active)
    where is_active = true
);

-- RLS
alter table recurring_plans enable row level security;

create policy "Users can manage own plans"
  on recurring_plans for all
  using (auth.uid() = user_id);
```

#### 1.2.4 weekly_instances - 每周实例表

```sql
create table weekly_instances (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references recurring_plans(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,

  week_start date not null,
  week_end date not null,

  target_count int not null,
  current_count int not null default 0,
  current_progress int default 0,  -- 进度型用，0-100

  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'archived')),

  completed_at timestamp with time zone,

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint unique_instance_per_plan_week unique (plan_id, week_start)
);

-- RLS
alter table weekly_instances enable row level security;

create policy "Users can view own instances"
  on weekly_instances for all
  using (auth.uid() = user_id);
```

#### 1.2.5 logs - 打卡记录表

```sql
create table logs (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid references weekly_instances(id) on delete cascade not null,
  user_id uuid references users(id) on delete cascade not null,

  -- 次数型: 本次是第几次完成
  count_value int default 1,

  -- 进度型: 当前进度百分比
  progress int,

  note text,

  completed_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- RLS
alter table logs enable row level security;

create policy "Users can manage own logs"
  on logs for all
  using (auth.uid() = user_id);
```

#### 1.2.6 user_habits - 用户习惯表

```sql
create table user_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,

  -- 分析结果
  best_days jsonb,  -- [1,3,5] 表示周一三五完成最多
  best_time_start time,
  best_time_end time,
  confidence float default 0,  -- 0-1
  data_points int default 0,  -- 统计样本数

  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  constraint unique_habit_per_category unique (user_id, category_id)
);

-- RLS
alter table user_habits enable row level security;

create policy "Users can manage own habits"
  on user_habits for all
  using (auth.uid() = user_id);
```

#### 1.2.7 notifications - 通知表

```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,

  type text not null
    check (type in ('reminder', 'habit_tip', 'achievement', 'weekly_summary')),
  title text not null,
  message text not null,

  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- RLS
alter table notifications enable row level security;

create policy "Users can view own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can manage own notifications"
  on notifications for all
  using (auth.uid() = user_id);
```

---

### 1.3 数据库函数

#### 1.3.1 生成每周实例的函数

```sql
create or replace function generate_weekly_instances(plan_uuid uuid, weeks_ahead int default 1)
returns void
language plpgsql
as $$
declare
  v_plan record;
  v_current_week_start date;
  v_week_start date;
  v_week_end date;
  v_weeks int;
begin
  -- 获取计划信息
  select * into v_plan from recurring_plans where id = plan_uuid;

  if v_plan is null then
    raise exception 'Plan not found';
  end if;

  -- 获取当前周开始日期
  v_current_week_start := date_trunc('week', current_date);

  -- 为未来 weeks_ahead 周生成实例
  for i in 0..weeks_ahead loop
    v_week_start := v_current_week_start + (i * 7);
    v_week_end := v_week_start + 6;

    -- 检查是否已存在
    if not exists (
      select 1 from weekly_instances
      where plan_id = plan_uuid and week_start = v_week_start
    ) then
      insert into weekly_instances (
        plan_id, user_id, week_start, week_end,
        target_count, current_count, current_progress, status
      ) values (
        plan_uuid, v_plan.user_id, v_week_start, v_week_end,
        v_plan.target_count, 0, 0, 'pending'
      );
    end if;
  end loop;
end;
$$;
```

#### 1.3.2 打卡后更新实例的触发器

```sql
create or replace function update_instance_on_log()
returns trigger as $$
declare
  v_instance record;
begin
  -- 获取关联的实例
  select * into v_instance
  from weekly_instances
  where id = new.instance_id;

  if v_instance is null then
    return new;
  end if;

  -- 判断打卡类型
  if v_instance.current_progress is not null then
    -- 进度型: 更新进度
    update weekly_instances
    set current_progress = new.progress,
        updated_at = now(),
        status = case when new.progress >= 100 then 'completed' else 'in_progress' end,
        completed_at = case when new.progress >= 100 then now() else null end
    where id = v_instance.id;
  else
    -- 次数型: 更新计数
    update weekly_instances
    set current_count = v_instance.current_count + new.count_value,
        updated_at = now(),
        status = case
          when v_instance.current_count + new.count_value >= v_instance.target_count
          then 'completed'
          else 'in_progress'
        end,
        completed_at = case
          when v_instance.current_count + new.count_value >= v_instance.target_count
          then now()
          else null
        end
    where id = v_instance.id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger on_log_created
  after insert on logs
  for each row
  execute function update_instance_on_log();
```

---

## 2. API 设计

### 2.1 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/logout` | 登出 |
| POST | `/api/auth/reset-password` | 重置密码 |

### 2.2 分类相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取用户所有分类 |
| POST | `/api/categories` | 创建分类 |
| PUT | `/api/categories/[id]` | 更新分类 |
| DELETE | `/api/categories/[id]` | 删除分类 |

### 2.3 循环计划相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/plans` | 获取用户所有循环计划 |
| POST | `/api/plans` | 创建循环计划 |
| PUT | `/api/plans/[id]` | 更新循环计划 |
| DELETE | `/api/plans/[id]` | 删除循环计划 |
| POST | `/api/plans/[id]/pause` | 暂停计划 |
| POST | `/api/plans/[id]/resume` | 恢复计划 |

### 2.4 打卡相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/instances/this-week` | 获取本周所有实例 |
| GET | `/api/instances/[id]` | 获取单个实例详情 |
| POST | `/api/instances/[id]/log` | 打卡（次数型） |
| PUT | `/api/instances/[id]/progress` | 更新进度（进度型） |

### 2.5 数据统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/trend` | 获取趋势数据 |
| GET | `/api/stats/summary` | 获取本周统计 |

### 2.6 通知相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/notifications` | 获取通知列表 |
| PUT | `/api/notifications/[id]/read` | 标记已读 |
| PUT | `/api/notifications/read-all` | 全部已读 |

### 2.7 Agent 相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agent/insights` | 获取习惯洞察 |
| POST | `/api/agent/analyze` | 触发分析 |

---

## 3. 页面路由

### 3.1 路由结构

```
/
├── (auth)
│   ├── login
│   │   └── page.tsx
│   └── register
│       └── page.tsx
│
├── (app) - 需要登录
│   ├── page.tsx                    # 仪表盘
│   │
│   ├── plans
│   │   ├── page.tsx                # 循环计划列表
│   │   ├── new
│   │   │   └── page.tsx            # 创建计划
│   │   └── [id]
│   │       ├── page.tsx            # 计划详情
│   │       └── edit
│   │           └── page.tsx        # 编辑计划
│   │
│   ├── this-week
│   │   └── page.tsx                # 本周打卡页
│   │
│   ├── categories
│   │   └── page.tsx                # 分类管理
│   │
│   ├── stats
│   │   └── page.tsx                # 统计页
│   │
│   ├── notifications
│   │   └── page.tsx                # 通知中心
│   │
│   └── settings
│       └── page.tsx                # 个人设置
```

### 3.2 路由守卫

- `(auth)` 路由组：未登录可访问，登录后重定向到 `/`
- `(app)` 路由组：需要登录，未登录重定向到 `/login`

---

## 4. 组件结构

### 4.1 目录结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (app)/
│   │   ├── plans/
│   │   ├── this-week/
│   │   ├── categories/
│   │   ├── stats/
│   │   ├── notifications/
│   │   └── settings/
│   ├── api/
│   └── layout.tsx
│
├── components/
│   ├── ui/                 # 基础UI组件
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   └── ...
│   │
│   ├── forms/              # 表单组件
│   │   ├── CategoryForm/
│   │   ├── PlanForm/
│   │   └── ...
│   │
│   ├── features/           # 功能组件
│   │   ├── PlanCard/
│   │   ├── ProgressRing/
│   │   ├── TrendChart/
│   │   ├── CheckInButton/
│   │   ├── HabitInsight/
│   │   └── ...
│   │
│   └── layouts/           # 布局组件
│       ├── AppHeader/
│       ├── Sidebar/
│       └── ...
│
├── lib/                   # 工具函数
│   ├── supabase/
│   │   └── client.ts
│   ├── utils/
│   └── date.ts
│
├── hooks/                 # 自定义 hooks
│   ├── useAuth.ts
│   ├── usePlans.ts
│   └── useStats.ts
│
└── types/                 # TypeScript 类型
    └── index.ts
```

### 4.2 核心组件

| 组件 | 说明 |
|------|------|
| PlanCard | 计划卡片，展示进度和打卡入口 |
| ProgressRing | 环形进度条 |
| TrendChart | 趋势图表（使用 Recharts） |
| CheckInButton | 打卡按钮（次数型） |
| ProgressSlider | 进度滑块（进度型） |
| HabitInsight | Agent 习惯洞察展示 |
| NotificationBell | 通知铃铛组件 |
| WeekSelector | 周选择器 |

---

## 5. 状态管理

### 5.1 全局状态

使用 React Context + useReducer：

```typescript
// auth-context.tsx
interface AuthState {
  user: User | null;
  loading: boolean;
}

// plans-context.tsx
interface PlansState {
  plans: Plan[];
  instances: WeeklyInstance[];
  loading: boolean;
}
```

### 5.2 服务端状态

使用 TanStack Query (React Query)：

```typescript
// 分类
useQuery({ queryKey: ['categories'], queryFn: fetchCategories })
useMutation({ mutationFn: createCategory })

// 计划
useQuery({ queryKey: ['plans'], queryFn: fetchPlans })
useQuery({ queryKey: ['this-week'], queryFn: fetchThisWeekInstances })

// 统计
useQuery({ queryKey: ['stats', 'trend'], queryFn: fetchTrend })
```

---

## 6. 技术栈详情

### 6.1 技术选型

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 14 (App Router) |
| UI框架 | Tailwind CSS |
| 数据库(本地) | Docker PostgreSQL |
| 数据库(云端) | Supabase |
| ORM | Prisma |
| 认证 | Supabase Auth |
| AI模型 | Minimax API |
| 状态管理 | TanStack Query + React Context |
| 图表 | Recharts |
| 表单 | React Hook Form + Zod |
| 部署 | Vercel |

### 6.2 依赖列表

```json
{
  "dependencies": {
    "next": "latest",
    "react": "latest",
    "@prisma/client": "^5",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.1",
    "@tanstack/react-query": "^5",
    "recharts": "^2",
    "date-fns": "^3",
    "zod": "^3",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "lucide-react": "^0.3",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "prisma": "^5",
    "@types/node": "latest",
    "@types/react": "latest",
    "typescript": "latest",
    "tailwindcss": "latest",
    "postcss": "latest",
    "autoprefixer": "latest",
    "eslint": "latest",
    "prettier": "latest"
  }
}
```

### 6.2 环境变量

```env
# 本地数据库 (Docker)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/growth_tracker"

# Supabase (生产环境)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Minimax
MINIMAX_API_KEY=your_minimax_api_key
```

### 6.3 Prisma Schema 设计

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  nickname     String?
  weekStartDay Int       @default(1)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  categories      Category[]
  recurringPlans RecurringPlan[]
  weeklyInstances WeeklyInstance[]
  logs            Log[]
  userHabits     UserHabit[]
  notifications  Notification[]
}

model Category {
  id         String   @id @default(uuid())
  userId     String
  name       String
  icon       String   @default("📌")
  color      String   @default("#3B82F6")
  targetType String   // "count" | "progress"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  recurringPlans RecurringPlan[]
  userHabits    UserHabit[]

  @@unique([userId, name])
}

model RecurringPlan {
  id               String    @id @default(uuid())
  userId           String
  categoryId       String
  name             String
  targetCount      Int       @default(1)
  frequencyType    String    @default("weekly") // "daily" | "weekly" | "custom"
  frequencyDays    Json?     // [1,2,3,4,5]
  startDate        DateTime
  endDate          DateTime?
  reminderEnabled  Boolean   @default(false)
  reminderMinutes  Int       @default(15)
  isActive         Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  category        Category          @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  weeklyInstances WeeklyInstance[]

  @@unique([userId, categoryId, isActive])
}

model WeeklyInstance {
  id            String    @id @default(uuid())
  planId        String
  userId        String
  weekStart     DateTime
  weekEnd       DateTime
  targetCount   Int
  currentCount  Int       @default(0)
  currentProgress Int     @default(0)
  status        String    @default("pending") // "pending" | "in_progress" | "completed" | "archived"
  completedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  plan   RecurringPlan @relation(fields: [planId], references: [id], onDelete: Cascade)
  user   User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs   Log[]

  @@unique([planId, weekStart])
}

model Log {
  id          String    @id @default(uuid())
  instanceId  String
  userId      String
  countValue  Int       @default(1)
  progress    Int?
  note        String?
  completedAt DateTime  @default(now())
  createdAt   DateTime  @default(now())

  instance WeeklyInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserHabit {
  id              String   @id @default(uuid())
  userId          String
  categoryId      String
  bestDays        Json?    // [1,3,5]
  bestTimeStart   String?
  bestTimeEnd     String?
  confidence      Float    @default(0)
  dataPoints      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  type      String   // "reminder" | "habit_tip" | "achievement" | "weekly_summary"
  title     String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 7. 实现优先级

### Phase 1: MVP

1. 用户注册/登录
2. 分类管理（创建/编辑/删除）
3. 循环计划管理（创建/编辑/暂停）
4. 本周打卡
5. 仪表盘展示

### Phase 2: 统计与可视化

1. 趋势图表
2. 单个计划历史
3. 整体趋势

### Phase 3: Agent

1. 习惯分析
2. 习惯洞察展示
3. 智能提醒（基础）

### Phase 4: 完善

1. 通知中心
2. 个人设置
3. 优化体验

---

## 8. 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0 | 2024-03-04 | 初版技术设计 |

---

*文档生成时间: 2024-03-04*
