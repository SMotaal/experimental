//@ts-check
/// <references path="./types.d.ts" />

/**
 * @template {container} T
 * @template {resource.locator} U
 */
export class Sandbox {

  /** @param {Sandbox.Options<{container: T, location: U}>} options */
  constructor(options) {
    ({container: this.container, location: this.location} = {... options});
  }

  /** @type {T | undefined} */
  get container() { return; }

  set container(value) {
    Object.defineProperty(this, 'container', {value, enumerable: true});
  }

  /** @type {U | undefined} */
  get location() { return; }

  set location(value) {
    Object.defineProperty(this, 'location', {value, enumerable: true});
  }

}

/** @typedef {HTMLIFrameElement} Sandbox.BrowserContainer */
/** @typedef {import('vm').Context} Sandbox.NodeContainer */
/** @typedef {Sandbox.BrowserContainer | Sandbox.NodeContainer} Sandbox.Container */

/** @typedef {string | URL} Sandbox.Location */

/**
 * @template {{}} T
 * @typedef {Partial<{}> & T} Sandbox.Options
 */
