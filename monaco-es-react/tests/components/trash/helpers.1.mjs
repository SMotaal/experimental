/// <reference path="types.d.ts" />

import * as polyfills from './polyfills.mjs';

/// CONSTANTS ///

const malformed = new Throw(SyntaxError(`Malformed`));
const resolved = Promise.resolve();
const noop = () => {};

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

  // const render = (strings, ... values) => {
  //   for (let i = 0, n = values.length; n--; i++)
  //     !values[i] || values[i].then && (values[i] = '');
  //   return raw(strings, ...values);
  // }

  const createFragment = html => ((template.innerHTML = html), template.content.cloneNode(true));

  // console.table([`<div a="`, `<div a="{{}}" b="`, `<div/> a="`].map(v => /<([a-z][^\s>]+)((?:[^>]+(?=\s)|)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/s.exec(v)))

  // console.table([`<div a="`, `<div a="{{}}" b="`, `<div/> a="`, `<div/><div a="`].map(v => /^((?:[^>]+|.*<[a-z][^>]+)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/sg.exec(v)))

  const AttributeSpan = /^((?:[^>]+|.*<[a-z][^>]+)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/gs;
  // /^((?:[^>]+|.*<[a-z][^>]+)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/gs;

  const Interpolation = Symbol('{{interpolation}}');

  const prerender = spans => Reflect.apply(raw, String, spans);

  const render = spans => {
    // if (spans && spans.spans === spans && spans.length > 1) {
    const values = Array(spans.length);
    values[0] = spans[0];
    for (let index = 1, n = spans.length; --n; index++) {
      const value = spans[index];
      values[index] =
        value && value.attribute && !value.attribute.quote ? `"${value || ''}"` : `${value || ''}`;
    }
    return Reflect.apply(raw, String, values);
    // }
    // return Reflect.apply(raw, String, spans);
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
      }

      const prerendered = render(marks);
      // const template = createFragment(`<template >${prerendered}</template>`).children[0];
      // const fragment = template.content;
      const fragment = createFragment(prerendered);

      // TODO: Connect Attributes;
      for (const mark in attributes) {
        const span = attributes[mark];
        const attribute = span.attribute;
        const name = attribute.name;
        const selector = (attribute.selector = `[${attribute.name}="${mark}"]`);
        const element = (attribute.element = fragment.querySelector(selector));
        if (!element) {
          console.warn(attribute);
        } else {
          span.update = async value => {
            element.removeAttribute(`${name}-`);
            attribute.value = value;
            const resolved = await value;
            if (attribute.value === value) {
              if (resolved === null) element.removeAttribute(name);
              else element.setAttribute(name, `${value || ''}`);
            }
          };
          span.update(null);
          // console.log(attribute);
        }
      }

      // TODO: Connect Literals
      {
        const prefixed = `{{${prefix}-`;
        const Marks = new RegExp(`\{\{${prefix}-.*?\}\}`, 'g');
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
        // const matched = [];
        let node;
        while ((node = nodeIterator.nextNode())) {
          const text = node.textContent;
          const element = node.parentElement;
          const strings = text.split(Marks);
          strings.raw = strings;
          const spans = [strings];
          // const marks = [];
          let match;
          let updating;
          const updateElement = () => {
            updating = undefined;
            element.textContent = render(spans);
          };
          while ((match = Marks.exec(text))) {
            const mark = match[0];
            const span = literals[mark];
            if (span) {
              const updateSpan = span.update;
              span.update = value => {
                updateSpan(value);
                updating && cancelAnimationFrame(updating);
                updating = requestAnimationFrame(updateElement);
              };
              spans.push(span);
              // marks.push(mark);
            }
          }

          // matched.push({node, element, strings});
        }
        // console.log(matched);
      }

      fragment.spans = spans;
      fragment.update = values => {
        if (length - values.length !== 1)
          return console.warn(
            `Spans mismatch — %O(%d) <- %O(%d)`,
            spans,
            length,
            values,
            values.length,
          );
        for (let index = 1, n = length; --n; index++) {
          spans[index].update(values[index - 1]);
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

  const resolved = values => {
    for (const value of values)
      if (value && value.then && typeof value.then === 'function') {
        return Promise.all(values);
      }
    return values;
  };

  html = (strings, ...values) => {
    const fragment = interpolate(strings);
    const result = fragment;
    const promises = resolved(values);
    const promise =
      values === promises
        ? Promise.resolve(result)
        : promises.then(values => {
            fragment.update(values);
          });
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

// const create = html => {
//   template.innerHTML = html;
//   const fragment = createFragment(html);
//   fragment.fragment = fragment;
//   fragment.nodes = [...fragment.children];

//   if (!fragment.children.length) {
//     fragment.update = () => nodes;
//   } else {
//     // TODO: Handle mismatched fragment structure
//     fragment.update = html => {
//       const newFragment = createFragment(html);
//       const fragmentNodes = fragment.nodes; // fragment.children;
//       const newNodes = newFragment.children;
//       if (newNodes.length !== fragmentNodes.length) {
//         return console.warn(
//           `Update mismatch — %O(%d) <- %O(%d)`,
//           fragment,
//           length,
//           newFragment,
//           newNodes.length,
//         );
//       }

//       for (let position = 0, n = fragmentNodes.length; n--; position++)
//         updateNode(fragmentNodes[position], newNodes[position]);
//     };

//     let position = 0;
//     for (const node of fragment.children) {
//       node.fragment = fragment;
//       node.updateNode = newNode => updateNode(node, newNode);
//     }

//     // if (length === 1) return nodes[0];
//   }
//   return fragment;
// };

// const contentTags = new Set('STYLE', 'SCRIPT');

// const updateNode = (node, {innerHTML, attributes, textContent}) => {
//   if (innerHTML && node.innerHTML !== innerHTML) {
//     // const tag = node.localName;
//     if (contentTags.has(node.tagName)) {
//       node.textContent = textContent;
//     } else {
//       node.innerHTML = innerHTML;
//     }
//   }
//   if (attributes && typeof attributes !== 'object') {
//     if ('getNamedItem' in attributes) {
//       for (const {name, value} of attributes) node.setAttribute(name, value);
//     } else {
//       for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
//     }
//   }
//   return node;
// };
// const promise = Promise.all(values).then(values => {
//   fragment.update(values);
//   // console.log({values, result});
//   // return result;
// });
// values === (values = resolved(values))
//   ? Promise.resolve(result)
//   : values.then(values => {fragment.update()})

// console.table([`<div a="`, `<div a="{{}}" b="`, `<div/> a="`].map(v => /<([a-z][^\s>]+)((?:[^>]+(?=\s)|)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/s.exec(v)))

// console.table([`<div a="`, `<div a="{{}}" b="`, `<div/> a="`, `<div/><div a="`].map(v => /^((?:[^>]+|.*<[a-z][^>]+)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/sg.exec(v)))
// /^((?:[^>]+|.*<[a-z][^>]+)\s+)([a-z](?:[a-z-]+[a-z])*)(\s*=)(["']|)$/gs;
