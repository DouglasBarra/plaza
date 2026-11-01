// Every district is a module with the same shape:
//   id, name, key, title       who it is and how to jump to it
//   summary() -> { status, count, ... }   what the plaza shows on its sign
//   subscribe(fn) -> unsubscribe          tells the plaza when that changes
//   mount(el, ctx) -> unmount             draws the district's app in the panel
// Adding a district = writing one of these and putting it in DISTRICTS.
import { todos } from './todos.js';
import { finance } from './finance.js';
import { people } from './people.js';

// Placeholder district with static sample rows, until its real app exists.
function sample({ id, name, key, title, status, count = 0, items = [], note }) {
  return {
    id, name, key, title,
    subscribe: () => () => {},
    summary: () => ({ status, count }),
    mount(el) {
      el.innerHTML = items.map(([t, when, state]) => `
        <div class="row">
          <span class="box${state === 'done' ? ' done' : ''}" aria-hidden="true"></span>
          <span class="t">${t}</span>
          <span class="when${state === 'late' ? ' late' : ''}">${when}</span>
        </div>`).join('') +
        `<p class="pz-panel-note">${note || `Sample data. The real ${name} app moves in here next.`}</p>`;
      return () => {};
    },
  };
}

export const DISTRICTS = {
  todo: todos,
  finance,
  study: sample({ id: 'study', name: 'Study', key: '3', title: 'Reading list', status: 'Chapter 4 · 40%',
    items: [['Cloud Computing, ch. 4', '40%'], ['TCC draft: methodology', 'Fri'], ['Japanese flashcards', '20 left']] }),
  ideas: sample({ id: 'ideas', name: 'Ideas', key: '4', title: 'Idea box', status: '12 ideas',
    items: [['A plaza where my life lives', 'Today'], ['Postcard club with friends', 'Oct 28'], ['Learn to draw like Hidden Folks', 'Oct 12']] }),
  projects: sample({ id: 'projects', name: 'Projects', key: '5', title: 'On the workbench', status: '3 on the go',
    items: [['Plaza, this app', 'Town hall'], ['TCC', 'Ch. 3 of 5'], ['A bookshelf for the hall', 'Sanding'], ['Learn Blender', 'Started', 'done']] }),
  people,
};
