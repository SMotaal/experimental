export default (() => {
  // const filename = location.pathname.replace(/^.*[/]/, '');
  // const base = new URL(`./caches/${filename}/`, location);

  const define = (object, property, value, writable = false, configurable = true) => {
    return object && property
      ? Object.defineProperty(object, property, {value, writable, configurable})[property]
      : value;
  };

  const contentElementFrom = element => (element && element.content) || element || null;

  const attribute = (element, name, value) => {
    try {
      if (value === null) element.removeAttribute(name);
      else if (value !== undefined) element.setAttribute(name, value);
      return element.getAttribute(name);
    } catch (exception) {
      return null;
    }
  };

  class CacheEntry {
    constructor(properties) {
      Object.assign(this, properties);
    }

    static from(element) {
      const content = contentElementFrom(element);
      if (!content) return {};
      const file = attribute(element, 'file');
      const directory = !file && attribute(element, 'directory');
      const name = file || directory;
      if (!name) return;
      const tag = element.localName;
      const type = directory ? 'directory' : attribute(element, 'type');
      return new (this || CacheEntry)({name, type, tag, element, content});
    }

    get entries() {
      if (!this.type) return;
      return define(this, 'entries', (this.type === 'directory' && Entries.from(this)) ||
        undefined);
    }

    get body() {
      const type = this.type;
      if (type && type !== 'directory') {
        const content = contentElementFrom(this);
        if (content && 'innerHTML' in content) return content.innerHTML;
        const element = this.element;
        if (element && 'innerHTML' in element) return element.innerHTML;
      }
    }
  }

  class CacheEntries extends Map {
    constructor(properties, entries) {
      super(entries || (properties && properties.entries) || undefined);
      Object.assign(this, properties);
    }

    static from(element, properties) {
      const content = contentElementFrom(element);
      if (!content) return;
      const entries = new (this || Entries)({element, content});
      for (const element of content.children) {
        const entry = CacheEntry.from(element);
        entry && entries.set(entry.name, entry);
      }
      return entries;
    }
  }

  return CacheEntries;
})();

// class Entry {
//   constructor(properties) {
//     Object.assign(this, properties);
//   }

//   static from(element) {
//     const content = contentElementFrom(element);
//     if (!content) return;
//     const file = attribute(element, 'file');
//     const directory = !file && attribute(element, 'directory');
//     const name = file || directory;
//     if (!name) return;
//     const tag = element.localName;
//     const type = directory ? 'directory' : attribute(element, 'type');
//     return new (this || Entry)({ name, type, tag, element, content });
//   }

//   get entries() {
//     if (!this.type) return;
//     return define(this, 'entries', this.type === 'directory' && Entries.from(this) || undefined);
//   }

//   get body() {
//     const type = this.type;
//     if (type && type !== 'directory') {
//       const content = contentElementFrom(this);
//       if (content && 'innerHTML' in content) return content.innerHTML;
//       const element = this.element;
//       if (element && 'innerHTML' in element) return element.innerHTML;
//     }
//   }
// }

// class Entries extends Map {
//   constructor(properties, entries) {
//     super(entries || properties && properties.entries || undefined);
//     Object.assign(this, properties);
//   }

//   static from(element, properties) {
//     const content = contentElementFrom(element);
//     if (!content) return;
//     const entries = new (this || Entries)({ element, content });
//     for (const element of content.children) {
//       const entry = Entry.from(element);
//       entry && entries.set(entry.name, entry);
//     }
//     return entries;
//   }
// }

// const contentElementFrom = element =>
// element && element.content || element || null;

// const attribute = (element, name, value) => {
// try {
//   if (value === null) element.removeAttribute(name);
//   else if (value !== undefined) element.setAttribute(name, value);
//   return element.getAttribute(name);
// } catch (exception) {
//   return null;
// }
// }
