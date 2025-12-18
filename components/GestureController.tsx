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
          numHands: 1
        });
        // 尝试自动启动
        startWebcam();
      } catch (error) { 
        console.error("Error initializing MediaPipe:", error);
        setErrorMsg("初始化失败");
      }
    };
    initLandmarker();
    return () => {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startWebcam = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("浏览器不支持摄像头");
      return;
    }
    
    try {
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user" // 强制使用前置摄像头
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // 手机端关键：必须在 play() 成功后再开始预测
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setWebcamRunning(true);
          predictWebcam();
        };
      }
    } catch (err) { 
      console.error("Webcam error:", err);
      setErrorMsg("摄像头被拒绝");
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
    const isUp = (tip: number, pip: number) => getDist(lm[tip], wrist) > getDist(lm[pip], wrist);
    const isFolded = (tip: number, mcp: number) => getDist(lm[tip], wrist) < getDist(lm[mcp], wrist) * 1.12;

    const indexUp = isUp(8, 6), middleUp = isUp(12, 10), ringUp = isUp(16, 14), pinkyUp = isUp(20, 18);
    const indexFolded = isFolded(8, 5), middleFolded = isFolded(12, 9), ringFolded = isFolded(16, 13), pinkyFolded = isFolded(20, 17);
    const thumbUp = getDist(lm[4], lm[5]) > getDist(lm[3], lm[5]) * 1.2;
    const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

    const pinchDist = getDist(lm[4], lm[8]);
    if (pinchDist < 0.045 && upCount >= 1) return 'Pinch';
    if (indexFolded && middleFolded && ringFolded && pinkyFolded && !thumbUp) return 'Fist';
    if (thumbUp && indexUp && middleFolded && ringFolded && pinkyFolded) return 'L_Shape';
    if (upCount >= 3) return 'Open_Palm';

    return 'None';
  };

  return (
    <div 
      onClick={!webcamRunning ? startWebcam : undefined}
      className={`relative rounded-xl overflow-hidden shadow-xl border transition-all duration-300 w-32 h-24 sm:w-[180px] sm:h-[135px] bg-black group ${activeGesture !== 'None' ? 'border-yellow-400 scale-105' : 'border-white/30'}`}
    >
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        webkit-playsinline="true"
        className="w-full h-full object-cover opacity-80" 
      />
      
      {/* 状态指示 */}
      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-black/40 text-[6px] text-white border border-white/20 flex items-center gap-1">
        <span className={`w-1 h-1 rounded-full ${webcamRunning ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></span>
        {webcamRunning ? 'Camera On' : (errorMsg || 'Tap to Start')}
      </div>

      {activeGesture !== 'None' && (
        <div className="absolute inset-0 flex items-center justify-center bg-yellow-400/20">
             <div className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter animate-bounce">
                {activeGesture}
            </div>
        </div>
      )}

      {!webcamRunning && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 pointer-events-none">
           <div className="text-[14px] mb-1">📷</div>
           <div className="text-[8px] text-white/70">点击此处启动</div>
        </div>
      )}
    </div>
  );
};
