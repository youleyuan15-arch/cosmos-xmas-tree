import React, { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData, GestureType } from './components/GestureController.tsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue } from 'firebase/database';
import { ShapeType } from './types.ts';

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const INITIAL_AUDIO_URL = "https://raw.githubusercontent.com/youleyuan15-arch/cosmos-xmas-tree/main/All%20I%20Want%20For%20Christmas%20Is%20You%20-%20Mariah%20Carey.mp3";

export default function App() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // 新增加载进度状态
  const [loadProgress, setLoadProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(isMobile);
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [hasInteracted, setHasInteracted] = useState(false); 

  const [showForm, setShowForm] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [activeTab, setActiveTab] = useState<'wish' | 'private'>('wish');
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [aspiration, setAspiration] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [burstTime, setBurstTime] = useState(0); 
  
  const [inputPassword, setInputPassword] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const ADMIN_PASSWORD = "0407"; 

  const [audioUrl, setAudioUrl] = useState<string>(INITIAL_AUDIO_URL);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songInfo, setSongInfo] = useState({ title: 'All I Want For Christmas Is You', artist: 'Mariah Carey' });
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  // 照片相册：修复重复显示和上传显示
  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  const deckRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPhotoTime = useRef(0);

  // 模拟加载逻辑
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsReady(true);
          return 100;
        }
        return prev + Math.random() * 10;
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const messagesRef = ref(db, 'messages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).reverse();
        setInboxMessages(list);
      }
    });
    return () => unsubscribe();
  }, []);

  // 修复：音乐强触发 + 首屏进入
  const startExperience = () => {
    if (!isReady || hasInteracted) return;
    setHasInteracted(true);
    if (audioRef.current) {
      audioRef.current.play(); // 同步第一行执行，绕过浏览器拦截
      setIsPlaying(true);
    }
  };

  // 修复：不重复切图算法
  const pickNextPhoto = useCallback(() => {
    if (photoAlbum.length <= 1) return;
    if (deckRef.current.length === 0) {
      deckRef.current = [...Array(photoAlbum.length).keys()]
        .filter(i => photoAlbum[i] !== currentPhotoUrl)
        .sort(() => Math.random() - 0.5);
    }
    const nextIndex = deckRef.current.pop();
    if (nextIndex !== undefined) setCurrentPhotoUrl(photoAlbum[nextIndex]);
  }, [photoAlbum, currentPhotoUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } 
    else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  // 修复：点击 Photo 按钮时自动切换下一张，解决电脑端总是同一张的问题
  const handlePhotoToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showPhoto) pickNextPhoto(); 
    setShowPhoto(!showPhoto);
  };

  // 修复：上传后立即显示
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newUrls = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setPhotoAlbum(prev => {
        const updated = [...prev, ...newUrls];
        setCurrentPhotoUrl(newUrls[0]); // 立即显示新传的第一张
        return updated;
      });
      setShowPhoto(true);
      deckRef.current = []; // 重置牌堆
    }
  };

  const handleGesture = useCallback((data: GestureData) => {
    if (isMobile || isManualMode) return; 
    const { type, position } = data;
    setHandPosition(position);
    if (type === 'Pinch') { 
      const now = Date.now();
      if (now - lastPhotoTime.current > 350) {
        pickNextPhoto(); 
        lastPhotoTime.current = now;
      }
      setShowPhoto(true); 
    } 
    else if (type !== 'None') {
      setShowPhoto(false);
      if (type === 'Fist') setCurrentShape('tree');
      if (type === 'Open_Palm') setCurrentShape('nebula');
      if (type === 'L_Shape') setCurrentShape('text');
    }
  }, [isManualMode, pickNextPhoto, isMobile]);

  const handleSubmit = async () => {
    if (!aspiration.trim() && !message.trim()) return;
    setIsSending(true);
    try {
      await push(ref(db, 'messages'), { aspiration, message, timestamp: Date.now() });
      setBurstTime(performance.now() / 1000);
      const prev = currentShape;
      setCurrentShape('clover');
      setShowForm(false);
      setAspiration(''); setMessage('');
      setTimeout(() => { setCurrentShape(prev); setBurstTime(0); }, 8500);
    } catch (e) { alert("Sending failed"); } finally { setIsSending(false); }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white" onClick={startExperience}>
      
      {/* 增强：加载进度与引导 */}
      {!hasInteracted && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm pointer-events-auto">
           <div className="text-5xl mb-10 animate-pulse">🎄</div>
           {!isReady ? (
             <div className="flex flex-col items-center gap-3">
               <div className="w-32 h-[1px] bg-white/10 rounded-full overflow-hidden">
                 <div className="h-full bg-white transition-all duration-300" style={{ width: `${loadProgress}%` }} />
               </div>
               <div className="text-[10px] tracking-[0.4em] text-white/40 uppercase">Loading Cosmos {Math.floor(loadProgress)}%</div>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-4">
               <div className="px-6 py-2 rounded-full border border-white/30 text-[10px] tracking-[0.5em] font-light">TOUCH TO START</div>
             </div>
           )}
        </div>
      )}

      <Scene currentShape={currentShape} burstTime={burstTime} density={isMobile ? 0.4 : 1.0} handPosition={handPosition} />
      
      {/* 修复：key={currentPhotoUrl} 确保图片刷新 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none">
        <div className={`bg-white p-2 pb-6 shadow-2xl transform transition-all duration-500 ease-out ${showPhoto ? 'scale-100 opacity-100 rotate-[-2deg]' : 'scale-50 opacity-0 rotate-[10deg]'}`}>
          <img 
            key={currentPhotoUrl}
            src={currentPhotoUrl} 
            alt="Memory" 
            className="w-[60vw] h-[60vw] sm:w-[280px] sm:h-[280px] object-cover" 
          />
          <div className="text-center mt-3 font-serif text-gray-800 italic text-sm">Merry Christmas</div>
        </div>
      </div>

      <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
      <input type="file" ref={musicInputRef} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          setAudioUrl(URL.createObjectURL(f));
          setSongInfo({ title: f.name.replace(/\.[^/.]+$/, ""), artist: 'Local' });
          setIsPlaying(true);
        }
      }} accept="audio/*" className="hidden" />
      
      <audio ref={audioRef} src={audioUrl} loop crossOrigin="anonymous" playsInline preload="auto" />

      {/* 控制界面 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 p-4 sm:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto flex flex-col gap-2">
            <div className="bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/20">
               <div onClick={(e) => {e.stopPropagation(); setCurrentShape('tree');}} className={`flex items-center gap-3 py-2 px-4 rounded-xl ${currentShape==='tree' ? 'bg-white text-black' : ''} cursor-pointer transition-all`}>
                 <span className="text-sm">✊</span>
                 <span className="text-[10px] font-bold uppercase tracking-widest">Tree</span>
               </div>
               <div onClick={(e) => {e.stopPropagation(); setCurrentShape('nebula');}} className={`flex items-center gap-3 py-2 px-4 rounded-xl ${currentShape==='nebula' ? 'bg-white text-black' : ''} cursor-pointer transition-all`}>
                 <span className="text-sm">🖐️</span>
                 <span className="text-[10px] font-bold uppercase tracking-widest">Space</span>
               </div>
               {/* 修复：使用专门的 Toggle 函数 */}
               <div onClick={handlePhotoToggle} className={`flex items-center gap-3 py-2 px-4 rounded-xl ${showPhoto ? 'bg-white text-black' : ''} cursor-pointer transition-all`}>
                 <span className="text-sm">👌</span>
                 <span className="text-[10px] font-bold uppercase tracking-widest">Photo</span>
               </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pointer-events-auto items-end">
             <button onClick={(e) => {e.stopPropagation(); setShowInbox(true);}} className="px-4 py-2 rounded-full border border-white/30 bg-black/20 backdrop-blur-md text-[10px] font-bold tracking-widest">📨 INBOX</button>
             <button onClick={(e) => {e.stopPropagation(); setShowForm(true);}} className="px-4 py-2 rounded-full border border-white/30 bg-black/20 backdrop-blur-md text-[10px] font-bold tracking-widest">✉️ LETTER</button>
             <button onClick={(e) => {e.stopPropagation(); fileInputRef.current?.click();}} className="px-4 py-2 rounded-full border border-white/30 bg-black/20 backdrop-blur-md text-[10px] font-bold tracking-widest">🖼️ ALBUM</button>
          </div>
        </div>

        <div className="flex justify-between items-end gap-2">
          <div className="pointer-events-auto backdrop-blur-3xl p-3 rounded-[2rem] border border-white/20 bg-white/5 w-full max-w-[280px] shadow-2xl flex items-center gap-3">
             <button onClick={togglePlay} className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black active:scale-90 transition-transform">
               {isPlaying ? '||' : '▶'}
             </button>
             <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-[12px] truncate">{songInfo.title}</div>
                <div className="text-white/50 text-[10px] truncate">{songInfo.artist}</div>
             </div>
             <button onClick={(e) => {e.stopPropagation(); musicInputRef.current?.click();}} className="p-2 opacity-50 hover:opacity-100">📁</button>
          </div>
          
          {!isMobile && (
            <div className={`pointer-events-auto transition-all duration-700 ${isManualMode ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
               <GestureController onGestureDetected={handleGesture} />
            </div>
          )}
        </div>
      </div>

      {/* 以下功能组件保持原样 */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto p-6" onClick={e => e.stopPropagation()}>
             <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-[2.5rem] p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white text-xl font-bold italic tracking-tighter">Cosmic Letter</h2>
                    <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/40">✕</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] ml-2">2025 Aspiration</label>
                    <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm mt-1 focus:border-white/30 transition-all outline-none h-24 resize-none" placeholder="What's your star wish?" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] ml-2">Private Message</label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm mt-1 focus:border-white/30 transition-all outline-none h-24 resize-none" placeholder="Something for the universe..." />
                  </div>
                  <button onClick={handleSubmit} disabled={isSending} className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-white/10 disabled:opacity-50 mt-2">
                    {isSending ? 'Sending...' : 'Send to Universe'}
                  </button>
                </div>
             </div>
        </div>
      )}

      {showInbox && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto p-4 sm:p-10" onClick={e => e.stopPropagation()}>
            <div className="w-full h-full max-w-4xl flex flex-col bg-zinc-900/50 rounded-[3rem] border border-white/10 overflow-hidden">
               <div className="p-8 flex justify-between items-center border-b border-white/5">
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white">Star Inbox</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-1">Collecting wishes from the cosmos</p>
                  </div>
                  <button onClick={() => setShowInbox(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white hover:text-black transition-all">✕</button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="flex gap-4 mb-10">
                    <button onClick={() => setActiveTab('wish')} className={`px-6 py-2 rounded-full text-
