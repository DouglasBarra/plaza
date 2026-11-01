// Speech bubbles: what folks say when you come close (the town hall clerk).
import * as THREE from 'three';
import { game } from '../app/state.js';
import { me } from '../app/plaza.js';
import { screenOf } from './labels.js';

const bubble = document.createElement('div');
bubble.className = 'speech is-hidden';
document.body.appendChild(bubble);
let bubbleText = '', bubbleAt = 0;

// who's close enough to talk to (the T key asks them something: ui/chat.js)
export let nearSpeaker = null;

export function placeSpeech() {
  const sp = game.room?.speakers?.find((s) => s.level === me.level && s.object.getWorldPosition(new THREE.Vector3()).distanceTo(me.position) < s.range);
  nearSpeaker = sp && !game.appOpen ? sp : null;
  if (!sp || game.appOpen) return bubble.classList.add('is-hidden');
  if (performance.now() - bubbleAt > 1500) { bubbleText = sp.text(); bubbleAt = performance.now(); }
  const [x, y, z] = screenOf(sp.object.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, sp.height, 0)));
  if (z > 1) return bubble.classList.add('is-hidden');
  bubble.textContent = bubbleText;
  if (sp.persona) { const k = document.createElement('small'); k.textContent = 'T to talk'; bubble.appendChild(k); }
  bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  bubble.classList.remove('is-hidden');
}
