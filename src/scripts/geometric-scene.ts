import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { createTrainWorld, type TrainView } from './train-world';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let navigationId = 0;
let enterTimer: ReturnType<typeof setTimeout> | undefined;
let detachAbort: (() => void) | undefined;
const background = () => document.querySelector<HTMLElement>('[data-geo-background]');
const stopped = () => reducedMotion.matches;
const isConcept = (path: string) => /^\/concept(?:\/notes(?:\/.*)?|\/gallery\/?|\/about\/?)?\/?$/.test(path);
const sceneForPath = (path: string): TrainView => {
  const route=path.replace(/\/$/,'');
  if(route==='/concept')return 'home';
  if(route==='/concept/gallery')return 'gallery';
  if(route==='/concept/about')return 'about';
  return route==='/concept/notes'?'notes':'article';
};
const host = background() as (HTMLElement & { trainWorld?: ReturnType<typeof createTrainWorld> }) | null;
const world = host ? (host.trainWorld ??= createTrainWorld(host)) : null;

function updateNavigation() {
  const nav = document.querySelector<HTMLElement>('.geo-nav');
  if (!nav) return;
  const scene = document.body.dataset.geoScene ?? 'home';
  const activePath = scene==='home'?'/concept/':`/concept/${scene==='article'?'notes':scene}/`;
  nav.querySelectorAll<HTMLAnchorElement>('[data-geo-nav]').forEach(link => {
    const current = link.getAttribute('href') === activePath;
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
  if (active) {
    nav.style.setProperty('--geo-nav-x', `${active.offsetLeft}px`);
    nav.style.setProperty('--geo-nav-width', `${active.offsetWidth}px`);
  }
}

function syncMotion() {
  const backdrop = background();
  if (!backdrop) return;
  backdrop.toggleAttribute('data-still', stopped());
  backdrop.toggleAttribute('data-hidden', document.hidden);
  document.body.toggleAttribute('data-geo-still', stopped());
}

function resetExit() {
  const backdrop = background();
  if (backdrop) delete backdrop.dataset.phase;
  delete document.body.dataset.geoPhase;
  document.querySelector('#geo-main')?.removeAttribute('aria-busy');
  world?.moveTo((document.body.dataset.geoScene as TrainView) ?? 'home');
}

function enterScene(animate: boolean) {
  const backdrop = background();
  if (!backdrop) return;
  clearTimeout(enterTimer);
  backdrop.dataset.view = document.body.dataset.geoScene ?? 'home';
  world?.moveTo((document.body.dataset.geoScene as TrainView) ?? 'home');
  delete backdrop.dataset.phase;
  syncMotion();
  updateNavigation();
  document.querySelector('#geo-main')?.removeAttribute('aria-busy');
  if (animate && !stopped()) {
    document.body.dataset.geoPhase = 'enter';
    enterTimer = setTimeout(() => delete document.body.dataset.geoPhase, 1350);
  } else delete document.body.dataset.geoPhase;
}

document.addEventListener('astro:before-preparation', (rawEvent) => {
  const event = rawEvent as TransitionBeforePreparationEvent;
  const backdrop = background();
  if (!backdrop || !isConcept(event.to.pathname) || event.from.pathname === event.to.pathname) return;
  detachAbort?.();
  clearTimeout(enterTimer);
  const id = ++navigationId;
  const destination=sceneForPath(event.to.pathname);
  const current=document.body.dataset.geoScene;
  const sceneChanges=(current==='article'?'notes':current)!==(destination==='article'?'notes':destination);
  const duration = stopped() ? 0 : sceneChanges ? 280 : 150;
  const originalLoader = event.loader;
  if (duration) {
    document.body.dataset.geoPhase = 'out';
  }
  world?.moveTo(destination);
  document.querySelector('#geo-main')?.setAttribute('aria-busy', 'true');
  const onAbort = () => { if (id === navigationId) resetExit(); };
  event.signal.addEventListener('abort', onAbort, { once: true });
  detachAbort = () => event.signal.removeEventListener('abort', onAbort);
  event.loader = async () => {
    try {
      // Fetch immediately; only the short exit beat is held before the DOM swap.
      await Promise.all([originalLoader(), new Promise<void>(resolve => setTimeout(resolve, duration))]);
    } catch (error) {
      if (id === navigationId) resetExit();
      throw error;
    }
  };
});

document.addEventListener('astro:before-swap', rawEvent => {
  const event = rawEvent as TransitionBeforeSwapEvent;
  if (!background() || !isConcept(event.to.pathname)) return;
  // Our live WebGL scene owns the animation. Native screenshots
  // are unnecessary here and can fail when capturing a scrolled, long article.
  // Skipping the snapshot animation still lets Astro swap the DOM and history.
  event.viewTransition.ready.catch(error => {
    if (!(error instanceof DOMException) || !['AbortError', 'InvalidStateError'].includes(error.name)) throw error;
  });
  event.viewTransition.skipTransition();
});

document.addEventListener('astro:after-swap', () => enterScene(true));
document.addEventListener('astro:page-load', () => {
  detachAbort?.();
  detachAbort = undefined;
  syncMotion();
  updateNavigation();
});
document.addEventListener('visibilitychange', syncMotion);
reducedMotion.addEventListener('change', () => { resetExit(); syncMotion(); });
addEventListener('resize', updateNavigation, { passive: true });
document.fonts.ready.then(updateNavigation);
enterScene(false);

if (import.meta.hot) import.meta.hot.dispose(() => { world?.dispose(); if(host)delete host.trainWorld; });
