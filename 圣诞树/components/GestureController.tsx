
import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type GestureType = 'Fist' | 'Open_Palm' | 'L_Shape' | 'Pinch' | 'None';

export interface GestureData {
  type: GestureType;
  position: { x: number; y: number };
}

interface GestureControllerProps {
  onGestureDetected: (data: GestureData) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ onGestureDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const requestRef = useRef<number>(0);
  const [activeGesture, setActiveGesture] = useState<GestureType>('None');

  const onGestureDetectedRef = useRef(onGestureDetected);
  useEffect(() => { onGestureDetectedRef.current = onGestureDetected; }, [onGestureDetected]);

  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm");
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        startWebcam();
      } catch (error) { console.error("Error initializing MediaPipe:", error); }
    };
    initLandmarker();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
          setWebcamRunning(true);
        }
      } catch (err) { console.error("Webcam error:", err); }
    }
  };

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current) return;
    let nowInMs = Date.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const results = landmarkerRef.current.detectForVideo(videoRef.current, nowInMs);
      if (results.landmarks?.length > 0) {
        const landmarks = results.landmarks[0];
        const detected = recognizeGesture(landmarks);
        setActiveGesture(detected);
        onGestureDetectedRef.current({ type: detected, position: { x: landmarks[0].x, y: landmarks[0].y } });
      } else {
        setActiveGesture('None');
        onGestureDetectedRef.current({ type: 'None', position: { x: 0.5, y: 0.5 } });
      }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  const recognizeGesture = (lm: any[]): GestureType => {
    const wrist = lm[0];
    const getDist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    
    // 基础判定函数
    // 只要指尖距离手腕比关节远，就判定为“向上/伸展”
    const isUp = (tip: number, pip: number) => getDist(lm[tip], wrist) > getDist(lm[pip], wrist);
    // 指尖非常靠近指根或手腕，判定为“折叠”
    const isFolded = (tip: number, mcp: number) => getDist(lm[tip], wrist) < getDist(lm[mcp], wrist) * 1.12;

    const indexUp = isUp(8, 6);
    const middleUp = isUp(12, 10);
    const ringUp = isUp(16, 14);
    const pinkyUp = isUp(20, 18);

    const indexFolded = isFolded(8, 5);
    const middleFolded = isFolded(12, 9);
    const ringFolded = isFolded(16, 13);
    const pinkyFolded = isFolded(20, 17);

    // 优化大拇指判定：大拇指尖(4)离开食指根部(5)
    // 只要距离超过一定比例即视为张开，不依赖于复杂的角度或手腕距离
    const thumbUp = getDist(lm[4], lm[5]) > getDist(lm[3], lm[5]) * 1.2;

    // 计算伸出的手指数量（不含大拇指）
    const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

    // --- 识别逻辑优先级 ---

    // 1. Pinch (捏合/OK) 
    // 拇指食指尖靠得很近，且此时至少有1-2个手指是伸展的
    const pinchDist = getDist(lm[4], lm[8]);
    if (pinchDist < 0.045 && upCount >= 1) {
      return 'Pinch';
    }

    // 2. Fist (握拳)
    // 关键手指全部折叠，且拇指没有张开
    if (indexFolded && middleFolded && ringFolded && pinkyFolded && !thumbUp) {
      return 'Fist';
    }

    // 3. L_Shape (比八/L)
    // 拇指张开，食指伸展，其他手指折叠
    if (thumbUp && indexUp && middleFolded && ringFolded && pinkyFolded) {
      return 'L_Shape';
    }

    // 4. Open_Palm (五指张开)
    // 如果四根主手指都伸展了，或者三根主手指+大拇指伸展，就判定为张开
    // 这种“容错”逻辑能极大提高灵敏度
    if ((upCount === 4 && thumbUp) || (upCount === 4)) {
      return 'Open_Palm';
    }

    return 'None';
  };

  return (
    <div className={`relative rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border transition-all duration-300 w-32 h-24 sm:w-[180px] sm:h-[135px] bg-white/5 backdrop-blur-md group ${activeGesture !== 'None' ? 'border-yellow-400/80 scale-105 shadow-yellow-400/20' : 'border-white/50'}`}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover camera-preview opacity-80" />
      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 px-1.5 sm:px-2 py-0.5 rounded-full bg-white/20 text-[6px] sm:text-[8px] text-white border border-white/20 uppercase tracking-widest flex items-center gap-1">
        <span className={`w-1 h-1 rounded-full ${webcamRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
        Leaf
      </div>
      {activeGesture !== 'None' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="bg-yellow-400/90 text-black px-3 py-1 rounded-full text-[10px] sm:text-[12px] font-black uppercase tracking-tighter animate-[ping_1s_ease-in-out_1]">
                {activeGesture}
            </div>
        </div>
      )}
      {!webcamRunning && <div className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] text-white/50">Waking...</div>}
    </div>
  );
};
