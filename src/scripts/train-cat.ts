import * as THREE from 'three';
import type { Companion } from '../data/companion';

const damp = (current: number, target: number, rate: number, dt: number) => THREE.MathUtils.lerp(current, target, 1 - Math.exp(-rate * dt));

/**
 * A small curled-up cat built from soft primitives. It breathes while asleep,
 * twitches when hovered and sits up when woken. Local +x is the head direction.
 */
export function createTrainCat(colors: Companion['colors']) {
  const group = new THREE.Group(); group.name = 'companion-cat';
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  const mat = (color: string, roughness = .92) => { const m = new THREE.MeshStandardMaterial({ color, roughness }); materials.push(m); return m; };
  const fur = mat(colors.fur), belly = mat(colors.belly), accent = mat(colors.accent), eye = mat(colors.eyes, .3);
  const dark = mat('#2f3a3a', .5), collar = mat(colors.collar, .7), bell = mat('#e3c46b', .35);
  const sphere = new THREE.SphereGeometry(1, 24, 16); geometries.push(sphere);
  const blob = (m: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(sphere, m); mesh.scale.set(sx, sy, sz); mesh.position.set(x, y, z);
    mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };

  // Body and paws.
  const body = new THREE.Group(); group.add(body);
  blob(fur, .17, .085, .11, 0, .085, 0, body);
  blob(belly, .12, .06, .08, .03, .07, .035, body);
  blob(fur, .075, .07, .075, -.11, .09, -.01, body);
  for (const z of [.055, -.035]) blob(belly, .045, .025, .03, .17, .025, z, body);

  // Head with ears, muzzle, nose and two sets of eyes (closed and open).
  const head = new THREE.Group(); head.position.set(.15, .1, .02); group.add(head);
  blob(fur, .085, .075, .08, 0, 0, 0, head);
  blob(belly, .04, .03, .045, .065, -.022, 0, head);
  blob(accent, .011, .008, .012, .1, -.008, 0, head);
  const earGeo = new THREE.ConeGeometry(.034, .06, 12); geometries.push(earGeo);
  const innerGeo = new THREE.ConeGeometry(.02, .04, 10); geometries.push(innerGeo);
  const ears: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const ear = new THREE.Group(); ear.position.set(-.005, .062, side * .045); ear.rotation.set(side * -.35, 0, -.15); head.add(ear);
    const outer = new THREE.Mesh(earGeo, fur); outer.position.y = .025; ear.add(outer);
    const inner = new THREE.Mesh(innerGeo, accent); inner.position.set(.008, .02, 0); ear.add(inner);
    ears.push(ear);
  }
  const closed = new THREE.Group(), open = new THREE.Group(); head.add(closed, open);
  const lidGeo = new THREE.TorusGeometry(.014, .003, 6, 12, Math.PI); geometries.push(lidGeo);
  for (const side of [-1, 1]) {
    const lid = new THREE.Mesh(lidGeo, dark); lid.position.set(.071, .012, side * .032); lid.rotation.set(0, Math.PI / 2 - side * .35, Math.PI); closed.add(lid);
    blob(eye, .016, .018, .014, .068, .014, side * .033, open);
    blob(dark, .006, .014, .006, .081, .014, side * .033, open);
  }
  // Collar with a small bell.
  const collarGeo = new THREE.TorusGeometry(.062, .01, 8, 24); geometries.push(collarGeo);
  const ring = new THREE.Mesh(collarGeo, collar); ring.position.set(.1, .07, .02); ring.rotation.set(0, Math.PI / 2, .5); group.add(ring);
  blob(bell, .014, .014, .014, .14, .02, .02, group);

  // Tail as a chain of joints so it can curl and swish.
  const tail: THREE.Group[] = [];
  let parent: THREE.Object3D = group;
  for (let i = 0; i < 9; i++) {
    const joint = new THREE.Group();
    if (i === 0) joint.position.set(-.16, .05, -.02); else joint.position.x = -.036;
    parent.add(joint); blob(i > 6 ? belly : fur, .024, .022 - i * .0012, .024 - i * .0012, -.018, 0, 0, joint);
    tail.push(joint); parent = joint;
  }
  group.traverse(o => { if (o instanceof THREE.Mesh) o.castShadow = false; });

  let wake = 0, wakeTarget = 0, twitchAt = -10;
  return {
    group,
    /** Whether a pointer ray hits the cat. */
    hit(raycaster: THREE.Raycaster) { return raycaster.intersectObject(group, true).length > 0; },
    twitch(time: number) { if (time - twitchAt > 1.2) twitchAt = time; },
    setAwake(awake: boolean) { wakeTarget = awake ? 1 : 0; },
    get awake() { return wakeTarget === 1; },
    update(time: number, dt: number, still: boolean) {
      wake = still ? wakeTarget : damp(wake, wakeTarget, 3.2, dt);
      const breathe = still ? 0 : Math.sin(time * 2.1) * (1 - wake);
      const twitch = still ? 0 : Math.max(0, 1 - (time - twitchAt) / .6);
      const flick = Math.sin((time - twitchAt) * 22) * twitch;
      body.scale.set(1 + wake * .06, 1 + breathe * .035 + wake * .1, 1);
      body.position.y = wake * .015;
      // Asleep: head tucked down on the paws. Awake: lifted and turned to the viewer.
      head.position.set(.15 + wake * .02, .1 + wake * .07, .02 + wake * .01);
      head.rotation.set(wake * -.15, wake * .35, -.25 + wake * .45 + breathe * .02);
      ears.forEach((ear, i) => { ear.rotation.z = -.15 + wake * .12 + (i ? flick : -flick) * .25; });
      closed.visible = wake < .5; open.visible = wake >= .5;
      // Curled tail around the body; it swishes when awake and flicks when hovered.
      const swish = still ? 0 : Math.sin(time * (1.2 + wake * 2.4)) * (.08 + wake * .25) + flick * .3;
      tail.forEach((joint, i) => { joint.rotation.y = (i ? .4 : -.15) + swish * (i / tail.length); joint.rotation.z = i ? .03 * wake : 0; });
      return wake > .001 && wake < .999;
    },
    dispose() { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); },
  };
}
