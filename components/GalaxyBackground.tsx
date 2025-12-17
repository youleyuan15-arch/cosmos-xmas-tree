
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const GalaxyBackground: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useMemo(() => {
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 40; // 范围稍微调大
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      
      const choice = Math.random();
      if (choice > 0.95) color.setHex(0xffdd88);
      else if (choice > 0.7) color.setHex(0xffffff);
      else if (choice > 0.4) color.setHex(0xaaddff);
      else color.setHex(0xffc0cb);
      
      cols[i * 3] = color.r; 
      cols[i * 3 + 1] = color.g; 
      cols[i * 3 + 2] = color.b;
    }
    return { pos, cols, count };
  }, []);

  useFrame((s) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = s.clock.getElapsedTime() * 0.015;
      pointsRef.current.rotation.z = s.clock.getElapsedTime() * 0.008;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={particles.count} array={particles.pos} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={particles.count} array={particles.cols} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial 
          size={0.15} 
          vertexColors 
          transparent 
          opacity={0.6} 
          sizeAttenuation 
          blending={THREE.AdditiveBlending} 
          depthWrite={false} 
        />
      </points>
    </group>
  );
};
