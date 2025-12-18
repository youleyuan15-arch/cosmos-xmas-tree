import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData } from './components/GestureController.tsx';
import { ShapeType } from './types.ts';

export default function App() {
  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [hasInteracted, setHasInteracted] = useState(false); 
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [particleDensity, setParticleDensity] = useState(1.0);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setParticleDensity(isMobile ? 0.4 : 1.0);
  }, []);

  const handleGesture = useCallback((data: GestureData) => {
    setHandPosition(data.position);
    if (data.type === 'Fist') setCurrentShape('tree');
    if (data.type === 'Open_Palm') setCurrentShape('nebula');
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden touch-none">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={0} density={particleDensity} />
      
      {/* 强制交互层：如果这个没出来，说明编译还是失败的 */}
      {!hasInteracted && (
        <div 
          onClick={() => {
            alert("正在激活摄像头...");
            setHasInteracted(true);
          }}
          className="fixed inset-0 z-[999] bg-black/80 flex flex-col items-center justify-center cursor-pointer"
        >
          <div className="text-white text-lg font-bold">点击屏幕开启手势控制</div>
        </div>
      )}

      {/* 底部 UI */}
      <div className="absolute bottom-10 right-4 z-50 pointer-events-auto">
         {hasInteracted && <GestureController onGestureDetected={handleGesture} />}
      </div>
    </div>
  );
}
