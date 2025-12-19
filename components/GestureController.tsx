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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
          numHands: 1,
          minHandDetectionConfidence: 0.4, // 稍微降低门槛提高速度
          minHandPresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
        startWebcam();
      } catch (error) { 
        console.error("MediaPipe Init Error:", error);
      }
    };
    initLandmarker();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg("环境不支持");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setWebcamRunning(true);
          predictWebcam();
        };
      }
    } catch (err) { 
      setErrorMsg("启动失败");
    }
  };

  const predictWebcam = () => {
    if (!landmarkerRef.current || !videoRef.current || videoRef.current.paused) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }
    
    let nowInMs = Date.now();
    if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = videoRef.current.currentTime;
      const results = landmarkerRef.current.detectForVideo(videoRef.current, nowInMs);
      if (results.landmarks?.length > 0) {
        const landmarks = results.landmarks[0];
        const detected = recognizeGesture(landmarks);
        setActiveGesture(detected);
        onGestureDetectedRef.current({ type: detected, position: { x: 1 - landmarks[0].x, y: landmarks[0].y } });
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
    
    // 判断手指是否伸直 (适当放宽系数到1.1)
    const isUp = (tip: number, pip: number) => getDist(lm[tip], wrist) > getDist(lm[pip], wrist) * 1.1;
    
    const indexUp = isUp(8, 6);
    const middleUp = isUp(12, 10);
    const ringUp = isUp(16, 14);
    const pinkyUp = isUp(20, 18);
    const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    
    // 大拇指判定
    const thumbUp = getDist(lm[4], lm[5]) > getDist(lm[3], lm[5]) * 1.2;
    // 捏合距离
    const pinchDist = getDist(lm[4], lm[8]);

    // --- 识别逻辑排序 ---

    // 1. 优先判定 Pinch (大拇指靠近食指，且其他手指至少有一根是立着的)
    if (pinchDist < 0.045 && (middleUp || ringUp)) return 'Pinch';

    // 2. 判定 Fist (关键：食指、中指、无名指都收回就算握拳)
    if (!indexUp && !middleUp && !ringUp) return 'Fist';

    // 3. 判定 L_Shape (食指大拇指张开)
    if (thumbUp && indexUp && upCount === 1) return 'L_Shape';

    // 4. 判定 Open_Palm (三根及以上手指张开)
    if (upCount >= 3) return 'Open_Palm';

    return 'None';
  };

  return (
    <div 
      onClick={startWebcam}
      className={`relative rounded-xl overflow-hidden shadow-xl border transition-all duration-300 w-32 h-24 sm:w-[180px] sm:h-[135px] bg-black group ${activeGesture !== 'None' ? 'border-yellow-400 scale-105' : 'border-white/30'}`}
    >
      <video ref={videoRef} autoPlay playsInline muted webkit-playsinline="true" className="w-full h-full object-cover opacity-80 scale-x-[-1]" />
      
      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-black/40 text-[6px] text-white border border-white/20 flex items-center gap-1">
        <span className={`w-1 h-1 rounded-full ${webcamRunning ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
        {webcamRunning ? 'Active' : (errorMsg || 'Tap to Start')}
      </div>

      {!webcamRunning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
           <div className="text-[14px] mb-1">📷</div>
           <div className="text-[8px] text-white/70">点我授权</div>
        </div>
      )}

      {activeGesture !== 'None' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black animate-bounce uppercase">
                {activeGesture}
            </div>
        </div>
      )}
    </div>
  );
};
