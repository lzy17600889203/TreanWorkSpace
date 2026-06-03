import React, { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const latLonToVector3 = (lat, lon, radius = 1.05) => {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  
  return new THREE.Vector3(x, y, z)
}

const Airplane = ({ flight, onClick }) => {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  useFrame(() => {
    if (meshRef.current) {
      const start = latLonToVector3(flight.originLat, flight.originLon, 1.05)
      const end = latLonToVector3(flight.destLat, flight.destLon, 1.05)
      
      const t = (flight.progress + Date.now() / 50000) % 1
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
      mid.normalize().multiplyScalar(1.5)
      
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
      const pos = curve.getPointAt(t)
      
      const nextPos = curve.getPointAt(Math.min(t + 0.01, 1))
      meshRef.current.position.copy(pos)
      meshRef.current.lookAt(nextPos)
    }
  })

  const color = flight.delayed ? '#ffd700' : '#00ff88'
  const scale = hovered ? 1.5 : 1

  return (
    <group
      ref={meshRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
      scale={scale}
    >
      {/* 机身 */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.15, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* 机头 */}
      <mesh position={[0, 0, 0.085]}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* 主翼 */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.008, 0.12, 0.03]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* 尾翼 */}
      <mesh position={[0, 0.025, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.006, 0.05, 0.025]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* 水平尾翼 */}
      <mesh position={[0, 0, -0.06]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.005, 0.06, 0.015]} />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* 发光效果 */}
      <pointLight color={color} intensity={2} distance={0.5} />
    </group>
  )
}

export default Airplane
