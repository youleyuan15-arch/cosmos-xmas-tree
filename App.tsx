import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData } from './components/GestureController.tsx';
import { ShapeType } from './types.ts';

export default function App() {
  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(true); // 手机端建议默认手动，稳定后再开手势
  const [isPlaying, setIsPlaying] = useState(false);
  const [songInfo, setSongInfo] = useState({ title: 'Cosmic Silent Night', artist: 'Galaxy Ensemble' });
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  // 修复音乐：点击播放按钮的同时强制触发 audio 对象的加载
  const handleToggleMusic = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => alert("请先点击右侧文件夹图标上传 MP3 音乐"));
    }
  };

  const closePhoto = (e: React.PointerEvent) => {
    e.stopPropagation();
    setShowPhoto(false);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden touch-none" onPointerDown={() => showPhoto && setShowPhoto(false)}>
      <Scene currentShape={currentShape} density={0.4} />

      {/* 顶部菜单：使用 onPointerDown 解决移动端点击延迟 */}
      <div className="absolute top-6 left-6 z-50 flex flex-col gap-4 pointer-events-auto">
        {[
          { id: 'tree', icon: '🎄' },
          { id: 'nebula', icon: '🌌' },
          { id: 'text', icon: '✨' }
        ].map(item => (
          <button 
            key={item.id}
            onPointerDown={(e) => { e.stopPropagation(); setCurrentShape(item.id as ShapeType); }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl transition-all ${currentShape === item.id ? 'bg-white scale-110' : 'bg-white/10 border border-white/20'}`}
          >
            {item.icon}
          </button>
        ))}
        <button 
          onPointerDown={(e) => { e.stopPropagation(); setShowPhoto(!showPhoto); }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${showPhoto ? 'bg-yellow-400' : 'bg-white/10 border border-white/20'}`}
        >
          🖼️
        </button>
      </div>

      {/* 音乐播放控制区：解决歌曲信息编辑问题 */}
      <div className="absolute bottom-10 left-6 z-50 pointer-events-auto bg-black/80 backdrop-blur-2xl p-4 rounded-[2rem] border border-white/20 flex items-center gap-4 shadow-2xl">
        <button onPointerDown={handleToggleMusic} className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center text-xl font-bold active:scale-90 transition-transform">
          {isPlaying ? '||' : '▶'}
        </button>
        <div className="flex flex-col gap-1">
          <input 
            className="bg-transparent border-none text-white text-sm font-bold w-32 outline-none focus:ring-1 focus:ring-white/30 rounded px-1"
            value={songInfo.title}
            onChange={(e) => setSongInfo({...songInfo, title: e.target.value})}
            onPointerDown={(e) => e.stopPropagation()}
          />
          <input 
            className="bg-transparent border-none text-white/50 text-[10px] uppercase tracking-widest w-32 outline-none focus:ring-1 focus:ring-white/10 rounded px-1"
            value={songInfo.artist}
            onChange={(e) => setSongInfo({...songInfo, artist: e.target.value})}
            onPointerDown={(e) => e.stopPropagation()}
          />
        </div>
        <button onPointerDown={(e) => { e.stopPropagation(); musicInputRef.current?.click(); }} className="p-2 opacity-50 hover:opacity-100 transition-opacity">📁</button>
      </div>

      {/* 手势控制区 */}
      <div className="absolute bottom-10 right-6 z-50 flex flex-col items-end gap-2">
        <div className={isManualMode ? 'opacity-30 grayscale' : 'opacity-100'}>
          <GestureController onGestureDetected={(data) => { if (!isManualMode) { 
              if (data.type === 'Fist') setCurrentShape('tree');
              if (data.type === 'Open_Palm') setCurrentShape('nebula');
              if (data.type === 'L_Shape') setCurrentShape('text');
              if (data.type === 'Pinch') setShowPhoto(true);
          }}} />
        </div>
        <button 
          onPointerDown={(e) => { e.stopPropagation(); setIsManualMode(!isManualMode); }}
          className={`px-6 py-2 rounded-full text-[10px] font-bold tracking-tighter shadow-lg transition-all ${isManualMode ? 'bg-white text-black' : 'bg-red-600 text-white animate-pulse'}`}
        >
          {isManualMode ? '开启手势控制' : '已进入手势模式'}
        </button>
      </div>

      {/* 拍立得相框：点击即关闭 */}
      {showPhoto && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onPointerDown={closePhoto}>
          <div className="bg-white p-3 pb-12 shadow-[0_50px_100px_rgba(0,0,0,0.5)] rotate-[-2deg] animate-in zoom-in-75 duration-300">
            <img src="https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=500" className="w-[70vw] h-[70vw] max-w-[300px] max-h-[300px] object-cover" alt="Xmas" />
            <div className="text-black text-center mt-4 font-serif italic text-xl">Merry Christmas</div>
          </div>
        </div>
      )}

      <input type="file" ref={musicInputRef} className="hidden" accept="audio/*" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const url = URL.createObjectURL(file);
          if (audioRef.current) audioRef.current.src = url;
          setSongInfo({ title: file.name.split('.')[0], artist: 'Local File' });
          setIsPlaying(false);
        }
      }} />
      <audio ref={audioRef} loop playsInline />
    </div>
  );
}
