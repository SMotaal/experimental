const preferences = {
  classic: false,
  // dynamic: true,
  base: '/node_modules/monaco-es/dist/',
  extension: '.js',
  workers: {
    editor: './monaco/editor.worker',
    resolve: mode => `./languages/${mode}/${mode}.worker`,
    dynamic: './worker.js',
  },
};

const platform = {
  ...((typeof navigator === 'object' && {
    chrome: typeof chrome === 'object',
    safari: /Version\/.* Safari\//.test(navigator.userAgent),
  }) ||
    undefined),

  node: typeof process === 'object' && process.versions && 'node' in process.versions,
};

const supports = (platform.supports = {
  modules: platform.chrome || platform.safari,
  static: platform.chrome,
});

const {defineProperties, entries} = Object;

const defaults = defineProperties(
  {
    modes: [preferences.default || 'editor', 'html', 'css', 'js', 'json', 'ts'],
    mappings: {ts: 'typescript', js: 'javascript'},
    workers: {resolve: mode => `./${mode}.worker`},
    base: '.',
  },
  {
    // base: {get: () => `${new URL(preferences.base || '.', import.meta.url)}`},
    extension: {get: () => (/[^/]+(\.m?js|)/.exec(import.meta.url) || '')[1] || '.js'},
    modes: {get: () => [preferences.fallback || 'editor', 'html', 'css', 'js', 'json', 'ts']},
  },
);

const configuration = defineProperties(
  {},
  {
    modules: {get: () => supports.modules && !preferences.classic},
    dynamic: {get: () => preferences.dynamic || !supports.static},
    extension: {get: () => preferences.extension || defaults.extension},
    // base: {get: () => preferences.base || defaults.base},
    modes: {get: () => preferences.modes || defaults.modes},
    mappings: {get: () => ({...defaults.mappings, ...preferences.mappings})},
    aliases: {
      get() {
        const {modes, mappings} = this;
        const aliases = {default: modes[0]};
        for (const mode of modes) aliases[mode] = mode;
        for (const [mode, mapping] of entries(mappings)) {
          if (aliases[mode]) aliases[mapping] = mode;
        }
        return aliases;
      },
    },
    options: {
      get() {
        return {type: this.modules ? 'module' : 'classic'};
      },
    },
    paths: {
      get() {
        const {extension, modes} = this;
        const workers = {...defaults.workers, ...preferences.workers};
        const paths = {
          dynamic: workers.dynamic || `worker${extension}`,
        };
        const resolve = workers.resolve;
        for (const mode of modes) {
          paths[mode] = `${workers[mode] || resolve(mode)}${extension}`;
        }
        return paths;
      },
    },
  },
);

const environment = base => {
  const {log} = console;

  const {dynamic, options, aliases, paths} = configuration;

  base = `${new URL(base || preferences.base || defaults.base, import.meta.url)}/`;

  const resolved = {};

  const resolve = path => resolved[path] || (resolved[path] = `${new URL(path, base)}`);

  const getWorker = (moduleID, label) => {
    const mode = aliases[label] || aliases.default;
    const path = paths[mode];
    const src = resolve(path); // resolved[path] || (resolved[path] = resolve(path));
    const url = dynamic ? `${resolve(paths['dynamic'])}#${src.replace(base, '')}` : src;
    const worker = new Worker(url, options);
    log('getWorker(%o, %o) => %O', moduleID, label, {worker, mode, src, url, options});
    // Log(() => ['getWorker(%o, %o) => %O', moduleID, label, {worker, mode, src, url, options}]);
    return worker;
  };
  const environment = {config: {dynamic, options, aliases, paths}, base, getWorker};
  log('monaco-environment: %o', environment);
  return environment;
};

// const {
//   // modules: MODULES,
//   dynamic: DYNAMIC,
//   // options: OPTIONS,
//   extension: EXTENSION,
//   // base: BASE,
//   aliases,
//   paths,
// } = configuration;

// // const {Log, CurrentScope} = Debugging();

// const resolve = (alias, base) => {
//   let mapping = mappings[alias];
//   if (!mapping) {
//     const name = aliases[alias] || 'editor';
//     mapping = mappings[alias] = `${new URL(`./${paths[name]}`, base)}`;
//   }
//   return mapping;
// };

// const getWorker = (moduleID, label) => {
//   const mode = aliases[label] || aliases.default;
//   const src = resolve(mode, configuration.base);
//   const url = getWorkerURL(configuration.base, src, configuration.dynamic);
//   const options = configuration.options;
//   const worker = new Worker(url, options);
//   log('getWorker(%o, %o) => %O', moduleID, label, {worker, mode, src, url, options});
//   // Log(() => ['getWorker(%o, %o) => %O', moduleID, label, {worker, mode, src, url, options}]);
//   return worker;
// };

// const getWorkerURL = (base, src, dynamic) =>
//   dynamic ? `${new URL(`./worker${EXTENSION}`, base)}#${src.replace(base, '')}` : `${src}`;
// ({
//   base,
//   getWorker(moduleID, label) {
//     return getWorker(moduleID, label, base);
//   },
// });

// function Debugging() {
//   const {setPrototypeOf, defineProperties, defineProperty, freeze} = Object;
//   const debugging = {};
//   const namespace = {};
//   const noop = freeze(a => a);
//   const configurable = true;

//   Debugging = () => debugging;

//   const imports = import(`../node_modules/monaco-es/debugging${EXTENSION}`)
//     .then(imports => {
//       const descriptors = {};
//       for (const k in imports) descriptors[k] = {get: () => namespace[k], configurable};
//       defineProperties(debugging, descriptors);
//       return setPrototypeOf(namespace, imports);
//     })
//     .catch(r => console.warn(r) || namespace);

//   const apply = async (k, args) => {
//     const [n, ...p] = await Promise.all([imports, ...(await args)]);
//     return Reflect.apply(namespace[k] || noop, null, p);
//   };

//   const proxy = new Proxy(setPrototypeOf(new class Debugging {}(), null), {
//     get: (t, k) =>
//       (k &&
//         typeof k === 'string' &&
//         defineProperty(debugging, k, {
//           value: ƒ => apply(k, ƒ()),
//           configurable,
//         })[k]) ||
//       noop,
//   });

//   return setPrototypeOf(debugging, proxy);
// }

export default environment;
// export {Log, CurrentScope, getWorker};

// const MODULES = supports.modules && !preferences.classic; // platform.modules
// const DYNAMIC = !supports.static; // !MODULES || preferences.dynamic;
// const OPTIONS = {type: MODULES ? 'module' : 'classic'};
// const EXTENSION = preferences.extension || defaults.extension;
// const BASE = preferences.base || defaults.base;
// const PREFIX = preferences.prefix || defaults.prefix;
// const aliases = configuration.aliases();
// const paths = configuration.paths(PREFIX, EXTENSION);
