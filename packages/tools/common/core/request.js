import { Headers } from './headers.js';
import { Resource as Body } from './resource.js';
import globals, { scoped } from './globals.js';

import {
  defineProperties,
  getOwnPropertyDescriptors,
} from '../helpers.js';


/// Builtin Request
globals.Request ||
  defineProperties(scoped(
    'Request',
    class Request {
      /**
       * @param {RequestInfo | URL | Request} input
       * @param {RequestInit} [init]
       */
      constructor(input, init) {
        if (!arguments.length) {
          throw TypeError(`Failed to construct 'Request': 1 argument required, but only ${arguments.length} present.`);
        }

        const url = input && (
          typeof input === 'string'
            ? input
            : 'href' in input
              ? input.href
              : input.url
        ) || '';

        /** @type {BodyInit} */
        let body;

        /** @type {boolean} */
        let bodyUsed;

        /** @type {HeadersInit} */
        let headers;

        ({
          body = null,
          bodyUsed = false,
          cache: this.cache = defaults.cache,
          credentials: this.credentials = defaults.credentials,
          destination: this.destination = defaults.destination,
          headers,
          integrity: this.integrity = defaults.integrity,
          method: this.method = defaults.method,
          mode: this.mode = defaults.mode,
          redirect: this.redirect = defaults.redirect,
          referrer: this.referrer = defaults.referrer,
          referrerPolicy: this.referrerProlicy = defaults.referrerPolicy,
        } = {
          ...(typeof input === 'object' && 'url'
            in input && input || undefined),
          ...init && (init = { ...init }),
          ...overrides.passive,
        });

        this.headers = new Headers(headers);
        this.url = url;
      }

      clone() {
        return new Request(this);
      }
    },
  ).prototype, (({ constructor, ...properties }) => properties)(getOwnPropertyDescriptors(Body.prototype)));

/// Core Request
export class Request extends globals.Request {
  /**
   * @param {RequestInfo | URL | Request} input
   * @param {RequestInit} [init]
   */
  constructor(input, init) {
    //@ts-ignore
    super(input || '', { ...defaults, ...init });
    // this.clone = () => new new.target(this);
  }

  clone() {
    /** @type {typeof Request}  */
    const constructor = this.constructor || Request;
    return new constructor(this);
  }
}

/// Defaults

const defaults = {
  cache: 'default' || 'reload' || 'no-cache',
  credentials: 'same-origin' || 'omit' || 'include',
  destination: '',
  integrity: '',
  method: 'GET' || 'POST',
  mode: 'cors' || 'no-cors' || 'same-origin' || 'navigate',
  redirect: 'follow' || 'error' || 'manual',
  referrer: 'about:client',
  referrerPolicy: '',
}

/// Overrides

// Passive requests only use "resource" fields only
// other fields default to the specs for now.
const overrides = {
  passive: {
    cache: 'default',
    credentials: 'same-origin',
    method: 'GET',
    mode: 'cors',
    redirect: 'follow',
    referrerPolicy: '',
  }
}


/** @typedef {(typeof globals)['Request']['prototype']} globals.Request */
