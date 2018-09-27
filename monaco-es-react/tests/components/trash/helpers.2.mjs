/// <reference path="types.d.ts" />

import * as polyfills from './polyfills.mjs';

/// INTERNAL ///

const malformed = new Throw(SyntaxError(`Malformed`));
const noop = () => {};
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

/// RESOURCES ///

/** @type {components.helpers.resource} */
export const resource = properties => new Resource(properties);

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
    const {body, type} = this;
    if (body) return define(this, 'blob', new Blob([body], {type}));
  }

  /** @readonly */
  get url() {
    const blob = this.blob;
    return (blob && define(this, 'url', URL.createObjectURL(blob))) || '';
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
      const body = String.raw(...arguments);
      const [, opener = malformed(), content = malformed(), closer = malformed()] =
        /(<.+?>|)(.*)(<\/.+?>)/s.exec(body) || '';
      this.body = content;
    }
    return this;
  }
};

constants(Resource.prototype, 'base', 'file', 'type', 'body');
// , 'text'

/// ELEMENTS ///

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

  const AttributeSpan = /^((?:[^>]+|.*<[a-z][^>]+)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/gs;

  const Interpolation = Symbol('{{interpolation}}');

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
    strings = [...strings];
    strings.raw = strings;
    if (length) {
      const spans = new Array(length);
      const marks = new Array(length);
      spans[0] = marks[0] = strings;

      const attributes = (spans.attributes = {});
      const literals = (spans.literals = {});
      const prefix = (spans.prefix = (Math.random() * 10e8).toString(32));

      let attributeSpans = 0;
      let literalSpans = 0;

      // Parsing
      for (let index = 1, n = length; --n; index++) {
        const mark = (marks[index] = `{{${prefix}-${index}}}`);
        const last = strings[index - 1];
        const next = strings[index];
        const attribute = last && next && AttributeSpan.exec(last);
        // console.log(attribute);
        if (attribute) {
          const [, before, name, separator, quote] = attribute;
          const after = /\S/.exec(next) || '';
          if (!quote || after[0] === quote) {
            // Attribute Span
            const attribute = {name, separator, quote};
            const span = (spans[index] = attributes[mark] = {
              [Interpolation]: mark,
              index,
              attribute,
              update: value => (attribute.value = value),
              toString: () => `${attribute.value || ''}`,
            });
            attributeSpans++;
            continue;
          } //else console.warn(last, {mark, last, next, quote, after});
        }
        // Literal Span
        const span = (spans[index] = literals[mark] = {
          [Interpolation]: mark,
          index,
          toString: () => `${span.value || ''}`,
          update: value => (span.value = value),
        });
        literalSpans++;
      }

      const prerendered = render(marks);
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
            const element = (attribute.element = fragment.querySelector(selector));
            if (!element) {
              console.warn(attribute);
            } else {
              span.update = async (value = attribute.value) => {
                attribute.value = value;
                const resolved = await value;
                if (attribute.value === value)
                  if (resolved === null)
                    return element.hasAttribute(name) && (element.removeAttribute(name), true);
                  else
                    return (
                      (value = `${value || ''}`) !== element.getAttribute(name) &&
                      (element.setAttribute(name, value), true)
                    );
                return false;
              };
              span.update(null);
              (element.spans || (element.spans = [])).push(span);
              // console.log(attribute);
            }
          }
        }

        // Literals
        if (literalSpans) {
          const prefixed = `{{${prefix}-`;
          const Marks = new RegExp(`(\{\{${prefix}-.*?\}\})`, 'g');
          const Pairs = new RegExp(`(.*?)(\{\{${prefix}-.*?\}\}|(?=$))`, 'gs');
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
            // if (element.childElementCount) {
            //   // TODO: Slot Text
            //   // const slot = document.createElement('slot');
            //   // slot.name =
            // } else {
            //   const pairs = text.split(Marks);
            //   const strings = Array(pairs.length / 2);
            //   const marks = Array(pairs.length / 2) - 1;
            //   for (let i = 0, n = strings.length; n--; i++) {
            //     strings[i] = pairs[i + i];
            //     n || (marks[i] = pairs[i + i + 1]);
            //   }
            //   console.log(pairs);
            //   // TODO: Split Text
            // }
          // // }
          // // while ((node = nodeIterator.nextNode())) {
          //   // const text = node.textContent;
          //   // const element = node.parentElement;
            // const strings = text.split(Marks);

            const pairs = text.split(Marks);
            const length = ~~(pairs.length / 2) + 1;
            const strings = Array(length);
            const marks = Array(length - 1);
            for (let i = 0, n = length, j; n; i++) {
              strings[i] = pairs[j = i + i] || "";
              n-- && (marks[i] = pairs[j + 1]);
            }

            // console.log({pairs, length, strings, marks});
            strings.raw = strings;
            const spans = [strings];
            // let match;
            // while ((match = Marks.exec(text))) {
            let updating;
            const updateElement = () => {
              updating = undefined;
              element.textContent = render(spans);
            };
            for (const mark of marks) {
              // const mark = match[0];
              const span = literals[mark];
              if (span) {
                const updateSpan = span.update;
                span.update = (value = span.value) => {
                  const text = `${value}`;
                  if (value !== span.value || span.text !== text) {
                    updateSpan(value);
                    span.text = text;
                    updating && cancelAnimationFrame(updating);
                    updating = requestAnimationFrame(updateElement);
                    return true;
                  }
                  return false;
                };
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
        if (updates !== undefined) {
          if (length - updates.length !== 1)
            return console.warn(
              `Spans mismatch — %O(%d) <- %O(%d)`,
              spans,
              length,
              updates,
              updates.length,
            );
          for (let index = 1, n = length; --n; index++) spans[index].update(updates[index - 1]);
        } else {
          for (let index = 1, n = length; --n; index++) spans[index].update();
        }
        return fragment;
      };
      fragment.render = () => render(spans);
      fragment.render();

      return fragment;
    } else {
      const spans = [strings];
      const prerendered = render(spans);
      const fragment = createFragment(prerendered);
      fragment.spans = spans;
      fragment.update = () => fragment;
      fragment.render = () => prerendered;
      return fragment;
    }
  };

  html = (strings, ...values) => {
    const fragment = interpolate(strings);
    const result = fragment;
    const promise = resolvables(values)
      ? Promise.all(values).then(values => fragment.update(values))
      : resolved;
    result.then = (ƒv, ƒe) => promise.then(() => ƒv(result), ƒe);
    return result;
  };

  return html(strings, ...values);
}

export function createElement(tag, options) {
  createElement =
    (typeof document === 'object' &&
      document.createElement &&
      document.createElement.bind(document)) ||
    ((tag, options) =>
      new ((tag === 'template' && polyfills.fakeHTMLTemplateElement) ||
        polyfills.fakeHTMLElement)());
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

/// GLOBALS ///

export function define(object, property, value, writable = false, configurable = true) {
  return object && property
    ? Object.defineProperty(object, property, {value, writable, configurable})[property]
    : value;
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
        value === undefined || define(this, property, value);
      },
      configurable: true,
    };
  }
  return Object.defineProperties(target, descriptors);
}

export const idle =
  typeof requestIdleCallback === 'function' ? requestIdleCallback : ƒ => setTimeout(ƒ, 100);

export function Throw(error) {
  if (!new.target) throw error || Error('Ouch: sloppy code!');
  return () => Throw(error);
}

/// TRASH ///

// class TemplateStrings extends Array {}
