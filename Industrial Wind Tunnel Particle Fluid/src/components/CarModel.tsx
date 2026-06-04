
import React from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function CarModel({ showPressure }) {
  return (
    <group>
      {/* 车身主体 - 使用更平滑的形状 */}
      <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.0, 0.45, 1.35]} />
        <meshStandardMaterial 
          color={showPressure ? '#ff4444' : '#1a1a2e'} 
          emissive={showPressure ? '#ff2200' : '#000000'}
          emissiveIntensity={showPressure ? 0.3 : 0}
          roughness={0.25} 
          metalness={0.8} 
        />
      </mesh>
      
      {/* 车顶/驾驶舱 */}
      <mesh position={[0.1, 0.85, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.75, 0.6, 8, 1, false, 0, Math.PI]} />
        <meshStandardMaterial 
          color={showPressure ? '#ff5544' : '#16213e'} 
          emissive={showPressure ? '#ff3300' : '#000000'}
          emissiveIntensity={showPressure ? 0.25 : 0}
          roughness={0.2} 
          metalness={0.75} 
          rotation={[0, Math.PI / 2, 0]}
        />
      </mesh>
      
      {/* 前部引擎盖 */}
      <mesh position={[1.2, 0.45, 0]} castShadow receiveShadow rotation={[0.12, 0, 0]}>
        <boxGeometry args={[1.0, 0.25, 1.3]} />
        <meshStandardMaterial 
          color={showPressure ? '#ff3333' : '#1f2937'} 
          emissive={showPressure ? '#ff1100' : '#000000'}
          emissiveIntensity={showPressure ? 0.35 : 0}
          roughness={0.2} 
          metalness={0.85} 
        />
      </mesh>
      
      {/* 后备箱 */}
      <mesh position={[-1.2, 0.45, 0]} castShadow receiveShadow rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.8, 0.25, 1.25]} />
        <meshStandardMaterial 
          color={showPressure ? '#ff4444' : '#111827'} 
          emissive={showPressure ? '#ff2200' : '#000000'}
          emissiveIntensity={showPressure ? 0.2 : 0}
          roughness={0.3} 
          metalness={0.7} 
        />
      </mesh>
      
      {/* 前挡风玻璃 */}
      <mesh position={[0.7, 0.9, 0]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.02, 0.4, 1.15]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent
          opacity={0.6}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* 后挡风玻璃 */}
      <mesh position={[-0.6, 0.9, 0]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.02, 0.35, 1.05]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent
          opacity={0.5}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* 左侧车窗 */}
      <mesh position={[0.1, 0.95, 0.68]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[0.7, 0.3, 0.02]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent
          opacity={0.55}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* 右侧车窗 */}
      <mesh position={[0.1, 0.95, -0.68]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.7, 0.3, 0.02]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent
          opacity={0.55}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      
      {/* 车轮 */}
      {[
        { x: 0.8, y: 0.15, z: 0.75 },
        { x: 0.8, y: 0.15, z: -0.75 },
        { x: -0.8, y: 0.15, z: 0.75 },
        { x: -0.8, y: 0.15, z: -0.75 }
      ].map((pos, i) => (
        <group key={i} position={[pos.x, pos.y, pos.z]}>
          {/* 轮胎 */}
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.28, 24]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.9} />
          </mesh>
          
          {/* 轮毂 */}
          <mesh>
            <cylinderGeometry args={[0.18, 0.18, 0.3, 8]} />
            <meshStandardMaterial color="#666" roughness={0.4} metalness={0.9} />
          </mesh>
          
          {/* 轮毂细节 */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
            <mesh key={j} position={[0, 0, 0]} rotation={[0, (j * Math.PI) / 4, 0]}>
              <boxGeometry args={[0.04, 0.32, 0.06]} />
              <meshStandardMaterial color="#888" roughness={0.4} metalness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      
      {/* 前灯 */}
      <mesh position={[1.65, 0.4, 0.45]}>
        <boxGeometry args={[0.1, 0.15, 0.25]} />
        <meshStandardMaterial color="#ffffaa" emissive="#ffff88" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[1.65, 0.4, -0.45]}>
        <boxGeometry args={[0.1, 0.15, 0.25]} />
        <meshStandardMaterial color="#ffffaa" emissive="#ffff88" emissiveIntensity={0.5} />
      </mesh>
      
      {/* 尾灯 */}
      <mesh position={[-1.6, 0.4, 0.45]}>
        <boxGeometry args={[0.08, 0.12, 0.2]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-1.6, 0.4, -0.45]}>
        <boxGeometry args={[0.08, 0.12, 0.2]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.4} />
      </mesh>
      
      {/* 后视镜 */}
      <mesh position={[0.3, 0.75, 0.85]}>
        <boxGeometry args={[0.25, 0.08, 0.1]} />
        <meshStandardMaterial color={showPressure ? '#ff4444' : '#1a1a2e'} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.3, 0.75, -0.85]}>
        <boxGeometry args={[0.25, 0.08, 0.1]} />
        <meshStandardMaterial color={showPressure ? '#ff4444' : '#1a1a2e'} roughness={0.3} metalness={0.8} />
      </mesh>
      
      {/* 后视镜镜面 */}
      <mesh position={[0.42, 0.75, 0.85]}>
        <boxGeometry args={[0.02, 0.1, 0.08]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.7} roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0.42, 0.75, -0.85]}>
        <boxGeometry args={[0.02, 0.1, 0.08]} />
        <meshStandardMaterial color="#88ccff" transparent opacity={0.7} roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  )
}
