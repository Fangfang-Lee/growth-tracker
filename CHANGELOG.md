# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 支持删除打卡记录功能，删除后自动回退相关数据（次数/进度/状态）
- 打卡记录旁边添加删除按钮（悬停时显示）
- README.md 文档引用和资源链接
- CHANGELOG.md 更新日志文档
- CLAUDE.md 版本发布约定

### Changed
- 更新技术栈说明（Neon + Session Cookie）

### Dependencies
- 移除未使用的 Supabase 依赖

### Performance
- 添加数据库索引优化查询性能
- 使用 Prisma $transaction 优化串行查询
- 使用 createManyAndReturn 批量创建
- 使用 Promise.all 并行查询
- 前端 stats 页面并行请求 API

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

### Fixed
- Vercel 构建时 Prisma Client 问题
