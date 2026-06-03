# 3D 仓库可视化系统

一个现代化的3D仓库可视化工具，使用 React + Three.js + Node.js + SQLite 技术栈构建。

## 功能特性

- 🎨 **3D 立体货架展示** - 使用 Three.js 渲染逼真的3D仓库场景
- 🖱️ **交互式视角控制** - 支持拖拽旋转、缩放查看
- 📦 **商品分类筛选** - 左侧分类列表，点击筛选对应货架
- 📊 **库存状态可视化** - 根据库存比率显示不同颜色（红色/橙色/绿色）
- 💓 **呼吸闪烁动画** - 库存紧张的货架有心跳式闪烁效果
- 🎯 **预设场景** - 四个快捷加载场景
  - 双十一爆仓高压状态
  - 日常平稳周转状态
  - 冷门滞销品冷区分布
  - 新入库补货动态流向

## 技术栈

### 前端
- React 18
- Three.js (使用 @react-three/fiber 和 @react-three/drei)
- Vite
- Axios

### 后端
- Node.js
- Express
- better-sqlite3 (SQLite 数据库)
- CORS

## 项目结构

```
warehouse-heatmap/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── components/     # React 组件
│   │   │   ├── WarehouseScene.jsx
│   │   │   ├── Shelf.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ScenarioBar.jsx
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                 # 后端项目
│   ├── index.js
│   └── package.json
└── package.json
```

## 快速开始

### 前置要求

- Node.js 16+ 版本
- npm 或 yarn

### 安装依赖

1. 在根目录、server目录和client目录分别安装依赖：

```bash
# 根目录
npm install

# 后端
cd server
npm install

# 前端
cd ../client
npm install
```

或者使用根目录的快捷命令：

```bash
npm run install:all
```

### 运行项目

需要同时运行后端和前端服务。

#### 终端 1 - 启动后端服务

```bash
cd server
npm run dev
```

后端服务将在 `http://localhost:3001` 运行

#### 终端 2 - 启动前端服务

```bash
cd client
npm run dev
```

前端服务将在 `http://localhost:3000` 运行

### 访问应用

在浏览器中打开 `http://localhost:3000` 即可查看应用。

## 使用说明

1. **查看全部货架** - 点击左侧"全部分类"
2. **筛选分类** - 点击左侧任意商品分类查看对应货架
3. **旋转视角** - 在3D场景中按住鼠标左键拖拽
4. **缩放场景** - 滚动鼠标滚轮
5. **加载场景** - 点击顶部场景按钮快速切换预设状态

## 库存状态说明

- 🔴 **红色** - 库存紧张 (0-30%) - 有呼吸闪烁效果
- 🟠 **橙色** - 库存偏低 (30-60%)
- 🟢 **绿色** - 库存正常 (60-100%)

## API 接口

### 获取分类列表
```
GET /api/categories
```

### 获取货架数据
```
GET /api/shelves?categoryId={id}
GET /api/shelves/all
```

### 加载预设场景
```
POST /api/scenario/{scenarioName}
```
场景名称: double11, normal, cold, restock
