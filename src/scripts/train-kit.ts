import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Shared primitive builders. Every geometry is tracked so the owner can dispose it. */
export function createKit(root: THREE.Object3D, geometries: THREE.BufferGeometry[]) {
  function place<T extends THREE.Mesh>(mesh: T, x: number, y: number, z: number, parent: THREE.Object3D) {
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = root) {
    geometries.push(g); return place(new THREE.Mesh(g, m), x, y, z, parent);
  }
  function box(w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, r = .04, parent: THREE.Object3D = root) {
    const g = r ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
    return mesh(g, m, x, y, z, parent);
  }
  function cylinder(radius: number, height: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = root) {
    return mesh(new THREE.CylinderGeometry(radius, radius, height, 32), m, x, y, z, parent);
  }
  return { mesh, box, cylinder };
}

export type Kit = ReturnType<typeof createKit>;
