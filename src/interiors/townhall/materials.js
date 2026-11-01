// Materials shared by the town hall's pieces.
import * as THREE from 'three';
import { toon } from '../../ink.js';

export const dark = toon('#3a3a3a');
export const alertPin = toon('#c8202b');
export const flameA = new THREE.MeshBasicMaterial({ color: '#ff6a13' });
export const flameB = new THREE.MeshBasicMaterial({ color: '#ffd21f' });
export const lampOn = new THREE.MeshBasicMaterial({ color: '#fff1b8' });
export const glassDay = new THREE.MeshBasicMaterial({ color: '#eef1ee' });
export const glassNight = new THREE.MeshBasicMaterial({ color: '#2a2d33' });
