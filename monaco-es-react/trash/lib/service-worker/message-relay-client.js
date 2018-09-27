if (typeof document === 'object' && document.defaultView)
  /**
   * Creates a service worker which would
   * listen to messages passed from it's
   * clients and forward them to all the
   * other clients
   */
  (function initializeMessageRelayClient() {

    /// UI ///

    const container = document.body;
    const element = container.appendChild(new MessageRelayElement());
    const {['#message']: message, ['#received']: received} = element;

    const status = text => {
      element.statusText = (text && text.message) || text || '';
    };


    if (!navigator.serviceWorker) return status('Not Supported');
    const serviceWorker = navigator.serviceWorker;

    /// STATE ///

    const inbox = {};

    /// SERVICE ///

    // Listen for messages relayed by the service worker
    serviceWorker.addEventListener('message', ({data}) => {
      const sender = data.sender;
      if (sender && 'message' in data) {
        const message = data.message;
        // console.log('[message] %o', data);
        if (message !== null) {
          (
            inbox[sender] || (inbox[sender] = received.appendChild(document.createElement('div')))
          ).textContent = `[${sender}]: ${message || '…'}`;
        } else if (inbox[sender]) {
          inbox[sender].remove();
          inbox[sender] = undefined;
        }
      }
    });

    message.addEventListener('input', event => {
      // There isn’t always a service worker to send a message to. This can happen when the page is force reloaded.
      if (!serviceWorker.controller) return status('No Controller');

      // Send the message to the service worker
      serviceWorker.controller.postMessage({relay: message.value});
    });

    self.addEventListener('beforeunload', event => {
      serviceWorker.controller.postMessage({relay: null});
      status('Closed');
    });

    return element;

    /// WEB COMPONENT ///

    function MessageRelayElement() {
      const html = String.raw;
      const template = document.createElement('template');
        template.innerHTML = html`
        <div style="display: grid">
          <div>Message Relay <span id=status></span></div>
          <textarea id=message></textarea>
          <div id=received style="white-space: pre"></div>
        </div>
      `;

      MessageRelayElement = class MessageRelayElement extends HTMLElement {
        constructor() {
          super();
          const root = this.attachShadow({mode: 'open'});
          // console.log(root.style);
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

      customElements.define('message-relay', MessageRelayElement);

      return new MessageRelayElement(...arguments);
    }
  })();

// if (!message || !received) {
//   return console.warn(
//     `MessageRelayClient: element (%O) must include both #message and #received elements`,
//     element,
//   );
// }
