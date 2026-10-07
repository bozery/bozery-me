import * as THREE from 'three';

/** Reusable geometry and texture builders that give the procedural carriage finer detail. */

/** An irregular, many-sided peak whose ridges vary around and along its height. */
export function mountainGeometry(radius: number, height: number, seed = 0) {
  const g = new THREE.ConeGeometry(radius, height, 48, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + height / 2) / height;
    const a = Math.atan2(z, x);
    const ridge = 1 + .16 * Math.sin(a * 3 + seed) + .08 * Math.sin(a * 7 + t * 5 + seed) + .04 * Math.sin(a * 15 + seed * 2);
    p.setXYZ(i, x * ridge, y - Math.max(0, t - .72) * height * .5, z * ridge);
  }
  g.computeVertexNormals();
  return g;
}

/** A unit puff with a flattened base, so instanced clouds read as cumulus rather than balls. */
export function cumulusGeometry() {
  const g = new THREE.SphereGeometry(1, 28, 18);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < -.15) p.setY(i, -.15 + (y + .15) * .22);
  }
  g.computeVertexNormals();
  return g;
}

/** A pointed leaf blade, slightly cupped along its midrib. */
export function leafGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(.5, .45, 0, 1);
  shape.quadraticCurveTo(-.5, .45, 0, 0);
  const g = new THREE.ShapeGeometry(shape, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.abs(p.getX(i)) * .35);
  g.computeVertexNormals();
  return g;
}

/** A soft radial falloff used as the alpha of contact-shadow decals. */
export function contactShadowTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + .5) / size * 2 - 1, dy = (y + .5) / size * 2 - 1;
    const d = Math.min(1, Math.hypot(dx, dy));
    const n = (y * size + x) * 4;
    // alphaMap samples the green channel; keep every channel equal.
    data[n] = data[n + 1] = data[n + 2] = data[n + 3] = Math.round(255 * Math.pow(1 - d, 1.8));
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Merges floor-level contact shadows into one transparent mesh (one draw call). */
export function contactShadows(spots: { x: number; z: number; w: number; d: number }[], y: number, texture: THREE.Texture, opacity = .32) {
  const parts = spots.map(({ x, z, w, d }) => {
    const g = new THREE.PlaneGeometry(w, d);
    g.rotateX(-Math.PI / 2);
    g.translate(x, y, z);
    return g;
  });
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  parts.forEach(g => {
    const offset = positions.length / 3;
    positions.push(...g.attributes.position.array);
    uvs.push(...g.attributes.uv.array);
    g.index!.array.forEach(i => index.push(i + offset));
    g.dispose();
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({ color: '#30504b', alphaMap: texture, transparent: true, opacity, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;
  return mesh;
}
