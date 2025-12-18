import React, { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData } from './components/GestureController.tsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push } from 'firebase/database';
import { ShapeType } from './types.ts';

// --- Firebase 配置 ---
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  
  // 照片库逻辑
  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=600"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  const deckRef = useRef<number[]>([]);
  const wasPinchingRef = useRef(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setParticleDensity(isMobile ? 0.4 : 1.0);
  }, []);

  // 音乐上传处理
  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsPlaying(true);
    }
  };

  // 照片上传处理
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoAlbum(prev => [...prev, url]);
      setCurrentPhotoUrl(url);
    }
  };

  const pickNextPhoto = useCallback(() => {
    if (photoAlbum.length === 0) return;
    if (deckRef.current.length === 0) deckRef.current = [...Array(photoAlbum.length).keys()].sort(() => Math.random() - 0.5);
    const nextIndex = deckRef.current.pop();
    if (nextIndex !== undefined) setCurrentPhotoUrl(photoAlbum[nextIndex]);
  }, [photoAlbum]);

  const handleSubmit = async () => {
    if (!aspiration.trim()) return;
    setIsSending(true);
    try {
      await push(ref(db, 'messages'), { aspiration, message, timestamp: Date.now() });
      setBurstTime(performance.now() / 1000);
      setShowForm(false);
      setAspiration('');
      setTimeout(() => setBurstTime(0), 5000);
    } catch (err) { alert("发送失败"); }
    finally { setIsSending(false); }
  };

  const handleGesture = useCallback((data: GestureData) => {
    // 镜像修复：手机端 x 坐标通常需要反转
    setHandPosition({ x: 1 - data.position.x, y: data.position.y });
    if (isManualMode) return;

    switch(data.type) {
      case 'Pinch':
        if (!wasPinchingRef.current) {
          pickNextPhoto();
          setShowPhoto(true);
          wasPinchingRef.current = true;
        }
        break;
      case 'Fist':
        setCurrentShape('tree');
        setShowPhoto(false);
        wasPinchingRef.current = false;
        break;
      case 'Open_Palm':
        setCurrentShape('nebula');
        setShowPhoto(false);
        wasPinchingRef.current = false;
        break;
      case 'L_Shape':
        setCurrentShape('text');
        setShowPhoto(false);
        wasPinchingRef.current = false;
        break;
      case 'None':
        setShowPhoto(false);
        wasPinchingRef.current = false;
        break;
    }
  }, [isManualMode, pickNextPhoto]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white touch-none">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {showPhoto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <img src={currentPhotoUrl} className="max-w-[80%] max-h-[80%] rounded-3xl shadow-2xl border-4 border-white/20 animate-in zoom-in-75 duration-300" alt="Memory" />
        </div>
      )}

      {!hasInteracted && (
        <div onClick={() => setHasInteracted(true)} className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center cursor-pointer">
          <div className="text-6xl mb-6 animate-pulse">🎄</div>
          <h1 className="text-2xl font-black tracking-tighter mb-2">COSMIC TREE</h1>
          <p className="text-white/40 text-xs tracking-[0.2em] mb-8">TAP TO ACTIVATE EXPERIENCE</p>
          <div className="px-10 py-4 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest">START</div>
        </div>
      )}

      {/* 侧边功能区 */}
      <div className="absolute top-0 left-0 w-full p-6 pt-16 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto bg-black/20 backdrop-blur-xl p-3 rounded-3xl border border-white/10 flex flex-col gap-4">
          <div onClick={() => setCurrentShape('tree')} className={`p-3 rounded-xl transition-all ${currentShape==='tree'?'bg-white/20 scale-110':'opacity-30'}`}>✊ TREE</div>
          <div onClick={() => setCurrentShape('nebula')} className={`p-3 rounded-xl transition-all ${currentShape==='nebula'?'bg-white/20 scale-110':'opacity-30'}`}>🖐️ SPACE</div>
          <div onClick={() => setCurrentShape('text')} className={`p-3 rounded-xl transition-all ${currentShape==='text'?'bg-white/20 scale-110':'opacity-30'}`}>☝️ TEXT</div>
        </div>

        <div className="flex flex-col gap-3 pointer-events-auto items-end">
          <button onClick={() => setShowForm(true)} className="px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-widest active:scale-90">✉️ Letter</button>
          <label className="px-6 py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-widest cursor-pointer active:scale-90">
            🖼️ Photo <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </div>
      </div>

      {/* 底部播放器 */}
      <div className="absolute bottom-0 left-0 w-full p-6 pb-12 flex justify-between items-end z-30 pointer-events-none">
        <div className="pointer-events-auto bg-black/20 backdrop-blur-2xl p-4 rounded-[2.5rem] border border-white/10 w-64 bg-white/5 flex items-center gap-4 shadow-2xl">
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center text-xl shadow-lg active:scale-90">
            {isPlaying ? "||" : "▶"}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-black truncate uppercase tracking-tight">Cosmic Audio</div>
            <label className="text-[9px] text-white/40 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
              Upload Music <input type="file" hidden accept="audio/*" onChange={handleMusicUpload} ref={musicInputRef} />
            </label>
          </div>
        </div>

        <div className="pointer-events-auto transform scale-90 sm:scale-100 origin-bottom-right">
          {hasInteracted && <GestureController onGestureDetected={handleGesture} />}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[3rem] p-10 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-2xl font-black mb-8 tracking-tighter italic">NEW MESSAGE</h2>
            <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm mb-6 h-48 outline-none focus:border-white/30 transition-all" placeholder="Your cosmic wish..." />
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-4 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-widest">Cancel</button>
              <button onClick={handleSubmit} disabled={isSending} className="flex-[2] py-4 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest shadow-xl shadow-white/10">{isSending ? 'Sending...' : 'Send Letter'}</button>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={audioUrl || ''} loop />
    </div>
  );
}
