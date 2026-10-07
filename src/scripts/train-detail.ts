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
  const g = new THREE.SphereGeometry(1, 20, 12);
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
export function contactShadows(spots: { x: number; z: number; w: number; d: number }[], y: number, texture: THREE.Texture, opacity = .45) {
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

/**
 * A rounded block with a soft crown, for cushions. Vertices are packed toward the
 * edges so the rounding stays smooth without a dense grid across each face.
 * `axis` names the face that bulges: 'y' crowns the top, 'z' pushes the -z face.
 */
export function pillowGeometry(w: number, h: number, d: number, r: number, bulge: number, axis: 'y' | 'z' = 'y') {
  const g = new THREE.BoxGeometry(w, h, d, 12, 6, 12);
  const p = g.attributes.position, n = g.attributes.normal;
  const half = [w / 2, h / 2, d / 2];
  const pack = (v: number, size: number) => { const t = Math.abs(v) / size; return Math.sign(v) * size * (1 - (1 - t) ** 2); };
  const v = new THREE.Vector3(), inner = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(pack(p.getX(i), half[0]), pack(p.getY(i), half[1]), pack(p.getZ(i), half[2]));
    inner.set(
      THREE.MathUtils.clamp(v.x, -half[0] + r, half[0] - r),
      THREE.MathUtils.clamp(v.y, -half[1] + r, half[1] - r),
      THREE.MathUtils.clamp(v.z, -half[2] + r, half[2] - r));
    normal.subVectors(v, inner);
    if (normal.lengthSq() < 1e-10) normal.set(n.getX(i), n.getY(i), n.getZ(i));
    normal.normalize();
    v.copy(inner).addScaledVector(normal, r);
    const [a, b] = axis === 'y' ? [v.x / half[0], v.z / half[2]] : [v.x / half[0], v.y / half[1]];
    const crown = bulge * (1 - a * a) * (1 - b * b);
    if (axis === 'y') v.y += crown * Math.max(0, v.y / half[1]);
    else v.z -= crown * Math.max(0, -v.z / half[2]);
    p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, normal.x, normal.y, normal.z);
  }
  return g;
}

/** Bakes a vertical colour gradient into a geometry's vertex colours. */
export function verticalGradient(g: THREE.BufferGeometry, bottom: string, top: string, from: number, to: number) {
  const p = g.attributes.position, colors = new Float32Array(p.count * 3);
  const a = new THREE.Color(bottom), b = new THREE.Color(top), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.lerpColors(a, b, THREE.MathUtils.smoothstep(p.getY(i), from, to));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/** A hanging curtain panel gathered into soft vertical folds. */
export function curtainGeometry(width: number, height: number, folds = 5, depth = .05) {
  const g = new THREE.PlaneGeometry(width, height, folds * 8, 4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / width + .5;
    p.setZ(i, Math.sin(x * folds * Math.PI * 2) * depth * (.6 + .4 * (1 - (p.getY(i) / height + .5))));
  }
  g.computeVertexNormals();
  return g;
}
