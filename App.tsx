import React, { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData, GestureType } from './components/GestureController.tsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push } from 'firebase/database';
import { ShapeType } from './types.ts';

// --- Firebase 配置区 ---
const firebaseConfig = {
  apiKey: "AIzaSyClBUC_mSEghAwjpwW_bh_v4YNpEO7fua0",
  authDomain: "cosmic-christmas-tree.firebaseapp.com",
  projectId: "cosmic-christmas-tree",
  storageBucket: "cosmic-christmas-tree.firebasestorage.app",
  messagingSenderId: "65471273470",
  appId: "1:65471273470:web:8724052c905abeb23588af",
  measurementId: "G-ZTNF3N384B",
  databaseURL: "https://cosmic-christmas-tree-default-rtdb.firebaseio.com"
};

const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
let db: any = null;
if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  } catch (e) { console.warn("Firebase 失败", e); }
}

export default function App() {
  // 核心改动：设备检测
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  // 手机端强制进入 MANUAL 模式，不显示手势窗口
  const [isManualMode, setIsManualMode] = useState(isMobile);
  
  const [showForm, setShowForm] = useState(false);
  const [aspiration, setAspiration] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [burstTime, setBurstTime] = useState(0); 

  const [particleDensity, setParticleDensity] = useState(isMobile ? 0.35 : 1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songInfo, setSongInfo] = useState({ title: 'Cosmic Silent Night', artist: 'Galaxy Ensemble' });
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  
  const wasPinchingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 手机端点击形态图标的逻辑
  const handleShapeSelect = (shape: ShapeType) => {
    setCurrentShape(shape);
    if (!isMobile) setIsManualMode(true); // 电脑端点击图标也暂时切到手动
  };

  const handleSubmit = async () => {
    if (!aspiration.trim() && !message.trim()) return;
    setIsSending(true);
    try {
        if (db) await push(ref(db, 'messages'), { aspiration, message, timestamp: Date.now() });
        setBurstTime(performance.now() / 1000);
        const prevShape = currentShape;
        setCurrentShape('clover');
        setShowForm(false);
        setAspiration('');
        setMessage('');
        setTimeout(() => { setCurrentShape(prevShape); setBurstTime(0); }, 8500);
    } catch (err) { alert("发送失败"); } finally { setIsSending(false); }
  };

  const handleGesture = useCallback((data: GestureData) => {
    if (isMobile) return; // 手机端跳过所有手势逻辑
    const { type, position } = data;
    setHandPosition(position);
    if (isManualMode) return;

    if (type === 'Pinch') {
       if (!wasPinchingRef.current) {
         setShowPhoto(true);
         wasPinchingRef.current = true;
       }
    } else {
      if (wasPinchingRef.current) { setShowPhoto(false); wasPinchingRef.current = false; }
      if (type === 'Fist') setCurrentShape('tree');
      if (type === 'Open_Palm') setCurrentShape('nebula');
      if (type === 'L_Shape') setCurrentShape('text');
    }
  }, [isManualMode, isMobile]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {/* 信笺表单 */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4">
            <div className="w-full max-w-sm bg-white/5 border border-white/40 backdrop-blur-3xl rounded-[2.5rem] p-10 shadow-2xl">
                <h2 className="text-white text-2xl font-bold mb-6">星空寄语</h2>
                <div className="space-y-6">
                    <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-white text-sm outline-none h-28 resize-none" placeholder="愿星光照亮前路..." />
                    <button onClick={handleSubmit} disabled={isSending} className="w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-xs bg-white text-black active:scale-95 transition-all shadow-lg">
                        {isSending ? '正在寄出...' : '发送信笺'}
                    </button>
                    <button onClick={() => setShowForm(false)} className="w-full text-white/30 text-[10px] uppercase tracking-[0.2em]">Close</button>
                </div>
            </div>
        </div>
      )}

      {/* 拍立得照片 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto" onClick={() => setShowPhoto(false)}>
        <div className={`bg-white p-2 pb-6 shadow-2xl transition-all duration-300 ${showPhoto ? 'scale-100 opacity-100 rotate-[-2deg]' : 'scale-50 opacity-0 rotate-[10deg]'}`}>
          <img src={currentPhotoUrl} alt="Memory" className="w-[60vw] h-[60vw] max-w-[260px] object-cover" />
          <div className="text-center mt-3 font-serif text-gray-800 italic">Merry Christmas</div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 p-4 sm:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          {/* 左侧形态图标：手机端通过点击此处触控切换 */}
          <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 rounded-[1.5rem] border border-white/30">
            <div className="space-y-1">
               <div onClick={() => handleShapeSelect('tree')} className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${currentShape==='tree' ? 'bg-white/20' : ''}`}><span className="text-lg">🎄</span><span className="text-[9px] font-bold">TREE</span></div>
               <div onClick={() => handleShapeSelect('nebula')} className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${currentShape==='nebula' ? 'bg-white/20' : ''}`}><span className="text-lg">🌌</span><span className="text-[9px] font-bold">SPACE</span></div>
               <div onClick={() => setShowPhoto(!showPhoto)} className={`flex items-center gap-3 py-2 px-3 rounded-xl transition-all ${showPhoto ? 'bg-white/20' : ''}`}><span className="text-lg">🖼️</span><span className="text-[9px] font-bold">PHOTO</span></div>
            </div>
          </div>
          <div className="flex flex-col gap-2 pointer-events-auto items-end">
             <button onClick={() => setShowForm(true)} className="px-5 py-2 rounded-full border border-white/50 bg-white/5 text-[10px] backdrop-blur-md">✉️ Letter</button>
             {!isMobile && (
               <button onClick={() => setIsManualMode(!isManualMode)} className={`px-5 py-2 rounded-full border text-[10px] transition-all ${isManualMode ? 'bg-white text-black' : 'bg-white/5 border-white/50'}`}>
                 {isManualMode ? 'MANUAL' : 'GESTURE'}
               </button>
             )}
          </div>
        </div>
        
        <div className="flex justify-between items-end gap-2">
          {/* 音乐控制器 */}
          <div className="pointer-events-auto backdrop-blur-2xl p-4 rounded-[2rem] border border-white/40 bg-white/10 w-60 sm:w-80 shadow-2xl flex items-center gap-3">
             <button onClick={() => setIsPlaying(!isPlaying)} className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black font-bold active:scale-90 transition-all ${isPlaying ? 'animate-pulse' : ''}`}>
               {isPlaying ? '||' : '▶'}
             </button>
             <div className="flex-1 min-w-0">
                <input className="w-full bg-transparent border-none text-white font-bold text-xs outline-none" value={songInfo.title} onChange={(e) => setSongInfo({...songInfo, title: e.target.value})} />
                <input className="w-full bg-transparent border-none text-white/50 text-[9px] uppercase outline-none" value={songInfo.artist} onChange={(e) => setSongInfo({...songInfo, artist: e.target.value})} />
             </div>
             <button onClick={() => musicInputRef.current?.click()} className="p-2 bg-white/5 rounded-lg">📁</button>
          </div>
          
          {/* 电脑端才显示手势预览窗口 */}
          {!isMobile && (
            <div className={`pointer-events-auto transition-all ${isManualMode ? 'opacity-0 scale-90' : 'opacity-100'}`}>
               <GestureController onGestureDetected={handleGesture} />
            </div>
          )}
        </div>
      </div>

      <input type="file" ref={musicInputRef} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          setAudioUrl(URL.createObjectURL(f));
          setSongInfo({ title: f.name.replace(/\.[^/.]+$/, ""), artist: 'Local' });
          setIsPlaying(true);
        }
      }} className="hidden" accept="audio/*" />
      <audio ref={audioRef} loop playsInline />
    </div>
  );
}
