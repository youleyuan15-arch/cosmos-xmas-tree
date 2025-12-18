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
  databaseURL: "https://cosmic-christmas-tree-default-rtdb.firebaseio.com/"
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
  const [hasInteracted, setHasInteracted] = useState(false); // 解决手机视频权限

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

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setParticleDensity(isMobile ? 0.4 : 1.0);
  }, []);

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
        alert("发送失败，请检查数据库规则");
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
    const { type, position } = data;
    setHandPosition(position);
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
  }, [isManualMode, pickNextPhoto]);

  return (
    <div 
      className="relative w-full h-full bg-black overflow-hidden font-sans text-white touch-none"
      onClick={() => setHasInteracted(true)} // 激活视频和音频权限
    >
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {/* 顶部菜单区：适配刘海屏 pt-16 */}
      <div className="absolute top-0 left-0 w-full p-4 pt-16 sm:pt-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/30 shadow-lg">
          <div className="flex flex-col gap-1">
             <div className={`p-2 rounded-lg ${currentShape==='tree'?'bg-white/20':'opacity-50'}`}>✊</div>
             <div className={`p-2 rounded-lg ${currentShape==='nebula'?'bg-white/20':'opacity-50'}`}>🖐️</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
           <button onClick={(e) => {e.stopPropagation(); setShowForm(true);}} className="px-5 py-2.5 rounded-full border border-white/50 bg-white/10 text-white text-xs backdrop-blur-md active:scale-95 shadow-xl">✉️ Letter</button>
           <button onClick={() => setIsManualMode(!isManualMode)} className={`px-5 py-2.5 rounded-full border text-xs transition-all ${isManualMode ? 'bg-white text-black font-bold' : 'bg-white/5'}`}>
              {isManualMode ? 'MANUAL' : 'GESTURE'}
           </button>
        </div>
      </div>

      {/* 底部 UI：适配底部横条 pb-16 */}
      <div className="absolute bottom-0 left-0 w-full p-4 pb-16 sm:pb-8 flex justify-between items-end gap-2 pointer-events-none z-30">
        <div className="pointer-events-auto backdrop-blur-2xl p-3 rounded-[1.8rem] border border-white/40 w-44 sm:w-80 bg-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black shadow-lg">
              {isPlaying ? "||" : "▶"}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] sm:text-sm font-bold truncate">{songInfo.title}</div>
              <div className="text-[7px] sm:text-[9px] text-white/50 truncate uppercase tracking-widest">MUSIC PLAYER</div>
            </div>
          </div>
        </div>
        
        <div className="pointer-events-auto transition-all transform origin-bottom-right scale-75 sm:scale-100 mb-[-10px]">
           {/* 只有在用户点击过屏幕后才尝试加载摄像头组件 */}
           {!isManualMode && hasInteracted && <GestureController onGestureDetected={handleGesture} />}
           {!hasInteracted && !isManualMode && (
             <div className="bg-white/10 border border-white/20 px-3 py-2 rounded-xl text-[8px] animate-pulse">点击屏幕开启手势识别</div>
           )}
        </div>
      </div>

      {/* 消息发送成功提示 */}
      {burstTime > 0 && performance.now()/1000 - burstTime < 5.0 && (
          <div className="absolute top-1/2 left-
