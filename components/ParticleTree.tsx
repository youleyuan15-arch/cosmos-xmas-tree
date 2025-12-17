
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ShapeType } from '../types.ts';

const SixPointStarGeometry = () => {
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const vertices = [];
        const indices = [];
        const outerRadius = 0.6;
        const innerRadius = 0.2;
        const thickness = 0.08;
        vertices.push(0, 0, thickness);
        vertices.push(0, 0, -thickness);
        for (let i = 0; i < 12; i++) {
            const angle = (i * Math.PI) / 6;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const x = r * Math.sin(angle);
            const y = r * Math.cos(angle);
            vertices.push(x, y, 0);
        }
        for (let i = 0; i < 12; i++) {
            const current = 2 + i;
            const next = 2 + ((i + 1) % 12);
            indices.push(0, current, next);
            indices.push(1, next, current);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }, []);
    return <primitive object={geometry} attach="geometry" />;
};

const useGlowTexture = () => {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 230, 200, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 128, 128);
        }
        return new THREE.CanvasTexture(canvas);
    }, []);
    return texture;
}

const GlowingStar: React.FC<{ visible: boolean }> = ({ visible }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const glowTexture = useGlowTexture();
  useFrame((state) => {
    if (!visible) return;
    const t = state.clock.getElapsedTime();
    if (meshRef.current) meshRef.current.rotation.y = t * 0.3;
    if (glowRef.current) {
        const pulse = 2.2 + Math.sin(t * 3.0) * 0.4;
        glowRef.current.scale.set(pulse, pulse, 1.0);
    }
  });
  return (
    <group position={[0, 11, 0]} visible={visible}>
      <mesh ref={meshRef}>
        <SixPointStarGeometry />
        <meshStandardMaterial color="#ffffff" metalness={1.0} roughness={0.1} emissive="#444444" />
      </mesh>
      <sprite ref={glowRef}>
        <spriteMaterial map={glowTexture} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <pointLight distance={15} intensity={3} color="#ffffff" decay={2} />
    </group>
  );
};

function generateTextPositions(text: string, count: number, width: number, height: number): Float32Array {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new Float32Array(count * 3);
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; ctx.font = 'Bold 80px "Times New Roman", Serif'; 
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText("Wishing you a", canvas.width / 2, canvas.height / 2 - 60);
    ctx.fillText("Merry Christmas!", canvas.width / 2, canvas.height / 2 + 60);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const validPixels: number[] = [];
    for (let i = 0; i < canvas.height; i += 3) { 
        for (let j = 0; j < canvas.width; j += 3) {
            const index = (i * canvas.width + j) * 4;
            if (data[index] > 128) validPixels.push(j, i);
        }
    }
    const positions = new Float32Array(count * 3);
    const pixelCount = Math.floor(validPixels.length / 2);
    for (let i = 0; i < count; i++) {
        const pIndex = (i % pixelCount) * 2;
        const px = validPixels[pIndex]; const py = validPixels[pIndex + 1];
        const x = (px / canvas.width - 0.5) * width;
        const y = ((1.0 - py / canvas.height) - 0.5) * height + 5.0; 
        const z = (Math.random() - 0.5) * 0.5;
        positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    }
    return positions;
}

