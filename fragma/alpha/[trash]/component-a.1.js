import {
  resource,
  html,
  css,
  idle,
  cancelIdle,
  noop,
  Component,
  viewPort,
  define,
  indeterminate,
} from '../lib/helpers.js';

const base = `${import.meta.url}/`;

const styles = resource({
  file: 'styles.css',
  base,
  type: 'text/css',
  body: css`
    .fill {
      --fill: transparent;
    }
    .grid {
      display: grid;
      place-items: center;
      grid-auto-flow: column;
    }
    red {
      color: red;
    }
    green {
      color: green;
    }

    .content::after {
      content: ' ';
    }
    :host(.viewable) .content::after {
      content: attr(data-text);
    }

    :host > * {
      --text: transparent;
      background-color: var(--fill, #f006);
      color: var(--text, currentcolor);
      transition: color 250ms 5ms, background 250ms 5ms;
    }
    :host(.viewable) > * {
      --text: orange;
    }
    ::message {
      background-color: green;
    }
  `,
});

const isCached = styles.cache;

let instance = 0;

const apply = Reflect.apply;

export default class ComponentA extends Component {
  constructor() {
    super();
    const root = this.attachShadow ? this.attachShadow({mode: 'open'}) : this;

    const tillViewable = indeterminate(this, 'wasViewable', (value, resolve) => resolve(!!value));

    this.messageText = '';

    const message = {toString: () => this.messageText};

    this.initialized = new Promise(resolve => {
      viewPort.observe(this);

      /// Fragments
      const fragment = (this.fragment = html`
        <style>@import "${{toString: () => styles.href}}";</style>
        <div class="fill" style="display: grid; place-items: center; grid-auto-flow: column; grid-auto-columns: 1fr;">
          <div name="instance-only">${++instance}</div>
          <!-- <div name="time-only">{time}</div> -->
          <div class="content" data-text="${time}">&nbsp;</div>
          <div id=message>${message}</div>
          <div id=field>
            <slot name="field" oninput="component.elements.message.textContent = this.children[0].value"><input/></slot>
          </div>
        </div>
      `);
      const slots = (this.slots = [...fragment.querySelectorAll('slot')]);
      const elements = (this.elements = [...fragment.querySelectorAll('[id]')]);

      /// Slots
      this.addEventListener('slotchange', this.slotChangeCallback);
      for (const slot of slots) {
        slot.component = this;
        slots[slot.name] = slot;
      }

      /// Elements

      for (const element of elements) {
        element.component = this;
        elements[element.id] = element;
      }

      this.initialize = async () => {
        try {
          this.initialize = noop;
          await isCached;
          await fragment.ready;
          await Promise.race([tillViewable, new Promise(resolve => idle(() => resolve()))]);
          root.appendChild(fragment);
          resolve(this);
          await tillViewable;

          let updating;
          const update = async () => {
            if (updating) return;
            (updating = true), fragment.update();
            await fragment.updated, (updating = false);
          };

          let pending;
          setInterval(() => {
            cancelIdle(pending);
            if (this.viewable) update();
            else if (!updating) pending = idle(update);
          }, 1000);

          this.style.opacity = 1;
        } catch (exception) {
          console.warn(exception);
        }
      };
    });
  }

  handleEvent(event, source) {
    const type = event && event.type;
    if (!type) return;

    if (event.composed && !source) {
      const path = (event.composed && event.path) || event.composedPath();
      source = (path && path[0]) || event.target;
    }

    this.traceEvent(event, source);
  }

  traceEvent(event, source) {
    if (!event) return;
    const type = event.type;
    const path = (event.composed && event.path) || (event.path = event.composedPath());
    const target = (path && path[0]) || event.target;
    !source || source === this
      ? console.trace(`%O[%s] — %o`, target, type, event)
      : console.trace(`%O - %O[%s] — %o`, target, source, type, event);
  }

  slotChangeCallback(event) {
    traceEvent(event);
  }

  initialize() {}

  connectedCallback() {
    this.initialize();
  }

  set statusText(text) {
    this['#status'] && (this['#status'].textContent = text);
  }

  get statusText() {
    return this['#status'] && this['#status'].textContent;
  }

  set viewable(viewable) {
    const wasViewable = this.wasViewable;
    viewable = this.isViewable =
      (viewable && (this.wasViewable || (this.wasViewable = true), true)) || false;
    this.classList[this.isViewable ? 'add' : 'remove']('viewable');
  }

  get viewable() {
    return this.isViewable || false;
  }
}

/// HELPERS

const zeroes = (value, length) => `${value || '0'}`.padStart((length > 0 && length) || 0, '0');

const time = {
  toString: (time = new Date()) =>
    `${time.getMinutes()}:${zeroes(time.getSeconds(), 2)}.${zeroes(time.getMilliseconds(), 3)}`,
};
