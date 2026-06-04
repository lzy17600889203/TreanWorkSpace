import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import useStore from '../store';

const OrderBook3D = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const bidsGroupRef = useRef(null);
  const asksGroupRef = useRef(null);
  const particlesGroupRef = useRef(null);
  const rippleMeshesRef = useRef([]);
  const { orderBook, scene, lastPrice, bestBid, bestAsk } = useStore();

  const [vibration, setVibration] = useState(0);
  const [droughtMode, setDroughtMode] = useState(false);
  const [pumpMode, setPumpMode] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 80, 150);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 1);
    topLight.position.set(0, 100, 50);
    scene.add(topLight);

    const greenLight = new THREE.PointLight(0x10b981, 0.5, 200);
    greenLight.position.set(-50, 30, 0);
    scene.add(greenLight);

    const redLight = new THREE.PointLight(0xef4444, 0.5, 200);
    redLight.position.set(50, 30, 0);
    scene.add(redLight);

    const bidsGroup = new THREE.Group();
    scene.add(bidsGroup);
    bidsGroupRef.current = bidsGroup;

    const asksGroup = new THREE.Group();
    scene.add(asksGroup);
    asksGroupRef.current = asksGroup;

    const particlesGroup = new THREE.Group();
    scene.add(particlesGroup);
    particlesGroupRef.current = particlesGroup;

    const planeGeometry = new THREE.PlaneGeometry(300, 200);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.5 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.1;
    scene.add(plane);

    const gridHelper = new THREE.GridHelper(300, 50, 0x334155, 0x1e293b);
    scene.add(gridHelper);

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
      };
      
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);
      spherical.theta -= THREE.MathUtils.degToRad(deltaMove.x * 0.5);
      spherical.phi -= THREE.MathUtils.degToRad(deltaMove.y * 0.5);
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
      camera.position.setFromSpherical(spherical);
      camera.lookAt(0, 0, 0);
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => { isDragging = false; };

    const onWheel = (e) => {
      const distance = camera.position.length();
      const newDistance = Math.max(50, Math.min(400, distance + e.deltaY * 0.2));
      camera.position.normalize().multiplyScalar(newDistance);
      camera.lookAt(0, 0, 0);
    };

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel);
    window.addEventListener('resize', onResize);

    let animationId;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.016;

      if (bidsGroupRef.current && asksGroupRef.current) {
        if (vibration > 0) {
          const offset = Math.sin(time * 30) * vibration * 0.5;
          bidsGroupRef.current.position.x = offset;
          asksGroupRef.current.position.x = -offset;
          setVibration(v => Math.max(0, v - 0.01));
        } else {
          // 震动结束后重置位置
          if (bidsGroupRef.current.position.x !== 0) {
            bidsGroupRef.current.position.x = 0;
          }
          if (asksGroupRef.current.position.x !== 0) {
            asksGroupRef.current.position.x = 0;
          }
        }
      }

      if (particlesGroupRef.current) {
        particlesGroupRef.current.children.forEach((particle) => {
          particle.position.y += particle.userData.velocity;
          particle.userData.velocity -= 0.1;
          particle.material.opacity -= 0.02;
          if (particle.material.opacity <= 0) {
            particlesGroupRef.current.remove(particle);
          }
        });
      }

      rippleMeshesRef.current.forEach((ripple, i) => {
        ripple.scale.x += 0.5;
        ripple.scale.z += 0.5;
        ripple.material.opacity -= 0.03;
        if (ripple.material.opacity <= 0) {
          scene.remove(ripple);
          rippleMeshesRef.current.splice(i, 1);
        }
      });

      if (pumpMode) {
        greenLight.intensity = 1 + Math.sin(time * 10) * 0.5;
      } else {
        greenLight.intensity = 0.5;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.dispose();
      containerRef.current.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    switch (scene) {
      case 'battle':
        setVibration(0.8);
        setDroughtMode(false);
        setPumpMode(false);
        break;
      case 'drought':
        setDroughtMode(true);
        setVibration(0);
        setPumpMode(false);
        break;
      case 'pump':
        setPumpMode(true);
        setDroughtMode(false);
        setVibration(0);
        break;
      case 'flashcrash':
        setDroughtMode(false);
        setPumpMode(false);
        setVibration(0);
        break;
      default:
        setDroughtMode(false);
        setPumpMode(false);
        setVibration(0);
    }
  }, [scene]);

  const createSparkParticles = (x, z, color) => {
    if (!particlesGroupRef.current) return;
    
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.SphereGeometry(0.5 + Math.random() * 1);
      const material = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        x + (Math.random() - 0.5) * 10,
        5 + Math.random() * 10,
        z + (Math.random() - 0.5) * 10
      );
      particle.userData.velocity = 2 + Math.random() * 3;
      particlesGroupRef.current.add(particle);
    }
  };

  const createRedDebris = (x, z) => {
    if (!particlesGroupRef.current) return;
    
    for (let i = 0; i < 15; i++) {
      const size = 0.3 + Math.random() * 0.5;
      const geometry = Math.random() > 0.5 
        ? new THREE.BoxGeometry(size, size, size)
        : new THREE.TetrahedronGeometry(size);
      const material = new THREE.MeshBasicMaterial({ 
        color: 0xef4444,
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        x + (Math.random() - 0.5) * 30,
        10 + Math.random() * 30,
        z + (Math.random() - 0.5) * 30
      );
      particle.userData.velocity = 3 + Math.random() * 4;
      particle.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      particlesGroupRef.current.add(particle);
    }
  };

  useEffect(() => {
    if (!bidsGroupRef.current || !asksGroupRef.current) return;

    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];

    while (bidsGroupRef.current.children.length > 0) {
      bidsGroupRef.current.remove(bidsGroupRef.current.children[0]);
    }
    while (asksGroupRef.current.children.length > 0) {
      asksGroupRef.current.remove(asksGroupRef.current.children[0]);
    }

    const midPrice = (bestBid + bestAsk) / 2;
    const priceRange = 500;

    bids.forEach(([price, size], index) => {
      const width = 3;
      const depth = 3;
      const height = Math.min(size * 2, 50);
      const geometry = new THREE.BoxGeometry(width, height, depth);
      
      const color = droughtMode ? 0x475569 : 0x10b981;
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        transparent: true,
        opacity: droughtMode ? 0.5 : 0.9
      });
      const bar = new THREE.Mesh(geometry, material);
      
      const x = ((price - midPrice) / priceRange) * 100;
      bar.position.set(x - 30, height / 2, -index * 4);
      bidsGroupRef.current.add(bar);
    });

    asks.forEach(([price, size], index) => {
      const width = 3;
      const depth = 3;
      const height = Math.min(size * 2, 50);
      const geometry = new THREE.BoxGeometry(width, height, depth);
      
      const color = droughtMode ? 0x475569 : 0xef4444;
      const material = new THREE.MeshPhongMaterial({ 
        color: color,
        transparent: true,
        opacity: droughtMode ? 0.5 : 0.9
      });
      const bar = new THREE.Mesh(geometry, material);
      
      const x = ((price - midPrice) / priceRange) * 100;
      bar.position.set(x + 30, height / 2, -index * 4);
      asksGroupRef.current.add(bar);
    });

    if (scene === 'battle') {
      createSparkParticles(0, 0, 0xfbbf24);
    }

    if (scene === 'pump') {
      createRedDebris(50, 0);
    }
  }, [orderBook, bestBid, bestAsk, droughtMode, pumpMode]);

  return (
    <div 
      ref={containerRef} className="w-full h-full" style={{ cursor: 'grab' }} />
  );
};

export default OrderBook3D;
