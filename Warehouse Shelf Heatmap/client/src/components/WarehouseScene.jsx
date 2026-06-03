import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Shelf from './Shelf';

const Warehouse = ({ shelves }) => {
  return (
    <group>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, 10, -5]} intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#4a90d9" />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.5, -0.6, 1]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {shelves.map((shelf) => (
        <Shelf key={shelf.id} shelf={shelf} />
      ))}
    </group>
  );
};

const Legends = () => {
  return (
    <div className="legends">
      <div className="legend-title">📋 库存状态</div>
      <div className="legend-item">
        <div className="legend-color" style={{ background: '#e94560' }}></div>
        <span className="legend-text">库存紧张 (0-30%)</span>
      </div>
      <div className="legend-item">
        <div className="legend-color" style={{ background: '#f39c12' }}></div>
        <span className="legend-text">库存偏低 (30-60%)</span>
      </div>
      <div className="legend-item">
        <div className="legend-color" style={{ background: '#4ecca3' }}></div>
        <span className="legend-text">库存正常 (60-100%)</span>
      </div>
    </div>
  );
};

const WarehouseScene = ({ shelves }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas shadows camera={{ position: [8, 6, 8], fov: 50 }}>
        <Warehouse shelves={shelves} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={4}
          maxDistance={20}
        />
      </Canvas>
      <Legends />
    </div>
  );
};

export default WarehouseScene;
