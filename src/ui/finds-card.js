// The finds list: little things hidden around the plaza to click on.
import * as finds from '../finds.js';
import { showCard } from './card.js';

const findsBtn = document.getElementById('finds-btn');
export function refreshFinds() {
  const { found, total } = finds.progress();
  findsBtn.textContent = `Finds ${found}/${total}`;
}
finds.subscribe(refreshFinds);
findsBtn.addEventListener('click', openFinds);

export function openFinds() {
  const { found, total } = finds.progress();
  showCard('finds', {
    tag: 'Finds', title: 'Little things', cls: 'finds-panel',
    body: `
      <p class="finds-intro">${found} of ${total} found. Click anything that looks a little out of place.</p>
      ${finds.list().map((f) => `
        <div class="row">
          <span class="box${f.found ? ' done' : ''}" aria-hidden="true"></span>
          <span class="t">${f.found ? f.name : '???'}<small>${f.hint}</small></span>
        </div>`).join('')}`,
  });
}
