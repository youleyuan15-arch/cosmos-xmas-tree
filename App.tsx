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
  const [hasInteracted, setHasInteracted] = useState(false); 

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
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white touch-none">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {/* 终极全屏交互层：确保用户点任何地方都能激活权限 */}
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

      {/* 顶部菜单区 */}
      <div className="absolute top-0 left-0 w-full p-4 pt-16 sm:pt-10 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/30 shadow-2xl">
          <div className="flex flex-col gap-2">
             <div onClick={() => setCurrentShape('tree')} className={`p-2 rounded-lg cursor-pointer ${currentShape==='tree'?'bg-white/20':'opacity-50'}`}>✊</div>
             <div onClick={() => setCurrentShape('nebula')} className={`p-2 rounded-lg cursor-pointer ${currentShape==='nebula'?'bg-white/20':'opacity-50'}`}>🖐️</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
           <button onClick={(e) => { e.stopPropagation(); setShowForm(true); }} className="px-6 py-2.5 rounded-full border border-white/50 bg-white/10 text-white text-xs backdrop-blur-md active:scale-95 shadow-xl">✉️ 寄信</button>
           <button onClick={() => setIsManualMode(!isManualMode)} className={`px-6 py-2.5 rounded-full border text-xs transition-all ${isManualMode ? 'bg-white text-black font-bold' : 'bg-white/5'}`}>
              {isManualMode ? 'MANUAL' : 'GESTURE'}
           </button>
        </div>
      </div>

      {/* 底部 UI */}
      <div className="absolute bottom-0 left-0 w-full p-4 pb-16 sm:pb-12 flex justify-between items-end gap-2 pointer-events-none z-30">
        <div className="pointer-events-auto backdrop-blur-2xl p-4 rounded-[2rem] border border-white/40 w-48 sm:w-80 bg-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <button onClick
