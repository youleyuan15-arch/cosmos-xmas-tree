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
  
  // 修复 1: 增加资源加载状态
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

  const [photoAlbum, setPhotoAlbum] = useState<string[]>(["https://images.unsplash.com/photo-1543589077-47d81606c1bf?auto=format&fit=crop&w=600&q=80"]);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string>(photoAlbum[0]);
  const deckRef = useRef<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    }, 150);
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

  const startExperience = () => {
    // 修复 2: 确保点击时音乐立即触发（解决 iOS 禁音）
    if (!isReady || hasInteracted) return;
    setHasInteracted(true);
    if (audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    isPlaying ? audioRef.current.pause() : audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const pickNextPhoto = useCallback(() => {
    const now = Date.now();
    if (now - lastPhotoTime.current < 300) return;
    lastPhotoTime.current = now;

    if (photoAlbum.length <= 1) return;
    
    // 修复 3: 真正的洗牌去重算法
    if (deckRef.current.length === 0) {
      deckRef.current = [...Array(photoAlbum.length).keys()]
        .filter(i => photoAlbum[i] !== currentPhotoUrl) // 排除掉当前正在显示的
        .sort(() => Math.random() - 0.5);
    }
    const nextIndex = deckRef.current.pop();
    if (nextIndex !== undefined) setCurrentPhotoUrl(photoAlbum[nextIndex]);
  }, [photoAlbum, currentPhotoUrl]);

  const handlePhotoToggle = () => {
    if (!showPhoto) pickNextPhoto(); // 每次打开时主动换一张
    setShowPhoto(!showPhoto);
  };

  const handleGesture = useCallback((data: GestureData) => {
    if (isMobile || isManualMode) return; 
    const { type, position } = data;
    setHandPosition(position);
    if (type === 'Pinch') { 
      pickNextPhoto(); 
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
      
      {/* 引导层：修复增加了加载进度条 */}
      {!hasInteracted && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer pointer-events-auto">
           <div className="text-5xl mb-10 animate-pulse">🎄</div>
           {!isReady ? (
             <div className="flex flex-col items-center gap-3">
               <div className="w-32 h-[1px] bg-white/10 overflow-hidden">
                 <div className="h-full bg-white transition-all duration-300" style={{ width: `${loadProgress}%` }} />
               </div>
               <div className="text-[9px] tracking-[0.4em] text-white/40 uppercase">Loading {Math.floor(loadProgress)}%</div>
             </div>
           ) : (
             <div className="text-white/60 text-[10px] uppercase tracking-[0.3em] animate-pulse border border-white/20 px-6 py-2 rounded-full">Touch to start cosmic journey</div>
           )}
        </div>
      )}

      <Scene currentShape={currentShape} burstTime={burstTime} density={isMobile ? 0.4 : 1.0} handPosition={handPosition} />
      
      {burstTime > 0 && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[60] text-white text-[10px] bg-white/5 px-8 py-3 rounded-full backdrop-blur-3xl border border-white/30 text-center shadow-lg animate-pulse whitespace-nowrap">
              Thank you for your letter, wish you luck~
          </div>
      )}

      {showInbox && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-auto p-4">
            <div className="w-full max-w-md bg-white/5 border border-white/20 backdrop-blur-3xl rounded-[2rem] p-6 shadow-2xl h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white text-xl font-bold tracking-tight">Star Inbox</h2>
                    <button onClick={() => {setShowInbox(false); setIsUnlocked(false); setInputPassword('');}} className="text-white/40 p-2 text-xl hover:text-white">✕</button>
                </div>
                
                <div className="flex bg-white/10 p-1 rounded-xl mb-6">
                    <button onClick={() => setActiveTab('wish')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'wish' ? 'bg-white text-black' : 'text-white/40'}`}>2025 Wishes</button>
                    <button onClick={() => setActiveTab('private')} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${activeTab === 'private' ? 'bg-white text-black' : 'text-white/40'}`}>Private</button>
                </div>

                {activeTab === 'private' && !isUnlocked ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Admin Password Required</div>
                    <input 
                      type="password" 
                      placeholder="••••" 
                      maxLength={4}
                      value={inputPassword}
                      onChange={(e) => {
                        const val = e.target.value;
                        setInputPassword(val);
                        if(val === ADMIN_PASSWORD) setIsUnlocked(true);
                      }}
                      className="bg-white/5 border border-white/20 rounded-xl px-4 py-2 text-center text-xl tracking-[0.5em] outline-none focus:border-white/50 w-32"
                    />
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {inboxMessages.map((msg, idx) => (
                      ((activeTab === 'wish' && msg.aspiration) || (activeTab === 'private' && msg.message)) && (
                        <div key={idx} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                          <div className="text-[9px] text-white/30 mb-2 font-mono">
                            {new Date(msg.timestamp).toLocaleString('zh-CN', { hour12: false })}
                          </div>
                          <div className="text-sm leading-relaxed text-white/90">
                            {activeTab === 'wish' ? msg.aspiration : msg.message}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
            </div>
        </div>
      )}

      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4 sm:p-6">
            <div className="animate-form w-full max-sm:max-w-[92vw] max-w-sm bg-white/5 border border-white/40 backdrop-blur-3xl rounded-[2.5rem] p-5 sm:p-10 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white text-lg sm:text-2xl font-bold tracking-tight">Cosmic Message</h2>
                    <button onClick={() => setShowForm(false)} className="text-white/40 p-2 text-lg">✕</button>
                </div>
                <div className="space-y-6">
                    <div>
                      <label className="text-[10px] text-white/50 ml-1 mb-1 block uppercase tracking-widest">Aspiration for 2025</label>
                      <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white text-xs outline-none h-20 resize-none" placeholder="May the starlight guide..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/50 ml-1 mb-1 block uppercase tracking-widest">Private Message to Me</label>
                      <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl p-3 text-white text-xs outline-none h-20 resize-none" placeholder="Write something confidential..." />
                    </div>
                    <button onClick={handleSubmit} disabled={isSending} className="w-full py-4 bg-white text-black rounded-xl font-bold uppercase text-[10px]">
                        {isSending ? 'Sending...' : 'Post to Stars'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 照片展示 - 修复增加了 key 解决刷新问题 */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none">
        <div className={`bg-white p-1 sm:p-2 pb-3 sm:pb-6 shadow-[0_0_80px_rgba(255,255,255,0.6)] transform origin-center transition-all duration-300 ease-out ${showPhoto ? 'scale-100 opacity-100 rotate-[-2deg]' : 'scale-75 opacity-0 rotate-[5deg]'}`}>
          <img 
            key={currentPhotoUrl}
            src={currentPhotoUrl} 
            alt="Memory" 
            className="w-[45vw] h-[45vw] sm:w-[65vw] sm:h-[65vw] max-w-[260px] max-h-[260px] object-cover" 
          />
          <div className="text-center mt-3 font-serif text-gray-800 italic text-[10px] sm:text-lg">Merry Christmas</div>
        </div>
      </div>

      <input type="file" multiple ref={fileInputRef} onChange={(e) => { 
        if (e.target.files) {
          const newUrls = Array.from(e.target.files!).map(f => URL.createObjectURL(f));
          setPhotoAlbum(prev => [...prev, ...newUrls]);
          setCurrentPhotoUrl(newUrls[0]); // 自动切换到新上传的第一张
          setShowPhoto(true); 
          deckRef.current = []; // 清空洗牌堆
        }
      }} accept="image/*" className="hidden" />

      <input type="file" ref={musicInputRef} onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) {
          setAudioUrl(URL.createObjectURL(f));
          setSongInfo({ title: f.name.replace(/\.[^/.]+$/, ""), artist: 'Local' });
          setIsPlaying(true);
        }
      }} accept="audio/*" className="hidden" />
      <audio ref={audioRef} src={audioUrl} loop crossOrigin="anonymous" playsInline preload="auto" />

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 p-3 sm:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 sm:p-4 rounded-[1.2rem] border border-white/50 shadow-lg">
            <div className="space-y-1">
               <div onClick={() => setCurrentShape('tree')} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${currentShape==='tree' ? 'bg-white/20' : ''} cursor-pointer transition-colors`}><span className="text-sm">✊</span><span className="text-[10px] font-bold uppercase tracking-widest text-inherit">Tree</span></div>
               <div onClick={() => setCurrentShape('nebula')} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${currentShape==='nebula' ? 'bg-white/20' : ''} cursor-pointer transition-colors`}><span className="text-sm">🖐️</span><span className="text-[10px] font-bold uppercase tracking-widest text-inherit">Space</span></div>
               <div onClick={() => setCurrentShape('text')} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${currentShape==='text' ? 'bg-white/20' : ''} cursor-pointer transition-colors`}><span className="text-sm">👆</span><span className="text-[10px] font-bold uppercase tracking-widest text-inherit">Text</span></div>
               <div onClick={handlePhotoToggle} className={`flex items-center gap-2 py-1.5 px-3 rounded-lg ${showPhoto ? 'bg-white/20' : ''} cursor-pointer transition-colors`}><span className="text-sm">👌</span><span className="text-[10px] font-bold uppercase tracking-widest text-inherit">Photo</span></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pointer-events-auto items-end">
             <button onClick={() => setShowInbox(true)} className="px-5 py-2 rounded-full border border-white/50 bg-white/5 text-[10px] hover:bg-white/10 transition-all font-bold">📨 Inbox</button>
             <button onClick={() => setShowForm(true)} className="px-5 py-2 rounded-full border border-white/50 bg-white/5 text-[10px] hover:bg-white/10 transition-all font-bold">✉️ Letter</button>
             <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 rounded-full border border-white/50 bg-white/5 text-[10px] hover:bg-white/10 transition-all font-bold">🖼️ Album</button>
             {!isMobile && (
                <button onClick={() => setIsManualMode(!isManualMode)} className={`px-5 py-2 rounded-full border text-[10px] transition-all ${isManualMode ? 'bg-white text-black font-bold' : 'bg-white/5 border-white/50'}`}>
                  {isManualMode ? 'MANUAL' : 'GESTURE'}
                </button>
             )}
          </div>
        </div>
        
        <div className="flex justify-between items-end gap-2">
          <div className="pointer-events-auto backdrop-blur-2xl p-3 sm:p-5 rounded-[1.5rem] border border-white/40 bg-white/10 w-52 sm:w-80 shadow-2xl flex items-center gap-3">
             <button onClick={togglePlay} className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-white text-black font-bold active:scale-90 transition-transform">
               {isPlaying ? '||' : '▶'}
             </button>
             <div className="flex-1 min-w-0">
                <input className="w-full bg-transparent border-none text-white font-bold text-[11px] sm:text-sm outline-none" value={songInfo.title} onChange={e => setSongInfo({...songInfo, title: e.target.value})} />
                <input className="w-full bg-transparent border-none text-white/50 text-[8px] sm:text-[10px] outline-none" value={songInfo.artist} onChange={e => setSongInfo({...songInfo, artist: e.target.value})} />
             </div>
             <button onClick={() => musicInputRef.current?.click()} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">📁</button>
          </div>
          
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
