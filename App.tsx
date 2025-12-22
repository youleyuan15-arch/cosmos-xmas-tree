import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData } from './components/GestureController.tsx';
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
const INITIAL_AUDIO_URL = "/music.mp3"; 

export default function App() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadProgress(p => { if (p >= 100) { clearInterval(timer); setIsReady(true); return 100; } return p + 10; });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'messages'), s => {
      const d = s.val(); if (d) setInboxMessages(Object.values(d).reverse());
    });
    return () => unsubscribe();
  }, []);

  const startExperience = () => {
    if (!isReady || hasInteracted) return;
    setHasInteracted(true);
    audioRef.current?.play().then(() => setIsPlaying(true)).catch(e => console.error("Audio error:", e));
  };

  const pickNextPhoto = useCallback(() => {
    if (photoAlbum.length <= 1) return;
    if (deckRef.current.length === 0) {
      deckRef.current = [...Array(photoAlbum.length).keys()].filter(i => photoAlbum[i] !== currentPhotoUrl).sort(() => Math.random() - 0.5);
    }
    const idx = deckRef.current.pop();
    if (idx !== undefined) setCurrentPhotoUrl(photoAlbum[idx]);
  }, [photoAlbum, currentPhotoUrl]);

  const handleGesture = useCallback((data: GestureData) => {
    if (isMobile || isManualMode) return; 
    setHandPosition(data.position);
    if (data.type === 'Pinch') { pickNextPhoto(); setShowPhoto(true); } 
    else if (data.type !== 'None') {
      setShowPhoto(false);
      if (data.type === 'Fist') setCurrentShape('tree');
      if (data.type === 'Open_Palm') setCurrentShape('nebula');
    }
  }, [isManualMode, pickNextPhoto, isMobile]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white" onClick={startExperience}>
      {!hasInteracted && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md cursor-pointer">
           <div className="text-6xl mb-8 animate-bounce">🎁</div>
           {!isReady ? (
             <div className="w-32 h-[1px] bg-white/20"><div className="h-full bg-white transition-all" style={{width:`${loadProgress}%`}}/></div>
           ) : (
             <div className="group flex flex-col items-center gap-4">
               <div className="text-[10px] tracking-[0.5em] text-white/60 uppercase">Click to Enter</div>
               <div className="px-8 py-3 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all font-bold text-xs">ENTER</div>
             </div>
           )}
        </div>
      )}
      <Scene currentShape={currentShape} burstTime={burstTime} density={isMobile ? 0.4 : 1.0} handPosition={handPosition} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
        <div className={`bg-white p-2 pb-6 shadow-2xl transition-all duration-500 ${showPhoto ? 'scale-100 opacity-100 rotate-[-2deg]' : 'scale-50 opacity-0'}`}>
          <img key={currentPhotoUrl} src={currentPhotoUrl} className="w-[60vw] h-[60vw] sm:w-[260px] sm:h-[260px] object-cover" />
          <div className="text-center mt-3 font-serif text-gray-800 italic text-sm">Merry Christmas</div>
        </div>
      </div>
      <input type="file" multiple ref={fileInputRef} className="hidden" onChange={e => {
        if(e.target.files) {
          const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f));
          setPhotoAlbum(p => [...p, ...urls]); setCurrentPhotoUrl(urls[0]); setShowPhoto(true);
        }
      }} />
      <input type="file" ref={musicInputRef} className="hidden" onChange={e => {
        const f = e.target.files?.[0];
        if(f) { setAudioUrl(URL.createObjectURL(f)); setSongInfo({title:f.name.replace(/\.[^/.]+$/,""), artist:'Local'}); setIsPlaying(true); }
      }} />
      <audio ref={audioRef} src={audioUrl} loop playsInline preload="auto" />
      <div className="absolute inset-0 pointer-events-none z-30 p-4 sm:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/30 space-y-1">
             <div onClick={()=>setCurrentShape('tree')} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${currentShape==='tree'?'bg-white text-black':''}`}>✊ TREE</div>
             <div onClick={()=>setCurrentShape('nebula')} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${currentShape==='nebula'?'bg-white text-black':''}`}>🖐️ SPACE</div>
             <div onClick={()=>{if(!showPhoto)pickNextPhoto(); setShowPhoto(!showPhoto)}} className={`px-4 py-2 rounded-xl text-[10px] font-bold ${showPhoto?'bg-white text-black':''}`}>👌 PHOTO</div>
          </div>
          <div className="flex flex-col gap-2">
             <button onClick={()=>setShowInbox(true)} className="px-4 py-2 rounded-full border border-white/30 bg-black/20 text-[10px] font-bold">📨 INBOX</button>
             <button onClick={()=>setShowForm(true)} className="px-4 py-2 rounded-full border border-white/30 bg-black/20 text-[10px] font-bold">✉️ LETTER</button>
             <button onClick={()=>fileInputRef.current?.click()} className="px-4 py-2 rounded-full border border-white/30 bg-black/20 text-[10px] font-bold">🖼️ ALBUM</button>
          </div>
        </div>
        <div className="flex justify-between items-end gap-2 pointer-events-auto">
          <div className="backdrop-blur-3xl p-3 rounded-3xl border border-white/30 bg-white/10 w-full max-w-[280px] flex items-center gap-3">
             <button onClick={(e)=>{e.stopPropagation(); if(isPlaying)audioRef.current?.pause(); else audioRef.current?.play(); setIsPlaying(!isPlaying);}} className="w-12 h-12 rounded-full bg-white text-black font-bold">{isPlaying?'||':'▶'}</button>
             <div className="flex-1 min-w-0">
                <input className="w-full bg-transparent border-none text-white font-bold text-[12px] outline-none" value={songInfo.title} onChange={e=>setSongInfo({...songInfo, title:e.target.value})} />
                <input className="w-full bg-transparent border-none text-white/50 text-[10px] outline-none" value={songInfo.artist} onChange={e=>setSongInfo({...songInfo, artist:e.target.value})} />
             </div>
             <button onClick={()=>musicInputRef.current?.click()} className="p-2 opacity-40 hover:opacity-100">📁</button>
          </div>
          {!isMobile && <GestureController onGestureDetected={handleGesture} />}
        </div>
      </div>
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="font-bold italic">Cosmic Letter</h2><button onClick={()=>setShowForm(false)}>✕</button></div>
            <textarea value={aspiration} onChange={e=>setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs h-24 mb-4 outline-none text-white" placeholder="Aspiration..." />
            <textarea value={message} onChange={e=>setMessage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs h-24 mb-6 outline-none text-white" placeholder="Private..." />
            <button onClick={async ()=>{
              if(!aspiration.trim() && !message.trim()) return; setIsSending(true);
              try { await push(ref(db, 'messages'), { aspiration, message, timestamp: Date.now() }); setBurstTime(performance.now()/1000); setCurrentShape('clover'); setShowForm(false); setAspiration(''); setMessage(''); setTimeout(()=> {setCurrentShape('tree'); setBurstTime(0);}, 8500); } catch(e){alert("Failed");} finally{setIsSending(false);}
            }} className="w-full py-4 bg-white text-black rounded-2xl font-bold uppercase text-[10px]">{isSending?'...':'SEND'}</button>
          </div>
        </div>
      )}
      {showInbox && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/95 pointer-events-auto p-4">
          <div className="w-full h-full max-w-4xl bg-zinc-900 rounded-[2.5rem] border border-white/10 flex flex-col p-8 text-white">
            <div className="flex justify-between mb-8"><h2 className="font-bold italic">Star Inbox</h2><button onClick={()=>setShowInbox(false)}>✕</button></div>
            <div className="flex gap-4 mb-8">
              <button onClick={()=>setActiveTab('wish')} className={`px-6 py-2 rounded-full text-[10px] ${activeTab==='wish'?'bg-white text-black':'bg-white/5 text-white/40'}`}>WISH</button>
              <button onClick={()=>setActiveTab('private')} className={`px-6 py-2 rounded-full text-[10px] ${activeTab==='private'?'bg-white text-black':'bg-white/5 text-white/40'}`}>PRIVATE</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {activeTab==='wish'?inboxMessages.filter(m=>m.aspiration).map((m,i)=>(<div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 italic">"{m.aspiration}"</div>)) :
                (!isUnlocked ? <input type="password" value={inputPassword} onChange={e=>{setInputPassword(e.target.value); if(e.target.value===ADMIN_PASSWORD) setIsUnlocked(true);}} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-white" placeholder="Password" /> :
                inboxMessages.filter(m=>m.message).map((m,i)=>(<div key={i} className="p-4 bg-white/5 rounded-xl text-sm">{m.message}</div>)))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
