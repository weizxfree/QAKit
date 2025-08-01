# KnowFlow 更新日志


## [v1.1.6] - 2025-07-18

### 优化
- 优化大文件获取 block 位置速度国慢的问题


## [v1.1.5] - 2025-07-14

### 新增
- 架构调整：KnowFlow 支持通过 Plugin 和 Patch 和 RAGFlow 进行通信
- 支持批量添加 chunk，大幅度优化文档分块和向量化性能


### 优化
- 去除 API_KEY 配置，通过数据库查询获取


### 修复
- excel 解析失败问题



## [v1.1.3] - 2025-07-09

### 新增
- MinerU 升级到 v2.1.0

### 修复
- Docker 镜像里缺失 pandas 库
- ragflow 登录的用户非 ragflow 第一个新建用户时知识库权限报错
- 修复 MineU 2.0 中存在特殊字符导致无法正常返回解析数据缺陷


## [v1.1.0] - 2025-07-02

### 新增
- 开源 ragflow 前端源码，用于替换 ragflow 前端界面

### 修复
- 修复 fastapi 只支持 pdf 文件格式问题



## [v1.0.1] - 2025-06-30

### 修复
- 修复 config.yaml 中 server_url 配置未生效的问题


## [v1.0.0] - 2025-06-30

### 新增
- 支持 MinerU 2.0 三种模式接入


## [v0.8.0] - 2025-06-19

### 新增
- 新增 Excel 分块增强
- 优化配置项

## [v0.7.0] - 2025-06-12

### 修复
- 修复 Minio 设置公开策略无效问题
- 修复 MinerU 模型挂载失败问题

## [v0.6.0] - 2025-06-11

### 新增
- 修复策略不能切换的问题
- 优化默认分块大小为 256


## [v0.5.0] - 2025-06-10

### 新增
- 支持 Markdown 智能分块和标题分块策略
- 三方接入支持自动创建会话

## [v0.4.0] - 2025-05-29（兼容 RAGFlow v0.19.0）
### 新增
- 支持更多的文件格式，包含 doc、ppt、docx、url、excel 等文件格式
- Markdown 文件分块规则和官方保持一致，支持图片和表格向量化

### 优化
- 简化配置流程，避免配置错误导致链接失败
- 支持在 .env 配置是否保存 MinerU 生成产物


## [v0.3.0] - 2025-05-02（兼容 RAGFlow v0.18.0）
### 新增
- 开源 KnowFlow 前端 dist 产物
- 移除了向量模型配置，默认为最后更新的向量模型
- 适配 RAGFlow v0.18.0


## [v0.2.0] - 2025-04-24（仅支持源码，镜像包尚未构建）
### 新增
- 适配 RAGFlow Plus 的知识库管理
- 支持自定义 chunk 以及坐标回溯
- 支持企业微信三方接入


## [v0.1.2] - 2025-04-17
### 新增
- 图文回答支持在前端页面一键解析，无需复杂配置

## [v0.1.1] - 2025-04-11
### 新增
- 回答结果支持图片展示

## [v0.1.0] - 2025-04-10
### 新增
- 用户后台管理系统（用户管理、团队管理、模型配置管理）
