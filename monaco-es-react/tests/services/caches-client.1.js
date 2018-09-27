import {html, Component} from '../components/helpers.mjs';
import * as prototypes from '../prototypes/prototypes.js';

const safari = `${navigator.vendor || ''}`.startsWith('Apple');

export const serviceWorker = navigator.serviceWorker;

export const events = {
  container: ['controllerchange' /*'message',*/], // ServiceWorkerContainer
  registration: ['updatefound'], // ServiceWorkerRegistration
  controller: ['error', 'statechange'], // ServiceWorker
};

export const listen = (target, handler, events) => {
  if (!target || !handler || !events || !target.addEventListener) return;
  for (const event of events) target.addEventListener(event, handler);
};

export const register = async src => {
  if (!serviceWorker || !serviceWorker.register) return;

  const element = new CachesStatus();

  document.addEventListener('readystatechange', () => document.body.appendChild(element), {
    once: true,
  });

  const log = detail => {
    if (!detail) return;
    const type = detail.type;
    const target = detail.target;
    target && type
      ? console.log('[Client %O %s] %o', target, type, detail)
      : console.log('[Client] %o', detail);
  };
  const notify = event => {
    // log(event);
    setTimeout(
      () =>
        (element.statusText =
          (serviceWorker.controller && serviceWorker.controller.state) ||
          event.type ||
          'no controller'),
    );
  };

  listen(serviceWorker, notify, events.container);

  if (!src) src = document.currentScript.src;
  const options = undefined;
  const registration = await serviceWorker.register(src, options);

  listen(registration, notify, events.registration);

  safari || (await registration.update());

  const installation = registration.installing;
  const installed = installation && (await installation);
  if (installed) notify({target: registration, type: 'installed', installed});

  const active = registration.active;

  if (active) {
    listen(active, notify, events.controller);
    notify({target: active, type: 'active'});
  }

  return registration;
};

export function CachesStatus() {
  const template = html`
    <template>
      <div style="display: grid">
        <div>Caches Status <span id=status></span></div>
        <div id=entries style="white-space: pre"></div>
      </div>
    </template>
  `;

  CachesStatus = class CachesStatus extends Component {
    constructor() {
      super();
      const root = this.attachShadow ? this.attachShadow({mode: 'open'}) : this;
      root.append(...template.content.cloneNode(true).children);
      const elements = root.querySelectorAll('[id]');
      for (const element of elements) this[`#${element.id}`] = element;
    }

    set statusText(text) {
      this['#status'] && (this['#status'].textContent = text);
    }

    get statusText() {
      return this['#status'] && this['#status'].textContent;
    }
  };

  customElements.define('caches-status', CachesStatus);

  return new CachesStatus(...arguments);
}
