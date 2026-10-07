import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

/**
 * Signed-distance helpers for building soft organic shapes (negative inside).
 * Shapes are blended with smooth unions, then meshed once with marching cubes.
 */
export type Sdf = (x: number, y: number, z: number) => number;

/** Smooth union: blends two distances with a fillet of size k. */
export const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * .25;
};

/** Smooth intersection, or subtraction when b is negated. */
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);

/** An ellipsoid centred at (cx, cy, cz) with radii (rx, ry, rz). */
export const ellipsoid = (cx: number, cy: number, cz: number, rx: number, ry: number, rz: number): Sdf => (x, y, z) => {
  const px = x - cx, py = y - cy, pz = z - cz;
  const k0 = Math.hypot(px / rx, py / ry, pz / rz);
  const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
  return k1 ? k0 * (k0 - 1) / k1 : -Math.min(rx, ry, rz);
};

/**
 * A cone along +y with rounded ends: radius r1 at y=y0 tapering to r2 at y=y1.
 * `flat` squashes the x axis, which turns it into a leaf or ear-like blade.
 */
export const roundCone = (r1: number, r2: number, y0: number, y1: number, flat = 1, ox = 0): Sdf => (x, y, z) => {
  const h = y1 - y0, b = (r1 - r2) / h, a = Math.sqrt(1 - b * b);
  const qx = Math.hypot((x - ox) * flat, z), qy = y - y0;
  const k = -b * qx + a * qy;
  if (k < 0) return Math.hypot(qx, qy) - r1;
  if (k > a * h) return Math.hypot(qx, qy - h) - r2;
  return qx * a + qy * b - r1;
};

/** Union of several shapes, all blended with the same fillet. */
export const blend = (k: number, ...shapes: Sdf[]): Sdf => (x, y, z) => {
  let d = shapes[0](x, y, z);
  for (let i = 1; i < shapes.length; i++) d = smin(d, shapes[i](x, y, z), k);
  return d;
};

/** Colours a vertex from its position and normal. */
export type Paint = (p: THREE.Vector3, n: THREE.Vector3, out: THREE.Color) => void;

/**
 * Meshes the zero surface of an SDF inside a cube of half-size `extent` around
 * `center`. Normals come from the field gradient, so the surface shades smoothly.
 */
export function sdfGeometry(sdf: Sdf, center: THREE.Vector3, extent: number, resolution = 48, paint?: Paint) {
  const material = new THREE.MeshBasicMaterial();
  const mc = new MarchingCubes(resolution, material, false, false, resolution * resolution * 12);
  const { size, size2, halfsize } = mc;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    mc.field[x + y * size + z * size2] = -sdf(
      center.x + (x - halfsize) / halfsize * extent,
      center.y + (y - halfsize) / halfsize * extent,
      center.z + (z - halfsize) / halfsize * extent);
  }
  mc.isolation = 0;
  mc.update();
  const count = mc.count;
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color();
  const colors = paint ? new Float32Array(count * 3) : null;
  for (let i = 0; i < count; i++) {
    p.fromArray(mc.positionArray, i * 3).multiplyScalar(extent).add(center);
    n.fromArray(mc.normalArray, i * 3).normalize();
    p.toArray(positions, i * 3); n.toArray(normals, i * 3);
    if (colors) { paint!(p, n, c); c.toArray(colors, i * 3); }
  }
  mc.geometry.dispose(); material.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  if (colors) geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Sphere-traces from `origin` along `dir` to the surface; returns the hit point and its normal. */
export function surfacePoint(sdf: Sdf, origin: THREE.Vector3, dir: THREE.Vector3) {
  const d = dir.clone().normalize(), p = origin.clone();
  // From inside the surface the distance is negative, so step by its magnitude.
  const sign = Math.sign(sdf(p.x, p.y, p.z)) || 1;
  for (let i = 0; i < 64; i++) {
    const s = sdf(p.x, p.y, p.z) * sign;
    if (Math.abs(s) < 1e-5) break;
    p.addScaledVector(d, s);
  }
  const e = 1e-4;
  const normal = new THREE.Vector3(
    sdf(p.x + e, p.y, p.z) - sdf(p.x - e, p.y, p.z),
    sdf(p.x, p.y + e, p.z) - sdf(p.x, p.y - e, p.z),
    sdf(p.x, p.y, p.z + e) - sdf(p.x, p.y, p.z - e)).normalize();
  return { point: p, normal };
}

/** Orients an object so its local +z follows `normal` and its local +x stays level. */
export function alignToSurface(object: THREE.Object3D, point: THREE.Vector3, normal: THREE.Vector3) {
  const x = new THREE.Vector3(0, 1, 0).cross(normal);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  const y = new THREE.Vector3().crossVectors(normal, x);
  object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, normal));
  object.position.copy(point);
  return object;
}
