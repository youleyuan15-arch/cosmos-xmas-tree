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

const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId !== "YOUR_PROJECT";

let db: any = null;
if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  } catch (e) {
    console.warn("Firebase 初始化失败，切换至演示模式:", e);
  }
}

export default function App() {
  // 仅新增：设备检测
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(isMobile); // 手机默认手动模式
  const [lastDetectedGesture, setLastDetectedGesture] = useState<GestureType>('None');
  
  const [showForm, setShowForm] = useState(false);
  const [aspiration, setAspiration] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [burstTime, setBurstTime] = useState(0); 

  const [particleDensity, setParticleDensity] = useState(isMobile ? 0.4 : 1.0);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songInfo, setSongInfo] = useState({ title: 'Cosmic Silent Night', artist: 'Galaxy Ensemble' });
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      if (audio.paused && audioUrl) audio.play().catch(() => setIsPlaying(false));
    } else {
      if (!audio.paused) audio.pause();
    }
  }, [isPlaying, audioUrl]);

  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  
  const deckRef = useRef<number[]>([]);
  const wasPinchingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (isMobile) return; // 手机端跳过手势计算
    const { type, position } = data;
    setHandPosition(position);
    setLastDetectedGesture(type);

    if (isManualMode) return;

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
      if (type === 'Fist') setCurrentShape('tree');
      if (type === 'Open_Palm') setCurrentShape('nebula');
      if (type === 'L_Shape') setCurrentShape('text');
    }
  }, [isManualMode, pickNextPhoto, isMobile]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4 sm:p-6">
            <div className="animate-form w-full max-sm:max-w-[92vw] max-w-sm bg-white/5 border border-white/40 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-10 shadow-2xl">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h2 className="text-white text-lg sm:text-2xl font-bold tracking-tight">星空寄语</h2>
                    <button onClick={() => setShowForm(false)} className="text-white/40 p-2 text-lg">✕</button>
                </div>
                <div className="space-y-4 sm:space-y-6">
                    <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white text-xs outline-none h-20 resize-none" placeholder="愿星光照亮前路..." />
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white text-xs outline-none h-20 resize-none" placeholder="匿名悄悄话..." />
                    <button onClick={handleSubmit} disabled={isSending} className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase text-[10px]">
                        {isSending ? '正在寄出...' : '发送信笺'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {burstTime > 0 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[60] text-white text-[10px] bg-white/5 px-8 py-3 rounded-full backdrop-blur-3xl border border-white/30 text-center shadow-lg">
              感谢你的来信，祝你好运~
          </div>
      )}

      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none`}>
        <div className={`bg-white p-1 sm:p-2 pb-3 sm:pb-6 shadow-2xl transform transition-all duration-300 ${showPhoto ? 'scale-100 opacity-100 rotate-[-2deg]' : 'scale-75 opacity-0 rotate-[5deg]'}`}>
          <img src={currentPhotoUrl} alt="Memory" className="w-[45vw] h-[45vw] sm:w-[65vw] sm:h-[65vw] max-w-[260px] max-h-[260px] object-cover" />
          <div className="text-center mt-1 sm:mt-3 font-serif text-gray-800 italic text-[10px] sm:text-lg">Merry Christmas</div>
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
      }} accept="audio/*" className="hidden" />
      <audio ref={audioRef} loop />

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 p-3 sm:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 sm:p-4 rounded-[1.2rem] sm:rounded-[2rem] border border-white/50">
            <div className="space-y-0.5 sm:space-y-1">
               {/* 增加 onClick，方便手机端触控 */}
               <div onClick={() => setCurrentShape('tree')} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${currentShape==='tree' ? 'bg-white/20' : ''}`}><span className="text-sm">✊</span><span className="text-[8px] font-bold uppercase tracking-widest">Tree</span></div>
               <div onClick={() => setCurrentShape('nebula')} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${currentShape==='nebula' ? 'bg-white/20' : ''}`}><span className="text-sm">🖐️</span><span className="text-[8px] font-bold uppercase tracking-widest">Space</span></div>
               <div onClick={() => setShowPhoto(!showPhoto)} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${showPhoto ? 'bg-white/20' : ''}`}><span className="text-sm">👌</span><span className="text-[8px] font-bold uppercase tracking-widest">Photo</span></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pointer-events-auto items-end">
             <button onClick={() => setShowForm(true)} className="px-5 py-2 rounded-full border border-white/50 bg-white/5 text-[10px]">✉️ Letter</button>
             <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 rounded-full border border-white/50 bg-white/5 text-[10px]">🖼️ Album</button>
             {!isMobile && (
                <button onClick={() => setIsManualMode(!isManualMode)} className={`px-5 py-2 rounded-full border text-[10px] ${isManualMode ? 'bg-white text-black' : 'bg-white/5 border-white/50'}`}>
                  {isManualMode ? 'MANUAL' : 'GESTURE'}
                </button>
             )}
          </div>
        </div>
        
        <div className="flex justify-between items-end gap-2">
          {/* 音乐播放控制完全没改 */}
          <div className="pointer-events-auto backdrop-blur-2xl p-3 sm:p-5 rounded-[1.5rem] border border-white/40 bg-white/10 w-52 sm:w-80 shadow-2xl flex items-center gap-3">
             <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black font-bold active:scale-90">
               {isPlaying ? '||' : '▶'}
             </button>
             <div className="flex-1 min-w-0">
                <input className="w-full bg-transparent border-none text-white font-bold text-[11px] sm:text-sm outline-none" value={songInfo.title} onChange={e => setSongInfo({...songInfo, title: e.target.value})} />
                <input className="w-full bg-transparent border-none text-white/50 text-[8px] sm:text-[10px] outline-none" value={songInfo.artist} onChange={e => setSongInfo({...songInfo, artist: e.target.value})} />
             </div>
             <button onClick={() => musicInputRef.current?.click()} className="p-2 bg-white/5 rounded-lg">📁</button>
          </div>
          
          {/* 核心改动：如果是手机端，不渲染 GestureController */}
          {!isMobile && (
            <div className={`pointer-events-auto transition-all duration-700 ${isManualMode ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
               <GestureController onGestureDetected={handleGesture} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
