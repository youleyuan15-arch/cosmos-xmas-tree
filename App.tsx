import React, { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData } from './components/GestureController.tsx';
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default function App() {
  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); // 关键：解决手机启动

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
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  
  const deckRef = useRef<number[]>([]);
  const wasPinchingRef = useRef(false);

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

  // --- 恢复所有上传逻辑 ---
  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioUrl(URL.createObjectURL(file));
      setSongInfo({ title: file.name.replace(/\.[^/.]+$/, ""), artist: "本地上传" });
      setIsPlaying(true);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoAlbum(prev => [...prev, url]);
      setCurrentPhotoUrl(url);
      setShowPhoto(true);
      setTimeout(() => setShowPhoto(false), 3000);
    }
  };

  const pickNextPhoto = useCallback(() => {
    if (photoAlbum.length === 0) return;
    if (deckRef.current.length === 0) deckRef.current = [...Array(photoAlbum.length).keys()].sort(() => Math.random() - 0.5);
    const nextIndex = deckRef.current.pop();
    if (nextIndex !== undefined) setCurrentPhotoUrl(photoAlbum[nextIndex]);
  }, [photoAlbum]); 

  // --- 恢复 Firebase 原始字段 ---
  const handleSubmit = async () => {
    if (!aspiration.trim() && !message.trim()) return;
    setIsSending(true);
    try {
      await push(ref(db, 'messages'), { aspiration, message, timestamp: Date.now() });
      setBurstTime(performance.now() / 1000);
      setShowForm(false);
      setAspiration('');
      setMessage('');
      setTimeout(() => setBurstTime(0), 8500);
    } catch (err) { alert("发送失败，请重试"); }
    finally { setIsSending(false); }
  };

  // --- 恢复完整手势识别映射 ---
  const handleGesture = useCallback((data: GestureData) => {
    setHandPosition(data.position);
    if (isManualMode) return;

    if (data.type === 'Pinch') { // 捏合手势
      if (!wasPinchingRef.current) {
        pickNextPhoto();
        setShowPhoto(true);
        wasPinchingRef.current = true;
      }
    } else {
      if (wasPinchingRef.current) { setShowPhoto(false); wasPinchingRef.current = false; }
      if (data.type === 'Fist') setCurrentShape('tree');      // 握拳
      if (data.type === 'Open_Palm') setCurrentShape('nebula'); // 张开
      if (data.type === 'L_Shape') setCurrentShape('text');     // 比八
    }
  }, [isManualMode, pickNextPhoto]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white touch-none">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {/* 照片显示层 */}
      {showPhoto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <img src={currentPhotoUrl} className="max-w-[80%] max-h-[80%] rounded-3xl border-4 border-white/20 shadow-2xl animate-in zoom-in-95" alt="Memory" />
        </div>
      )}

      {/* 手机端启动遮罩 */}
      {!hasInteracted && (
        <div onClick={() => setHasInteracted(true)} className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center cursor-pointer">
          <div className="text-6xl mb-6 animate-pulse">🎄</div>
          <h1 className="text-2xl font-bold mb-2">星空圣诞树</h1>
          <p className="text-white/40 text-[10px] tracking-[0.3em] mb-10 text-center">点击屏幕开启宇宙交互与音乐</p>
          <div className="px-10 py-4 bg-white text-black rounded-full font-black text-xs tracking-widest uppercase">Enter</div>
        </div>
      )}

      {/* 顶部菜单区 */}
      <div className="absolute top-0 left-0 w-full p-4 pt-16 sm:pt-6 flex justify-between items-start z-30 pointer-events-none">
        <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/30 flex flex-col gap-1">
           <div onClick={() => setCurrentShape('tree')} className={`p-2 rounded-lg cursor-pointer ${currentShape==='tree'?'bg-white/20':'opacity-50'}`}>✊</div>
           <div onClick={() => setCurrentShape('nebula')} className={`p-2 rounded-lg cursor-pointer ${currentShape==='nebula'?'bg-white/20':'opacity-50'}`}>🖐️</div>
           <div onClick={() => setCurrentShape('text')} className={`p-2 rounded-lg cursor-pointer ${currentShape==='text'?'bg-white/20':'opacity-50'}`}>☝️</div>
        </div>
        <div className="flex flex-col gap-3 pointer-events-auto items-end">
          <button onClick={() => setShowForm(true)} className="px-5 py-2.5 rounded-full border border-white/50 bg-white/10 text-white text-xs backdrop-blur-md active:scale-95 shadow-xl">✉️ 寄信</button>
          <label className="px-5 py-2.5 rounded-full border border-white/50 bg-white/10 text-white text-xs backdrop-blur-md cursor-pointer active:scale-95 shadow-xl">
             🖼️ 传照 <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </div>
      </div>

      {/* 底部 UI */}
      <div className="absolute bottom-0 left-0 w-full p-4 pb-16 sm:pb-8 flex justify-between items-end gap-2 pointer-events-none z-30">
        <div className="pointer-events-auto backdrop-blur-2xl p-3 rounded-[1.8rem] border border-white/40 w-44 sm:w-80 bg-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black shadow-lg">
              {isPlaying ? "||" : "▶"}
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] sm:text-sm font-bold truncate">{songInfo.title}</div>
              <label className="text-[7px] text-white/50 uppercase tracking-widest cursor-pointer hover:text-white transition-all">
                更换音乐 <input type="file" hidden accept="audio/*" onChange={handleMusicUpload} />
              </label>
            </div>
          </div>
        </div>
        
        <div className="pointer-events-auto transition-all transform origin-bottom-right scale-75 sm:scale-100 mb-[-10px]">
           {hasInteracted && !isManualMode && <GestureController onGestureDetected={handleGesture} />}
        </div>
      </div>

      {/* 寄信弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
          <div className="w-full max-w-sm bg-gray-900 border border-white/20 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tighter">星空寄语</h2>
              <button onClick={() => setShowForm(false)} className="text-white/40 p-2 text-2xl">✕</button>
            </div>
            <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm mb-6 h-40 outline-none focus:border-white/40" placeholder="写下你对未来的期许..." />
            <button onClick={handleSubmit} disabled={isSending} className="w-full py-4 rounded-2xl bg-white text-black font-bold text-xs uppercase shadow-xl">
               {isSending ? '发送中...' : '发送信笺'}
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} src={audioUrl || ''} loop />
    </div>
  );
}
