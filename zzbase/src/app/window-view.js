// The plaza through the windows. A second ink renderer draws the plaza from
// where your eye would be if the room sat inside its building; the window
// panes sample that picture at their pixel. Used in first person only.
import * as THREE from 'three';
import { InkRenderer, portalMaterial } from '../ink.js';
import { skipND } from '../life.js';
import { renderer, camera, plazaScene, onResize } from './engine.js';
import { game } from './state.js';
import { buildingFor } from './plaza.js';

export const portalMat = portalMaterial();
export const plazaInk = new InkRenderer(renderer, { samples: 0, scale: 0.75 });
plazaInk.skipND = skipND;
const portalRT = new THREE.WebGLRenderTarget(1, 1);
onResize((w, h) => {
  plazaInk.setSize(w, h);
  const dpr = renderer.getPixelRatio();
  portalRT.setSize(Math.round(w * dpr * 0.75), Math.round(h * dpr * 0.75));
  portalMat.uniforms.screen.value.set(w * dpr, h * dpr);
});

const viewCam = new THREE.PerspectiveCamera();
const mapM = new THREE.Matrix4();
export function renderWindowView(t) {
  const { room } = game;
  const b = buildingFor(room.id);
  camera.updateMatrixWorld();
  b.updateMatrixWorld();
  mapM.copy(b.matrixWorld).multiply(new THREE.Matrix4().makeTranslation(room.plazaOffset.x, room.plazaOffset.y, room.plazaOffset.z));
  viewCam.matrixWorld.multiplyMatrices(mapM, camera.matrixWorld);
  viewCam.matrixWorld.decompose(viewCam.position, viewCam.quaternion, viewCam.scale);
  viewCam.fov = camera.fov; viewCam.aspect = camera.aspect; viewCam.near = 0.1; viewCam.far = 1200;
  viewCam.updateProjectionMatrix();
  viewCam.updateMatrixWorld();
  plazaScene.fog.near = 50; plazaScene.fog.far = 170;
  plazaInk.setFog(50, 170);
  b.visible = false; // we're inside it
  plazaInk.render(plazaScene, viewCam, t, portalRT);
  b.visible = true;
  portalMat.uniforms.tView.value = portalRT.texture;
}
