
import React, { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Effects } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import ParticleSystem from './ParticleSystem';
import CarModel from './CarModel';

function SceneContent({ config, preset, onWindAngleChange }) {
  const cameraRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const lastMouseX = useRef(0);
  
  const modelPosition = new THREE.Vector3(0, 0, 0);
  
  const getCameraPosition = () =&gt; {
    switch (preset) {
      case 'underpressure':
        return new THREE.Vector3(0, 2, 0);
      case 'crosswind':
        return new THREE.Vector3(5, 3, 0);
      default:
        return new THREE.Vector3(5, 3, 5);
    }
  };
  
  const getCameraTarget = () =&gt; {
    switch (preset) {
      case 'underpressure':
        return new THREE.Vector3(0, -1, 0);
      default:
        return new THREE.Vector3(0, 0.5, 0);
    }
  };
  
  useFrame((state) =&gt; {
    if (cameraRef.current) {
      const targetPos = getCameraPosition();
      const targetLookAt = getCameraTarget();
      
      cameraRef.current.position.lerp(targetPos, 0.02);
      cameraRef.current.lookAt(targetLookAt);
    }
  });
  
  const handlePointerDown = (e) =&gt; {
    if (e.button === 0) {
      setIsDragging(true);
      lastMouseX.current = e.clientX;
    }
  };
  
  const handlePointerMove = (e) =&gt; {
    if (isDragging) {
      const deltaX = e.clientX - lastMouseX.current;
      lastMouseX.current = e.clientX;
      const newAngle = config.windAngle + deltaX * 0.2;
      onWindAngleChange(Math.max(-180, Math.min(180, newAngle)));
    }
  };
  
  const handlePointerUp = () =&gt; {
    setIsDragging(false);
  };
  
  return (
    &lt;group
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    &gt;
      &lt;PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[5, 3, 5]}
        fov={50}
      /&gt;
      &lt;OrbitControls enablePan={true} enableZoom={true} /&gt;
      
      &lt;color attach="background" args={['#0a1628']} /&gt;
      
      &lt;ambientLight intensity={0.3} /&gt;
      &lt;directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      /&gt;
      &lt;pointLight position={[-10, 5, -10]} color="#00d4ff" intensity={0.5} /&gt;
      
      &lt;Environment preset="city" /&gt;
      
      &lt;mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow&gt;
        &lt;planeGeometry args={[50, 50]} /&gt;
        &lt;meshStandardMaterial color="#0d1b2a" roughness={0.8} /&gt;
      &lt;/mesh&gt;
      
      &lt;gridHelper args={[50, 50, 0x1b263b, 0x0d1b2a]} position={[0, -0.49, 0]} /&gt;
      
      &lt;CarModel showPressure={config.showPressure} /&gt;
      
      &lt;ParticleSystem config={config} modelPosition={modelPosition} /&gt;
      
      &lt;Effects&gt;
        &lt;EffectComposer&gt;
          &lt;Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.5} /&gt;
        &lt;/EffectComposer&gt;
      &lt;/Effects&gt;
    &lt;/group&gt;
  );
}

function Scene3D(props) {
  return (
    &lt;Canvas shadows dpr={[1, 2]}&gt;
      &lt;SceneContent {...props} /&gt;
    &lt;/Canvas&gt;
  );
}

export default Scene3D;
