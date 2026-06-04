import React from 'react';
import useStore from '../store';
import useWebSocket from '../hooks/useWebSocket';

const ControlPanel = () => {
  const { scene, lastPrice, bestBid, bestAsk, isConnected } = useStore();
  const { sendScene } = useWebSocket();

  const scenes = [
    { id: 'normal', name: '正常', color: 'bg-blue-500' },
    { id: 'battle', name: '多空绞杀', color: 'bg-yellow-500' },
    { id: 'drought', name: '流动性枯竭', color: 'bg-gray-500' },
    { id: 'pump', name: '暴力拉升', color: 'bg-green-500' },
    { id: 'flashcrash', name: '乌龙指', color: 'bg-red-500' },
  ];

  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pointer-events-none">
      <div className="glass-card rounded-lg p-4 pointer-events-auto">
        <h2 className="text-white font-bold text-lg mb-2 font-mono">
          BTC/USDT 盘口
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">最新价</span>
            <span className="text-white font-mono font-bold">{lastPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">买一</span>
            <span className="text-buy font-mono">{bestBid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">卖一</span>
            <span className="text-sell font-mono">{bestAsk.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">连接状态</span>
            <span className={`font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? '已连接' : '断开'}
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-lg p-4 pointer-events-auto">
        <h3 className="text-white font-bold mb-3 font-mono">场景演示</h3>
        <div className="flex flex-col gap-2">
          {scenes.map((s) => (
            <button
              key={s.id}
              onClick={() => sendScene(s.id)}
              className={`btn-scene px-4 py-2 rounded text-white font-mono text-sm border transition-all
                ${scene === s.id ? s.color + ' border-blue-400' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
