import * as THREE from 'three';
import type { Buddy } from '../data/companion';
import { contactShadowTexture } from './train-detail';
import { blend, ellipsoid, sdfGeometry, smax, smin, type Sdf } from './sdf';
import { damp, mottle, placeOn, plushMaterial, plushTube, seam, stitch } from './train-plush';

const smooth = THREE.MathUtils.smoothstep;

// Body: lying down like a sphinx, front legs stretched forward. Local +x is the head direction.
const legs = blend(.015, ellipsoid(.16, .028, .045, .085, .028, .032), ellipsoid(.16, .028, -.045, .085, .028, .032));
const feet = blend(.015, ellipsoid(-.07, .02, .088, .06, .02, .028), ellipsoid(-.07, .02, -.088, .06, .02, .028));
const bodySdf: Sdf = seam((x, y, z) => {
  let d = blend(.05,
    ellipsoid(-.02, .082, 0, .16, .078, .098),
    ellipsoid(.09, .092, 0, .08, .088, .082),
    ellipsoid(-.11, .07, .052, .075, .068, .052),
    ellipsoid(-.11, .07, -.052, .075, .068, .052))(x, y, z);
  d = smin(d, smin(legs(x, y, z), feet(x, y, z), .01), .03);
  return smax(d, -y, .012);
}, 'z');

// Head: a domed skull with the beagle's long, soft muzzle and jowls.
const muzzle = blend(.02, ellipsoid(.07, -.028, 0, .064, .04, .046), ellipsoid(.058, -.05, 0, .042, .02, .036));
const skull = seam(ellipsoid(0, .01, 0, .07, .066, .07), 'z', .004, .0025);
const headSdf: Sdf = (x, y, z) => smin(skull(x, y, z), muzzle(x, y, z), .03);

// Long floppy ear: a flat, rounded leaf hanging from its top edge.
const earSdf: Sdf = (x, y, z) => smin(ellipsoid(0, -.055, 0, .042, .07, .015)(x, y, z), ellipsoid(0, -.11, 0, .034, .024, .013)(x, y, z), .02);

/**
 * A stuffed-toy beagle lying beside the cat. It watches the viewer, glances at
 * the cat now and then, and cheers up (wagging, ears flapping) when clicked.
 */
