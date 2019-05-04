import {define, constants} from './helpers.js';

const raw = String.raw;
const {defineProperty, freeze} = Object;

export const InvalidType = message => new Throw(TypeError(message));

export const render = (spans, values) => {
  // TODO: Maybe validate lengths before rendering
  if (!spans || !(spans.length > 0)) return '';
  if (!values) return Reflect.apply(raw, null, spans);
  const strings = spans.strings || spans[0] || spans;
  return (strings && strings.raw && raw(strings, ...values)) || '';
};

/// ABSTRACT TEMPLATE SPANS ///

export class TemplateSpans extends Array {
  static marker(body) {
    return `{{${body || ''}}}`;
  }

  constructor(strings, properties) {
    const length = strings && ((strings = [...strings]).raw = strings).length;
    const spans = length - 1;

    length > 0 ||
      InvalidType(
        `TemplateSpans constructor requires a raw "strings" array argument with at least one string`,
      )();

    super(length);

    // Well-Formed Immutable Properties
    defineProperty(this, '0', {value: (this.strings = this[0] = freeze(strings)), writable: false});
    define(this, 'marker', (properties && properties.marker) ||
      this.marker ||
      TemplateSpans.marker);
    define(this, 'render', this.render);
    const prefix = (this.prefix =
      (properties && properties.prefix) || (Math.random() * 10e8).toString(32));
    const keys = (this.keys = Array(spans));
    const marks = (this.marks = Array(spans));
    for (let i = 0, n = spans; n--; ) {
      marks[i] = this.marker((keys[i] = `${prefix}-${++i}`));
    }

    freeze(keys), freeze(marks);

    // Arbitrary Properties
    if (properties && properties) {
      for (const k in properties) this.hasOwnProperty(k) || (this[k] = properties[k]);
    }
  }

  get values() {
    return this.slice(1);
  }

  get template() {
    return this.render(this.marks);
  }

  toString() {
    return this.render();
  }

  render(values) {
    return render(this, values);
  }
}

constants(TemplateSpans.prototype, 'strings', 'marker', 'prefix', 'keys', 'marks');

/// ABSTRACT TEMPLATE SPAN ///

export class TemplateSpan {
  constructor(properties) {
    properties && Object.assign(this, properties);
  }

  toString() {
    const text = 'text' in this ? this.text : undefined;
    return text === null || text === undefined ? '' : text;
  }
}

constants(TemplateSpan.prototype, 'mark', 'index');

TemplateSpan.symbol = Symbol('{{Template Span}}');

/// HTML TEMPLATE SPANS ///

export class HTMLTemplateSpans extends TemplateSpans {
  constructor(strings, properties) {
    super(strings, properties);
  }
}

// constants(HTMLTemplateSpans.prototype, 'mark');

/// HTML TEMPLATE ATTRIBUTE SPAN ///

export class HTMLAttributeSpan extends TemplateSpan {
  update(value) {
    const attribute = this.attribute;
    if (!attribute) return false;
    const previous = attribute.value;
    const changed = value === undefined || previous !== value || typeof previous === 'object';
    if (!changed) return false;
    value === undefined || (attribute.value = value);
    return (this.element && this.updateElement()) || false;
  }
  async updateElement() {
    const attribute = this.attribute;
    const element = this.element;
    const name = attribute.name;
    let value = attribute.value;
    if (!attribute || !element) return false;
    const previous = attribute.last;
    const resolved = value ? await value : value;
    if (typeof resolved === 'function') {
      console.error('Not supported: Function as attribute value');
    } else {
      const current = resolved == null ? resolved : `${resolved}`;
      const changed =
        previous !== current &&
        // <false> outdated value (ie debounce)
        (attribute.value !== value ||
        // <false> unspecified (ie preserve current)
        resolved === undefined
          ? false
          : // <true/false if present and removed>
            resolved === null
            ? element.hasAttribute(name) && (element.removeAttribute(name), true)
            : // <true/false if present and changed>
              // (value = `${value || ''}`) !== element.getAttribute(name) &&
              (element.setAttribute(name, value), true));
      changed && (this.text = `${(attribute.last = current) || ''}`);
      return changed;
    }
  }
}

constants(HTMLAttributeSpan.prototype, 'attribute');

/// HTML TEMPLATE TEXT SPAN ///

export class HTMLTextSpan extends TemplateSpan {
  update(value) {
    const previous = this.value;
    const changed = value === undefined || previous !== value || typeof previous === 'object';
    if (!changed) return false;
    value === undefined || (this.value = value);
    return this.updateText();
  }

  async updateText() {
    const previous = this.text;
    const value = this.value;
    const resolved = value ? await value : value;
    const current = resolved == null ? '' : `${resolved}`;
    if (this.value === value && this.text !== current) {
      this.text = current;
      if (this.updateElement) this.updateElement();
      return true;
    }
    return false;
  }
}

/// HTML TEMPLATE SLOT SPAN ///

export class HTMLSlotSpan extends TemplateSpan {}
