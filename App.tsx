// 关键部分：修改后的 App 逻辑
export default function App() {
  const [currentShape, setCurrentShape] = useState<ShapeType>('tree');
  const [showPhoto, setShowPhoto] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songInfo, setSongInfo] = useState({ title: 'Cosmic Silent Night', artist: 'Galaxy Ensemble' });
  const audioRef = useRef<HTMLAudioElement>(null);

  // 1. 修复音乐：移动端必须在 Pointer 事件中直接触发 play
  const toggleMusic = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(err => alert("请先上传歌曲或重试"));
    }
  };

  // 2. 修复照片：强制切换逻辑
  const togglePhoto = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsManualMode(true);
    setShowPhoto(prev => !prev);
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden touch-none">
      <Scene currentShape={currentShape} density={0.4} /> {/* 移动端强制低密度 */}

      {/* 顶部菜单 */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-2 pointer-events-auto">
        {['tree', 'nebula', 'text'].map(s => (
          <button 
            key={s}
            onPointerDown={(e) => { e.stopPropagation(); setIsManualMode(true); setCurrentShape(s as ShapeType); }}
            className={`p-3 rounded-full border ${currentShape === s ? 'bg-white text-black' : 'bg-black/40 border-white/30'}`}
          >
            {s === 'tree' ? '🎄' : s === 'nebula' ? '🌌' : '✨'}
          </button>
        ))}
        <button onPointerDown={togglePhoto} className={`p-3 rounded-full border ${showPhoto ? 'bg-yellow-400' : 'bg-black/40'}`}>🖼️</button>
      </div>

      {/* 音乐播放器：增加可编辑输入框 */}
      <div className="absolute bottom-4 left-4 z-50 pointer-events-auto bg-black/60 p-4 rounded-3xl border border-white/20">
        <div className="flex items-center gap-3">
          <button onPointerDown={toggleMusic} className="w-12 h-12 rounded-full bg-white text-black font-bold">
            {isPlaying ? '||' : '▶'}
          </button>
          <div className="flex flex-col">
            <input 
              className="bg-transparent border-none text-xs font-bold w-24 outline-none"
              value={songInfo.title}
              onChange={(e) => setSongInfo({...songInfo, title: e.target.value})}
            />
            <input 
              className="bg-transparent border-none text-[10px] opacity-50 w-24 outline-none"
              value={songInfo.artist}
              onChange={(e) => setSongInfo({...songInfo, artist: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* 手势窗口 */}
      <div className="absolute bottom-4 right-4 z-50">
        <GestureController onGestureDetected={(d) => !isManualMode && handleGesture(d)} />
        <button 
          onPointerDown={() => setIsManualMode(!isManualMode)}
          className={`mt-2 w-full py-1 rounded text-[10px] ${isManualMode ? 'bg-white text-black' : 'bg-red-500/50'}`}
        >
          {isManualMode ? '切换为手势模式' : '当前：手势模式'}
        </button>
      </div>

      {/* 拍立得照片 */}
      {showPhoto && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/20" onPointerDown={() => setShowPhoto(false)}>
          <div className="bg-white p-2 pb-8 shadow-2xl rotate-[-2deg] animate-in zoom-in-50">
            <img src={currentPhotoUrl} className="w-[60vw] h-[60vw] object-cover" />
            <div className="text-black text-center mt-2 font-serif">Memory</div>
          </div>
        </div>
      )}
      
      <audio ref={audioRef} loop />
    </div>
  );
}
