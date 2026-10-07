import * as THREE from 'three';
import type { Companion } from '../data/companion';
import { contactShadowTexture } from './train-detail';
import { alignToSurface, blend, ellipsoid, roundCone, sdfGeometry, smax, smin, surfacePoint, type Sdf } from './sdf';
import { damp, mottle, plushMaterial, plushTube, seam, stitch } from './train-plush';

const smooth = THREE.MathUtils.smoothstep;

// Body: a curled loaf with a rounded haunch, a soft chest and tucked paws. Local +x is the head direction.
const chest = ellipsoid(.09, .07, .025, .085, .065, .085);
const paws = blend(.012, ellipsoid(.17, .022, .07, .052, .022, .03), ellipsoid(.155, .022, -.02, .05, .022, .03));
const bodySdf: Sdf = seam((x, y, z) => {
  let d = blend(.05,
    ellipsoid(0, .09, 0, .15, .09, .12),
    ellipsoid(-.08, .092, -.02, .105, .095, .11),
    chest)(x, y, z);
  d = smin(d, paws(x, y, z), .03);
  return smax(d, -y, .012);
}, 'z');

// Head: a round skull with full cheeks, a small muzzle and chin. Ears are separate so they can twitch.
const muzzle = blend(.012, ellipsoid(.064, -.024, .017, .027, .022, .024), ellipsoid(.064, -.024, -.017, .027, .022, .024), ellipsoid(.052, -.043, 0, .028, .016, .024));
const headSdf: Sdf = seam((x, y, z) => {
  const d = blend(.025,
    ellipsoid(0, .004, 0, .074, .066, .084),
    ellipsoid(.02, -.024, .036, .055, .042, .046),
    ellipsoid(.02, -.024, -.036, .055, .042, .046))(x, y, z);
  return smin(d, muzzle(x, y, z), .014);
}, 'z', .004, .0025);

// Ear: a flattened cone along +y with a cupped front; its base sinks into the head.
const earOuter = roundCone(.04, .007, -.02, .046, 2.2);
const earInner = roundCone(.028, .003, -.006, .04, 2.2, .012);
const earSdf: Sdf = (x, y, z) => smax(earOuter(x, y, z), -earInner(x, y, z), .004);

/**
 * aqp, a small stuffed-toy grey cat curled up asleep. It breathes while asleep, twitches its
 * ears and tail when hovered and lifts its head when woken.
 */
