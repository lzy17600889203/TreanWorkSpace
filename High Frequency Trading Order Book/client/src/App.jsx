import React from 'react';
import OrderBook3D from './components/OrderBook3D';
import ControlPanel from './components/ControlPanel';
import useWebSocket from './hooks/useWebSocket';

function App() {
  // 初始化 WebSocket 连接
  useWebSocket();

  return (
    <div className="w-full h-screen relative overflow-hidden bg-bg-dark">
      <OrderBook3D />
      <ControlPanel />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-gray-400 text-sm font-mono text-center">
        鼠标拖拽旋转视角 | 滚轮缩放
      </div>
    </div>
  );
}

export default App;
