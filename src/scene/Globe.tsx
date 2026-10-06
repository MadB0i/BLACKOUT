// Canvas shell: camera rig, adaptive quality, restrained post-processing.

import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { EarthGlobe } from './Earth';
import { Network } from './Network';
import { latLonToVec3 } from './geo';
import { useBlackout } from '../state/store';

const Fx = lazy(() => import('./Fx').then((m) => ({ default: m.Fx })));

function webglAvailable(): boolean {  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function GlobeView() {
  const ok = useMemo(() => (typeof window === 'undefined' ? true : webglAvailable()), []);
  const snapshot = useBlackout((s) => s.snapshot);
  const failures = useBlackout((s) => s.failures);
  const layers = useBlackout((s) => s.layers);
  const selection = useBlackout((s) => s.selection);
  const reducedMotion = useBlackout((s) => s.reducedMotion);
  const quality = useBlackout((s) => s.quality);
  const focus = useBlackout((s) => s.focus);
  const select = useBlackout((s) => s.select);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const [tier, setTier] = useState<'high' | 'low'>(quality === 'low' ? 'low' : 'high');

  useEffect(() => {
    if (quality !== 'auto') setTier(quality);
  }, [quality]);

  if (!ok) {
    return (
      <div className="bo-gl-fallback" role="alert">
        <h2>WEBGL UNAVAILABLE</h2>
        <p>
          BLACKOUT needs WebGL to render the globe. The simulation itself still works — every
          scenario, metric and event below is computed live.
        </p>
        <p className="bo-mono">Try a recent Chrome, Edge, Firefox or Safari with hardware acceleration on.</p>
      </div>
    );
  }

  const low = tier === 'low';
  return (
    <div id="bo-gl" className="bo-gl" aria-label="Interactive 3D globe of simulated Internet infrastructure">
      <Canvas
        dpr={low ? 1 : Math.min(window.devicePixelRatio || 1, 2)}
        camera={{ position: [0.4, 0.9, 2.9], fov: 42, near: 0.1, far: 60 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, raycaster }) => {
          (raycaster.params as unknown as { Line: { threshold: number } }).Line = { threshold: 0.018 };
          gl.setClearColor('#05070b', 1);
        }}
        onPointerMissed={() => select(null)}
      >
        <Suspense fallback={null}>
          <CameraRig focus={focus} reducedMotion={reducedMotion} />
          <ambientLight intensity={0.4} />
          <EarthGlobe reducedMotion={reducedMotion} />
          <Network
            snapshot={snapshot}
            failures={failures}
            layers={layers}
            selection={selection}
            reducedMotion={reducedMotion}
            onSelect={select}
            hoverEdge={hoverEdge}
            onHoverEdge={setHoverEdge}
          />
          {!low && !reducedMotion && (
            <Stars radius={40} depth={12} count={1400} factor={2.2} saturation={0} fade speed={0.4} />
          )}
          {!low && (
            <Suspense fallback={null}>
              <Fx />
            </Suspense>
          )}
          {quality === 'auto' && <QualityProbe onDecide={setTier} />}
        </Suspense>
      </Canvas>
    </div>
  );
}

function CameraRig({
  focus,
  reducedMotion,
}: {
  focus: { lon: number; lat: number; nonce: number } | null;
  reducedMotion: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null!);
  const { camera } = useThree();
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; k: number } | null>(null);
  const [interacted, setInteracted] = useState(false);
  const seenNonce = useRef(0);

  useEffect(() => {
    if (!focus || focus.nonce === seenNonce.current) return;
    seenNonce.current = focus.nonce;
    const dest = latLonToVec3(focus.lat, focus.lon, 2.55);
    dest.y = Math.max(dest.y, 0.4);
    if (reducedMotion) {
      camera.position.copy(dest);
      controls.current?.update();
    } else {
      anim.current = { from: camera.position.clone(), to: dest, k: 0 };
    }
  }, [focus, reducedMotion, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    if (anim.current) {
      anim.current.k = Math.min(1, anim.current.k + dt / 1.1);
      const e = 1 - Math.pow(1 - anim.current.k, 3);
      camera.position.lerpVectors(anim.current.from, anim.current.to, e);
      if (anim.current.k >= 1) anim.current = null;
    }
    c.autoRotate = !reducedMotion && !interacted && !anim.current;
    c.update();
  });

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={1.7}
      maxDistance={5.2}
      rotateSpeed={0.55}
      autoRotateSpeed={reducedMotion ? 0 : 0.5}
      onStart={() => {
        setInteracted(true);
        anim.current = null;
      }}
    />
  );
}

/** FPS probe: drop to the low tier if the GPU can't hold up. */
function QualityProbe({ onDecide }: { onDecide: (t: 'high' | 'low') => void }) {
  const frames = useRef(0);
  const acc = useRef(0);
  const done = useRef(false);
  useFrame((_, dt) => {
    if (done.current) return;
    frames.current++;
    acc.current += dt;
    if (frames.current >= 150) {
      done.current = true;
      const fps = frames.current / acc.current;
      onDecide(fps < 38 ? 'low' : 'high');
    }
  });
  return null;
}
