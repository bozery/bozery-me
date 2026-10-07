import * as THREE from 'three';
import type { Sdf } from './sdf';

/** Shared look for the stuffed-toy companions: felt-like fabric, pinched seams and stitches. */

const hash = (x: number, y: number, z: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

/** Smooth value noise in [-1, 1]; `scale` is the blob size in metres. */
export function felt(x: number, y: number, z: number, scale = .006) {
  const fx = x / scale, fy = y / scale, fz = z / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
  const s = (t: number) => t * t * (3 - 2 * t);
  const ux = s(fx - ix), uy = s(fy - iy), uz = s(fz - iz);
  const lerp = THREE.MathUtils.lerp;
  const c = (dx: number, dy: number, dz: number) => hash(ix + dx, iy + dy, iz + dz);
  const v = lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), ux), lerp(c(0, 1, 0), c(1, 1, 0), ux), uy),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), ux), lerp(c(0, 1, 1), c(1, 1, 1), ux), uy), uz);
  return v * 2 - 1;
}

/** Pinches a shape inward along the plane `axis = 0`, like the seam between two fabric panels. */
export const seam = (sdf: Sdf, axis: 'x' | 'y' | 'z', width = .005, depth = .003): Sdf => (x, y, z) => {
  const c = axis === 'x' ? x : axis === 'y' ? y : z;
  return sdf(x, y, z) + depth * Math.exp(-((c / width) ** 2));
};

/**
 * How much a point lies on a running stitch along the seam plane `coord = 0`:
 * short dashes spaced along `along`.
 */
export const stitch = (coord: number, along: number, width = .0016, pitch = .009) => {
  const line = 1 - THREE.MathUtils.smoothstep(Math.abs(coord), width * .5, width * 1.6);
  const dash = THREE.MathUtils.smoothstep(Math.sin(along / pitch * Math.PI * 2), -.1, .4);
  return line * dash;
};

/** Gives a fabric colour some felt mottling. */
export function mottle(out: THREE.Color, x: number, y: number, z: number, amount = .07) {
  const n = felt(x, y, z) * .7 + felt(x, y, z, .0022) * .3;
  return out.multiplyScalar(1 + n * amount);
}

/** Soft velvety fabric: fully rough with a broad sheen that lights up the silhouette. */
export function plushMaterial() {
  return new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 1, sheen: .75, sheenRoughness: .55, sheenColor: '#b9bfbc' });
}
