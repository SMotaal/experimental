/// <reference path="types.d.ts" />

import {polyfills, NodeTypes} from './polyfills.mjs';
import {
  TemplateSpans,
  TemplateSpan,
  HTMLAttributeSpan as AttributeSpan,
  HTMLTextSpan as TextSpan,
} from './templates.mjs';
import cachable from '../prototypes/cachable.mjs';

export const Void = Object.freeze(Object.create(null));
export const Empty = Object.freeze([]);

/// INTERNAL ///

export const navigator = typeof self === 'object' && self.navigator;
export const supportsServiceWorkers = navigator.serviceWorker;
export const safari = `${navigator.vendor || ''}`.includes('Apple');

const malformed = new Throw(SyntaxError(`Malformed`));
const resolved = Promise.resolve();
const resolvables = values => {
  for (const value of values)
    if (value && value.then && typeof value.then === 'function') return true;
};
const resolve = values => {
  for (const value of values)
    if (value && value.then && typeof value.then === 'function') return Promise.all(values);
  return Promise.resolve(values);
};

const {TEXT_NODE, ELEMENT_NODE, ENTITY_NODE} = NodeTypes;

/// CACHES ///
const defaultCaches = self.caches.open('default');

export async function cache(cache, path, data, type) {
  if (!cache || data === undefined || !path) return;
  const record = {};

  try {
    cache = record.cache = await ((typeof cache === 'string' && (cache = caches(cache))) || cache);
    if (data === null) return cache.delete(path);
    let response =
      data &&
      typeof data === 'object' &&
      'clone' in data &&
      data instanceof Response &&
      data.clone();
    if (response) {
      type && response.headers.set('Content-Type', (record.type = type));
    } else {
      const serialized = cachable(data, type);
      // console.log('serialized: %o %o', {data, type}, serialized)
      const init = (record.init = {
        headers: {'Content-Type': (record.type = serialized.type || type)},
      });
      response = new Response((record.data = serialized.data), init);
    }
    await cache.put(path, response);
    const cached = (record.cached = true);
  } catch (exception) {
    record.error = exception;
  }

  return record;
}

/// RESOURCES ///

// const cache = async (request, )

/** @type {components.helpers.resource} */
export const resource = properties => new Resource(properties);

const defaultBase = location.pathname.replace(/^.*[/]/, '');

/** @type {typeof components.helpers.Resource} */
export const Resource = class Resource {
  /**
   *  TODO:  Maybe support resource updates
   *  TODO:  Maybe support async resource refs
   */
  constructor(properties) {
    properties && Object.assign(this, properties);
  }

  /**
   * @readonly
   */
  get blob() {
    const {file, base, body, type} = this;
    // if (body) return define(this, 'blob', new Blob([body], {type}));
    if (!body || !type) return;
    if (body) return define(this, 'blob', new Blob([body], {type}));
  }

  get cache() {
    if (this.cached) return this.cached;
    if (this.caching) return this.caching;
    const {blob, type, file, base = defaultBase} = this;
    if (!blob || !file || !type) return;
    const specifier = `./caches/${file}`;
    const url = new URL(specifier, base);
    const pathname = url.pathname;
    return (this.caching = cache(defaultCaches, pathname, blob, type).then(
      record => (
        (this.caching = undefined),
        (this.cached =
          !record || record.error
            ? (record && console.warn(record.error)) || undefined
            : define(this, 'cache', pathname))
      ),
    ));
  }

  /** @readonly */
  get url() {
    const blob = this.blob;
    return (blob && define(this, 'url', URL.createObjectURL(blob))) || '';
  }

  get href() {
    return this.cached || this.url;
  }

  raw() {
    if (!this.body) this.body = String.raw(...arguments);
    return this;
  }

  /**
   *  TODO: Maybe check tags against type
   *  TODO: Maybe support declaring base, file, type in html
   */
  html() {
    if (!this.body) {
      const body = String.raw(...arguments); // .trim();
      const [, opener = malformed(), content = malformed(), closer = malformed()] =
        /(<.+?>|)(.*)(<\/.+?>)/s.exec(body) || '';
      this.body = content;
    }
    return this;
  }
};

Resource.cache = cache;

