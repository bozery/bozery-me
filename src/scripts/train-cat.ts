import * as THREE from 'three';
import type { Companion } from '../data/companion';
import { contactShadowTexture } from './train-detail';
import { alignToSurface, blend, ellipsoid, roundCone, sdfGeometry, smax, smin, surfacePoint, type Sdf } from './sdf';

const damp = (current: number, target: number, rate: number, dt: number) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * dt));
const smooth = THREE.MathUtils.smoothstep;

// Body: a curled loaf with a rounded haunch, a soft chest and tucked paws. Local +x is the head direction.
const chest = ellipsoid(.09, .07, .025, .085, .065, .085);
const paws = blend(.012, ellipsoid(.17, .022, .07, .052, .022, .03), ellipsoid(.155, .022, -.02, .05, .022, .03));
const bodySdf: Sdf = (x, y, z) => {
  let d = blend(.05,
    ellipsoid(0, .09, 0, .15, .09, .12),
    ellipsoid(-.08, .092, -.02, .105, .095, .11),
    chest)(x, y, z);
  d = smin(d, paws(x, y, z), .03);
  return smax(d, -y, .012);
};

// Head: a round skull with full cheeks, a small muzzle and chin. Ears are separate so they can twitch.
const muzzle = blend(.012, ellipsoid(.064, -.024, .017, .027, .022, .024), ellipsoid(.064, -.024, -.017, .027, .022, .024), ellipsoid(.052, -.043, 0, .028, .016, .024));
const headSdf: Sdf = (x, y, z) => {
  const d = blend(.025,
    ellipsoid(0, .004, 0, .074, .066, .084),
    ellipsoid(.02, -.024, .036, .055, .042, .046),
    ellipsoid(.02, -.024, -.036, .055, .042, .046))(x, y, z);
  return smin(d, muzzle(x, y, z), .014);
};

// Ear: a flattened cone along +y with a cupped front; its base sinks into the head.
const earOuter = roundCone(.04, .007, -.02, .046, 2.2);
const earInner = roundCone(.028, .003, -.006, .04, 2.2, .012);
const earSdf: Sdf = (x, y, z) => smax(earOuter(x, y, z), -earInner(x, y, z), .004);

/**
 * aqp, a small grey cat curled up asleep. It breathes while asleep, twitches its
 * ears and tail when hovered and lifts its head when woken.
 */
