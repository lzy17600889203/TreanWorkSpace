
## 1. Architecture Design
纯前端架构，使用 React 18 CDN 引入方式，无需后端服务。

## 2. Technology Description
- Frontend: React@18 (CDN引入) + 原生JavaScript + CSS3
- 不需要后端和数据库

## 3. Route Definitions
单页面应用，无需路由

## 4. API Definitions (if backend exists)
无需后端API

## 5. Server Architecture Diagram (if backend exists)
无需后端

## 6. Data Model (if applicable)
无需数据模型

### 核心组件设计：
1. `App` - 主应用组件
2. `MemoryDisplay` - 内存占用显示组件
3. `CacheFileList` - 缓存文件滚动列表组件
4. `CleanButton` - 一键清理按钮组件
5. `ProgressBar` - 进度条组件
6. `CleanCompleteModal` - 清理完成弹窗组件

### 核心状态：
- `memoryUsage`: 当前内存占用百分比
- `isCleaning`: 是否正在清理
- `progress`: 清理进度
- `showModal`: 是否显示完成弹窗