/** `lean` tilts the head toward local +z (positive) or -z (negative), e.g. onto a neighbour. */
export function createTrainDog(colors: Buddy['colors'], { lean = 0 } = {}) {
  const group = new THREE.Group(); group.name = 'companion-dog';
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const tan = new THREE.Color(colors.tan), saddle = new THREE.Color(colors.saddle), white = new THREE.Color(colors.white), earColor = new THREE.Color(colors.ear);
  const fabric = plushMaterial(); materials.push(fabric);
  const mat = (color: string, roughness = .5, metalness = 0) => { const m = new THREE.MeshStandardMaterial({ color, roughness, metalness }); materials.push(m); return m; };
  const dark = mat('#2a221e', .45), button = mat('#241c18', .15), noseMat = mat(colors.nose, .35), tongueMat = mat(colors.tongue, .6);
  const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' }), blushMaterial = new THREE.MeshBasicMaterial({ color: colors.accent, transparent: true, opacity: .55, depthWrite: false });
  materials.push(glint, blushMaterial);
  const add = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
  const plush = (g: THREE.BufferGeometry, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(add(g), fabric); mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const thread = (out: THREE.Color, w: number) => out.lerp(saddle, w * .5);

  // Tricolour coat: tan with a dark saddle on the back; white chest, legs and belly.
  const body = new THREE.Group(); group.add(body);
  const bodyMesh = plush(sdfGeometry(bodySdf, new THREE.Vector3(.02, .1, 0), .26, 56, (p, n, out) => {
    out.copy(tan);
    const saddleW = smooth(n.y, .3, .5) * smooth(p.x, -.19, -.16) * (1 - smooth(p.x, .03, .06)) * smooth(p.y, .085, .1);
    out.lerp(saddle, saddleW);
    const bib = smooth(p.x, .1, .16) * (1 - smooth(n.y, .3, .8));
    const low = 1 - smooth(p.y, .035, .06);
    out.lerp(white, Math.max(bib, low, 1 - smooth(legs(p.x, p.y, p.z), -.004, .01)));
    if (p.y > .07) thread(out, stitch(p.z, p.x));
    mottle(out, p.x, p.y, p.z);
  }), body);

  const head = new THREE.Group(); head.position.set(.15, .175, 0); head.rotation.order = 'YZX'; head.scale.setScalar(1.12); group.add(head);
  const headMesh = plush(sdfGeometry(headSdf, new THREE.Vector3(.04, -.01, 0), .125, 48, (p, n, out) => {
    out.copy(tan);
    // White muzzle with a blaze running up the forehead.
    const blaze = (1 - smooth(Math.abs(p.z), .008, .016)) * smooth(p.x, .02, .05) * smooth(n.x, -.2, .3);
    out.lerp(white, Math.max(1 - smooth(muzzle(p.x, p.y, p.z), -.004, .006), blaze));
    if (p.y > .02 && p.x < .03) thread(out, stitch(p.z, Math.atan2(p.y, p.x) * .07));
    mottle(out, p.x, p.y, p.z);
  }), head);
  const earGeometry = add(sdfGeometry(earSdf, new THREE.Vector3(0, -.06, 0), .07, 30, (p, n, out) => {
    out.copy(earColor).lerp(saddle, smooth(p.y, -.12, -.02) * .2);
    mottle(out, p.x, p.y, p.z);
  }));
  const ears: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(earGeometry, fabric); ear.position.set(-.008, .042, side * .076);
    ear.rotation.set(side * .34, side * -.25, .1); ear.receiveShadow = true; head.add(ear); ears.push(ear);
  }

  // Faces: glossy button eyes while watching, ^ ^ eyes with blush and a tongue when cheering.
  const open = new THREE.Group(), happy = new THREE.Group(), cheerFace = new THREE.Group(); head.add(open, happy, cheerFace);
  const sphere = add(new THREE.SphereGeometry(1, 20, 14));
  const happyGeometry = add(new THREE.TorusGeometry(.012, .0034, 8, 20, Math.PI));
  const blushGeometry = add(new THREE.CircleGeometry(.0105, 24));
  const sockets: THREE.Object3D[] = [];
  for (const side of [-1, 1]) {
    const socket = placeOn(new THREE.Group(), headSdf, [0, .012, 0], [.78, .2, side * .55], -.004); open.add(socket); sockets.push(socket);
    const ball = new THREE.Mesh(sphere, button); ball.scale.set(.0125, .0135, .008); socket.add(ball);
    const shine = new THREE.Mesh(sphere, glint); shine.scale.setScalar(.0026); shine.position.set(.0035, .005, .008); socket.add(shine);
    const arc = placeOn(new THREE.Mesh(happyGeometry, dark), headSdf, [0, .012, 0], [.78, .2, side * .55], .0015);
    arc.position.y -= .003; arc.scale.y = .85; happy.add(arc);
    const blush = placeOn(new THREE.Mesh(blushGeometry, blushMaterial), headSdf, [.02, -.02, 0], [.3, -.2, side], .0012);
    blush.scale.set(1.5, 1, 1); cheerFace.add(blush);
  }
  const nose = placeOn(new THREE.Mesh(sphere, noseMat), headSdf, [0, -.012, 0], [1, .12, 0]);
  nose.scale.set(.016, .011, .01); head.add(nose);
  const tongue = placeOn(new THREE.Mesh(sphere, tongueMat), headSdf, [.05, -.04, 0], [.55, -.85, 0], .003);
  tongue.scale.set(.011, .017, .005); cheerFace.add(tongue);

  // Red collar with a little gold tag.
  const collar = new THREE.Mesh(add(new THREE.TorusGeometry(.066, .009, 10, 40)), mat(colors.collar, .6));
  collar.position.set(.12, .14, 0); collar.rotation.set(0, Math.PI / 2, .7); group.add(collar);
  const tag = new THREE.Mesh(add(new THREE.CylinderGeometry(.012, .012, .003, 20)), mat('#e3c46b', .3, .6));
  tag.position.set(.172, .1, 0); tag.rotation.set(0, 0, Math.PI / 2 - .45); group.add(tag);

  // Tail: held up behind the rump, white at the tip.
  const tail = plushTube(fabric, {
    rings: 32, sides: 12,
    radius: t => .017 * (1 - .35 * t) * Math.sqrt(Math.max(0, 1 - (Math.max(0, t - .88) / .12) ** 2)) + .0005,
    color: (t, up, around, out) => { out.copy(saddle).lerp(tan, (1 - smooth(up, -.6, .4)) * .5).lerp(white, smooth(t, .68, .76)); mottle(out, t * .15, up * .02, around * .003); },
  });
  geometries.push(tail.geometry); group.add(tail.mesh);
  let wag = 0;
  const shapeTail = () => tail.shape((t, out) => {
    const lift = Math.sin(t * 1.4) * .13;
    out.set(-.165 - t * .06 + Math.sin(t * 2.2) * .01, .1 + lift, wag * t * t * .06);
  });
  shapeTail(); tail.geometry.computeBoundingSphere();

  // A soft contact shadow grounds it on the table.
  const shadowTexture = contactShadowTexture();
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: '#30504b', alphaMap: shadowTexture, transparent: true, opacity: .4, depthWrite: false });
  materials.push(shadowMaterial);
  const shadow = new THREE.Mesh(add(new THREE.PlaneGeometry(.58, .36)), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(.02, .002, 0); shadow.renderOrder = 2; group.add(shadow);

  const targets = [bodyMesh, headMesh, tail.mesh, ...ears];
  const viewer = new THREE.Vector3(), friend = new THREE.Vector3();
  let cheerAt = -10, twitchAt = -10, yaw = 0, pitch = 0, wagPhase = 0;
  const aim = (target: THREE.Vector3, into: THREE.Vector3) => {
    into.copy(target); group.worldToLocal(into).sub(head.position);
    return [THREE.MathUtils.clamp(Math.atan2(-into.z, into.x), -1.2, 1.2), THREE.MathUtils.clamp(Math.atan2(into.y, Math.hypot(into.x, into.z)), -.5, .4)];
  };
  return {
    group,
    hit(raycaster: THREE.Raycaster) { return raycaster.intersectObjects(targets, false).length > 0; },
    twitch(time: number) { if (time - twitchAt > 1.2) twitchAt = time; },
    /** A few happy seconds: smiling, tongue out, wagging hard. */
    cheer(time: number) { cheerAt = time; },
    /** `camera` is the viewer's world position; `cat` lets the dog glance at its friend. */
    update(time: number, dt: number, still: boolean, camera?: THREE.Vector3, cat?: THREE.Vector3) {
      const cheer = still ? (time - cheerAt < 3 ? 1 : 0) : Math.max(0, Math.min(1, (cheerAt + 3 - time) / .5));
      if (!still && time - twitchAt > 5.3) twitchAt = time;
      const twitch = still ? 0 : Math.max(0, 1 - (time - twitchAt) / .6);
      const flick = Math.sin((time - twitchAt) * 20) * twitch;
      group.updateWorldMatrix(true, false);
      let [lookYaw, lookPitch] = camera ? aim(camera, viewer) : [.3, .1];
      // Every so often it turns to check on the cat.
      const atFriend = !still && cat && cheer < .5 && (time % 9) > 6.3;
      if (atFriend) [lookYaw, lookPitch] = aim(cat!, friend);
      yaw = still ? lookYaw : damp(yaw, lookYaw, 4, dt); pitch = still ? lookPitch : damp(pitch, lookPitch, 4, dt);
      const breathe = still ? 0 : Math.sin(time * 1.8);
      body.scale.set(1, 1 + breathe * .02, 1 + breathe * .01);
      const bounce = still ? 0 : Math.abs(Math.sin(time * 6)) * .006 * cheer;
      head.position.y = .175 + breathe * .002 + bounce;
      // Leaning on its neighbour; cheering straightens it up a little and adds a happy wobble.
      const tilt = lean * (1 - cheer * .4) + (still ? 0 : Math.sin(time * .7) * .04 + Math.sin(time * 5) * .08 * cheer);
      head.position.z = lean * .08 * (1 - cheer * .4);
      head.rotation.set(tilt, yaw, pitch);
      ears.forEach((ear, i) => {
        const side = i ? 1 : -1, flap = still ? 0 : Math.sin(time * 9) * .25 * cheer;
        ear.rotation.x = side * (.34 + flap + flick * .12);
      });
      open.visible = cheer < .5; happy.visible = cheerFace.visible = !open.visible;
      // Blink every few seconds.
      const blink = still ? 1 : 1 - Math.max(0, 1 - Math.abs((time % 4.3) - 4.1) / .09);
      sockets.forEach(socket => { socket.scale.y = Math.max(.08, blink); });
      wagPhase += dt * (2.2 + cheer * 11);
      wag = still ? 0 : Math.sin(wagPhase) * (.5 + cheer * .7);
      shapeTail();
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); shadowTexture.dispose(); },
  };
}
