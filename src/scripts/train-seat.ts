import * as THREE from 'three';
import type { Kit } from './train-kit';
import { pillowGeometry } from './train-detail';

export interface SeatMaterials {
  shell: THREE.Material; fabric: THREE.Material; fabricLight: THREE.Material;
  seam: THREE.Material; wood: THREE.Material; metal: THREE.Material; linen: THREE.Material;
}

/**
 * An upholstered double bench: a crowned seat cushion, a channel-quilted back,
 * a linen headrest cover and wooden armrests. The seat faces local -z.
 */
export function buildBench(kit: Kit, m: SeatMaterials, parent: THREE.Object3D, x: number, z: number, facing: number) {
  const seat = new THREE.Group(); seat.position.set(x, 0, z); seat.rotation.y = facing; parent.add(seat);
  // Plinth and shell.
  kit.box(1.65, .23, .96, m.shell, 0, .46, 0, .09, seat);
  const shell = kit.box(1.7, 1.22, .2, m.shell, 0, 1.13, .46, .1, seat); shell.rotation.x = -.1;
  // Seat cushion with a soft crown and a piped front edge.
  kit.mesh(pillowGeometry(1.56, .2, .88, .09, .05), m.fabric, 0, .64, -.02, seat);
  kit.box(1.5, .016, .016, m.seam, 0, .7, -.465, .006, seat);
  // Three horizontal quilted channels on the back.
  const back = new THREE.Group(); back.position.set(0, 1.12, .33); back.rotation.x = -.1; seat.add(back);
  for (let i = 0; i < 3; i++) {
    const y = -.33 + i * .33;
    kit.mesh(pillowGeometry(1.52, .31, .15, .07, .035, 'z'), m.fabricLight, 0, y, 0, back);
    if (i) kit.box(1.46, .014, .02, m.seam, 0, y - .165, -.07, .006, back);
  }
  // A linen cover over the headrest, as on long-distance trains.
  kit.mesh(pillowGeometry(1.2, .26, .13, .06, 0, 'z'), m.fabricLight, 0, 1.62, .22, seat).rotation.x = -.1;
  kit.box(.62, .2, .02, m.linen, -.31, 1.6, .135, .008, seat).rotation.x = -.1;
  kit.box(.62, .2, .02, m.linen, .31, 1.6, .135, .008, seat).rotation.x = -.1;
  for (const side of [-1, 1]) {
    kit.box(.11, .09, .8, m.wood, side * .86, .9, .04, .045, seat);
    kit.box(.035, .34, .05, m.metal, side * .86, .69, .32, .01, seat);
    kit.box(.065, .44, .65, m.metal, side * .55, .23, .04, .015, seat);
  }
  return seat;
}