export function createTrainCat(colors: Companion['colors']) {
  const group = new THREE.Group(); group.name = 'companion-cat';
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const fur = new THREE.Color(colors.fur), back = new THREE.Color(colors.stripes), light = new THREE.Color(colors.belly), pink = new THREE.Color(colors.accent);
  const furMaterial = plushMaterial();
  const thread = (out: THREE.Color, w: number) => out.lerp(back, w * .7);
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
    if (p.y > .06) thread(out, stitch(p.z, p.x));
    mottle(out, p.x, p.y, p.z);
  }), body);

  // Head, with face details placed on its surface.
  const head = new THREE.Group(); head.position.set(.15, .1, .02); head.rotation.order = 'YZX'; head.scale.setScalar(1.1); group.add(head);
  const headMesh = furMesh(sdfGeometry(headSdf, new THREE.Vector3(.01, -.005, 0), .11, 44, (p, n, out) => {
    tabby(p, n, out, -p.x * 70 + Math.abs(p.z) * 30);
    out.lerp(light, 1 - smooth(muzzle(p.x, p.y, p.z), -.002, .008));
    if (p.y > .01 && p.x < .05) thread(out, stitch(p.z, Math.atan2(p.y, p.x) * .07));
    mottle(out, p.x, p.y, p.z);
  }), head);
  const earGeometry = add(sdfGeometry(earSdf, new THREE.Vector3(0, .02, 0), .05, 28, (p, n, out) => {
    out.copy(fur).lerp(back, .35);
    const inside = smooth(n.x, 0, .5) * (1 - smooth(earInner(p.x, p.y, p.z), .001, .008));
    out.lerp(pink, inside * .85);
    mottle(out, p.x, p.y, p.z);
  }));
  const ears: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeometry, furMaterial); ear.position.set(-.012, .044, side * .044);
    ear.rotation.set(side * .42, side * -.2, .1); ear.receiveShadow = true; head.add(ear); ears.push(ear);
  }
  const at = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) =>
    surfacePoint(headSdf, new THREE.Vector3(ox, oy, oz), new THREE.Vector3(dx, dy, dz));

  // Three faces: asleep, happy (smiling eyes, blush and a small ω mouth) and curious (open eyes).
  const closed = new THREE.Group(), open = new THREE.Group(), happy = new THREE.Group(), smile = new THREE.Group();
  head.add(closed, open, happy, smile);
  const lidGeometry = add(new THREE.TorusGeometry(.012, .0028, 8, 16, Math.PI));
  const happyGeometry = add(new THREE.TorusGeometry(.0125, .0036, 8, 20, Math.PI));
  const blushMaterial = new THREE.MeshBasicMaterial({ color: colors.accent, transparent: true, opacity: .6, depthWrite: false });
  materials.push(blushMaterial);
  const sphere = add(new THREE.SphereGeometry(1, 20, 14));
  const sockets: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const { point, normal } = at(0, .008, 0, .8, .18, side * .52);
    // Sleeping: a soft downward arc. Awake: a glossy almond eye with a slit pupil and a glint.
    const lid = alignToSurface(new THREE.Mesh(lidGeometry, dark), point.clone().addScaledVector(normal, .001), normal);
    lid.rotateZ(Math.PI); closed.add(lid);
    // Happy: an upturned arc, like ^ ^.
    const arc = alignToSurface(new THREE.Mesh(happyGeometry, dark), point.clone().addScaledVector(normal, .0015), normal);
    arc.position.y -= .004; arc.scale.y = .85; happy.add(arc);
    const cheek = at(0, -.01, 0, .62, -.32, side * .74);
    const blush = alignToSurface(new THREE.Mesh(add(new THREE.CircleGeometry(.0105, 24)), blushMaterial), cheek.point.addScaledVector(cheek.normal, .0012), cheek.normal);
    blush.scale.set(1.5, 1, 1); smile.add(blush);
    const socket = alignToSurface(new THREE.Group(), point.clone().addScaledVector(normal, -.0055), normal); open.add(socket); sockets.push(socket);
    const ball = new THREE.Mesh(sphere, eye); ball.scale.set(.0155, .016, .009); socket.add(ball);
    const pupil = new THREE.Mesh(sphere, dark); pupil.scale.set(.0045, .012, .004); pupil.position.z = .0065; socket.add(pupil);
    const shine = new THREE.Mesh(sphere, glint); shine.scale.setScalar(.0028); shine.position.set(.004, .006, .009); socket.add(shine);
  }
  {
    const { point, normal } = at(0, -.008, 0, 1, .02, 0);
    const tip = alignToSurface(new THREE.Mesh(sphere, nose), point, normal); tip.scale.set(.011, .007, .006); head.add(tip);
    // ω mouth: two small arcs under the nose.
    const mouthGeometry = add(new THREE.TorusGeometry(.0062, .0017, 6, 14, Math.PI));
    for (const side of [-1, 1]) {
      const m = at(0, -.022, side * .006, 1, -.05, 0);
      const arc = alignToSurface(new THREE.Mesh(mouthGeometry, dark), m.point.addScaledVector(m.normal, .0012), m.normal);
      arc.rotateZ(Math.PI); smile.add(arc);
    }
  }

  // Collar with a small bell under the chin.
  const ring = new THREE.Mesh(add(new THREE.TorusGeometry(.064, .008, 10, 40)), collarMat);
  ring.position.set(.11, .085, .02); ring.rotation.set(0, Math.PI / 2, .55); group.add(ring);
  // A little sewn-in label on the rump, as on any stuffed toy.
  {
    const { point, normal } = surfacePoint(bodySdf, new THREE.Vector3(-.08, .07, .02), new THREE.Vector3(-1, -.1, .55));
    const tag = alignToSurface(new THREE.Mesh(add(new THREE.BoxGeometry(.026, .034, .002)), mat('#f4efe4', .9)), point.addScaledVector(normal, .001), normal);
    tag.rotateZ(.25); group.add(tag);
  }
  const bellMesh = new THREE.Mesh(sphere, bell); bellMesh.scale.setScalar(.013); bellMesh.position.set(.155, .04, .03); group.add(bellMesh);

  // Tail: a tapered tube whose spine curls round the near side of the body toward the paws.
  const tail = plushTube(furMaterial, {
    radius: t => .023 * (1 - .3 * t) * Math.sqrt(Math.max(0, 1 - (Math.max(0, t - .92) / .08) ** 2)) + .0005,
    color: (t, up, around, out) => {
      out.copy(fur).lerp(back, smooth(up, -.2, .8) * .35 + smooth(Math.sin(t * 34), .3, .9) * .35 + smooth(t, .85, 1) * .4);
      mottle(out, t * .38, up * .02, Math.sin(around) * .02);
    },
  });
  geometries.push(tail.geometry); group.add(tail.mesh);
  const tailMesh = tail.mesh;
  function shapeTail(swish: number, lift: number) {
    tail.shape((t, out) => {
      const a = Math.PI * 1.1 - t * Math.PI * .88, reach = (.72 + .28 * smooth(t, 0, .22)) * (1 + swish * t * t);
      const rad = .023 * (1 - .3 * t);
      out.set(-.01 + Math.cos(a) * .2 * reach, rad + .045 * (1 - smooth(t, 0, .28)) + lift * t * t * t, Math.sin(a) * .15 * reach);
    });
  }
  shapeTail(0, 0);
  tail.geometry.computeBoundingSphere();

  // A soft contact shadow grounds the cat on the table.
  const shadowTexture = contactShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#30504b', alphaMap: shadowTexture, transparent: true, opacity: .4, depthWrite: false });
  materials.push(shadowMaterial);
  const shadow = new THREE.Mesh(add(new THREE.PlaneGeometry(.56, .44)), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, .002, .04); shadow.renderOrder = 2; group.add(shadow);

  const targets = [bodyMesh, headMesh, tailMesh, ...ears];
  let wake = 0, wakeTarget = 0, twitchAt = -10, yaw = 0, pitch = 0;
  const viewer = new THREE.Vector3();
  /**
   * While awake the cat keeps its eyes on the viewer, but every few seconds it
   * glances out of the window or down at the table before looking back.
   */
  const glances = [[0, 0, 2.6], [.75, .12, 1.1], [0, 0, 2.2], [-.55, -.22, .9], [0, 0, 1.8], [.35, .3, .8]];
  const cycle = glances.reduce((sum, g) => sum + g[2], 0);
  const glance = (time: number) => {
    let t = time % cycle;
    for (const g of glances) { if (t < g[2]) return g; t -= g[2]; }
    return glances[0];
  };
  return {
    group,
    /** Whether a pointer ray hits the cat. */
    hit(raycaster: THREE.Raycaster) { return raycaster.intersectObjects(targets, false).length > 0; },
    twitch(time: number) { if (time - twitchAt > 1.2) twitchAt = time; },
    setAwake(awake: boolean) { wakeTarget = awake ? 1 : 0; },
    get awake() { return wakeTarget === 1; },
    /** `camera` is the viewer's world position; the awake cat turns its head toward it. */
    update(time: number, dt: number, still: boolean, camera?: THREE.Vector3) {
      wake = still ? wakeTarget : damp(wake, wakeTarget, 3.2, dt);
      // An ear flick now and then, asleep or awake, so the cat never looks frozen.
      if (!still && time - twitchAt > 6.5) twitchAt = time;
      const breathe = still ? 0 : Math.sin(time * 2.1) * (1 - wake);
      const twitch = still ? 0 : Math.max(0, 1 - (time - twitchAt) / .6);
      const flick = Math.sin((time - twitchAt) * 22) * twitch;
      body.scale.set(1 + wake * .03, 1 + breathe * .03 + wake * .08, 1 + breathe * .012);
      // Asleep: head tucked down on the paws. Awake: lifted and turned to the viewer.
      head.position.set(.15 + wake * .02, .1 + wake * .075 + breathe * .002, .02 + wake * .01);
      let lookYaw = .4, lookPitch = .2;
      if (camera) {
        group.updateWorldMatrix(true, false);
        viewer.copy(camera); group.worldToLocal(viewer).sub(head.position);
        lookYaw = THREE.MathUtils.clamp(Math.atan2(-viewer.z, viewer.x), -1.2, 1.2);
        lookPitch = THREE.MathUtils.clamp(Math.atan2(viewer.y, Math.hypot(viewer.x, viewer.z)), -.4, .5);
      }
      // Smiling while it looks at the viewer; wide-eyed while it glances around.
      let curious = false;
      if (!still) { const [gy, gp] = glance(time); lookYaw += gy; lookPitch += gp; curious = gy !== 0; }
      yaw = still ? lookYaw : damp(yaw, lookYaw, 5, dt); pitch = still ? lookPitch : damp(pitch, lookPitch, 5, dt);
      // A slow head tilt keeps the awake pose from looking frozen.
      const tilt = still ? 0 : Math.sin(time * .9) * .07;
      head.rotation.set(wake * (tilt - .06), wake * yaw, -.28 * (1 - wake) + wake * pitch);
      // Blink every few seconds while awake.
      const blink = still ? 1 : 1 - Math.max(0, 1 - Math.abs((time % 3.7) - 3.55) / .09);
      sockets.forEach(socket => { socket.scale.y = Math.max(.08, blink); });
      ears.forEach((ear, i) => { ear.rotation.z = .1 - wake * .08 + (i ? flick : -flick) * .3; });
      closed.visible = wake < .5; smile.visible = !closed.visible;
      open.visible = smile.visible && curious; happy.visible = smile.visible && !curious;
      // A small happy bob while smiling.
      if (happy.visible && !still) head.position.y += Math.abs(Math.sin(time * 4.2)) * .004;
      const swish = still ? 0 : Math.sin(time * (1.1 + wake * 2.2)) * (.06 + wake * .28) + flick * .35;
      shapeTail(swish, wake * .03);
      return wake > .001 && wake < .999;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); shadowTexture.dispose(); },
  };
}
