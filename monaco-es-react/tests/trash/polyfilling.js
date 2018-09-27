function fakeHTMLElement(innerHTML) {
  fakeHTMLElement = class HTMLElement {
    constructor(innerHTML = '') {
      this.innerHTML = innerHTML;
    }
    get children() {
      return [];
    }
    cloneNode(deep) {
      return new this.constructor(this.innerHTML);
    }
  };
  return (new.target && new fakeHTMLElement(innerHTML)) || fakeHTMLElement;
}

function fakeHTMLTemplateElement() {
  const HTMLElement = fakeHTMLElement();

  fakeHTMLTemplateElement = class HTMLTemplateElement extends HTMLElement {
    get content() {
      if (this === HTMLTemplateElement) return;
      const value = {children: [], cloneNode: deep => this.cloneNode(deep)};
      Object.defineProperty(this, 'content', {value});
      return value;
    }
  };

  return new.target ? new fakeHTMLTemplateElement() : fakeHTMLTemplateElement;
}

function createElement(tag, options) {
  createElement =
    (typeof document === 'object' &&
      document.createElement &&
      document.createElement.bind(document)) ||
    ((tag, options) =>
      tag === 'template' ? new fakeHTMLTemplateElement() : new fakeHTMLElement());
  return createElement(tag);
}
