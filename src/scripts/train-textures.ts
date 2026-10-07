import * as THREE from 'three';

/** Small procedural canvas textures. Each is generated once and tiled. */
function canvasTexture(size: number, draw: (c: CanvasRenderingContext2D, size: number) => void, repeat: [number, number], srgb = true) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!; draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat);
  texture.anisotropy = 4; if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

let seed = 7;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function speckle(c: CanvasRenderingContext2D, size: number, count: number, alpha: number, dark = '#000', light = '#fff') {
  for (let i = 0; i < count; i++) {
    c.globalAlpha = alpha * random(); c.fillStyle = random() > .5 ? dark : light;
    c.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  c.globalAlpha = 1;
}

/** Pale vinyl planks running along the carriage. */
export function floorTexture(lengthMetres: number) {
  return canvasTexture(512, (c, s) => {
    c.fillStyle = '#c9c6b5'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = ['#cdcab9', '#c4c1af', '#cbc8b8', '#c6c3b1'][i]; c.fillRect(i * s / 4, 0, s / 4, s);
      c.fillStyle = '#a9a693'; c.fillRect(i * s / 4, 0, 2, s);
      c.fillRect(i * s / 4, ((i * 0.37) % 1) * s, s / 4, 2);
    }
    speckle(c, s, 9000, .12);
  }, [3, lengthMetres / 2]);
}

/** A teal aisle runner with a small woven diamond motif. */
export function runnerTexture(lengthMetres: number) {
  return canvasTexture(256, (c, s) => {
    c.fillStyle = '#3f8584'; c.fillRect(0, 0, s, s);
    c.strokeStyle = '#5a9d98'; c.lineWidth = 3;
    for (let y = 0; y < s; y += 32) for (let x = 0; x < s; x += 32) {
      c.beginPath(); c.moveTo(x + 16, y + 6); c.lineTo(x + 26, y + 16); c.lineTo(x + 16, y + 26); c.lineTo(x + 6, y + 16); c.closePath(); c.stroke();
    }
    c.fillStyle = '#e6dcc0'; c.fillRect(0, 0, 10, s); c.fillRect(s - 10, 0, 10, s);
    speckle(c, s, 5000, .18);
  }, [1, lengthMetres / 1.2]);
}

/** Soft, slightly clouded wood grain for tables and armrests. */
export function woodTexture() {
  return canvasTexture(256, (c, s) => {
    c.fillStyle = '#e6d6b3'; c.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      c.strokeStyle = random() > .5 ? '#d3bf96' : '#efe2c4'; c.globalAlpha = .35 + random() * .4; c.lineWidth = 1 + random() * 2;
      const y = random() * s; c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= s; x += 16) c.lineTo(x, y + Math.sin(x / 40 + i) * 3);
      c.stroke();
    }
    c.globalAlpha = 1;
  }, [1, 1]);
}

/** Barely visible plaster-like noise that keeps large walls from looking flat. */
export function wallTexture() {
  return canvasTexture(256, (c, s) => {
    c.fillStyle = '#f1f1e8'; c.fillRect(0, 0, s, s);
    speckle(c, s, 14000, .05, '#7d8a80');
  }, [.6, .6]);
}
