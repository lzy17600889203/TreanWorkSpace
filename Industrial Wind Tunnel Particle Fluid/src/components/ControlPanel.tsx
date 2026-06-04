
import React from 'react';
import { Wind, AlertTriangle, Droplets, Zap } from 'lucide-react';

const presetInfo = {
  smooth: {
    name: '流线型低风阻',
    description: '车身表面气流顺滑，无明显紊乱',
    icon: &lt;Wind size={18} /&gt;
  },
  stall: {
    name: '失速涡流',
    description: '大迎角时车尾剧烈紊流',
    icon: &lt;AlertTriangle size={18} /&gt;
  },
  underpressure: {
    name: '底盘乱流',
    description: '车底积聚高压区',
    icon: &lt;Droplets size={18} /&gt;
  },
  crosswind: {
    name: '侧向强风',
    description: '侧向强风导致气流剥离',
    icon: &lt;Zap size={18} /&gt;
  }
};

function ControlPanel({ currentPreset, config, onSetPreset, onUpdateConfig }) {
  return (
    &lt;div className="absolute left-4 top-4 bottom-4 w-80 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col"&gt;
      &lt;div className="p-6 border-b border-slate-700"&gt;
        &lt;h1 className="text-2xl font-bold text-white mb-1"&gt;风洞模拟系统&lt;/h1&gt;
        &lt;p className="text-slate-400 text-sm"&gt;空气动力学粒子流体分析&lt;/p&gt;
      &lt;/div&gt;
      
      &lt;div className="p-6 border-b border-slate-700"&gt;
        &lt;h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4"&gt;
          预设场景
        &lt;/h2&gt;
        &lt;div className="space-y-2"&gt;
          {Object.keys(presetInfo).map((preset) =&gt; (
            &lt;button
              key={preset}
              onClick={() =&gt; onSetPreset(preset)}
              className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                currentPreset === preset
                  ? 'bg-blue-600/30 border border-blue-500 text-blue-200'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600'
              }`}
            &gt;
              &lt;div className="flex items-center gap-3"&gt;
                &lt;div className={`p-2 rounded-md ${
                  currentPreset === preset ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-700 text-slate-400'
                }`}&gt;
                  {presetInfo[preset].icon}
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;div className="font-medium"&gt;{presetInfo[preset].name}&lt;/div&gt;
                  &lt;div className="text-xs text-slate-500 mt-0.5"&gt;{presetInfo[preset].description}&lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            &lt;/button&gt;
          ))}
        &lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div className="p-6 flex-1 overflow-y-auto"&gt;
        &lt;h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4"&gt;
          参数控制
        &lt;/h2&gt;
        
        &lt;div className="space-y-6"&gt;
          &lt;div&gt;
            &lt;div className="flex justify-between mb-2"&gt;
              &lt;label className="text-sm text-slate-400"&gt;风向角度&lt;/label&gt;
              &lt;span className="text-sm font-mono text-blue-400"&gt;{config.windAngle.toFixed(1)}°&lt;/span&gt;
            &lt;/div&gt;
            &lt;input
              type="range"
              min="-180"
              max="180"
              value={config.windAngle}
              onChange={(e) =&gt; onUpdateConfig({ windAngle: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            /&gt;
            &lt;p className="text-xs text-slate-500 mt-2"&gt;提示：也可以直接在画布上拖拽鼠标&lt;/p&gt;
          &lt;/div&gt;
          
          &lt;div&gt;
            &lt;div className="flex justify-between mb-2"&gt;
              &lt;label className="text-sm text-slate-400"&gt;风速&lt;/label&gt;
              &lt;span className="text-sm font-mono text-blue-400"&gt;{config.speed.toFixed(2)}&lt;/span&gt;
            &lt;/div&gt;
            &lt;input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={config.speed}
              onChange={(e) =&gt; onUpdateConfig({ speed: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            /&gt;
          &lt;/div&gt;
          
          &lt;div&gt;
            &lt;div className="flex justify-between mb-2"&gt;
              &lt;label className="text-sm text-slate-400"&gt;湍流强度&lt;/label&gt;
              &lt;span className="text-sm font-mono text-blue-400"&gt;{config.turbulence.toFixed(2)}&lt;/span&gt;
            &lt;/div&gt;
            &lt;input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.turbulence}
              onChange={(e) =&gt; onUpdateConfig({ turbulence: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            /&gt;
          &lt;/div&gt;
          
          &lt;div&gt;
            &lt;div className="flex justify-between mb-2"&gt;
              &lt;label className="text-sm text-slate-400"&gt;粒子数量&lt;/label&gt;
              &lt;span className="text-sm font-mono text-blue-400"&gt;{config.count.toLocaleString()}&lt;/span&gt;
            &lt;/div&gt;
            &lt;input
              type="range"
              min="10000"
              max="200000"
              step="10000"
              value={config.count}
              onChange={(e) =&gt; onUpdateConfig({ count: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            /&gt;
          &lt;/div&gt;
          
          &lt;div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"&gt;
            &lt;span className="text-sm text-slate-400"&gt;显示压力分布&lt;/span&gt;
            &lt;button
              onClick={() =&gt; onUpdateConfig({ showPressure: !config.showPressure })}
              className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                config.showPressure ? 'bg-red-500' : 'bg-slate-600'
              }`}
            &gt;
              &lt;div
                className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                  config.showPressure ? 'translate-x-7' : 'translate-x-1'
                }`}
              /&gt;
            &lt;/button&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;
      
      &lt;div className="p-4 border-t border-slate-700 bg-slate-800/30"&gt;
        &lt;div className="flex items-center gap-2 text-xs text-slate-500"&gt;
          &lt;div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /&gt;
          &lt;span&gt;系统运行正常 | 实时物理计算&lt;/span&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  );
}

export default ControlPanel;
