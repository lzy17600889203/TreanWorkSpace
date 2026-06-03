# Global Flight Radar 3D

一个酷炫的3D地球航班雷达系统，使用 React 和 Three.js 构建。

## 功能特性

- 🌍 **3D 地球可视化** - 使用 Three.js 渲染的逼真地球
- ✈️ **实时飞行动画** - 飞机在贝塞尔曲线上平滑移动
- 🖱️ **交互控制** - 支持鼠标拖拽旋转、滚轮缩放
- 💬 **航班信息卡片** - 点击飞机查看详细航班信息
- 🔄 **预设场景** - 四个不同的航班展示场景
- 🟡 **延误高亮** - 延误航班的飞行路径显示为黄色

## 技术栈

- **前端**: React 18、Three.js、@react-three/fiber、@react-three/drei
- **构建工具**: Vite

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行项目

```bash
npm run dev
```

项目将在浏览器中自动打开 (默认地址: http://localhost:3000)

## 预设场景

1. **跨洋洲际长途密集飞行 - 展示长距离国际航班
2. **国内短途高频穿梭 - 展示短距离国内航班
3. **极端天气导致的大面积绕航黄线 - 展示所有延误航班
4. **深夜低谷期的零星航班 - 展示少量精选航班

## 项目结构

```
.
├── src/
│   ├── components/
│   │   ├── Globe.jsx      # 3D 地球主组件
│   │   ├── Earth.jsx      # 地球模型
│   │   ├── Airplane.jsx # 飞机模型
│   │   ├── FlightPath.jsx # 飞行路径（贝塞尔曲线）
│   │   ├── FlightCard.jsx # 航班信息卡片
│   │   └── SceneSelector.jsx # 场景选择器
│   ├── App.jsx           # 应用主组件
│   ├── App.css
│   └── main.jsx           # React 入口文件
├── index.html
├── vite.config.js
└── package.json
```

## 许可证

MIT License