const morphVertexShader = `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uMixTree;
  uniform float uMixNebula;
  uniform float uMixText;
  uniform float uMixClover;
  uniform float uBurstTime;
  
  attribute vec3 aPosTree;
  attribute vec3 aPosNebula;
  attribute vec3 aPosText;
  attribute vec3 aPosClover;
  attribute float aRandom;
  attribute float aSize;
  
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 mixedPos = aPosTree * uMixTree + 
                    aPosNebula * uMixNebula + 
                    aPosText * uMixText +
                    aPosClover * uMixClover;
    
    float timeSinceBurst = uTime - uBurstTime;
    if (timeSinceBurst >= 0.0 && timeSinceBurst < 2.5) {
        float burstProgress = timeSinceBurst / 2.5;
        vec3 burstDir = normalize(mixedPos + vec3(0.0, -5.0, 0.0) + vec3(aRandom - 0.5));
        float force = smoothstep(0.0, 0.2, burstProgress) * (1.0 - burstProgress);
        mixedPos += burstDir * force * 15.0 * aRandom;
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(mixedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (uSize * aSize * uPixelRatio) / (-mvPosition.z);
    
    float burstColorBoost = 0.0;
    if (timeSinceBurst >= 0.0 && timeSinceBurst < 1.5) {
        burstColorBoost = (1.0 - timeSinceBurst / 1.5) * 2.0;
    }

    float tCycle = uTime * 0.5;
    float cycle = 0.5 + 0.5 * sin(tCycle); 
    vec3 colSilver = vec3(0.7, 0.8, 1.0);   
    vec3 colPink   = vec3(1.0, 0.4, 0.85);  
    vec3 colGold   = vec3(1.0, 0.6, 0.2);   
    vec3 baseColor;
    if (cycle < 0.5) baseColor = mix(colSilver, colPink, cycle * 2.0);
    else baseColor = mix(colPink, colGold, (cycle - 0.5) * 2.0);
    
    vec3 cloverGreenLight = vec3(0.7, 1.0, 0.5);
    vec3 cloverGreenVibrant = vec3(0.2, 0.9, 0.35);
    vec3 cloverCol = mix(cloverGreenLight, cloverGreenVibrant, aRandom);
    baseColor = mix(baseColor, cloverCol, uMixClover);
    
    baseColor = mix(baseColor, vec3(1.0), burstColorBoost);
    
    float sparkle = sin(uTime * 6.0 + aRandom * 50.0);
    sparkle = smoothstep(0.4, 1.0, sparkle); 
    vColor = baseColor * (1.1 + cycle * 0.8 + burstColorBoost);
    vAlpha = (0.7 + 0.3 * sparkle) * (1.0 - clamp(burstColorBoost - 1.2, 0.0, 1.0));
  }
`;

const morphFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float core = 1.0 - smoothstep(0.0, 0.2, dist);
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 2.5); 
    gl_FragColor = vec4(vColor + vec3(core * 0.6), vAlpha * (glow * 0.9 + core));
  }
