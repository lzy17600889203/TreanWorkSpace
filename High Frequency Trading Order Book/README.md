# 3D 盘口深度图工具

还原真实交易所微观结构的 3D 盘口深度图可视化工具。

## 功能特性

- **3D 深度图可视化**：使用 Three.js 渲染的立体价格-数量阶梯图
- **实时更新**：WebSocket 实时推送订单簿和成交数据
- **多种演示场景**：
  - 正常市场波动
  - 多空绞杀（高频波动 + 震动效果）
  - 流动性枯竭（买卖价差极大）
  - 暴力拉升（绿色海啸）
  - 乌龙指（闪崩后回弹）
- **交互式控制**：鼠标拖拽旋转视角，滚轮缩放

## 技术栈

### 后端
- Node.js + Express
- WebSocket (ws 库)
- 内存数据存储（演示用）

### 前端
- React 18
- Three.js (3D 渲染)
- Tailwind CSS (样式)
- Zustand (状态管理)
- Vite (构建工具)

## 快速开始

### 1. 安装依赖

```bash
npm install
cd client
npm install
```

### 2. 构建前端

```bash
cd client
npm run build
```

### 3. 启动服务

```bash
npm start
```

服务器将在 http://localhost:3000 启动

## 项目结构

```
High Frequency Trading Order Book/
├── api/                      # 后端代码
│   ├── server.js            # Express + WebSocket 服务器
│   ├── orderbook.js         # 订单簿管理
│   ├── dataGenerator.js     # 数据生成器和场景模拟
│   └── database.js          # 数据存储（内存）
├── client/                   # 前端代码
│   ├── src/
│   │   ├── components/      # React 组件
│   │   │   ├── OrderBook3D.jsx  # 3D 深度图组件
│   │   │   └── ControlPanel.jsx # 控制面板
│   │   ├── hooks/
│   │   │   └── useWebSocket.js  # WebSocket 钩子
│   │   ├── store.js         # Zustand 状态管理
│   │   ├── App.jsx          # 主应用组件
│   │   └── main.jsx         # 入口文件
│   ├── dist/                # 构建输出
│   └── package.json
└── package.json
```

## 使用说明

1. **正常场景**：显示标准的买卖盘深度
2. **多空绞杀**：高频波动，伴有画面震动和金色火花
3. **流动性枯竭**：中间区域塌陷，显示巨大的买卖价差
4. **暴力拉升**：绿色买单柱体急剧增长，红色卖单被压碎
5. **乌龙指**：急剧下跌后快速回弹

## 交互操作

- 鼠标拖拽：旋转 3D 视角
- 鼠标滚轮：缩放视角

## 开发模式

可以分别运行前后端进行开发：

```bash
# 终端 1 - 后端
npm run dev:server

# 终端 2 - 前端
npm run dev:client
```

## 许可证

MIT
