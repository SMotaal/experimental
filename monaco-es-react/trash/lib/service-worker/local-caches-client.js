if (typeof document === 'object' && document.defaultView)
  /**
   * Creates a service worker which would
   * listen to messages passed from it's
   * clients and forward them to all the
   * other clients
   */
  (function initializeLocalCachesClient() {
    /// UI ///

    const container = document.body;
    const element = container.appendChild(new LocalCachesElement());
    const status = text => {
      element.statusText = (text && text.message) || text || '';
    };
    const {['#entries']: entries} = element;

    if (!navigator.serviceWorker) return status('Not Supported');

    const serviceWorker = navigator.serviceWorker;

    /// STATE ///

    const empty = Object.freeze([]);
    let cached = empty; // new Set();
    const uptime = new Date().toISOString();

    const key =
      localStorage['local-caches'] ||
      (localStorage['local-caches'] = (Math.random() * 10e8).toString(32));

    const stats = count => status(`<${key}>${(count >= 0 && ` (${count || 'empty'})`) || ''}`);

    const local = new URL(`local/@${key}/`, location);
    // local.username = key;

    Object.defineProperty(element, 'entries', {get: () => cached});

    /// SERVICE ///

    // Listen for messages relayed by the service worker
    serviceWorker.addEventListener('message', ({data}) => {
      // Ignore message when key does not match
      // if (data.key !== key) return;

      if (!data || !(data = data.caches)) return;

      console.log('[message]: %o', data);

      if ('request' in data) {
        // TODO: Handle request
      } else if ('entries' in data) {
        const received = data.entries;
        // console.log({entries: received});
        cached = received && received.length ? Object.freeze(received) : empty;
        entries.textContent = cached.join('\n');
        stats(cached.length);
      }
    });

    self.addEventListener('beforeunload', event => {
      serviceWorker.controller.postMessage({cache: null});
      status('Closed');
    });

    stats();

    const cache = (filename, data, headers) => {
      serviceWorker.controller.postMessage({cache: {key, filename, data, headers}});
    };

    const init = () => {
      // cache(`${new URL('status/client', local)}`, {key, uptime});
      // cache(`${new URL('status/client.js', local)}`, `export default {key: "${key}", uptime: "${uptime}"};`, {});
      cache('status/client', {key, uptime});
      cache('status/client.js', `export default {key: "${key}", uptime: "${uptime}"};`, {
        'Content-Type': 'application/javascript',
      });

      serviceWorker.controller.postMessage({cache: {key, filename: '*'}});
    };

    Object.defineProperty(element, 'cache', {value: cache});

    if (!serviceWorker.controller) {
      serviceWorker.addEventListener('controllerchange', init, {once: true});
    } else {
      init();
    }

    return element;

    /// WEB COMPONENT ///

    function LocalCachesElement() {
      const html = String.raw;
      const template = document.createElement('template');
      template.innerHTML = html`
        <div style="display: grid">
          <div>Local Caches <span id=status></span></div>
          <div id=entries style="white-space: pre"></div>
        </div>
      `;

      LocalCachesElement = class LocalCachesElement extends HTMLElement {
        constructor() {
          super();
          const root = this.attachShadow({mode: 'open'});
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

      customElements.define('local-caches', LocalCachesElement);

      return new LocalCachesElement(...arguments);
    }
  })();
