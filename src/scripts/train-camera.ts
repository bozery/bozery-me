import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Camera rig for the carriage: curved travel between framings, a gentle rail sway
 * while riding, and a damped parallax that follows the mouse.
 */
export function createCameraRig(camera: THREE.PerspectiveCamera, reduced: () => boolean) {
  const position = new THREE.Vector3(), look = new THREE.Vector3(), orientation = new THREE.Quaternion();
  const from = { position: new THREE.Vector3(), look: new THREE.Vector3(), orientation: new THREE.Quaternion() };
  const to = { position: new THREE.Vector3(), look: new THREE.Vector3(), orientation: new THREE.Quaternion() };
  const control = new THREE.Vector3();
  const pointer = new THREE.Vector2(), drift = new THREE.Vector2();
  const offset = new THREE.Vector3(), tilt = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const matrix = new THREE.Matrix4();
  let start = 0, duration = 0;

  const orient = (target: THREE.Quaternion, p: THREE.Vector3, l: THREE.Vector3) => target.setFromRotationMatrix(matrix.lookAt(p, l, UP));
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') pointer.set(event.clientX / innerWidth * 2 - 1, event.clientY / innerHeight * 2 - 1);
  };
  const onLeave = () => pointer.set(0, 0);
  addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  /** Jump straight to a framing. */
  function set(p: THREE.Vector3, l: THREE.Vector3) {
    position.copy(p); look.copy(l); orient(orientation, p, l); to.position.copy(p); to.look.copy(l); to.orientation.copy(orientation); duration = 0;
  }

  /**
   * Travel to a framing along an arc. The midpoint is pulled toward the aisle and
   * lifted slightly, so the camera rises over seat backs instead of cutting through them.
   */
  function travel(p: THREE.Vector3, l: THREE.Vector3, now: number, length?: number) {
    if (reduced()) { set(p, l); return; }
    from.position.copy(position); from.look.copy(look); from.orientation.copy(orientation);
    to.position.copy(p); to.look.copy(l); orient(to.orientation, p, l);
    const distance = from.position.distanceTo(p);
    const turn = from.orientation.angleTo(to.orientation);
    control.addVectors(from.position, p).multiplyScalar(.5);
    control.x *= .45;
    control.y += Math.min(distance * .07, .32);
    start = now;
    duration = length ?? THREE.MathUtils.clamp(1.25 + distance * .16 + turn * .35, 1.5, 2.7);
  }

  /** Retarget the current destination, e.g. after a resize, without restarting the move. */
  function retarget(p: THREE.Vector3, l: THREE.Vector3) {
    if (!duration || reduced()) { set(p, l); return; }
    to.position.copy(p); to.look.copy(l); orient(to.orientation, p, l);
  }

  function update(now: number, dt: number) {
    if (duration) {
      const t = Math.min((now - start) / duration, 1), e = smootherstep(t), u = 1 - e;
      // Quadratic Bézier through the aisle control point.
      position.copy(from.position).multiplyScalar(u * u).addScaledVector(control, 2 * u * e).addScaledVector(to.position, e * e);
      look.lerpVectors(from.look, to.look, e);
      orientation.slerpQuaternions(from.orientation, to.orientation, e);
      if (t === 1) duration = 0;
    }
    camera.position.copy(position); camera.quaternion.copy(orientation);
    if (reduced()) return duration > 0;
    // Damped mouse parallax: a small shift and turn toward the pointer.
    drift.lerp(pointer, 1 - Math.exp(-dt * 2.4));
    offset.set(drift.x * .06, -drift.y * .035, 0).applyQuaternion(orientation);
    camera.position.add(offset);
    // Rail sway: slow lateral roll, fine vertical vibration and a rare joint bump.
    const bump = Math.max(0, Math.sin(now * .53)) ** 40 * .006;
    camera.position.y += Math.sin(now * 2.3) * .0025 + Math.sin(now * 6.1) * .0008 + bump;
    euler.set(-drift.y * .018, -drift.x * .03, Math.sin(now * .8) * .0035 + Math.sin(now * 1.9) * .001);
    camera.quaternion.multiply(tilt.setFromEuler(euler));
    return duration > 0;
  }

  return {
    set, travel, retarget, update,
    get moving() { return duration > 0; },
    state: () => ({ position: position.toArray(), look: look.toArray(), orientation: orientation.toArray() }),
    dispose() { removeEventListener('pointermove', onPointer); document.removeEventListener('pointerleave', onLeave); },
  };
}
