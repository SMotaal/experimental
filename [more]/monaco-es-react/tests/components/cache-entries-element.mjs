import {define, tagNameFor, Component, Resource} from './helpers.mjs';
import cachable from '../prototypes/cachable.mjs';

export class CacheEntriesElement extends Component.mixin(HTMLTemplateElement) {
  get entries() {
    return Entries.from(this);
  }

  put() {
    return CacheEntriesElement.put(this);
  }

  static async put(cacheEntries, cache) {
    const Class = this || CacheEntriesElement;
    cache = await (cache || Class.default || (Class.default = self.caches.open('default')));
    const Entries = await Prototypes.import('cache-entries');
    const entries = Entries.from(cacheEntries);
    const filename = location.pathname.replace(/^.*[/]/, '');
    const base = new URL(`./caches/${filename}/`, location);
    for (const [name, entry] of entries) {
      if (entry.body === undefined) continue;
      const {type, body} = entry;
      let operation = body === null ? 'delete' : 'put';
      const src = (entry.src = new URL(name, base).pathname);
      // console.log(`[cache] %s <%s> %o`, operation, src, entry);
      await Resource.cache(cache, src, body, type);
      // await CacheEntriesElement.cache(cache, src, body, type);
    }
    return entries;
  }

  static async caches(key) {
    const caches = this.caches || CacheEntriesElement.caches;
    return await (caches[key] || (caches[key] = self.caches.open(key)));
  }

  static async cache(cache, path, data, type) {
    if (!cache || data === undefined || !path) return;
    const record = {};

    try {
      cache = record.cache = await ((typeof cache === 'string' && (cache = caches(cache))) ||
        cache);
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

  static in(root) {
    const tag = (this.hasOwnProperty('tag') && this.tag) || tagNameFor(this);
    if (tag) return root.querySelectorAll(`[is=${tag}]`);
  }

  // static then(ƒ) {
  //   if (!this.hasOwnProperty('defined')) {
  //     const tag = (this.hasOwnProperty('tag') && this.tag) || tagNameFor(this);
  //     const promise = tag && define(this, 'defined', customElements.whenDefined(tag));
  //     if (!promise)
  //       throw ReferenceError(
  //         `When defined requires a Custom Element with a valid tag property or class name`,
  //       );
  //     return promise.then(ƒ);
  //   } else {
  //     return this.defined.then(ƒ);
  //   }
  // }

  // static define(options) {
  //   const tag =
  //     typeof options === 'string'
  //       ? options
  //       : (options && options.tag) || (this.hasOwnProperty('tag') && this.tag) || tagNameFor(this);
  //   customElements.define(tag, this, (typeof options === 'object' && options) || undefined);
  //   define(this, 'tag', tag);
  //   return this;
  // }
}

CacheEntriesElement.define({extends: 'template'});

export const put = CacheEntriesElement.put;
export const cache = CacheEntriesElement.cache;

export default CacheEntriesElement;

// record.data = typeof data === 'string' || (data = JSON.stringify(data));
// const blob = record.data = new Blob([data], { type });
