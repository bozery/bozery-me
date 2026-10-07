import * as THREE from 'three';
import { alignToSurface, surfacePoint, type Sdf } from './sdf';

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

export interface TubeOptions {
  rings?: number; sides?: number;
  /** Radius along the tube, t in [0, 1]. */
  radius: (t: number) => number;
  /** Colour at t; `up` is how much the vertex faces the tube's upper side (-1 to 1). */
  color: (t: number, up: number, around: number, out: THREE.Color) => void;
}

/**
 * A tapered fabric tube, such as a tail, whose spine can be reshaped every frame.
 * Rings bunch up toward the tip so its rounded cap stays smooth.
 */
export function plushTube(material: THREE.Material, { rings = 48, sides = 14, radius, color }: TubeOptions) {
  const ringT = (r: number) => 1 - (1 - r / (rings - 1)) ** 1.7;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(rings * sides * 3), normals = new Float32Array(rings * sides * 3), colors = new Float32Array(rings * sides * 3);
  const index: number[] = [];
  for (let r = 0; r < rings - 1; r++) for (let s = 0; s < sides; s++) {
    const a = r * sides + s, b = r * sides + (s + 1) % sides, c = a + sides, d = b + sides;
    index.push(a, b, c, b, d, c);
  }
  const c = new THREE.Color();
  for (let r = 0; r < rings; r++) for (let s = 0; s < sides; s++) {
    const around = s / sides * Math.PI * 2;
    color(ringT(r), Math.cos(around), around, c);
    c.toArray(colors, (r * sides + s) * 3);
  }
  geometry.setIndex(index);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; mesh.receiveShadow = true;
  const centre = new THREE.Vector3(), tangent = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0);
  /** Rebuilds the tube around a spine; `spine(t, out)` writes the centre at t. */
  function shape(spine: (t: number, out: THREE.Vector3) => void) {
    for (let r = 0; r < rings; r++) {
      const t = ringT(r), rad = radius(t);
      spine(t, centre); spine(t + .01, tangent); tangent.sub(centre).normalize();
      side.crossVectors(tangent, UP);
      if (side.lengthSq() < 1e-6) side.crossVectors(tangent, X);
      side.normalize(); up.crossVectors(side, tangent);
      for (let s = 0; s < sides; s++) {
        const a = s / sides * Math.PI * 2, cu = Math.cos(a), cs = Math.sin(a), i = (r * sides + s) * 3;
        const nx = up.x * cu + side.x * cs, ny = up.y * cu + side.y * cs, nz = up.z * cu + side.z * cs;
        normals[i] = nx; normals[i + 1] = ny; normals[i + 2] = nz;
        positions[i] = centre.x + nx * rad; positions[i + 1] = centre.y + ny * rad; positions[i + 2] = centre.z + nz * rad;
      }
    }
    geometry.attributes.position.needsUpdate = true; geometry.attributes.normal.needsUpdate = true;
  }
  return { mesh, geometry, shape };
}

/** Eases a value toward a target at a frame-rate independent rate. */
export const damp = (current: number, target: number, rate: number, dt: number) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * dt));

/** Places a face detail on a surface: traced from `origin` along `dir`, then lifted off it by `lift`. */
export function placeOn<T extends THREE.Object3D>(object: T, sdf: Sdf, origin: [number, number, number], dir: [number, number, number], lift = 0) {
  const { point, normal } = surfacePoint(sdf, new THREE.Vector3(...origin), new THREE.Vector3(...dir));
  return alignToSurface(object, point.addScaledVector(normal, lift), normal);
}
