/// GLOBALS ///

export const currentDocument =
  typeof document === 'object' &&
  document.nodeType === 9 &&
  typeof document.createElement === 'function' &&
  document;

export const currentWindow =
  currentDocument && typeof currentDocument.defaultView === 'object' && currentDocument.defaultView;

export const Document =
  currentDocument &&
  typeof currentDocument.constructor === 'function' &&
  currentDocument.constructor;

export const Window =
  currentWindow && typeof currentWindow.constructor === 'function' && currentWindow.constructor;

/// HTMLElement ///

export const HTMLElement =
  typeof currentWindow.HTMLElement === 'function' && currentWindow.HTMLElement;

export const fakeHTMLElement = class HTMLElement {
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
//   return (new.target && new fakeHTMLElement(innerHTML)) || fakeHTMLElement;
// }

/// HTMLTemplateElement ///

export const HTMLTemplateElement =
  typeof currentWindow.HTMLTemplateElement === 'function' && currentWindow.HTMLTemplateElement;

export const fakeHTMLTemplateElement = ((HTMLElement = fakeHTMLElement) =>
  class HTMLTemplateElement extends HTMLElement {
    get content() {
      if (this === HTMLTemplateElement) return;
      const value = {children: [], cloneNode: deep => this.cloneNode(deep)};
      Object.defineProperty(this, 'content', {value});
      return value;
    }
  })();

// export function fakeHTMLTemplateElement() {
//   const HTMLElement = polyfills.HTMLElement; // fakeHTMLElement();

//   fakeHTMLTemplateElement = ;

//   return new.target ? new fakeHTMLTemplateElement() : fakeHTMLTemplateElement;
// }

/// HELPERS ///

const createFakeElement = (tag, options) =>
  new ((tag === 'template' && fakeHTMLTemplateElement) || fakeHTMLElement)();

/// CONSTANTS ///

export const NodeTypes = (({
  ATTRIBUTE_NODE = 2,
  CDATA_SECTION_NODE = 4,
  COMMENT_NODE = 8,
  DOCUMENT_FRAGMENT_NODE = 11,
  DOCUMENT_NODE = 9,
  DOCUMENT_TYPE_NODE = 10,
  ELEMENT_NODE = 1,
  ENTITY_NODE = 6,
  ENTITY_REFERENCE_NODE = 5,
  NOTATION_NODE = 12,
  PROCESSING_INSTRUCTION_NODE = 7,
  TEXT_NODE = 3,
} = {}) => ({
  ATTRIBUTE_NODE,
  CDATA_SECTION_NODE,
  COMMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_TYPE_NODE,
  ELEMENT_NODE,
  ENTITY_NODE,
  ENTITY_REFERENCE_NODE,
  NOTATION_NODE,
  PROCESSING_INSTRUCTION_NODE,
  TEXT_NODE,
}))(typeof HTMLElement === 'object' && HTMLElement.prototype);

/// POLYFILLS ///

export const polyfills = {};

// console.log({Document, HTMLElement, currentDocument, currentWindow});

if (!Document || !HTMLElement || !HTMLTemplateElement) {
  polyfills.HTMLElement = fakeHTMLElement;
  polyfills.HTMLTemplateElement = fakeHTMLTemplateElement;
  polyfills.createElement = createFakeElement;
}

export default polyfills;
