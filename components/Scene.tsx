
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { ParticleTree } from './ParticleTree.tsx';
import { GalaxyBackground } from './GalaxyBackground.tsx';
import { ShapeType } from '../types.ts';

interface SceneProps {
  currentShape: ShapeType;
  handPosition: { x: number; y: number };
  burstTime: number;
  density?: number;
}

export const Scene: React.FC<SceneProps> = ({ currentShape, handPosition, burstTime, density = 1.0 }) => {
  return (
    <Canvas 
      dpr={[1, 2]} 
      gl={{ 
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      }}
    >
      <color attach="background" args={['#000000']} /> 
      <fog attach="fog" args={['#000000', 30, 100]} />
      
      <GalaxyBackground />

      <PerspectiveCamera makeDefault position={[0, 2, 18]} fov={35} />
      
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={8} 
        maxDistance={40}
        autoRotate={false}
        enableRotate={true} 
        enableDamping={true}
        dampingFactor={0.05}
      />

      <group position={[0, -5, 0]}>
        <ParticleTree currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={density} />
      </group>
    </Canvas>
  );
};
