// Shared globe math: every visual (dots, arcs, nodes) uses this mapping.

import * as THREE from 'three';

export const GLOBE_R = 1;

export function latLonToVec3(lat: number, lon: number, r = GLOBE_R): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/** Elevated quadratic-bezier arc between two surface points. */
export function arcCurve(a: THREE.Vector3, b: THREE.Vector3): THREE.QuadraticBezierCurve3 {
  const angle = a.angleTo(b);
  const mid = a.clone().add(b);
  if (mid.lengthSq() < 1e-6) mid.set(a.y, a.z, a.x); // antipodal fallback
  mid.normalize();
  const alt = GLOBE_R * (0.05 + 0.3 * (angle / Math.PI));
  const control = mid.multiplyScalar(GLOBE_R + alt);
  return new THREE.QuadraticBezierCurve3(a.clone(), control, b.clone());
}

/** Faint graticule line segments every `step` degrees. */
export function graticuleGeometry(step = 15, r = GLOBE_R * 1.001): THREE.BufferGeometry {
  const pts: number[] = [];
  for (let lon = -180; lon < 180; lon += step) {
    for (let lat = -75; lat < 75; lat += 5) {
      const a = latLonToVec3(lat, lon, r);
      const b = latLonToVec3(lat + 5, lon, r);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  for (let lat = -75; lat <= 75; lat += step) {
    for (let lon = -180; lon < 180; lon += 5) {
      const a = latLonToVec3(lat, lon, r);
      const b = latLonToVec3(lat, lon + 5, r);
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return g;
}
