import {Runtime} from '../../lib/runtime.mjs';

export class Scrubber {
  constructor(options = {}) {
    const defaults = new.target.defaults || (new.target.defaults = {});
    this.options = options = Object.assign(options || {}, defaults, options);
    this.runtime = options.runtime || defaults.runtime || (defaults.runtime = new Runtime());
    (this.scrubber = this.scrubber()).next();
    this.scrubber.cache = options.cache || {};
    this.scrub = this.scrub.bind(this);
  }

  async scrub(packageName) {
    return (
      this.scrubber.cache[packageName] ||
      (this.scrubber.cache[packageName] = this.scrubber
        .next(packageName)
        .then(result => result.value))
    );
  }

  async *scrubber() {
    const {
      runtime: {fetch},
      options: {fetch: fetchOptions = {}, fields = {}} = {},
    } = this;
    const json = async url => (await fetch(url, fetchOptions)).json();
    const cache = {};
    let name;
    let index = 0;
    while (true) {
      let current = cache[name];
      if (name && !current && (current = {name, index: index++})) {
        const {name, index} = current;
        current.package = await json(`https://unpkg.com/${name}/package.json`);


        // package@version
        const version = (current.version = current.package.version);
        const identifier = (current.identifier = `${name}${(version && `@${version}`) || ''}`);

        current.root = `https://unpkg.com/${identifier}/`;

        // package@version/entry
        const entries = (current.entries = {});
        if (fields.entries && fields.entries.length) {
          for (const field of fields.entries)
            if (field in current.package) entries[field] = current.package[field];
        }
        // current.bundle = await json(`https://bundlephobia.com/api/size?package=${identifier}`).catch(console.warn);
      }
      name = yield current;
    }
  }
}

// Object.setPrototypeOf(
//   Scrubber,
//   Object.setPrototypeOf(new Scrubber(), Object.getPrototypeOf(Scrubber)),
// );
