import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Shelf = ({ shelf }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const groupRef = useRef();

  const stockRatio = shelf.stock / shelf.max_stock;
  const isLowStock = stockRatio < 0.3;

  const getColor = () => {
    if (stockRatio < 0.3) return new THREE.Color('#e94560');
    if (stockRatio < 0.6) return new THREE.Color('#f39c12');
    return new THREE.Color('#4ecca3');
  };

  const baseColor = useMemo(() => getColor(), [stockRatio]);

  useFrame((state) => {
    if (isLowStock && materialRef.current) {
      const time = state.clock.getElapsedTime();
      const pulse = (Math.sin(time * 4) + 1) / 2;
      const intensity = 0.3 + pulse * 0.7;
      materialRef.current.emissiveIntensity = intensity;
      materialRef.current.emissive = new THREE.Color('#ff0040');
    } else if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0;
    }
  });

  const position = [
    shelf.x * 1.5 - 2.25,
    shelf.y * 1.2,
    shelf.z * 2 - 2
  ];

  return (
    <group ref={groupRef} position={position}>
      <mesh 
        ref={meshRef}
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[1.2, 1, 1.8]} />
        <meshStandardMaterial
          ref={materialRef}
          color={baseColor}
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
      
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[1.4, 0.1, 2]} />
        <meshStandardMaterial color="#2d3436" roughness={0.8} />
      </mesh>
    </group>
  );
};

export default Shelf;