constants(Resource.prototype, 'base', 'file', 'type', 'body', 'cached');

/// STYLES ///

export const css = String.raw;

/// ELEMENTS ///

/**
 * Names for asymmetric nodes (ie children if any do not belong to the
 * ownerDocument of the actual node).
 */
export const asymmetricNodeNames = new Set(['STYLE', 'SCRIPT', 'TEMPLATE', 'SVG']);

/**
 * Bare-bones Isomorphic HTML tagged template which fallbacks to simple
 * objects exposing cloneNode and innerHTML
 *
 *  TODO: Implement async html
 *
 * @param {TemplateStringsArray} strings
 * @param {... values: any[]} values
 * @returns { HTMLTemplateElement | HTMLElement | DocumentFragment }
 */
export function html(strings, ...values) {
  const template = html.template || (html.template = createElement('template'));
  // template.onload = console.warn;
  const raw = String.raw;

  const createFragment = html => ((template.innerHTML = html), template.content.cloneNode(true));

  const AttributeSpans = /^((?:[^>]+|.*<[a-z][^>]+)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/gs;

  // const Interpolation = Symbol('{{interpolation}}');

  const prerender = spans => Reflect.apply(raw, String, spans);

  const render = spans => {
    const values = Array(spans.length);
    values[0] = spans[0];
    for (let index = 1, n = spans.length; --n; index++) {
      const value = spans[index];
      values[index] =
        value && value.attribute && !value.attribute.quote ? `"${value || ''}"` : `${value || ''}`;
    }
    return Reflect.apply(raw, String, values);
  };

  const interpolate = strings => {
    const length = strings.length; // strings.length - 1;
    // (strings = [...strings]).raw = strings
    if (length) {
      const spans = new TemplateSpans(strings); // new Array(length);
      const prefix = spans.prefix;
      const marks = spans.marks;
      const attributes = (spans.attributes = {});
      const literals = (spans.literals = {});

      let attributeSpans = 0;
      let literalSpans = 0;

      // Parsing
      for (let i = 0, n = length; --n; i++) {
        // const mark = (marks[index] = `{{${prefix}-${index}}}`);
        const index = i + 1;
        const mark = marks[i];
        const last = spans.strings[i];
        const next = spans.strings[index];
        const attribute = last && next && AttributeSpans.exec(last);
        // console.log(attribute);
        if (attribute) {
          const [, before, name, separator, quote] = attribute;
          const after = /\S/.exec(next) || '';
          if (!quote || after[0] === quote) {
            // Attribute Span
            const attribute = {name, separator, quote};
            const span = (spans[index] = attributes[mark] = new AttributeSpan({
              mark,
              index,
              attribute,
            }));
            attributeSpans++;
            continue;
          } //else console.warn(last, {mark, last, next, quote, after});
        }
        // Literal Span
        const span = (spans[index] = literals[mark] = new TextSpan({
          mark,
          index,
          // toString: () => `${span.value || ''}`,
          // update: value => (span.value = value),
        }));
        literalSpans++;
      }

      // const prerendered = render(marks);
      const prerendered = spans.template; // render([strings, ... marks]);
      const fragment = createFragment(prerendered);
      // Prerendering
      if (attributeSpans || literalSpans) {
        // Attributes;
        if (attributeSpans) {
          for (const mark in attributes) {
            const span = attributes[mark];
            const attribute = span.attribute;
            const name = attribute.name;
            const selector = (attribute.selector = `[${attribute.name}="${mark}"]`);
            const element = (span.element = fragment.querySelector(selector));
            if (!element) {
              console.warn(attribute);
            } else {
              span.update(null);
              (element.spans || (element.spans = [])).push(span);
            }
          }
        }

        // Literals
        if (literalSpans) {
          const prefixed = `{{${prefix}-`;
          const Marks = new RegExp(`(\{\{${prefix}-.*?\}\})`, 'g');
          const nodeIterator = document.createNodeIterator(
            fragment,
            NodeFilter.SHOW_TEXT,
            {
              acceptNode: node => {
                if (node.textContent.includes(prefixed)) return NodeFilter.FILTER_ACCEPT;
              },
            },
            false,
          );
          let node;
          const slots = {};
          while ((node = nodeIterator.nextNode())) {
            const text = node.textContent;
            const element = node.parentElement;
            const nodeName = element.nodeName;
            const asymmetric = asymmetricNodeNames.has(nodeName);
            //  TODO: Split Text
            //  TODO: Slot Text

            const pairs = text.split(Marks);
            if (pairs.length === 1) continue;
            const length = ~~(pairs.length / 2) + 1;
            const strings = Array(length);
            const marks = Array(length - 1);
            for (let i = 0, n = length, j; n; i++) {
              strings[i] = pairs[(j = i + i)] || '';
              n-- && (marks[i] = pairs[j + 1]);
            }

            // console.log({pairs, length, strings, marks});
            strings.raw = strings;
            const spans = [strings];
            let updating;
            const updateElement = () => {
              updating = undefined;
              element.textContent = render(spans);
            };
            for (const mark of marks) {
              const span = literals[mark];
              if (span) {
                span.updateElement = updateElement;
                spans.push(span);
              }
            }
            // console.log({pairs, length, strings, marks, spans});
            (element.spans || (element.spans = [])).push(...spans.slice(1));
          }
        }
      }

      fragment.spans = spans;
      fragment.update = updates => {
        const updated = Array(length - 1);
        if (updates !== undefined) {
          if (length - updates.length !== 1)
            return console.warn(
              `Spans mismatch — %O(%d) <- %O(%d)`,
              spans,
              length,
              updates,
              updates.length,
            );

          for (let i = 0, n = length; --n; i++) updated[i] = spans[i + 1].update(updates[i]);
        } else {
          for (let i = 0, n = length; --n; i++) updated[i] = spans[i + 1].update();
        }
        fragment.updated = Promise.all(updated);
        return fragment;
      };
      fragment.render = () => render(spans);
      fragment.render();

      return fragment;
    } else {
      const spans = [((strings = [...strings]).raw = strings)];
      const prerendered = render(spans);
      const fragment = createFragment(prerendered);
      fragment.spans = spans;
      fragment.update = () => ((fragment.updated = Promise.resolve(fragment)), fragment);
      fragment.render = () => prerendered;
      return fragment;
    }
  };

  html = (strings, ...values) => {
    const fragment = interpolate(strings);
    const result = fragment;
    fragment.ready = Promise.all(values).then(
      values => (fragment.update(values), fragment.updated),
    );
    return result;
  };

  return html(strings, ...values);
}

export function createElement(tag, options) {
  createElement = polyfills.createElement || document.createElement.bind(document);
  return createElement(tag);
}

export const tagNameFor = Class =>
  (Class &&
    Class.name &&
    Class.name
      .replace(/([a-z])(?=[A-Z])/g, '$1-')
      .toLowerCase()
      .replace(/-element$/, '')) ||
  '';

/// COMPONENTS ///

export class Component extends HTMLElement {
  static define(options) {
    const tag =
      typeof options === 'string'
        ? options
        : (options && options.tag) || (this.hasOwnProperty('tag') && this.tag) || tagNameFor(this);
    customElements.define(tag, this, (typeof options === 'object' && options) || undefined);
    define(this, 'tag', tag);
    return this;
  }

  static then(ƒ) {
    if (!this.hasOwnProperty('defined')) {
      const tag = (this.hasOwnProperty('tag') && this.tag) || tagNameFor(this);
      const promise = tag && define(this, 'defined', customElements.whenDefined(tag));
      if (!promise)
        throw ReferenceError(
          `When defined requires a Custom Element with a valid tag property or class name`,
        );
      return promise.then(ƒ);
    } else {
      return this.defined.then(ƒ);
    }
  }

  static mixin(Class) {
    let Mixin = this.mixins && this.mixins.get(Class);
    if (!Mixin) {
      const name = `${this.name}<${Class.name}>`;
      const string = `class ${name} { … }`;
      Mixin = class extends Class {};
      const statics = Object.getOwnPropertyDescriptors(this);
      statics.name = {value: name};
      statics[Symbol.toPrimitive] = {value: hint => string};
      delete statics.prototype;
      Object.defineProperties(Mixin, statics);
      const properties = Object.getOwnPropertyDescriptors(this.prototype);
      delete properties.constructor;
      Object.defineProperties(Mixin.prototype, properties);
      (this.mixins || (this.mixins = new Map())).set(Class, Mixin);
      console.log(Mixin, [Mixin]);
    }
    return Mixin;
  }
}

/// VIEWPORT ///

export class ViewPort {
  constructor() {
    if (typeof IntersectionObserver === 'function') {
      let current, next;
      const update = async entries => {
        if (current) return (next = entries); // [... next, ... entries];
        current = entries;
        for (const {target, isIntersecting, intersectionRatio} of entries) {
          target.viewable === isIntersecting ||
            (target.viewable = isIntersecting || intersectionRatio);
        }
        current = null;
        await 0;
        if (next) return update(next);
      };
      this.intersectionObserver = new IntersectionObserver(update, {
        // root: document.querySelector('#scrollArea'),
        rootMargin: '0px',
        threshold: [0.001, 1],
      });
    } else {
      // debugger;
      const observed = new Set();
      let updating, next;
      const update = async () => {
        clearTimeout(next);
        if (updating) return (next = setTimeout(update, 100));
        updating = true;
        const height = self.innerHeight || document.documentElement.clientHeight;

        let n = 0;
        for (const element of observed) {
          let viewable = element.isConnected; //  && !element.hidden;
          if (viewable) {
            const bounds = element.getBoundingClientRect();
            viewable = (bounds.top > 0 || bounds.bottom > 0) && bounds.top < height;
          }
          element.viewable === viewable || (element.viewable = viewable);
          n++ % 500 || (await new Promise(requestAnimationFrame));
        }
        updating = false;
      };
      const events = ['scroll', 'resize'];
      const options = {passive: true};
      let connected = undefined;
      /** @type {IntersectionObserver} */
      this.intersectionObserver = {
        observe(target) {
          observed.add(target);
          connected || this.connect();
        },
        unobserve(target) {
          observed.size && observed.delete(target);
          !observed.size && connected && this.disconnect();
        },
        connect() {
          if (connected) return;
          connected === undefined && idle(update);
          connected = true;
          for (const event of events) window.addEventListener(event, update, {passive: true});
        },
        disconnect() {
          if (!connected) return;
          connected = false;
          for (const event of events) window.removeEventListener(event, update);
        },
      };
    }
  }

  observe(element) {
    this.intersectionObserver.observe(element);
  }

  unobserve(element) {
    this.intersectionObserver.unobserve(element);
  }
}

export const viewPort = new ViewPort();

/// GLOBALS ///

export function define(object, property, value, writable = false, configurable = true) {
  return object && property
    ? Object.defineProperty(object, property, {value, writable, configurable})[property]
    : value;
}

export function indeterminate(object, property, accept, value) {
  return new Promise(resolve => {
    const resolver = value => resolve(value);
    Object.defineProperty(object, property, {
      get: () => value,
      set: value => accept(value, resolver),
      configurable: true,
    });
  }).then(value => define(object, property, value));
}

export function constant(target, property) {
  return Object.defineProperty(target, property, {
    get: noop,
    set: value => value === undefined || define(target, property, value),
    configurable: true,
  });
}

export function constants(target, ...properties) {
  const descriptors = {};
  for (const property of properties) {
    descriptors[property] = {
      get: noop,
      set(value) {
        value === undefined || !this || (
          this.constructor && this.constructor.prototype === this
        ) || define(this, property, value);
      },
      configurable: true,
    };
  }
  return Object.defineProperties(target, descriptors);
}

export const idle =
  typeof cancelIdleCallback === 'function' && typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : ƒ => setTimeout(ƒ, 100);
export const cancelIdle = idle.name ? cancelIdleCallback : clearTimeout;

export function Throw(error) {
  if (new.target) return () => Throw(error);
  throw !error
    ? Throw.sloppy || (Throw.sloppy = Error('Ouch: sloppy code!'))
    : (!('message' in error && 'type' in error) && Error(error)) || error;
}

export function noop() {
  noop = () => {};
}

export function False() {
  False = () => false;
}

/// TRASH ///

// class TemplateStrings extends Array {}

// Object.setPrototypeOf([],Object.create(null, {[Symbol.iterator]: {value: Array.prototype[Symbol.iterator]}}))
