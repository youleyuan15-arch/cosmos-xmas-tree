import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData } from './components/GestureController.tsx';
import { ShapeType } from './types.ts';

export default function App() {
  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [hasInteracted, setHasInteracted] = useState(false); 
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [particleDensity, setParticleDensity] = useState(1.0);
  const [showForm, setShowForm] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setParticleDensity(isMobile ? 0.4 : 1.0);
  }, []);

  const handleGesture = useCallback((data: GestureData) => {
    setHandPosition(data.position);
    // 基础手势映射
    if (data.type === 'Fist') setCurrentShape('tree');
    if (data.type === 'Open_Palm') setCurrentShape('nebula');
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white touch-none">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={0} density={particleDensity} />
      
      {/* 1. 初始引导层：点击即消失并激活摄像头 */}
      {!hasInteracted && (
        <div 
          onClick={() => setHasInteracted(true)}
          className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer p-10 text-center"
        >
          <div className="animate-bounce text-5xl mb-6">✨</div>
          <h1 className="text-2xl font-bold mb-2">欢迎来到星空树</h1>
          <p className="text-white/60 text-sm mb-8">点击屏幕开启宇宙交互与音乐</p>
          <div className="px-8 py-3 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs">进入</div>
        </div>
      )}

      {/* 2. 顶部菜单区：适配刘海屏 */}
      <div className="absolute top-0 left-0 w-full p-4 pt-16 sm:pt-10 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/30 shadow-2xl">
          <div className="flex flex-col gap-2 text-xl">
             <div onClick={() => setCurrentShape('tree')} className={`p-2 rounded-lg cursor-pointer ${currentShape==='tree'?'bg-white/20':'opacity-50'}`}>✊</div>
             <div onClick={() => setCurrentShape('nebula')} className={`p-2 rounded-lg cursor-pointer ${currentShape==='nebula'?'bg-white/20':'opacity-50'}`}>🖐️</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
           <button onClick={() => setShowForm(true)} className="px-6 py-2.5 rounded-full border border-white/50 bg-white/10 text-white text-xs backdrop-blur-md active:scale-95 shadow-xl">✉️ Letter</button>
        </div>
      </div>

      {/* 3. 底部 UI：播放器和手势预览 */}
      <div className="absolute bottom-0 left-0 w-full p-4 pb-16 sm:pb-12 flex justify-between items-end gap-2 pointer-events-none z-30">
        <div className="pointer-events-auto backdrop-blur-2xl p-4 rounded-[2rem] border border-white/40 w-48 sm:w-80 bg-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black shadow-lg">
              {isPlaying ? "||" : "▶"}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-bold truncate">Cosmic Melody</div>
              <div className="text-[8px] text-white/50 truncate uppercase tracking-widest mt-1">Player Control</div>
            </div>
          </div>
        </div>
        
        {/* 手势控制器容器 */}
        <div className="pointer-events-auto transition-all transform origin-bottom-right scale-75 sm:scale-100">
           {hasInteracted && <GestureController onGestureDetected={handleGesture} />}
        </div>
      </div>

      {/* 4. 寄信弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
            <div className="w-full max-w-sm bg-gray-900 border border-white/20 rounded-[2.5rem] p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold">星空寄语</h2>
                    <button onClick={() => setShowForm(false)} className="text-white/40 p-2 text-2xl">✕</button>
                </div>
                <textarea className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm mb-6 h-40 outline-none focus:border-white/40" placeholder="写下你的期许..." />
                <button onClick={() => setShowForm(false)} className="w-full py-4 rounded-2xl bg-white text-black font-bold text-xs uppercase shadow-lg">发送信笺</button>
            </div>
        </div>
      )}
    </div>
  );
}