export function createTrainCat(colors: Companion['colors']) {
  const group = new THREE.Group(); group.name = 'companion-cat';
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const fur = new THREE.Color(colors.fur), back = new THREE.Color(colors.stripes), light = new THREE.Color(colors.belly), pink = new THREE.Color(colors.accent);
  const furMaterial = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .88, sheen: .35, sheenRoughness: .6, sheenColor: '#e4e8e8' });
  const mat = (color: string, roughness = .5) => { const m = new THREE.MeshStandardMaterial({ color, roughness }); materials.push(m); return m; };
  materials.push(furMaterial);
  const dark = mat('#26302f', .45), eye = mat(colors.eyes, .2), glint = new THREE.MeshBasicMaterial({ color: '#ffffff' }), nose = mat(colors.accent, .55);
  const collarMat = mat(colors.collar, .6), bell = new THREE.MeshStandardMaterial({ color: '#e3c46b', roughness: .3, metalness: .6 });
  materials.push(glint, bell);
  const add = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const furMesh = (g: THREE.BufferGeometry, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(add(g), furMaterial); mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };

  // Grey coat that darkens along the back into soft tabby bands; white chest, paws and muzzle.
  const tabby = (p: THREE.Vector3, n: THREE.Vector3, out: THREE.Color, bands: number) => {
    const top = smooth(n.y, .1, .8);
    const stripe = smooth(Math.sin(bands), .35, .9) * top;
    out.copy(fur).lerp(back, top * .45 + stripe * .4);
  };
  const body = new THREE.Group(); group.add(body);
  const bodyMesh = furMesh(sdfGeometry(bodySdf, new THREE.Vector3(0, .09, .02), .27, 56, (p, n, out) => {
    tabby(p, n, out, p.x * 52 + p.z * 10);
    const bib = smooth(p.x, .09, .17) * smooth(n.y, .65, .1), toes = 1 - smooth(paws(p.x, p.y, p.z), -.004, .01);
    out.lerp(light, Math.max(bib, toes));
  }), body);

  // Head, with face details placed on its surface.
  const head = new THREE.Group(); head.position.set(.15, .1, .02); group.add(head);
  const headMesh = furMesh(sdfGeometry(headSdf, new THREE.Vector3(.01, -.005, 0), .11, 44, (p, n, out) => {
    tabby(p, n, out, -p.x * 70 + Math.abs(p.z) * 30);
    out.lerp(light, 1 - smooth(muzzle(p.x, p.y, p.z), -.002, .008));
  }), head);
  const earGeometry = add(sdfGeometry(earSdf, new THREE.Vector3(0, .02, 0), .05, 28, (p, n, out) => {
    out.copy(fur).lerp(back, .35);
    const inside = smooth(n.x, 0, .5) * (1 - smooth(earInner(p.x, p.y, p.z), .001, .008));
    out.lerp(pink, inside * .85);
  }));
  const ears: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeometry, furMaterial); ear.position.set(-.012, .044, side * .044);
    ear.rotation.set(side * .42, side * -.2, .1); ear.receiveShadow = true; head.add(ear); ears.push(ear);
  }
  const at = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) =>
    surfacePoint(headSdf, new THREE.Vector3(ox, oy, oz), new THREE.Vector3(dx, dy, dz));

  const closed = new THREE.Group(), open = new THREE.Group(); head.add(closed, open);
  const lidGeometry = add(new THREE.TorusGeometry(.012, .0028, 8, 16, Math.PI));
  const sphere = add(new THREE.SphereGeometry(1, 20, 14));
  for (const side of [-1, 1]) {
    const { point, normal } = at(0, .008, 0, .8, .18, side * .52);
    // Sleeping: a soft downward arc. Awake: a glossy almond eye with a slit pupil and a glint.
    const lid = alignToSurface(new THREE.Mesh(lidGeometry, dark), point.clone().addScaledVector(normal, .001), normal);
    lid.rotateZ(Math.PI); closed.add(lid);
    const socket = alignToSurface(new THREE.Group(), point.clone().addScaledVector(normal, -.0055), normal); open.add(socket);
    const ball = new THREE.Mesh(sphere, eye); ball.scale.set(.0155, .016, .009); socket.add(ball);
    const pupil = new THREE.Mesh(sphere, dark); pupil.scale.set(.0045, .012, .004); pupil.position.z = .0065; socket.add(pupil);
    const shine = new THREE.Mesh(sphere, glint); shine.scale.setScalar(.0028); shine.position.set(.004, .006, .009); socket.add(shine);
  }
  {
    const { point, normal } = at(0, -.008, 0, 1, .02, 0);
    const tip = alignToSurface(new THREE.Mesh(sphere, nose), point, normal); tip.scale.set(.011, .007, .006); head.add(tip);
  }
  // Whiskers fan out from the muzzle pads.
  const whiskerPoints: number[] = [];
  for (const side of [-1, 1]) {
    const { point } = at(.055, -.024, side * .012, .25, .05, side);
    for (let i = 0; i < 3; i++) {
      const a = (i - 1) * .16;
      whiskerPoints.push(point.x, point.y, point.z, point.x + .022 - Math.abs(a) * .04, point.y + a * .14 - .004, point.z + side * .048);
    }
  }
  const whiskerGeometry = add(new THREE.BufferGeometry());
  whiskerGeometry.setAttribute('position', new THREE.Float32BufferAttribute(whiskerPoints, 3));
  const whiskerMaterial = new THREE.LineBasicMaterial({ color: '#f6f2e9', transparent: true, opacity: .6 }); materials.push(whiskerMaterial);
  head.add(new THREE.LineSegments(whiskerGeometry, whiskerMaterial));

  // Collar with a small bell under the chin.
  const ring = new THREE.Mesh(add(new THREE.TorusGeometry(.064, .008, 10, 40)), collarMat);
  ring.position.set(.11, .085, .02); ring.rotation.set(0, Math.PI / 2, .55); group.add(ring);
  const bellMesh = new THREE.Mesh(sphere, bell); bellMesh.scale.setScalar(.013); bellMesh.position.set(.155, .04, .03); group.add(bellMesh);

  // Tail: a tapered tube whose spine is re-integrated each frame, so it curls and swishes smoothly.
  const RINGS = 48, SIDES = 14;
  // Rings bunch up toward the tip so its rounded cap stays smooth.
  const ringT = (r: number) => 1 - (1 - r / (RINGS - 1)) ** 1.7;
  const tailGeometry = add(new THREE.BufferGeometry());
  const tailPositions = new Float32Array(RINGS * SIDES * 3), tailNormals = new Float32Array(RINGS * SIDES * 3), tailColors = new Float32Array(RINGS * SIDES * 3);
  const index: number[] = [];
  for (let r = 0; r < RINGS - 1; r++) for (let s = 0; s < SIDES; s++) {
    const a = r * SIDES + s, b = r * SIDES + (s + 1) % SIDES, c = a + SIDES, d = b + SIDES;
    index.push(a, b, c, b, d, c);
  }
  const color = new THREE.Color();
  for (let r = 0; r < RINGS; r++) {
    const t = ringT(r);
    for (let s = 0; s < SIDES; s++) {
      const up = Math.cos(s / SIDES * Math.PI * 2);
      color.copy(fur).lerp(back, smooth(up, -.2, .8) * .35 + smooth(Math.sin(t * 34), .3, .9) * .35 + smooth(t, .85, 1) * .4);
      color.toArray(tailColors, (r * SIDES + s) * 3);
    }
  }
  tailGeometry.setIndex(index);
  tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3).setUsage(THREE.DynamicDrawUsage));
  tailGeometry.setAttribute('normal', new THREE.BufferAttribute(tailNormals, 3).setUsage(THREE.DynamicDrawUsage));
  tailGeometry.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));
  const tailMesh = furMesh(tailGeometry, group);
  tailMesh.frustumCulled = false;
  const radius = (t: number) => .023 * (1 - .3 * t) * Math.sqrt(Math.max(0, 1 - (Math.max(0, t - .92) / .08) ** 2)) + .0005;
  // The spine follows an ellipse hugging the body, from the rump round the near side to the paws.
  const spine = new THREE.Vector3(), ahead = new THREE.Vector3();
  const along = (t: number, swish: number, out: THREE.Vector3) => {
    const a = Math.PI * 1.1 - t * Math.PI * .88, reach = (.72 + .28 * smooth(t, 0, .22)) * (1 + swish * t * t);
    return out.set(-.01 + Math.cos(a) * .2 * reach, 0, Math.sin(a) * .15 * reach);
  };
  function shapeTail(swish: number, lift: number) {
    for (let r = 0; r < RINGS; r++) {
      const t = ringT(r), rad = radius(t);
      const y = rad + .045 * (1 - smooth(t, 0, .28)) + lift * t * t * t;
      along(t, swish, spine); along(t + .01, swish, ahead).sub(spine).normalize();
      const x = spine.x, z = spine.z, tx = ahead.x, tz = ahead.z;
      for (let s = 0; s < SIDES; s++) {
        const a = s / SIDES * Math.PI * 2, ny = Math.cos(a), nh = Math.sin(a);
        const nx = -tz * nh, nz = tx * nh, i = (r * SIDES + s) * 3;
        tailNormals[i] = nx; tailNormals[i + 1] = ny; tailNormals[i + 2] = nz;
        tailPositions[i] = x + nx * rad; tailPositions[i + 1] = y + ny * rad; tailPositions[i + 2] = z + nz * rad;
      }
    }
    tailGeometry.attributes.position.needsUpdate = true; tailGeometry.attributes.normal.needsUpdate = true;
  }
  shapeTail(0, 0);
  tailGeometry.computeBoundingSphere();

  // A soft contact shadow grounds the cat on the table.
  const shadowTexture = contactShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#30504b', alphaMap: shadowTexture, transparent: true, opacity: .4, depthWrite: false });
  materials.push(shadowMaterial);
  const shadow = new THREE.Mesh(add(new THREE.PlaneGeometry(.56, .44)), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, .002, .04); shadow.renderOrder = 2; group.add(shadow);

  const targets = [bodyMesh, headMesh, tailMesh, ...ears];
  let wake = 0, wakeTarget = 0, twitchAt = -10;
  return {
    group,
    /** Whether a pointer ray hits the cat. */
    hit(raycaster: THREE.Raycaster) { return raycaster.intersectObjects(targets, false).length > 0; },
    twitch(time: number) { if (time - twitchAt > 1.2) twitchAt = time; },
    setAwake(awake: boolean) { wakeTarget = awake ? 1 : 0; },
    get awake() { return wakeTarget === 1; },
    update(time: number, dt: number, still: boolean) {
      wake = still ? wakeTarget : damp(wake, wakeTarget, 3.2, dt);
      const breathe = still ? 0 : Math.sin(time * 2.1) * (1 - wake);
      const twitch = still ? 0 : Math.max(0, 1 - (time - twitchAt) / .6);
      const flick = Math.sin((time - twitchAt) * 22) * twitch;
      body.scale.set(1 + wake * .03, 1 + breathe * .03 + wake * .08, 1 + breathe * .012);
      // Asleep: head tucked down on the paws. Awake: lifted and turned to the viewer.
      head.position.set(.15 + wake * .02, .1 + wake * .075 + breathe * .002, .02 + wake * .01);
      head.rotation.set(wake * -.12, wake * .4, -.28 + wake * .48);
      ears.forEach((ear, i) => { ear.rotation.z = .1 - wake * .08 + (i ? flick : -flick) * .3; });
      closed.visible = wake < .5; open.visible = wake >= .5;
      const swish = still ? 0 : Math.sin(time * (1.1 + wake * 2.2)) * (.06 + wake * .28) + flick * .35;
      shapeTail(swish, wake * .03);
      return wake > .001 && wake < .999;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); shadowTexture.dispose(); },
  };
}
