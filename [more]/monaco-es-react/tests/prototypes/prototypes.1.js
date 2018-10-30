var dynamicImport = (typeof dynamicImport === 'function' && dynamicImport) || undefined;

new class Prototypes {
  constructor() {
    if (typeof self === 'object') {
      this.base = `${location.origin}/prototypes/`;

      self.Prototypes = this;

      if ('registration' in self) {
        dynamicImport = self.dynamicImport = undefined;
        this.supportsImport = false;
      } else if (!dynamicImport) {
        this.supportsImport = (async url => {
          try {
            (1, eval)('self.dynamicImport = self.dynamicImport || (url => import(url))'); // .catch(() => {})
            await self.dynamicImport('data:text/javascript,export default 1');
            dynamicImport = self.dynamicImport;
            return true;
          } catch (exception) {
            console.trace(exception);
            dynamicImport = undefined;
            return false;
          }
        })()
      }
    } else {
      this.base = `${typeof __dirname === 'string' && `file://${__dirname}` || '/prototypes'}/`;
      this.supportsImport = true;
      if (typeof module === 'object' && module.exports) module.exports = this;
      if (typeof global === 'object') {
        if (!dynamicImport) {
          (1, eval)('global.dynamicImport = url => import(url)'); // .catch(() => {})
          dynamicImport = global.dynamicImport;
        }
        global.Prototypes = this;
      }
    }
    this.default = this
  }

  import(prototype) {
    const Importer = this;

    const importer = (async () => {
      const supportsImport = await Importer.supportsImport; // !!dynamicImport;

      Importer.resolve || (Importer.resolve = url => `${Importer.base}${url}.mjs`);

      if (supportsImport) {
        return (Importer.import = async prototype => {
          const url = Importer.resolve(prototype);
          const module = await Importer.importModule(url);
          return module && module.default || module;
        })
      } else if (typeof fetch === 'function') {
        return (Importer.import = async prototype => {
          const url = Importer.resolve(prototype);
          const module = await Importer.importScript(url);
          return module && module.default || module;
        })
      } else {
        return (Importer.import = async prototype => {
          throw Error(`Prototypes: failed to import "${prototype}" — unsupported platform`);
        });
      }
    })();

    return (Importer.import = async prototype => (await importer)(prototype))(prototype);
  }

  async importScript(url) {
    const Importer = this;

    Importer.load || (Importer.load = async url => await (await fetch(url)).text());

    Importer.translate ||
      (Importer.translate = (source, sourceURL) => `
      (function() {\n${`${source || ''}`.replace(/^export default /, 'return ')}\n${(sourceURL &&
        `\n// sourceURL=${sourceURL}\n`) ||
        ''}})()
    `);

    Importer.evaluate ||
      (Importer.evaluate = (code, sourceURL) => (1, eval)(Importer.translate(code, sourceURL)));

    Importer.importScript = async url => Importer.evaluate(await Importer.load(url), url);

    console.log('importScript — %o', url);

    return Importer.importScript(url);
  }

  async importModule(url) {
    // console.log('importModule — %o', url);
    // return dynamicImport(url);
    const imported = await dynamicImport(url);
    console.log('importModule — %o — %o', url, await imported);
    return imported;
  }
}();

// if (typeof self === 'object') {
//   self.Prototypes = Prototypes;

//   if (!dynamicImport)
//     self.dynamicImport = async url => {
//       try {
//         dynamicImport = (1, eval)('dynamicImport = url => import(url).catch(() => undefined)');
//         await dynamicImport('data:text/javascript,export default 1');
//       } catch (exception) {
//         dynamicImport = undefined;
//       }
//       return dynamicImport(url);
//     };
// } else {
//   dynamicImport = url => import(url).catch(() => undefined);
// }

// (1, eval)('dynamicImport = async url => import(url)') || dynamicImport || undefined;

// static resolve(prototype, base = Prototypes.base) {
//   const Resolver = this || Prototypes;
//   Resolver.base || (Resolver.base = '/prototypes/');
//   Resolver.resolve = (prototype, base = Resolver.base) =>
//     (prototype && `${`${prototype}`.replace(/[a-z](?=[A-Z])/g, '$1-').toLowerCase()}.js`) ||
//     undefined;
// }

