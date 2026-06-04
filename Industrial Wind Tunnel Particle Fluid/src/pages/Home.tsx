
import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import Particles from '../components/Particles'
import CarModel from '../components/CarModel'

export default function Home() {
  const [preset, setPreset] = useState('smooth')
  const [config, setConfig] = useState({
    count: 100000,
    speed: 0.8,
    windAngle: 0,
    turbulence: 0.3,
    color: '#00d4ff',
    showPressure: false
  })

  const presets = {
    smooth: {
      count: 100000,
      speed: 0.8,
      windAngle: 0,
      turbulence: 0.3,
      color: '#00d4ff',
      showPressure: false
    },
    stall: {
      count: 150000,
      speed: 1.0,
      windAngle: 25,
      turbulence: 1.5,
      color: '#ff6b35',
      showPressure: true
    },
    underpressure: {
      count: 120000,
      speed: 0.7,
      windAngle: 0,
      turbulence: 1.0,
      color: '#fff44f',
      showPressure: true
    },
    crosswind: {
      count: 180000,
      speed: 1.8,
      windAngle: 45,
      turbulence: 2.0,
      color: '#ff4444',
      showPressure: false
    }
  }

  const handleSetPreset = (p) => {
    setPreset(p)
    setConfig(presets[p])
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-slate-900">
      <div className="absolute inset-0">
        <Canvas shadows dpr={[1, 2]}>
          <PerspectiveCamera makeDefault position={[5, 3, 5]} fov={50} />
          <OrbitControls enablePan enableZoom />
          
          <color attach="background" args={['#0a1628']} />
          
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-10, 5, -10]} color="#00d4ff" intensity={0.5} />
          
          <Environment preset="city" />
          
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#0d1b2a" roughness={0.8} />
          </mesh>
          
          <gridHelper args={[50, 50, 0x1b263b, 0x0d1b2a]} position={[0, -0.49, 0]} />
          
          <CarModel showPressure={config.showPressure} />
          
          <Particles 
            count={config.count}
            color={config.color}
            speed={config.speed}
            windAngle={config.windAngle}
            turbulence={config.turbulence}
          />
          
          <EffectComposer>
            <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.5} />
          </EffectComposer>
        </Canvas>
      </div>
      
      <div className="absolute left-4 top-4 bottom-4 w-80 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold text-white mb-1">Wind Tunnel Simulator</h1>
          <p className="text-slate-400 text-sm">空气动力学粒子流体分析</p>
        </div>
        
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">预设场景</h2>
          <div className="space-y-2">
            {[
              { id: 'smooth', name: '流线型低风阻', desc: '车身表面气流顺滑' },
              { id: 'stall', name: '失速涡流', desc: '大迎角时车尾剧烈紊流' },
              { id: 'underpressure', name: '底盘乱流', desc: '车底积聚高压区' },
              { id: 'crosswind', name: '侧向强风', desc: '强侧风导致气流强力剥离' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleSetPreset(p.id)}
                className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                  preset === p.id
                    ? 'bg-blue-600/30 border border-blue-500 text-blue-200'
                    : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">参数控制</h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">风向角度</label>
                <span className="text-sm font-mono text-blue-400">{config.windAngle.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={config.windAngle}
                onChange={(e) => setConfig({ ...config, windAngle: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">风速</label>
                <span className="text-sm font-mono text-blue-400">{config.speed.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={config.speed}
                onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">湍流强度</label>
                <span className="text-sm font-mono text-blue-400">{config.turbulence.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="3.0"
                step="0.1"
                value={config.turbulence}
                onChange={(e) => setConfig({ ...config, turbulence: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-slate-400">粒子数量</label>
                <span className="text-sm font-mono text-blue-400">{config.count.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="20000"
                max="300000"
                step="10000"
                value={config.count}
                onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-400">显示压力分布</span>
              <button
                onClick={() => setConfig({ ...config, showPressure: !config.showPressure })}
                className={`w-12 h-6 rounded-full transition-colors duration-200 ${
                  config.showPressure ? 'bg-red-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    config.showPressure ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700 bg-slate-800/30">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>系统运行正常 | 实时物理计算</span>
          </div>
        </div>
      </div>
      
      <div className="absolute right-4 top-4 bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg p-4 text-slate-300 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="font-medium">操作说明</span>
        </div>
        <ul className="space-y-1 text-xs text-slate-400">
          <li>• 左键拖拽：旋转视角</li>
          <li>• 右键拖拽：平移视角</li>
          <li>• 滚轮：缩放视角</li>
        </ul>
      </div>
    </div>
  )
}
