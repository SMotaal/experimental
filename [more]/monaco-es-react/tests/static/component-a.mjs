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
} from '/components/helpers.mjs';
// import {reactions} from '/components/reactions.mjs';
import {time} from './values.mjs';

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

    // const bound = (method, target = this) => (... args) => Reflect.apply
    // const bind = Function.call.bind(Function.bind);

    // const handleEvent = (... args) = this.handleEvent(context, event, ... args)

    this.initialized = new Promise(resolve => {
      viewPort.observe(this);

      /// Fragments
      // <div><slot name="button" onclick="component.onButtonClick(event)"></slot></div>
      // <div><red><slot name=message>${Promise.resolve('AWESOME')}</slot></red></div>
      // <div name="time-and">{{${time}}}</div>
      // <slot name="field" oninput="component.handleEvent(event, this)"><input/></slot>

      const fragment = (this.fragment = html`
        <style>
          @import "${{toString: () => styles.href}}";
        </style>
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
      // if (slots) {
      this.addEventListener('slotchange', this.slotChangeCallback);
      for (const slot of slots) {
        slot.component = this;
        slots[slot.name] = slot;
        // (slot.component = this)[`${slot.name}`] = slot;
      }
      // slot.name.replace(/-+(.)/g, (m, a) => a.toUpperCase())
      // }
      /// Elements

      // if (elements) {
      for (const element of elements) {
        element.component = this;
        elements[element.id] = element;
        // (element.component = this)[`#${element.id}`] = element;
      }
      // }

      this.initialize = async () => {
        // this.hidden = true;
        try {
          this.initialize = noop;
          await isCached;
          await fragment.ready;
          await Promise.race([tillViewable, new Promise(resolve => idle(() => resolve()))]);
          // await tillViewable;
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
          // await rendered;

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
    // 'traceEvent' in target && target.traceEvent(event, '', source);
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

  // onButtonClick(event) {
  //   traceEvent(event, 'button');
  // }

  // onFieldInput(event) {
  //   traceEvent(event, 'field');
  // }

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