// Speech bubbles: what folks say when you come close (the town hall clerk).
import * as THREE from 'three';
import { game } from '../app/state.js';
import { me } from '../app/plaza.js';
import { screenOf } from './labels.js';

const bubble = document.createElement('div');
bubble.className = 'speech is-hidden';
document.body.appendChild(bubble);
let bubbleText = '', bubbleAt = 0;

export function placeSpeech() {
  const sp = game.room?.speakers?.find((s) => s.level === me.level && s.object.getWorldPosition(new THREE.Vector3()).distanceTo(me.position) < s.range);
  if (!sp || game.appOpen) return bubble.classList.add('is-hidden');
  if (performance.now() - bubbleAt > 1500) { bubbleText = sp.text(); bubbleAt = performance.now(); }
  const [x, y, z] = screenOf(sp.object.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, sp.height, 0)));
  if (z > 1) return bubble.classList.add('is-hidden');
  bubble.textContent = bubbleText;
  bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  bubble.classList.remove('is-hidden');
}
