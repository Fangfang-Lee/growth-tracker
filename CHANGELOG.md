# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2024-03-04

### Added
- 用户认证系统（注册、登录、登出）
- 循环计划管理（创建、编辑、删除）
- 打卡功能（次数型和进度型）
- 本周计划视图
- 统计数据页面（本周摘要、趋势图表）
- 习惯洞察功能
- 通知系统
- 设置页面

### Changed
- 使用 Neon 云端 PostgreSQL 替代 Supabase
- 优化数据库查询性能

### Fixed
- Vercel 构建时 Prisma Client 问题
- API 响应速度优化

### Dependencies
- 移除未使用的 Supabase 依赖
