
import React, { Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { Scene } from './components/Scene.tsx';
import { GestureController, GestureData, GestureType } from './components/GestureController.tsx';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push } from 'firebase/database';
import { ShapeType } from './types.ts';

// --- Firebase 配置区 ---
// 已更新为用户的真实配置
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
  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [lastDetectedGesture, setLastDetectedGesture] = useState<GestureType>('None');
  
  const [showForm, setShowForm] = useState(false);
  const [aspiration, setAspiration] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [burstTime, setBurstTime] = useState(0); 

  // 粒子密度：1.0 为默认高画质，会自动在低端设备下调
  const [particleDensity, setParticleDensity] = useState(1.0);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songInfo, setSongInfo] = useState({ title: 'Cosmic Silent Night', artist: 'Galaxy Ensemble' });
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  /**
   * 性能检测函数：根据硬件和设备类型自动调整性能参数
   */
  const checkPerformance = useCallback(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const cores = navigator.hardwareConcurrency || 4;
    
    // 如果是移动端或核心数少于 6 核，则降低粒子密度以防发烫
    if (isMobile || cores < 6) {
      console.log(`[Performance] 低性能设备检测: ${isMobile ? 'Mobile' : 'Low Core Count'}. 降低粒子密度至 0.4`);
      setParticleDensity(0.4);
    } else {
      console.log("[Performance] 高性能设备检测. 开启高密度粒子模式");
      setParticleDensity(1.0);
    }
  }, []);

  useEffect(() => {
    checkPerformance();
  }, [checkPerformance]);

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
        } else {
            await new Promise(r => setTimeout(r, 1000));
        }
        setBurstTime(performance.now() / 1000);
        const prevShape = currentShape;
        setCurrentShape('clover');
        setShowForm(false);
        setAspiration('');
        setMessage('');
        setTimeout(() => { setCurrentShape(prevShape); setBurstTime(0); }, 8500);
    } catch (err) {
        console.error("Submit Error:", err);
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
    }

    if (type !== 'Pinch') {
      if (type === 'Fist') setCurrentShape('tree');
      if (type === 'Open_Palm') setCurrentShape('nebula');
      if (type === 'L_Shape') setCurrentShape('text');
    }
    
  }, [isManualMode, pickNextPhoto]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-sans text-white">
      <Scene currentShape={currentShape} handPosition={handPosition} burstTime={burstTime} density={particleDensity} />
      
      {showForm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto p-4 sm:p-6">
            <div className="animate-form w-full max-sm:max-w-[92vw] max-w-sm bg-white/5 border border-white/40 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-10 shadow-2xl max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <div>
                      <h2 className="text-white text-lg sm:text-2xl font-bold tracking-tight">星空寄语</h2>
                      {!isFirebaseConfigured && <p className="text-[7px] text-yellow-400/60 uppercase tracking-widest mt-0.5">演示模式</p>}
                    </div>
                    <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white transition-colors p-2 text-lg">✕</button>
                </div>
                <div className="space-y-4 sm:space-y-6">
                    <div>
                        <label className="text-white/60 text-[9px] uppercase tracking-widest block mb-1.5">对明年的期许</label>
                        <textarea value={aspiration} onChange={(e) => setAspiration(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-xs sm:text-sm outline-none focus:border-white/50 transition-all h-20 sm:h-28 resize-none" placeholder="愿星光照亮前路..." />
                    </div>
                    <div>
                        <label className="text-white/60 text-[9px] uppercase tracking-widest block mb-1.5">对我想说的话</label>
                        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-white/5 border border-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-xs sm:text-sm outline-none focus:border-white/50 transition-all h-20 sm:h-28 resize-none" placeholder="匿名悄悄话..." />
                    </div>
                    <button onClick={handleSubmit} disabled={isSending} className={`w-full py-3.5 sm:py-5 rounded-xl sm:rounded-2xl font-bold uppercase tracking-widest text-[9px] sm:text-xs transition-all ${isSending ? 'bg-white/10 text-white/20 cursor-wait' : 'bg-white text-black hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]'}`}>
                        {isSending ? '正在寄出...' : '发送信笺'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {burstTime > 0 && performance.now()/1000 - burstTime < 5.0 && (
          <div className="absolute bottom-28 sm:bottom-12 left-1/2 -translate-x-1/2 z-[60] pointer-events-none text-white text-[10px] sm:text-sm font-serif italic tracking-widest animate-[pulse_1.5s_ease-in-out_infinite] bg-white/5 px-8 sm:px-12 py-3.5 sm:py-6 rounded-full backdrop-blur-3xl border border-white/30 text-center shadow-[0_0_80px_rgba(255,255,255,0.2)] whitespace-nowrap">
              感谢你的来信，祝你好运~
          </div>
      )}

      <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 flex items-center justify-center pointer-events-none`}>
        <div className={`bg-white p-1 sm:p-2 pb-3 sm:pb-6 shadow-[0_0_80px_rgba(255,255,255,0.6)] transform origin-center rounded-sm transition-all duration-150 ease-out ${showPhoto ? 'scale-100 opacity-100 rotate-[-2deg]' : 'scale-75 opacity-0 rotate-[5deg]'}`}>
          <img src={currentPhotoUrl} alt="Memory" className="w-[45vw] h-[45vw] sm:w-[65vw] sm:h-[65vw] max-w-[260px] max-h-[260px] object-cover filter sepia-[0.1] bg-gray-900 border border-gray-100" />
          <div className="text-center mt-1 sm:mt-3 font-serif text-gray-800 italic tracking-wide text-[10px] sm:text-lg">Merry Christmas</div>
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

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-30 p-3 sm:p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="pointer-events-auto bg-white/5 backdrop-blur-xl p-2 sm:p-4 rounded-[1.2rem] sm:rounded-[2rem] border border-white/50 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div className="space-y-0.5 sm:space-y-1">
               <div className={`flex items-center gap-2 sm:gap-3 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg ${currentShape==='tree' ? 'bg-white/20 border-white/40' : 'border-transparent'} border transition-colors`}><span className="text-sm">✊</span><span className="text-[8px] font-bold uppercase">Tree</span></div>
               <div className={`flex items-center gap-2 sm:gap-3 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg ${currentShape==='nebula' ? 'bg-white/20 border-white/40' : 'border-transparent'} border transition-colors`}><span className="text-sm">🖐️</span><span className="text-[8px] font-bold uppercase">Space</span></div>
               <div className={`flex items-center gap-2 sm:gap-3 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg ${currentShape==='text' ? 'bg-white/20 border-white/40' : 'border-transparent'} border transition-colors`}><span className="text-sm">👆</span><span className="text-[8px] font-bold uppercase">Text</span></div>
               <div className={`flex items-center gap-2 sm:gap-3 py-1 sm:py-1.5 px-2 sm:px-3 rounded-lg ${showPhoto ? 'bg-white/20 border-white/40' : 'border-transparent'} border transition-colors`}><span className="text-sm">👌</span><span className="text-[8px] font-bold uppercase">Photo</span></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pointer-events-auto items-end sm:items-start">
             <button onClick={() => setShowForm(true)} className="px-3 sm:px-5 py-2 rounded-full border border-white/50 bg-white/5 text-white text-[9px] sm:text-xs hover:bg-white/10 transition-all backdrop-blur-md shadow-lg active:scale-95">✉️ Letter</button>
             <button onClick={() => fileInputRef.current?.click()} className="px-3 sm:px-5 py-2 rounded-full border border-white/50 bg-white/5 text-white text-[9px] sm:text-xs hover:bg-white/10 transition-all backdrop-blur-md shadow-lg active:scale-95">🖼️ Album</button>
             <button onClick={() => setIsManualMode(!isManualMode)} className={`px-3 sm:px-5 py-2 rounded-full border text-[9px] sm:text-xs transition-all backdrop-blur-md shadow-lg active:scale-95 ${isManualMode ? 'bg-white text-black font-bold' : 'bg-white/5 text-white border-white/50'}`}>
                {isManualMode ? 'MANUAL' : 'GESTURE'}
             </button>
          </div>
        </div>
        
        <div className="flex justify-between items-end gap-2">
          {/* 音乐播放控制区 */}
          <div className={`pointer-events-auto backdrop-blur-2xl p-3 sm:p-5 rounded-[1.5rem] sm:rounded-[2.2rem] border border-white/40 w-52 sm:w-80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 bg-white/10 hover:bg-white/15`}>
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => setIsPlaying(!isPlaying)} className={`w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 flex items-center justify-center rounded-full transition-all shadow-lg active:scale-90 ${isPlaying ? 'bg-white text-black animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                {isPlaying ? <svg width="12" height="14" viewBox="0 0 14 16" fill="none"><rect width="4" height="16" rx="2" fill="currentColor"/><rect x="10" width="4" height="16" rx="2" fill="currentColor"/></svg> : <svg width="14" height="16" viewBox="0 0 16 18" fill="none" className="ml-1"><path d="M16 9L0 18V0L16 9Z" fill="currentColor"/></svg>}
              </button>
              <div className="flex-1 min-w-0">
                 <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-0.5">
                        <input 
                          type="text" 
                          value={songInfo.title} 
                          onChange={(e) => setSongInfo({...songInfo, title: e.target.value})}
                          className="w-full bg-white/0 border-b border-transparent hover:border-white/20 focus:border-white/50 focus:bg-white/5 outline-none font-bold text-[11px] sm:text-sm leading-tight text-white rounded px-1.5 py-0.5 transition-all"
                          placeholder="歌曲标题"
                        />
                        <input 
                          type="text" 
                          value={songInfo.artist} 
                          onChange={(e) => setSongInfo({...songInfo, artist: e.target.value})}
                          className="w-full bg-white/0 border-b border-transparent hover:border-white/10 focus:border-white/30 focus:bg-white/5 outline-none text-[8px] sm:text-[10px] uppercase tracking-widest text-white/50 rounded px-1.5 py-0.5 transition-all"
                          placeholder="歌手名称"
                        />
                    </div>
                    {/* 文件上传图标按钮 */}
                    <button 
                      onClick={() => musicInputRef.current?.click()} 
                      className="p-2 sm:p-3 bg-white/5 hover:bg-white/20 rounded-xl transition-all text-sm sm:text-xl flex-shrink-0 active:scale-90 border border-white/10"
                      title="上传本地歌曲"
                    >
                      📁
                    </button>
                 </div>
              </div>
            </div>
          </div>
          
          <div className={`pointer-events-auto transition-all duration-700 ${isManualMode ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
             <GestureController onGestureDetected={handleGesture} />
          </div>
        </div>
      </div>
    </div>
  );
}
