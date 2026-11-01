// The Day/Night and Wobbly lines buttons.
import { THEMES, applyTheme } from '../ink.js';
import { setNight } from '../life.js';
import { ink, plazaScene, plazaLights } from '../app/engine.js';
import { game } from '../app/state.js';
import { me } from '../app/plaza.js';
import { applyRoomView, relightRooms } from '../app/rooms.js';
import { plazaInk } from '../app/window-view.js';
import { soundCard } from '../sound/index.js';
import { showCard } from './card.js';

const themeBtn = document.getElementById('toggle-theme');
themeBtn.addEventListener('click', () => {
  const theme = game.theme = game.theme === 'day' ? 'night' : 'day';
  document.documentElement.dataset.theme = theme;
  themeBtn.textContent = theme === 'day' ? 'Night' : 'Day';
  applyTheme(theme, plazaLights);
  relightRooms();
  ink.setTheme(theme);
  plazaScene.fog.color.set(THEMES[theme].paper);
  me.setInkColor(THEMES[theme].ink);
  setNight(theme === 'night');
  plazaInk.setTheme(theme);
  applyRoomView();
});

const wobbleBtn = document.getElementById('toggle-wobble');
wobbleBtn.addEventListener('click', () => {
  ink.wobbleOn = !ink.wobbleOn;
  plazaInk.wobbleOn = ink.wobbleOn;
  wobbleBtn.setAttribute('aria-pressed', String(ink.wobbleOn));
});

// Sound: the button opens the sliders; M turns it all on and off
document.getElementById('toggle-sound').addEventListener('click', () => soundCard(showCard));