`;

interface ParticleTreeProps {
    currentShape: ShapeType;
    handPosition: { x: number; y: number };
    burstTime: number;
    density?: number;
}

export const ParticleTree: React.FC<ParticleTreeProps> = ({ currentShape, handPosition, burstTime, density = 1.0 }) => {
  const pointsRef = useRef<THREE.Points>(null);
  
  // 基础粒子数 75,000，按密度调节
  const particleCount = useMemo(() => Math.floor(75000 * density), [density]);
  const treeHeight = 11.0;
  
  const { positionsTree, positionsNebula, positionsText, positionsClover, randoms, sizes } = useMemo(() => {
    const randomsArr = new Float32Array(particleCount);
    const sizesArr = new Float32Array(particleCount);
    const pTree = new Float32Array(particleCount * 3);
    const pNebula = new Float32Array(particleCount * 3);
    const pClover = new Float32Array(particleCount * 3);
    const loops = 8.0;

    const cloverBaseY = 8.0;

    for (let i = 0; i < particleCount; i++) {
      const rVal = Math.random();
      randomsArr[i] = rVal;
      const isCore = Math.random() > 0.3;
      sizesArr[i] = isCore ? (Math.random() * 0.3 + 0.1) : (Math.random() * 1.3 + 0.5);
      
      const u = i / particleCount; 
      const h = u; 
      const angle = u * Math.PI * 2 * loops;
      const spiralRadius = 3.6 * (1.0 - h);
      const cx = spiralRadius * Math.cos(angle);
      const cy = h * treeHeight;
      const cz = spiralRadius * Math.sin(angle);
      const spread = isCore ? 0.06 : 0.48; 
      const rVol = spread * Math.pow(1.0 - h, 1.4); 
      const thetaVol = Math.random() * Math.PI * 2;
      const phiVol = Math.acos(2 * Math.random() - 1);
      pTree[i * 3] = cx + rVol * Math.sin(phiVol) * Math.cos(thetaVol);
      pTree[i * 3 + 1] = cy + rVol * Math.sin(phiVol) * Math.sin(thetaVol);
      pTree[i * 3 + 2] = cz + rVol * Math.cos(phiVol);

      const rNeb = 10.0 + Math.random() * 15.0;
      const thetaNeb = Math.random() * Math.PI * 2;
      const phiNeb = Math.acos(2 * Math.random() - 1);
      pNebula[i * 3] = rNeb * Math.sin(phiNeb) * Math.cos(thetaNeb);
      pNebula[i * 3 + 1] = rNeb * Math.sin(phiNeb) * Math.sin(thetaNeb) + 5.0; 
      pNebula[i * 3 + 2] = rNeb * Math.cos(phiNeb);

      if (i < particleCount * 0.85) {
          const petalIdx = Math.floor(Math.random() * 4);
          const petalAngle = petalIdx * (Math.PI / 2);
          const t = Math.random() * Math.PI * 2;
          const innerScale = Math.sqrt(Math.random());
          const s = 0.07 * innerScale;
          let lx = 16 * Math.pow(Math.sin(t), 3) * s;
          let ly = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s;
          ly += 0.4 * innerScale; 
          const rx = lx * Math.cos(petalAngle) - ly * Math.sin(petalAngle);
          const ry = lx * Math.sin(petalAngle) + ly * Math.cos(petalAngle);
          pClover[i * 3] = rx * 2.0; 
          pClover[i * 3 + 1] = ry * 2.0 + cloverBaseY; 
          pClover[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      } else {
          const h = (i - (particleCount * 0.85)) / (particleCount * 0.15);
          const stemLen = 5.6;
          const stemY = cloverBaseY - h * stemLen;
          const curveX = Math.sin(h * 1.8) * 0.6;
          const thickness = 0.12 * (1.0 - h * 0.5);
          pClover[i * 3] = curveX + (Math.random() - 0.5) * thickness;
          pClover[i * 3 + 1] = stemY;
          pClover[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      }
    }
    const pText = generateTextPositions("Wishing you a Merry Christmas!", particleCount, 16, 8);
    return { positionsTree: pTree, positionsNebula: pNebula, positionsText: pText, positionsClover: pClover, randoms: randomsArr, sizes: sizesArr };
  }, [particleCount]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uSize: { value: 45.0 },
    uMixTree: { value: 1.0 },
    uMixNebula: { value: 0.0 },
    uMixText: { value: 0.0 },
    uMixClover: { value: 0.0 },
    uBurstTime: { value: -100 }
  }), []);

  const weightsRef = useRef({ tree: 1, nebula: 0, text: 0, clover: 0 });

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    uniforms.uTime.value = t;
    uniforms.uBurstTime.value = burstTime;

    const targetTree = currentShape === 'tree' ? 1 : 0;
    const targetNebula = currentShape === 'nebula' ? 1 : 0;
    const targetText = currentShape === 'text' ? 1 : 0;
    const targetClover = currentShape === 'clover' ? 1 : 0;
    
    const speed = 4.0 * delta; 
    weightsRef.current.tree = THREE.MathUtils.lerp(weightsRef.current.tree, targetTree, speed);
    weightsRef.current.nebula = THREE.MathUtils.lerp(weightsRef.current.nebula, targetNebula, speed);
    weightsRef.current.text = THREE.MathUtils.lerp(weightsRef.current.text, targetText, speed);
    weightsRef.current.clover = THREE.MathUtils.lerp(weightsRef.current.clover, targetClover, speed);
    
    uniforms.uMixTree.value = weightsRef.current.tree;
    uniforms.uMixNebula.value = weightsRef.current.nebula;
    uniforms.uMixText.value = weightsRef.current.text;
    uniforms.uMixClover.value = weightsRef.current.clover;

    if (pointsRef.current) {
        if (currentShape === 'text' || currentShape === 'clover') {
            pointsRef.current.rotation.set(0, 0, 0);
            const pulse = currentShape === 'clover' ? 0.03 : 0.02;
            pointsRef.current.scale.setScalar(1.0 + Math.sin(t * 3.5) * pulse);
        } else {
            const targetRotY = (handPosition.x - 0.5) * -Math.PI * 1.5; 
            const targetRotX = (handPosition.y - 0.5) * -Math.PI / 4; 
            pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, targetRotY, delta * 5.0);
            pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, targetRotX, delta * 5.0);
            pointsRef.current.scale.setScalar(1.0);
        }
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-aPosTree" count={particleCount} array={positionsTree} itemSize={3} />
          <bufferAttribute attach="attributes-aPosNebula" count={particleCount} array={positionsNebula} itemSize={3} />
          <bufferAttribute attach="attributes-aPosText" count={particleCount} array={positionsText} itemSize={3} />
          <bufferAttribute attach="attributes-aPosClover" count={particleCount} array={positionsClover} itemSize={3} />
          <bufferAttribute attach="attributes-position" count={particleCount} array={positionsTree} itemSize={3} /> 
          <bufferAttribute attach="attributes-aRandom" count={particleCount} array={randoms} itemSize={1} />
          <bufferAttribute attach="attributes-aSize" count={particleCount} array={sizes} itemSize={1} />
        </bufferGeometry>
        <shaderMaterial 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} 
          transparent 
          vertexShader={morphVertexShader} 
          fragmentShader={morphFragmentShader} 
          uniforms={uniforms} 
        />
      </points>
      <GlowingStar visible={currentShape === 'tree'} />
    </group>
  );
};
