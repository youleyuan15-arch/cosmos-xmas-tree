import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export type GestureType = 'Fist' | 'Open_Palm' | 'L_Shape' | 'Pinch' | 'None';
export interface GestureData { type: GestureType; position: { x: number; y: number }; }

export const GestureController: React.FC<{ onGestureDetected: (data: GestureData) => void }> = ({ onGestureDetected }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [webcamRunning, setWebcamRunning] = useState(false);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const frameCountRef = useRef(0);
  const [activeGesture, setActiveGesture] = useState<GestureType>('None');

  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm");
        landmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { 
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU" 
          },
          runningMode: "VIDEO", numHands: 1
        });
        startWebcam();
      } catch (e) { console.error(e); }
    };
    init();
  }, []);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 320, height: 240, frameRate: 15 } // 降低分辨率减负
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setWebcamRunning(true);
          predict();
        };
      }
    } catch (err) { console.error(err); }
  };

  const predict = () => {
    if (landmarkerRef.current && videoRef.current && !videoRef.current.paused) {
      // 性能核心：手机端每 3 帧才检测一次手势，防止卡死
      frameCountRef.current++;
      if (frameCountRef.current % 3 === 0) {
        let now = Date.now();
        if (videoRef.current.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = videoRef.current.currentTime;
          const results = landmarkerRef.current.detectForVideo(videoRef.current, now);
          if (results.landmarks?.length > 0) {
            const lm = results.landmarks[0];
            const type = recognize(lm);
            setActiveGesture(type);
            onGestureDetected({ type, position: { x: lm[0].x, y: lm[0].y } });
          }
        }
      }
    }
    requestAnimationFrame(predict);
  };

  const recognize = (lm: any[]): GestureType => {
    const wrist = lm[0];
    const dist = (p1: any, p2: any) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const up = (t: number, p: number) => dist(lm[t], wrist) > dist(lm[p], wrist);
    const uCount = [up(8,6), up(12,10), up(16,14), up(20,18)].filter(Boolean).length;
    if (dist(lm[4], lm[8]) < 0.05) return 'Pinch';
    if (uCount === 0) return 'Fist';
    if (uCount >= 3) return 'Open_Palm';
    if (up(8,6) && dist(lm[4], lm[5]) > dist(lm[3], lm[5])) return 'L_Shape';
    return 'None';
  };

  return (
    <div onPointerDown={startWebcam} className="relative w-28 h-20 bg-black rounded-lg overflow-hidden border border-white/20">
      <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
      {!webcamRunning && <div className="absolute inset-0 flex items-center justify-center text-[10px]">点我启动</div>}
    </div>
  );
};
