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
  
  // 加载进度
  const [loadProgress, setLoadProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false); 

  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(isMobile);
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 照片相关逻辑
  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  const deckRef = useRef<number[]>([]);
  const lastPhotoTime = useRef(0);

  // 模拟加载进度
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsReady(true);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const messagesRef = ref(db, 'messages');
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setInboxMessages(Object.values(data).reverse());
    });
    return () => unsubscribe();
  }, []);

  // 修复 1: 不重复照片切换函数
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

  // 修复 2: 音乐强触发启动函数
  const startExperience = () => {
    if (!isReady || hasInteracted) return;
    setHasInteracted(true);
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } 
    else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  // 修复 3: 定义 handlePhotoToggle 解决报错
  const handlePhotoToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showPhoto) pickNextPhoto(); // 每次打开时换一张
    setShowPhoto(!showPhoto);
  };

  // 修复 4: 上传即显
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newUrls = Array.from(e.target.files).map(file => URL.createObjectURL(file));
      setPhotoAlbum(prev => {
        const updated = [...prev, ...newUrls];
        setCurrentPhotoUrl(newUrls[0]); 
        return updated;
      });
      setShowPhoto(true);
      deckRef.current = []; // 清空洗牌堆
    }
  };

  const handleGesture = useCallback((data: GestureData) => {
    if (isMobile || isManualMode) return; 
    setHandPosition(data.position);
    if (data.type === 'Pinch') { 
      const now = Date.now();
      if (now - lastPhotoTime.current > 400) {
        pickNextPhoto(); 
        lastPhotoTime.current = now;
      }
      setShowPhoto(true); 
    } else if (data.type !== 'None') {
      setShowPhoto(false);
      if (data.type === 'Fist') setCurrentShape('tree');
      if (data.type === 'Open_Palm') setCurrentShape('nebula');
      if (data.type === 'L_Shape') setCurrentShape('text');
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
    <div className="relative w-full h-full bg-black overflow-hidden text-white" onClick={startExperience}>
      
      {/* 加载引导层 */}
      {!hasInteracted && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md cursor-pointer">
           <div className="text-5xl mb-12 animate-pulse">🎄</div>
           {!isReady ? (
             <div className="flex flex-col items-center gap-4">
               <div className="w-40 h-[1px] bg-white/10 overflow-hidden">
                 <div className="h-full bg-white transition-all duration-300" style={{ width: `${loadProgress}%` }} />
               </div>
               <div className="text-[9px] tracking-[0.4em] text-white/40 uppercase">Loading {Math.floor(loadProgress)}%</div>
             </div>
           ) : (
             <div className="px-8 py-3 rounded-full border border-white/30 text-[10px] tracking-[0.6em] font-light animate-bounce">TOUCH TO START</div>
           )}
        </div>
      )}

      <Scene currentShape={currentShape} burstTime={burstTime} density={isMobile ? 0.4 : 1.0} handPosition={handPosition} />
      
      {/* 照片展示 - key 强制刷新解决不刷新 Bug */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className={`bg-white p-2 pb-6 shadow-2xl transition-all duration-700 ${showPhoto ? 'scale-100 rotate-[-2deg]' : 'scale-0'}`}>
          <img 
            key={currentPhotoUrl}
            src={currentPhotoUrl} 
            className="w-[60vw] h-[60vw] sm:w-[280px] sm:h-[280px] object-cover" 
            alt="Memory"
          />
          <div className="text-center mt-3 font-serif text-gray-800 italic text-sm">Merry Christmas</div>
        </div>
      </div>

      <audio ref={audioRef} src={audioUrl} loop playsInline preload="auto" />
      <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

      {/* 控制栏 */}
      <div className="absolute inset-0 pointer-events-none z-30 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-black/20 backdrop-blur-2xl p-2 rounded-2xl border border-white/10 flex flex-col gap-1">
             <button onClick={(e) => {e.stopPropagation(); setCurrentShape('tree');}} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${currentShape==='tree'?'bg-white text-black':'text-white/40'}`}>TREE</button>
             <button onClick={(e) => {e.stopPropagation(); setCurrentShape('nebula');}} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${currentShape==='nebula'?'bg-white text-black':'text-white/40'}`}>SPACE</button>
             <button onClick={handlePhotoToggle} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${showPhoto?'bg-white text-black':'text-white/40'}`}>PHOTO</button>
          </div>
          <div className="flex flex-col gap-2 items-end">
             <button onClick={(e) => {e.stopPropagation(); setShowInbox(true);}} className="px-4 py-2 rounded-full border border-white/20 bg-black/20 text-[9px] font-bold tracking-widest">📨 INBOX</button>
             <button onClick={(e) => {e.stopPropagation(); setShowForm(true);}} className="px-4 py-2 rounded-full border border-white/20 bg-black/20 text-[9px] font-bold tracking-widest">✉️ LETTER</button>
             <button onClick={(e) => {e.stopPropagation(); fileInputRef.current?.click();}} className="px-4 py-2 rounded-full border border-white/20 bg-black/20 text-[9px] font-bold tracking-widest">🖼️ ALBUM</button>
          </div>
        </div>

        <div className="flex justify-between items-end gap-2 pointer-events-auto">
          <div className="backdrop-blur-3xl p-3 rounded-3xl bg-white/5 border border-white/10 w-full max-w-[240px] flex items-center gap-3">
             <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-white text-black font-bold flex items-center justify-center">
               {isPlaying ? '||' : '▶'}
             </button>
             <div className="flex-1 truncate">
                <div className="text-white font-bold text-[11px] truncate">{songInfo.title}</div>
             </div>
          </div>
          {!isMobile && <GestureController onGestureDetected={handleGesture} />}
        </div>
      </div>

      {/* 功能组件 (Form, Inbox) 保持原逻辑 */}
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-6 pointer-events-auto" onClick={e => e.stopPropagation()}>
           <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-[2rem] p-8">
              <div className="flex justify-between mb-6">
                 <h2 className="font-bold">Cosmic Letter</h2>
                 <button onClick={() => setShowForm(false)}>✕</button>
              </div>
              <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm mb-4 h-24" placeholder="Your wish..." />
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm mb-6 h-24" placeholder="Private..." />
              <button onClick={handleSubmit} disabled={isSending} className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase text-[10px]">
                {isSending ? 'Sending...' : 'Send to Universe'}
              </button>
           </div>
        </div>
      )}

      {showInbox && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 pointer-events-auto" onClick={e => e.stopPropagation()}>
            <div className="w-full h-full max-w-4xl bg-zinc-900 rounded-[2rem] border border-white/10 flex flex-col p-8 overflow-hidden">
               <div className="flex justify-between mb-8">
                  <h2 className="text-2xl font-bold italic">Star Inbox</h2>
                  <button onClick={() => setShowInbox(false)}>✕</button>
               </div>
               <div className="flex gap-4 mb-8">
                  <button onClick={() => setActiveTab('wish')} className={`px-6 py-2 rounded-full text-[10px] ${activeTab==='wish'?'bg-white text-black':'bg-white/5'}`}>WISH POOL</button>
                  <button onClick={() => setActiveTab('private')} className={`px-6 py-2 rounded-full text-[10px] ${activeTab==='private'?'bg-white text-black':'bg-white/5'}`}>PRIVATE</button>
               </div>
               <div className="flex-1 overflow-y-auto space-y-4">
                  {activeTab === 'wish' ? (
                    inboxMessages.filter(m => m.aspiration).map((msg, i) => (
                      <div key={i} className="p-6 bg-white/5 rounded-2xl border border-white/10 italic">"{msg.aspiration}"</div>
                    ))
                  ) : (
                    !isUnlocked ? (
                      <div className="max-w-xs mx-auto text-center py-20">
                         <input type="password" value={inputPassword} onChange={e => setInputPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center mb-4" placeholder="Password" />
                         <button onClick={() => {if(inputPassword === ADMIN_PASSWORD) setIsUnlocked(true); else alert("Wrong");}} className="w-full py-4 bg-white text-black rounded-xl font-bold text-[10px]">UNLOCK</button>
                      </div>
                    ) : (
                      inboxMessages.filter(m => m.message).map((msg, i) => (
                        <div key={i} className="p-4 bg-white/5 rounded-xl text-sm">{msg.message}</div>
                      ))
                    )
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
