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
  } catch (e) {
    console.warn("Firebase 初始化失败:", e);
  }
}

export default function App() {
  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [lastDetectedGesture, setLastDetectedGesture] = useState<GestureType>('None');
  
  const [showForm, setShowForm] = useState(false);
  const [aspiration, setAspiration] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [burstTime, setBurstTime] = useState(0); 

  const [particleDensity, setParticleDensity] = useState(1.0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songInfo, setSongInfo] = useState({ title: 'Cosmic Silent Night', artist: 'Galaxy Ensemble' });
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  
  const deckRef = useRef<number[]>([]);
  const wasPinchingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 性能优化：移动端自动降级
  const checkPerformance = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      setParticleDensity(0.4); // 移动端减负
    }
  }, []);

  useEffect(() => {
    checkPerformance();
  }, [checkPerformance]);

  // 音乐控制逻辑
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying && audioUrl) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl]);

  const handleSubmit = async () => {
    if (!aspiration.trim() && !message.trim()) return;
    setIsSending(true);
    try {
        if (db) {
            await push(ref(db, 'messages'), { aspiration, message, timestamp: Date.now() });
        }
        setBurstTime(performance.now() / 1000);
        const prevShape = currentShape;
        setCurrentShape('clover');
        setShowForm(false);
        setAspiration('');
        setMessage('');
        setTimeout(() => { setCurrentShape(prevShape); setBurstTime(0); }, 8500);
    } catch (err) {
        alert("发送失败");
    } finally {
        setIsSending(false);
    }
  };

  const pickNextPhoto = useCallback(() => {
    if (photoAlbum.length === 0) return;
    if (deckRef.current.length === 0) deckRef.current = [...Array(photoAlbum.length).keys()].sort(() => Math.random() - 0.5);
    const nextIndex = deckRef.current.pop();
    if (nextIndex !== undefined) setCurrentPhotoUrl(photoAlbum[nextIndex]);
  }, [photoAlbum]); 

  const handleGesture = useCallback((data: GestureData) => {
    if (isManualMode) return; // 手动模式下忽略手势

    const { type, position } = data;
    setHandPosition(position);
    setLastDetectedGesture(type);

    if (type === 'Pinch') {
       if (!wasPinchingRef.current) {
         pickNextPhoto();
         setShowPhoto(true);
         wasPinchingRef.current = true;
       }
    } else {
      if (wasPinchingRef.current) {
        setShowPhoto(false);
        wasPinchingRef.current = false;
      }
    }

    if (type !== 'Pinch' && type !== 'None') {
      if (type === 'Fist') setCurrentShape('tree');
      if (type === 'Open_Palm') setCurrentShape('nebula');
      if (type === 'L_Shape') setCurrentShape('text');
    }
  }, [isManualMode, pickNextPhoto]);

  // 统一的形态切换处理函数（适配点击和触摸）
  const handleShapeSwitch = (shape: ShapeType) => {
    setIsManualMode(true); // 切换时自动进入手动模式
    setCurrentShape(shape);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="animate-form w-full max-w-sm bg-white/10 border border-white/40 backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white text-xl font-bold">星空寄语</h2>
                    <button onClick={() => setShowForm(false)} onTouchEnd={() => setShowForm(false)} className="text-white/40 p-2">✕</button>
                </div>
                <div className="space-y-4">
                    <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-white text-sm outline-none h-24 resize-none" placeholder="对明年的期许..." />
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-2xl p-4 text-white text-sm outline-none h-24 resize-none" placeholder="悄悄话..." />
                    <button onClick={handleSubmit} onTouchEnd={(e) => { e.preventDefault(); handleSubmit(); }} disabled={isSending} className="w-full py-4 rounded-2xl bg-white text-black font-bold uppercase tracking-widest text-xs">
                        {isSending ? '发送中...' : '发送信笺'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 拍立得相框预览 */}
      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none`}>
        <div className={`bg-white p-2 pb-6 shadow-2xl transform transition-all duration-300 ${showPhoto ? 'scale-100 opacity-100 rotate-[-2deg]' : 'scale-50 opacity-0 rotate-[10deg]'}`}>
          <img src={currentPhotoUrl} alt="Memory" className="w-[60vw] h-[60vw] max-w-[240px] max-h-[240px] object-cover border border-gray-100" />
          <div className="text-center mt-3 font-serif text-gray-800 italic text-sm">Merry Christmas</div>
        </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          {/* 左侧菜单：增加触摸支持 */}
          <div className="pointer-events-auto bg-white/10 backdrop-blur-xl p-2 rounded-[2rem] border border-white/30">
            <div className="space-y-1">
               <div onClick={() => handleShapeSwitch('tree')} onTouchEnd={() => handleShapeSwitch('tree')} className={`flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer ${currentShape==='tree' ? 'bg-white/20' : ''}`}><span className="text-lg">✊</span><span className="text-[9px] font-bold">TREE</span></div>
               <div onClick={() => handleShapeSwitch('nebula')} onTouchEnd={() => handleShapeSwitch('nebula')} className={`flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer ${currentShape==='nebula' ? 'bg-white/20' : ''}`}><span className="text-lg">🖐️</span><span className="text-[9px] font-bold">SPACE</span></div>
               <div onClick={() => handleShapeSwitch('text')} onTouchEnd={() => handleShapeSwitch('text')} className={`flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer ${currentShape==='text' ? 'bg-white/20' : ''}`}><span className="text-lg">👆</span><span className="text-[9px] font-bold">TEXT</span></div>
               <div onClick={() => setShowPhoto(!showPhoto)} onTouchEnd={() => setShowPhoto(!showPhoto)} className={`flex items-center gap-3 py-2 px-3 rounded-xl cursor-pointer ${showPhoto ? 'bg-white/20' : ''}`}><span className="text-lg">👌</span><span className="text-[9px] font-bold">PHOTO</span></div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pointer-events-auto items-end">
             <button onClick={() => setShowForm(true)} onTouchEnd={() => setShowForm(true)} className="px-4 py-2 rounded-full border border-white/50 bg-white/10 text-[10px]">✉️ Letter</button>
             <button onClick={() => fileInputRef.current?.click()} onTouchEnd={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-full border border-white/50 bg-white/10 text-[10px]">🖼️ Album</button>
             <button onClick={() => setIsManualMode(!isManualMode)} onTouchEnd={() => setIsManualMode(!isManualMode)} className={`px-4 py-2 rounded-full border text-[10px] ${isManualMode ? 'bg-white text-black font-bold' : 'bg-white/10'}`}>
                {isManualMode ? 'MANUAL' : 'GESTURE'}
             </button>
          </div>
        </div>
        
        <div className="flex justify-between items-end">
          {/* 音乐区 */}
          <div className="pointer-events-auto backdrop-blur-3xl p-4 rounded-[2rem] border border-white/30 bg-white/10 w-48 sm:w-64">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(!isPlaying)} onTouchEnd={() => setIsPlaying(!isPlaying)} className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black">
                {isPlaying ? '||' : '▶'}
              </button>
              <div className="min-w-0 overflow-hidden">
                <div className="font-bold text-xs truncate">{songInfo.title}</div>
                <div className="text-[9px] opacity-50 truncate">{songInfo.artist}</div>
              </div>
              <button onClick={() => musicInputRef.current?.click()} onTouchEnd={() => musicInputRef.current?.click()} className="p-2 opacity-50">📁</button>
            </div>
          </div>
          
          <div className={`pointer-events-auto transition-opacity ${isManualMode ? 'opacity-20' : 'opacity-100'}`}>
             <GestureController onGestureDetected={handleGesture} />
          </div>
        </div>
      </div>

      <input type="file" multiple ref={fileInputRef} onChange={(e) => { if (e.target.files) setPhotoAlbum(prev => [...prev, ...Array.from(e.target.files!).map(f => URL.createObjectURL(f))]); }} accept="image/*" className="hidden" />
      <input type="file" ref={musicInputRef} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          setAudioUrl(URL.createObjectURL(f));
          setSongInfo({ title: f.name.replace(/\.[^/.]+$/, ""), artist: 'User Uploaded' });
          setIsPlaying(true);
        }
      }} accept="audio/mp3,audio/mpeg" className="hidden" />
      <audio ref={audioRef} src={audioUrl || ''} loop />
    </div>
  );
}
