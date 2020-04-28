import {html, css, Component} from './helpers.js';

const styles = css/* css */ `
  /* @import '/pholio/styles/debug.css'; */

  :host {
    display: flex;
    padding: 0;
    margin: 0;
  }

  #wrapper {
    flex: 1;
    display: grid;
    grid-auto-flow: row;
    grid-auto-rows: min-content;
    /* grid-template-columns: repeat(auto-fit, minmax(7.5em, auto)); */
    grid-gap: 0.5ch;
    align-content: space-between;
    padding: 0.5ch;
  }
`;

export class SandboxConsoleElement extends Component {
  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
  }
}

try {
  SandboxConsoleElement.shadowRoot = {mode: 'closed'};
  SandboxConsoleElement.styles = styles;
  SandboxConsoleElement.template = html`
    <div id="wrapper">
      <slot></slot>
      <div id="content"><slot id="output" name="output" hidden></slot></div>
    </div>
    <!-- Slot used to sort child elements -->
  `;

  customElements.define('sandbox-console', SandboxConsoleElement);
} catch (exception) {
  console.warn(exception);
}
