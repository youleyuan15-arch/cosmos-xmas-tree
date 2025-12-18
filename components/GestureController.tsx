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
        // 尝试自动启动，失败也没关系，后面有点击启动
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
    // 1. 检查 API 是否存在 (非 HTTPS 环境下这里会直接 alert)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("错误：当前环境不支持摄像头。请确保使用 HTTPS 访问，且不在预览窗口内打开。");
      setErrorMsg("环境不支持");
      return;
    }
    
    try {
      // 2. 尝试获取视频流
      const constraints = { 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      };
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("标准请求失败，尝试简易模式...");
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => alert("播放被拦截: " + e.message));
          setWebcamRunning(true);
          setErrorMsg(null);
          predictWebcam();
        };
      }
    } catch (err: any) { 
      console.error("Webcam Error:", err);
      // 在手机端直接弹出错误详情
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        alert("权限被拒绝。请在手机设置里允许浏览器访问摄像头，并刷新页面。");
      } else {
        alert("启动失败: " + err.message);
      }
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
    const indexUp = isUp(8, 6), middleUp = isUp(12, 10), ringUp = isUp(16, 14), pinkyUp = isUp(20, 18);
    const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    const thumbUp = getDist(lm[4], lm[5]) > getDist(lm[3], lm[5]) * 1.2;
    const pinchDist = getDist(lm[4], lm[8]);

    if (pinchDist < 0.045 && upCount >= 1) return 'Pinch';
    if (upCount === 0 && !thumbUp) return 'Fist';
    if (thumbUp && indexUp && upCount === 1) return 'L_Shape';
    if (upCount >= 3) return 'Open_Palm';
    return 'None';
  };

  return (
    <div 
      onClick={startWebcam}
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
