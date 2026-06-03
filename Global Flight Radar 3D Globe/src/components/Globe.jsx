import React, { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Text } from '@react-three/drei'
import * as THREE from 'three'
import Earth from './Earth'
import FlightPath from './FlightPath'
import Airplane from './Airplane'

const GlobeContent = ({ flights, onFlightClick }) => {
  const groupRef = useRef()

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      <Earth />
      {flights.map((flight) => (
        <React.Fragment key={flight.id}>
          <FlightPath flight={flight} />
          <Airplane
            flight={flight}
            onClick={() => onFlightClick(flight)}
          />
        </React.Fragment>
      ))}
    </group>
  )
}

const Globe = ({ flights, onFlightClick }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <color attach="background" args={['#000000']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <GlobeContent flights={flights} onFlightClick={onFlightClick} />
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          autoRotate={false}
        />
      </Canvas>
    </div>
  )
}

export default Globe
