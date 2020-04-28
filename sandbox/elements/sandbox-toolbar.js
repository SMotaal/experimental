import {html, css, Component} from './helpers.js';

const styles = css/* css */ `
  /* @import '/pholio/styles/debug.css'; */

  *,
  ::slotted(*) {
    font-size: inherit;
    box-sizing: content-box;
  }

  #wrapper {
    background: #fff3;
  }

  #toolbar {
    display: flex;
    flex-flow: row nowrap;
  }

  :host(.grid) #toolbar {
    display: grid;
    grid-auto-flow: dense;
    grid-template-columns: repeat(auto-fit, minmax(7.5em, auto));
    grid-gap: 1em 0.5em;
  }

  /* #toolbar *, */
  ::slotted(*) {
    margin-inline-start: 0.25ch;
    margin-inline-end: 0.25ch;
  }

  ::slotted(input) {
    flex: 1;
    /* margin: 0.25ch; */
    border: none;
    background: #9991;
    padding: 0.25ch 1ch;
    border-radius: 1.5ch;
    min-width: 1.5ch;
    min-height: 1.5ch;
    border: 2px solid transparent;
    background-clip: padding-box;
    /* box-shadow: 0 1px 15px -10px #0003; */
  }

  ::slotted(input:active) {
    /* box-shadow: 0 1px 2px 0 #9999; */
    background-color: #fff9;
  }

  ::slotted(input:focus) {
    background-color: #fffe;
    outline: none;
    border-color: #03f3;
    /* box-shadow: inset 0 1px 0 #fff9, inset 0 0 4px #9993, inset 0 -1px 0 #0003; */
  }

  ::slotted(input[type='button']) {
    background-color: #fffe;
    padding: 0.25ch 0.5ch;
    max-width: max-content;
    max-height: max-content;
  }

  ::slotted(input[type='button']:active) {
    background-color: #fff6;
  }
`;

export class SandboxToolbarElement extends Component {
  constructor() {
    super();
    // /** @type {HTMLSlotElement} */ const slot = this['::'];
  }

  connectedCallback() {
    super.connectedCallback();
  }
}

try {
  SandboxToolbarElement.shadowRoot = {mode: 'closed'};
  SandboxToolbarElement.styles = styles;
  SandboxToolbarElement.template = html`
    <div id="wrapper">
      <slot id="toolbar"></slot>
    </div>
    <!-- Slot used to sort child elements -->
    <!-- <slot style="display: none;" inert hidden></slot> -->
  `;

  customElements.define('sandbox-toolbar', SandboxToolbarElement);
} catch (exception) {
  console.warn(exception);
}
