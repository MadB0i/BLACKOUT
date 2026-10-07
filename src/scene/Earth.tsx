// The hero: dark physical globe + dotted landmass + rim atmosphere.
// Custom shader keeps it premium without stock-texture clichés.

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import land from '../data/landDots.json';
import { GLOBE_R, graticuleGeometry, latLonToVec3 } from './geo';

const EARTH_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EARTH_FRAG = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  uniform vec3 uSunDir;
  uniform float uTime;
  uniform float uSurfaceGain;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 438.5453); }
  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float ndl = dot(normalize(vPos), uSunDir);
    float day = smoothstep(-0.25, 0.55, ndl);
    vec3 night = vec3(0.035, 0.047, 0.066);
    vec3 dayT = vec3(0.037, 0.051, 0.071);
    vec3 col = mix(night, dayT, day * 0.85) * uSurfaceGain;
    float polar = smoothstep(0.55, 0.95, abs(normalize(vPos).y));
    col *= 1.0 - polar * 0.35;
    float fres = pow(1.0 - abs(dot(n, viewDir)), 2.6);
    vec3 rimCol = vec3(0.36, 0.72, 0.78);
    col += rimCol * fres * mix(0.55, 0.22, day);
    col += vec3(0.05, 0.035, 0.02) * smoothstep(0.0, 0.25, ndl) * (1.0 - smoothstep(0.25, 0.6, ndl));
    col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.012;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ATMO_FRAG = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    float rim = pow(max(0.0, 0.72 - abs(vNormal.z)), 2.2);
    vec3 col = vec3(0.30, 0.62, 0.70) * rim * 0.9;
    gl_FragColor = vec4(col, rim * 0.85);
  }
`;

export function EarthGlobe({ reducedMotion, highQuality }: { reducedMotion: boolean; highQuality: boolean }) {
  const earthMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: EARTH_VERT,
        fragmentShader: EARTH_FRAG,
        uniforms: {
          uSunDir: { value: new THREE.Vector3(-0.7, 0.25, 0.65).normalize() },
          uTime: { value: 0 },
          uSurfaceGain: { value: 1 },
        },
      }),
    [],
  );
  // A small surface-only correction for the brighter postprocessed tier.
  earthMat.uniforms.uSurfaceGain.value = highQuality ? 0.82 : 1;
  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  const dots = useMemo(() => {
    const arr = (land as unknown as { dots: [number, number][] }).dots;
    const pos = new Float32Array(arr.length * 3);
    arr.forEach(([lon, lat], i) => {
      const v = latLonToVec3(lat, lon, GLOBE_R * 1.002);
      pos.set([v.x, v.y, v.z], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const grat = useMemo(() => graticuleGeometry(15), []);

  useFrame(({ clock }) => {
    if (!reducedMotion) earthMat.uniforms.uTime.value = clock.elapsedTime % 10;
  });

  return (
    <group>
      <mesh material={earthMat}>
        <sphereGeometry args={[GLOBE_R, 96, 96]} />
      </mesh>
      <mesh material={atmoMat} scale={1.09}>
        <sphereGeometry args={[GLOBE_R, 64, 64]} />
      </mesh>
      <points geometry={dots}>
        <pointsMaterial
          size={0.0075}
          sizeAttenuation
          color="#93a7bd"
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </points>
      <lineSegments geometry={grat}>
        <lineBasicMaterial color="#22303e" transparent opacity={0.42} depthWrite={false} />
      </lineSegments>
    </group>
  );
}
