import {html, css, Component, Attributes} from './helpers.js';
import {SandboxContainer} from '../lib/sandbox-container.js';

const styles = css/*css*/ `
  /* @import '/pholio/styles/debug.css'; */

  :host {
    display: flex;
    padding: 0;
    margin: 0;
    border-radius: 0.25ch;
    /* flex-flow: row; */
  }

  :host(.grid) {
    display: grid;
    grid-auto-flow: row;
    grid-auto-rows: 1fr;
  }

  #wrapper {
    display: grid;
    grid-template:
      'toolbar toolbar'
      'content console' 1fr
      / minmax(max-content, auto) minmax(0, min-content);
    flex: 1;
  }

  #console {
    background-color: #9991;
    min-width: 240px;
  }

  #console:not([hidden]) {
    grid-area: console;
  }

  #address-bar {
    display: contents;
  }

  #toolbar {
    grid-area: toolbar;
    background-color: #9991;
    /* font-size: 125%; */
  }

  #content {
    display: flex;
    background-color: #9993;
    grid-area: content;
  }

  #iframe {
    border: none;
    flex: 1;
    height: auto;
    width: auto;
    /* box-sizing: content-box; */
  }

  [hidden] {
    display: none;
  }
`;

export class SandboxFrameElement extends Component {
  constructor() {
    super();

    /** @type {{'#iframe': HTMLIFrameElement, '#address': HTMLInputElement '#reload': HTMLInputElement, '#address-bar': HTMLFormElement}} */
    const {
      '#iframe': iframe,
      '#console': consoleElement,
      '#address-field': addressField,
      '#reload-button': reloadButton,
      '#console-button': consoleButton,
      '#address-bar': addressBar,
    } = this;

    const container = (this.container = new SandboxContainer({
      frame: this,
    }));

    if (iframe) {
      iframe.addEventListener(
        'load',
        event => {
          const {contentDocument, contentWindow} = iframe;
          console.log('load: %o', {event, contentDocument, contentWindow});
          addressBar && addressBar.reset();
        },
        {passive: false, capture: true},
      );
    }

    if (addressField) {
      addressField.reset = () => {
        addressField.value = this.src;
        addressField.matches(':focus') &&
          (addressField.selectionEnd === addressField.selectionStart
            ? addressField.select()
            : (addressField.selectionStart = addressField.selectionEnd));
      };
    }

    if (reloadButton) {
      reloadButton.onclick = () => container.reload();
    }
    if (consoleButton) {
      consoleButton.onclick = () => consoleElement && (consoleElement.hidden = !consoleElement.hidden);
    }

    if (addressBar) {
      addressBar.addEventListener(
        'submit',
        event => {
          event.preventDefault();
          container.navigate(addressField.value);
        },
        {passive: false, capture: true},
      );
      addressBar.addEventListener(
        'reset',
        event => {
          event.preventDefault();
          addressField && addressField.reset();
        },
        {passive: false, capture: true},
      );
      addressBar.addEventListener(
        'keyup',
        event => {
          switch (event.key) {
            case 'Escape':
              return event.preventDefault(), addressBar.reset();
          }
        },
        {passive: false, capture: true},
      );
    }
  }

  async connectedCallback() {
    super.connectedCallback();
    // console.log(this.src);
    this.src ||
      (await new Promise(requestAnimationFrame),
      this.container.navigate(new URL(`./containers/${`${location.hash || ''}`.slice(1) || 'test'}/`, location)));
  }

  reload() {
    const {'#iframe': iframe} = this;
    iframe && iframe.contentWindow && iframe.contentWindow.location && iframe.contentWindow.location.reload();
  }

  get src() {
    const {'#iframe': iframe} = this;
    return (iframe && iframe.src) || '';
  }

  set src(value) {
    const {src, '#iframe': iframe, container} = this;
    !iframe || (value = `${value || ''}`) === src || (iframe.src = value);
  }
}

try {
  SandboxFrameElement.shadowRoot = {mode: 'closed'};
  SandboxFrameElement.observedAttributes = Attributes.from(['src']);
  SandboxFrameElement.styles = styles;
  SandboxFrameElement.template = html`
    <div id="wrapper">
      <form id="address-bar">
        <sandbox-toolbar id="toolbar">
          <input name="address" id="address-field" type="url" />
          <input id="reload-button" type="button" value="⟳" />
          <input id="console-button" type="button" value="▤" />
        </sandbox-toolbar>
        <input type="submit" hidden />
        <input type="reset" hidden />
      </form>
      <div id="content">
        <iframe id="iframe"></iframe>
      </div>
      <sandbox-console id="console" hidden>
        <slot></slot>
      </sandbox-console>
    </div>
  `;

  customElements.define('sandbox-frame', SandboxFrameElement);
} catch (exception) {
  console.warn(exception);
}
