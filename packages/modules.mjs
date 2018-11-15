const {defineProperty, getOwnPropertyDescriptor} = Reflect;
const {create, freeze, setPrototypeOf} = Object;

const noop = () => {};

const define = (target, property, value, enumerable = false, configurable = false) =>
  defineProperty(target, property, {value, enumerable, configurable}) && value;

const bind = (target, property, get, enumerable = false, configurable = false) =>
  defineProperty(target, property, {get, set: noop, configurable, enumerable});

const copy = (target, source, identifier, alias = identifier) =>
  defineProperty(target, alias, getOwnPropertyDescriptor(source, identifier));

const ResolvedPromise = Promise.resolve();

class ModuleNamespaces {
  import(url) {
    return (
      this[url] ||
      define(this, url, Module.import(url).then(
        namespace => (bind(this, url, () => namespace, true, false), namespace),
      ), true, true)
    );
  }
}

/// ECMAScript Expressions

/** Mapped binding: `Identifier as BindingIdentifier` */
const Mappings = /([^\s,]+)(?: +as +([^\s,]+))?/g;

/** Quoted export mappings: `export {…}` */
const Exports = /`export *{([^}`;\*]*)}`/gm;

/** Nothing but Identifier Characters */
const Identifier = /[^\n\s\(\)\{\}\-=+*/%`"'~!&.:^<>,]+/;

const BindingDeclarations = /\b(import|export)\b +(?:{ *([^}]*?) *}|([*] +as +\S+|\S+)|)(?: +from\b|)(?: +(['"])(.*?)\4|)/g;

const Specifier = /^(?:([a-z]+[^/]*?:)\/{0,2}(\b[^/]+\/?)?)(\.{0,2}\/)?([^#?]*?)(\?[^#]*?)?(#.*?)?$/u;

Specifier.parse = specifier => {
  const [url, schema, domain, root, path, query, fragment] = Specifier.exec(specifier) || '';
  return {url, schema, domain, root, path, query, fragment, specifier};
};

const evaluate = code => (0, eval)(code);

const wrap = (body, source) => `
((module, exports) => {
  module.debug('module-url', module.meta.url);
  module.debug('body-text', ${JSON.stringify(body)});
  module.debug('source-text', ${JSON.stringify(source)});
  with(module.scope) (function () {
    "use strict";
    ${body}
  })();
})
`;

const rewrite = source =>
  source.replace(Exports, (match, mappings) => {
    let bindings = [];
    while ((match = Mappings.exec(mappings))) {
      const [, identifier, binding] = match;
      bindings.push(`${binding || '()'} => ${identifier}`);
    }
    return (bindings.length && `exports(${bindings.join(', ')})`) || '';
  });

const parseFunction = source =>
  (typeof source === 'function' &&
    /^\(module, exports\) *=> *{([^]*)}$|/.exec(`${source}`.trim())[1]) ||
  '';

const ModuleEvaluator = (
  source,
  sourceText = (typeof source === 'function' && parseFunction(source)) || source,
) => evaluate(wrap(rewrite(sourceText), sourceText));

function ModuleNamespace() {}
{
  const toPrimitive = setPrototypeOf(() => 'ModuleNamespace', null);
  const toString = setPrototypeOf(() => 'class ModuleNamespace {}', null);
  ModuleNamespace.prototype = create(null, {
    [Symbol.toPrimitive]: {value: toPrimitive, enumerable: false},
    [Symbol.toStringTag]: {value: 'ModuleNamespace', enumerable: false},
  });
  freeze(setPrototypeOf(ModuleNamespace, create(null, {toString: {value: toString}})));
}

const ModuleStrapper = (() => {
  return class ModuleStrapper {
    *strap(module) {
    }

    get map() {
      if (this !== this.constructor.prototype) return define(this, 'map', create(null));
    }

    async link(module) {
      const enumerable = true;
      const {namespaces, context, bindings, links} = module;
      const promises = [];
      const imports = {};
      // const dependencies = {[module.url]: true};

      // let context;
      for (const binding in links) {
        const link = links[binding];
        const {intent, specifier, identifier, url} = link;
        if (!url) continue;
        // log({specifier, identifier, url});
        const namespace = namespaces[url];
        // const linked = dependencies[url] || (dependencies[url] = this.map[url].link());
        const imported =
          url &&
          (imports[url] ||
            (imports[url] = (namespace && ResolvedPromise) || namespaces.import(url)));
        if (intent === 'import') {
          promises.push(
            imported.then(() => {
              identifier === '*'
                ? copy(bindings, namespaces, url, binding)
                : copy(bindings, namespaces[url], identifier, binding);
            }),
          );
          bind(bindings, binding, noop, enumerable, true);
        } else if (intent === 'export') {
          promises.push(
            imported.then(async () => {
              context.export.from(link);
            }),
          );
        }
      }

      await Promise.all(promises);
    }

    instantiate(module) {
      const enumerable = false;
      const namespace = new ModuleNamespace();
      const {context, bindings, namespaces, url} = module;

      context.export = (...exports) => void this.bind(namespace, ...exports);
      context.export.from = (...links) => {
        for (const link of links) {
          const {intent, specifier, identifier, binding, url} = link;
          if (intent !== 'export') continue;
          url in namespaces
            ? copy(namespace, namespaces[url], identifier, binding)
            : bind(namespace, binding, () => namespaces[url][identifier], enumerable, false);
        }
      };
      defineProperty(context.export, 'default', {
        set: value => void this.bind(namespace, {default: () => value}),
      });
      // context.export.default = value => void this.bind(namespace, {default: () => value});

      define(bindings, 'module', context, false, true);
      define(context, 'scope', setPrototypeOf(bindings, ModuleScope), enumerable, false);
      define(context, 'meta', create(null), false, false);
      define(context.scope, 'meta', context.meta, false, false);
      define(context.meta, 'url', url);
      freeze(context);
      return define(module, 'instance', {namespace, context});
    }

    async evaluate(module) {
      const {bindings, namespace, context} = await module.instantiate();
      try {
        await module.evaluator(context, context.export);
        return define(module, 'namespace', namespace);
      } catch (exception) {
        console.warn(exception);
        define(module, 'exception', exception);
      }
    }

    async import(url) {
      const module = this.map[url];
      return module.namespace || (await module.evaluate());
    }

    resolve(specifier, referrer) {
      specifier = `${(specifier && specifier) || ''}`;
      referrer = `${(referrer && referrer) || ''}` || '';
      const key = `[${referrer}][${specifier}]`;
      const cache = this.resolve.cache || (this.resolve.cache = {});
      let url = cache[key];
      if (url) return url.link;
      const {schema, domain} = Specifier.parse(specifier);
      const origin = (schema && `${schema}${domain || '//'}`) || `file:///`;
      referrer =
        (!referrer && origin) ||
        (cache[`[${referrer}]`] || (cache[`[${referrer}]`] = new URL(referrer, origin))).href;
      url = cache[key] = new URL(specifier, referrer);
      // log({specifier, referrer, origin, schema, domain, url: url.href});
      return (url.link = url.href.replace(/^file:\/\/\//, ''));
    }

    links(source, referrer) {
      // log({declarations});
      let match;
      const links = {};
      while ((match = BindingDeclarations.exec(source))) {
        // log(match[0]);
        const [declaration, intent, bindings, binding, , specifier] = match;
        const mappings = (
          (binding && ((binding.startsWith('* ') && binding) || `default as ${binding}`)) ||
          bindings ||
          ''
        ).split(/ *, */g);
        const url = (specifier && this.resolve(specifier, referrer)) || undefined;
        // log({declaration, bindings, binding, specifier, mappings});
        while ((match = Mappings.exec(mappings))) {
          const [, identifier, binding = identifier] = match;
          links[binding] = {intent, specifier, identifier, binding, url};
        }
      }
      return links;
    }

    bind(namespace, ...bindings) {
      for (const binding of bindings) {
        const type = typeof binding;
        if (type === 'function') {
          const identifier = (Identifier.exec(binding) || '')[0];
          identifier && bind(namespace, identifier, binding, true);
        } else if (type === 'object') {
          for (const identifier in binding) {
            identifier === (Identifier.exec(identifier) || '')[0] &&
              bind(namespace, identifier, binding[identifier], true);
          }
        }
      }
    }
  };
})();

class Module {
  constructor(url, evaluator, imports) {
    const enumerable = false;
    define(this, 'url', url, enumerable);
    define(this, 'evaluator', ModuleEvaluator(evaluator), enumerable);
    define(this, 'context', create(null, contextuals), enumerable, false);
    define(this, 'bindings', create(null), enumerable);
    define(this, 'links', Module.links(imports || `${evaluator}`, url), enumerable, false);
    this.namespaces || define(new.target.prototype, 'namespaces', new ModuleNamespaces(), false);
    Module.map[url] = this;
  }

  link() {
    const promise = Module.link(this);
    define(this, 'link', () => promise);
    return promise;
  }

  instantiate() {
    const instance = this.instance || Module.instantiate(this);
    const promise = this.link().then(() => instance);
    define(this, 'instantiate', () => promise);
    return promise;
  }

  evaluate() {
    const promise = Module.evaluate(this).then(() => this.namespace);
    define(this, 'evaluate', () => promise);
    return promise;
  }
}

/** Properties injected into every module context */
const contextuals = {};

Module.debugging = (() => {
  const debug = (type, ...args) => {
    console.log(type, ...args);
    // type in debugging && debugging[type] null, args);
  };
  const debugging = (debug.debugging = {});
  contextuals.debug = {value: freeze(debug)};
  return debugging;
})();

setPrototypeOf(Module, new ModuleStrapper());

const GlobalScope =
  (typeof self === 'object' && self && self.self) ||
  (typeof global === 'object' && global && global.global) ||
  (() => (0, eval)('this'))();

const globals = (({eval: $eval}) => ({
  eval: $eval,
  Module,
}))(GlobalScope);

const scope = freeze(setPrototypeOf({...globals}, GlobalScope));

const locals = {};

const ModuleScope = new Proxy(scope, {
  get: (target, property, receiver) => {
    if (property in globals) return globals[property];
    const value =
      property in GlobalScope && typeof property === 'string' ? GlobalScope[property] : undefined;
    if (value && typeof value === 'function') {
      const local = locals[property];
      const {proxy} =
        (local && local.value === value && local) ||
        (locals[property] = {
          value,
          proxy: new Proxy(value, {
            construct: (constructor, argArray, newTarget) =>
              Reflect.construct(value, argArray, newTarget),
            apply: (method, thisArg, argArray) =>
              !thisArg || thisArg === receiver
                ? value(...argArray)
                : Reflect.apply(value, thisArg, argArray),
          }),
        });
      return proxy;
    }
    return value;
  },
  set: (globals, property) => {
    throw ReferenceError(`${property} is not defined`);
  },
});

GlobalScope.ModuleScope = ModuleScope;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlcy5tanMiLCJzb3VyY2VzIjpbIi4uL21vZHVsZXMvbGliL2hlbHBlcnMubWpzIiwiLi4vbW9kdWxlcy9saWIvbmFtZXNwYWNlcy5tanMiLCIuLi9tb2R1bGVzL2xpYi9leHByZXNzaW9ucy5tanMiLCIuLi9tb2R1bGVzL2xpYi9ldmFsdWF0b3IubWpzIiwiLi4vbW9kdWxlcy9saWIvbmFtZXNwYWNlLm1qcyIsIi4uL21vZHVsZXMvbGliL3N0cmFwcGVyLm1qcyIsIi4uL21vZHVsZXMvbGliL21vZHVsZS5tanMiLCIuLi9tb2R1bGVzL2xpYi9zY29wZS5tanMiLCIuLi9tb2R1bGVzL2xpYi9tb2R1bGVzLm1qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3Qge2RlZmluZVByb3BlcnR5LCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3J9ID0gUmVmbGVjdDtcbmV4cG9ydCBjb25zdCB7Y3JlYXRlLCBmcmVlemUsIHNldFByb3RvdHlwZU9mfSA9IE9iamVjdDtcblxuZXhwb3J0IGNvbnN0IG5vb3AgPSAoKSA9PiB7fTtcblxuZXhwb3J0IGNvbnN0IGRlZmluZSA9ICh0YXJnZXQsIHByb3BlcnR5LCB2YWx1ZSwgZW51bWVyYWJsZSA9IGZhbHNlLCBjb25maWd1cmFibGUgPSBmYWxzZSkgPT5cbiAgZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wZXJ0eSwge3ZhbHVlLCBlbnVtZXJhYmxlLCBjb25maWd1cmFibGV9KSAmJiB2YWx1ZTtcblxuZXhwb3J0IGNvbnN0IGJpbmQgPSAodGFyZ2V0LCBwcm9wZXJ0eSwgZ2V0LCBlbnVtZXJhYmxlID0gZmFsc2UsIGNvbmZpZ3VyYWJsZSA9IGZhbHNlKSA9PlxuICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5LCB7Z2V0LCBzZXQ6IG5vb3AsIGNvbmZpZ3VyYWJsZSwgZW51bWVyYWJsZX0pO1xuXG5leHBvcnQgY29uc3QgY29weSA9ICh0YXJnZXQsIHNvdXJjZSwgaWRlbnRpZmllciwgYWxpYXMgPSBpZGVudGlmaWVyKSA9PlxuICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGFsaWFzLCBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBpZGVudGlmaWVyKSk7XG5cbmV4cG9ydCBjb25zdCBSZXNvbHZlZFByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcbiIsImltcG9ydCB7TW9kdWxlfSBmcm9tICcuL21vZHVsZS5tanMnO1xuaW1wb3J0IHtkZWZpbmUsIGJpbmR9IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5leHBvcnQgY2xhc3MgTW9kdWxlTmFtZXNwYWNlcyB7XG4gIGltcG9ydCh1cmwpIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpc1t1cmxdIHx8XG4gICAgICBkZWZpbmUodGhpcywgdXJsLCBNb2R1bGUuaW1wb3J0KHVybCkudGhlbihcbiAgICAgICAgbmFtZXNwYWNlID0+IChiaW5kKHRoaXMsIHVybCwgKCkgPT4gbmFtZXNwYWNlLCB0cnVlLCBmYWxzZSksIG5hbWVzcGFjZSksXG4gICAgICApLCB0cnVlLCB0cnVlKVxuICAgICk7XG4gIH1cbn1cbiIsIi8vLyBFQ01BU2NyaXB0IEV4cHJlc3Npb25zXG5cbi8qKiBFQ01BU2NyaXB0IHF1b3RlZCBzdHJpbmdzOiBgJ+KApidgIG9yIGBcIuKAplwiYCAgKi9cbmV4cG9ydCBjb25zdCBTdHJpbmdMaXRlcmFsID0gL1wiKD86W15cXFxcXCJdK3xcXFxcLikqKD86XCJ8JCl8Jyg/OlteXFxcXCddK3xcXFxcLikqKD86J3wkKS9nO1xuXG4vKiogRUNNQVNjcmlwdCBjb21tZW50cyAqL1xuZXhwb3J0IGNvbnN0IENvbW1lbnRzID0gL1xcL1xcLy4qKD86XFxufCQpfFxcL1xcKlteXSo/KD86XFwqXFwvfCQpfF5cXCNcXCEuKlxcbi9nO1xuXG4vKiogRUNNQVNjcmlwdCByZWd1bGFyIGV4cHJlc3Npb25zICAqL1xuZXhwb3J0IGNvbnN0IFJlZ0V4cHMgPSAvXFwvKD89W15cXCpcXC9cXG5dW15cXG5dKlxcLykoPzpbXlxcXFxcXC9cXG5cXHRcXFtdK3xcXFxcXFxTfFxcWyg/OlxcXFxcXFN8W15cXFxcXFxuXFx0XFxdXSspKz9cXF0pKz9cXC9bYS16XSovZztcblxuLy8vIEN1c3RvbSBFeHByZXNzaW9uc1xuXG4vKiogQ29tbWEgd2l0aCBzdXJyb3VuZGluZyB3aGl0ZXNwYWNlICovXG5leHBvcnQgY29uc3QgU2VwYXJhdG9yID0gL1tcXHNcXG5dKixbXFxzXFxuXSovO1xuXG4vKiogTWFwcGVkIGJpbmRpbmc6IGBJZGVudGlmaWVyIGFzIEJpbmRpbmdJZGVudGlmaWVyYCAqL1xuZXhwb3J0IGNvbnN0IE1hcHBpbmdzID0gLyhbXlxccyxdKykoPzogK2FzICsoW15cXHMsXSspKT8vZztcblxuLyoqIFF1b3RlZCBleHBvcnQgbWFwcGluZ3M6IGBleHBvcnQge+KApn1gICovXG5leHBvcnQgY29uc3QgRXhwb3J0cyA9IC9gZXhwb3J0ICp7KFtefWA7XFwqXSopfWAvZ207XG5cbi8qKiBOb3RoaW5nIGJ1dCBJZGVudGlmaWVyIENoYXJhY3RlcnMgKi9cbmV4cG9ydCBjb25zdCBJZGVudGlmaWVyID0gL1teXFxuXFxzXFwoXFwpXFx7XFx9XFwtPSsqLyVgXCInfiEmLjpePD4sXSsvO1xuXG5leHBvcnQgY29uc3QgQmluZGluZ3MgPSAvXFxiKGltcG9ydHxleHBvcnQpXFxiICsoPzp7ICooW159XSo/KSAqfXwoWypdICthcyArXFxTK3xcXFMrKXwpKD86ICtmcm9tXFxifCkoPzogKyhbJ1wiXSkoLio/KVxcNHwoPzpjb25zdHxsZXR8dmFyKSArKD86eyAqKFtefV0qPykgKn18XFxTKyl8KS9nO1xuXG5leHBvcnQgY29uc3QgQmluZGluZ0RlY2xhcmF0aW9ucyA9IC9cXGIoaW1wb3J0fGV4cG9ydClcXGIgKyg/OnsgKihbXn1dKj8pICp9fChbKl0gK2FzICtcXFMrfFxcUyspfCkoPzogK2Zyb21cXGJ8KSg/OiArKFsnXCJdKSguKj8pXFw0fCkvZztcblxuZXhwb3J0IGNvbnN0IFNwZWNpZmllciA9IC9eKD86KFthLXpdK1teL10qPzopXFwvezAsMn0oXFxiW14vXStcXC8/KT8pKFxcLnswLDJ9XFwvKT8oW14jP10qPykoXFw/W14jXSo/KT8oIy4qPyk/JC91O1xuXG5TcGVjaWZpZXIucGFyc2UgPSBzcGVjaWZpZXIgPT4ge1xuICBjb25zdCBbdXJsLCBzY2hlbWEsIGRvbWFpbiwgcm9vdCwgcGF0aCwgcXVlcnksIGZyYWdtZW50XSA9IFNwZWNpZmllci5leGVjKHNwZWNpZmllcikgfHwgJyc7XG4gIHJldHVybiB7dXJsLCBzY2hlbWEsIGRvbWFpbiwgcm9vdCwgcGF0aCwgcXVlcnksIGZyYWdtZW50LCBzcGVjaWZpZXJ9O1xufTtcbiIsImltcG9ydCB7RXhwb3J0cywgTWFwcGluZ3N9IGZyb20gJy4vZXhwcmVzc2lvbnMubWpzJztcblxuY29uc3QgZXZhbHVhdGUgPSBjb2RlID0+ICgxLCBldmFsKShjb2RlKTtcblxuY29uc3Qgd3JhcCA9IChib2R5LCBzb3VyY2UpID0+IGBcbigobW9kdWxlLCBleHBvcnRzKSA9PiB7XG4gIG1vZHVsZS5kZWJ1ZygnbW9kdWxlLXVybCcsIG1vZHVsZS5tZXRhLnVybCk7XG4gIG1vZHVsZS5kZWJ1ZygnYm9keS10ZXh0JywgJHtKU09OLnN0cmluZ2lmeShib2R5KX0pO1xuICBtb2R1bGUuZGVidWcoJ3NvdXJjZS10ZXh0JywgJHtKU09OLnN0cmluZ2lmeShzb3VyY2UpfSk7XG4gIHdpdGgobW9kdWxlLnNjb3BlKSAoZnVuY3Rpb24gKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgICR7Ym9keX1cbiAgfSkoKTtcbn0pXG5gO1xuXG5jb25zdCByZXdyaXRlID0gc291cmNlID0+XG4gIHNvdXJjZS5yZXBsYWNlKEV4cG9ydHMsIChtYXRjaCwgbWFwcGluZ3MpID0+IHtcbiAgICBsZXQgYmluZGluZ3MgPSBbXTtcbiAgICB3aGlsZSAoKG1hdGNoID0gTWFwcGluZ3MuZXhlYyhtYXBwaW5ncykpKSB7XG4gICAgICBjb25zdCBbLCBpZGVudGlmaWVyLCBiaW5kaW5nXSA9IG1hdGNoO1xuICAgICAgYmluZGluZ3MucHVzaChgJHtiaW5kaW5nIHx8ICcoKSd9ID0+ICR7aWRlbnRpZmllcn1gKTtcbiAgICB9XG4gICAgcmV0dXJuIChiaW5kaW5ncy5sZW5ndGggJiYgYGV4cG9ydHMoJHtiaW5kaW5ncy5qb2luKCcsICcpfSlgKSB8fCAnJztcbiAgfSk7XG5cbmNvbnN0IHBhcnNlRnVuY3Rpb24gPSBzb3VyY2UgPT5cbiAgKHR5cGVvZiBzb3VyY2UgPT09ICdmdW5jdGlvbicgJiZcbiAgICAvXlxcKG1vZHVsZSwgZXhwb3J0c1xcKSAqPT4gKnsoW15dKil9JHwvLmV4ZWMoYCR7c291cmNlfWAudHJpbSgpKVsxXSkgfHxcbiAgJyc7XG5cbmV4cG9ydCBjb25zdCBNb2R1bGVFdmFsdWF0b3IgPSAoXG4gIHNvdXJjZSxcbiAgc291cmNlVGV4dCA9ICh0eXBlb2Ygc291cmNlID09PSAnZnVuY3Rpb24nICYmIHBhcnNlRnVuY3Rpb24oc291cmNlKSkgfHwgc291cmNlLFxuKSA9PiBldmFsdWF0ZSh3cmFwKHJld3JpdGUoc291cmNlVGV4dCksIHNvdXJjZVRleHQpKTtcbiIsImltcG9ydCB7Y3JlYXRlLCBmcmVlemUsIHNldFByb3RvdHlwZU9mfSBmcm9tICcuL2hlbHBlcnMubWpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIE1vZHVsZU5hbWVzcGFjZSgpIHt9XG57XG4gIGNvbnN0IHRvUHJpbWl0aXZlID0gc2V0UHJvdG90eXBlT2YoKCkgPT4gJ01vZHVsZU5hbWVzcGFjZScsIG51bGwpO1xuICBjb25zdCB0b1N0cmluZyA9IHNldFByb3RvdHlwZU9mKCgpID0+ICdjbGFzcyBNb2R1bGVOYW1lc3BhY2Uge30nLCBudWxsKTtcbiAgTW9kdWxlTmFtZXNwYWNlLnByb3RvdHlwZSA9IGNyZWF0ZShudWxsLCB7XG4gICAgW1N5bWJvbC50b1ByaW1pdGl2ZV06IHt2YWx1ZTogdG9QcmltaXRpdmUsIGVudW1lcmFibGU6IGZhbHNlfSxcbiAgICBbU3ltYm9sLnRvU3RyaW5nVGFnXToge3ZhbHVlOiAnTW9kdWxlTmFtZXNwYWNlJywgZW51bWVyYWJsZTogZmFsc2V9LFxuICB9KTtcbiAgZnJlZXplKHNldFByb3RvdHlwZU9mKE1vZHVsZU5hbWVzcGFjZSwgY3JlYXRlKG51bGwsIHt0b1N0cmluZzoge3ZhbHVlOiB0b1N0cmluZ319KSkpO1xufVxuIiwiaW1wb3J0IHtNb2R1bGVTY29wZX0gZnJvbSAnLi9zY29wZS5tanMnO1xuaW1wb3J0IHtNb2R1bGVOYW1lc3BhY2V9IGZyb20gJy4vbmFtZXNwYWNlLm1qcyc7XG5pbXBvcnQge0lkZW50aWZpZXIsIE1hcHBpbmdzLCBCaW5kaW5nRGVjbGFyYXRpb25zLCBTcGVjaWZpZXJ9IGZyb20gJy4vZXhwcmVzc2lvbnMubWpzJztcblxuLy8gaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vbW9kdWxlLm1qcyc7XG5cbmltcG9ydCB7XG4gIG5vb3AsXG4gIGRlZmluZSxcbiAgZGVmaW5lUHJvcGVydHksXG4gIGJpbmQsXG4gIGNvcHksXG4gIGNyZWF0ZSxcbiAgZnJlZXplLFxuICBzZXRQcm90b3R5cGVPZixcbiAgUmVzb2x2ZWRQcm9taXNlLFxufSBmcm9tICcuL2hlbHBlcnMubWpzJztcblxuY29uc3QgRU5VTUVSQUJMRSA9IHRydWU7XG5cbmV4cG9ydCBjb25zdCBNb2R1bGVTdHJhcHBlciA9ICgoKSA9PiB7XG4gIHJldHVybiBjbGFzcyBNb2R1bGVTdHJhcHBlciB7XG4gICAgKnN0cmFwKG1vZHVsZSkge1xuICAgICAgY29uc3QgcmVjb3JkcyA9IG5ldyBXZWFrTWFwKCk7XG4gICAgfVxuXG4gICAgZ2V0IG1hcCgpIHtcbiAgICAgIGlmICh0aGlzICE9PSB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZSkgcmV0dXJuIGRlZmluZSh0aGlzLCAnbWFwJywgY3JlYXRlKG51bGwpKTtcbiAgICB9XG5cbiAgICBhc3luYyBsaW5rKG1vZHVsZSkge1xuICAgICAgY29uc3QgZW51bWVyYWJsZSA9IHRydWU7XG4gICAgICBjb25zdCB7bmFtZXNwYWNlcywgY29udGV4dCwgYmluZGluZ3MsIGxpbmtzfSA9IG1vZHVsZTtcbiAgICAgIGNvbnN0IHByb21pc2VzID0gW107XG4gICAgICBjb25zdCBpbXBvcnRzID0ge307XG4gICAgICAvLyBjb25zdCBkZXBlbmRlbmNpZXMgPSB7W21vZHVsZS51cmxdOiB0cnVlfTtcblxuICAgICAgLy8gbGV0IGNvbnRleHQ7XG4gICAgICBmb3IgKGNvbnN0IGJpbmRpbmcgaW4gbGlua3MpIHtcbiAgICAgICAgY29uc3QgbGluayA9IGxpbmtzW2JpbmRpbmddO1xuICAgICAgICBjb25zdCB7aW50ZW50LCBzcGVjaWZpZXIsIGlkZW50aWZpZXIsIHVybH0gPSBsaW5rO1xuICAgICAgICBpZiAoIXVybCkgY29udGludWU7XG4gICAgICAgIC8vIGxvZyh7c3BlY2lmaWVyLCBpZGVudGlmaWVyLCB1cmx9KTtcbiAgICAgICAgY29uc3QgbmFtZXNwYWNlID0gbmFtZXNwYWNlc1t1cmxdO1xuICAgICAgICAvLyBjb25zdCBsaW5rZWQgPSBkZXBlbmRlbmNpZXNbdXJsXSB8fCAoZGVwZW5kZW5jaWVzW3VybF0gPSB0aGlzLm1hcFt1cmxdLmxpbmsoKSk7XG4gICAgICAgIGNvbnN0IGltcG9ydGVkID1cbiAgICAgICAgICB1cmwgJiZcbiAgICAgICAgICAoaW1wb3J0c1t1cmxdIHx8XG4gICAgICAgICAgICAoaW1wb3J0c1t1cmxdID0gKG5hbWVzcGFjZSAmJiBSZXNvbHZlZFByb21pc2UpIHx8IG5hbWVzcGFjZXMuaW1wb3J0KHVybCkpKTtcbiAgICAgICAgaWYgKGludGVudCA9PT0gJ2ltcG9ydCcpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgaW1wb3J0ZWQudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgIGlkZW50aWZpZXIgPT09ICcqJ1xuICAgICAgICAgICAgICAgID8gY29weShiaW5kaW5ncywgbmFtZXNwYWNlcywgdXJsLCBiaW5kaW5nKVxuICAgICAgICAgICAgICAgIDogY29weShiaW5kaW5ncywgbmFtZXNwYWNlc1t1cmxdLCBpZGVudGlmaWVyLCBiaW5kaW5nKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICk7XG4gICAgICAgICAgYmluZChiaW5kaW5ncywgYmluZGluZywgbm9vcCwgZW51bWVyYWJsZSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaW50ZW50ID09PSAnZXhwb3J0Jykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgICAgICBpbXBvcnRlZC50aGVuKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgY29udGV4dC5leHBvcnQuZnJvbShsaW5rKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xuICAgIH1cblxuICAgIGluc3RhbnRpYXRlKG1vZHVsZSkge1xuICAgICAgY29uc3QgZW51bWVyYWJsZSA9IGZhbHNlO1xuICAgICAgY29uc3QgbmFtZXNwYWNlID0gbmV3IE1vZHVsZU5hbWVzcGFjZSgpO1xuICAgICAgY29uc3Qge2NvbnRleHQsIGJpbmRpbmdzLCBuYW1lc3BhY2VzLCB1cmx9ID0gbW9kdWxlO1xuXG4gICAgICBjb250ZXh0LmV4cG9ydCA9ICguLi5leHBvcnRzKSA9PiB2b2lkIHRoaXMuYmluZChuYW1lc3BhY2UsIC4uLmV4cG9ydHMpO1xuICAgICAgY29udGV4dC5leHBvcnQuZnJvbSA9ICguLi5saW5rcykgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGxpbmsgb2YgbGlua3MpIHtcbiAgICAgICAgICBjb25zdCB7aW50ZW50LCBzcGVjaWZpZXIsIGlkZW50aWZpZXIsIGJpbmRpbmcsIHVybH0gPSBsaW5rO1xuICAgICAgICAgIGlmIChpbnRlbnQgIT09ICdleHBvcnQnKSBjb250aW51ZTtcbiAgICAgICAgICB1cmwgaW4gbmFtZXNwYWNlc1xuICAgICAgICAgICAgPyBjb3B5KG5hbWVzcGFjZSwgbmFtZXNwYWNlc1t1cmxdLCBpZGVudGlmaWVyLCBiaW5kaW5nKVxuICAgICAgICAgICAgOiBiaW5kKG5hbWVzcGFjZSwgYmluZGluZywgKCkgPT4gbmFtZXNwYWNlc1t1cmxdW2lkZW50aWZpZXJdLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBkZWZpbmVQcm9wZXJ0eShjb250ZXh0LmV4cG9ydCwgJ2RlZmF1bHQnLCB7XG4gICAgICAgIHNldDogdmFsdWUgPT4gdm9pZCB0aGlzLmJpbmQobmFtZXNwYWNlLCB7ZGVmYXVsdDogKCkgPT4gdmFsdWV9KSxcbiAgICAgIH0pO1xuICAgICAgLy8gY29udGV4dC5leHBvcnQuZGVmYXVsdCA9IHZhbHVlID0+IHZvaWQgdGhpcy5iaW5kKG5hbWVzcGFjZSwge2RlZmF1bHQ6ICgpID0+IHZhbHVlfSk7XG5cbiAgICAgIGRlZmluZShiaW5kaW5ncywgJ21vZHVsZScsIGNvbnRleHQsIGZhbHNlLCB0cnVlKTtcbiAgICAgIGRlZmluZShjb250ZXh0LCAnc2NvcGUnLCBzZXRQcm90b3R5cGVPZihiaW5kaW5ncywgTW9kdWxlU2NvcGUpLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgICBkZWZpbmUoY29udGV4dCwgJ21ldGEnLCBjcmVhdGUobnVsbCksIGZhbHNlLCBmYWxzZSk7XG4gICAgICBkZWZpbmUoY29udGV4dC5zY29wZSwgJ21ldGEnLCBjb250ZXh0Lm1ldGEsIGZhbHNlLCBmYWxzZSk7XG4gICAgICBkZWZpbmUoY29udGV4dC5tZXRhLCAndXJsJywgdXJsKTtcbiAgICAgIGZyZWV6ZShjb250ZXh0KTtcbiAgICAgIHJldHVybiBkZWZpbmUobW9kdWxlLCAnaW5zdGFuY2UnLCB7bmFtZXNwYWNlLCBjb250ZXh0fSk7XG4gICAgfVxuXG4gICAgYXN5bmMgZXZhbHVhdGUobW9kdWxlKSB7XG4gICAgICBjb25zdCB7YmluZGluZ3MsIG5hbWVzcGFjZSwgY29udGV4dH0gPSBhd2FpdCBtb2R1bGUuaW5zdGFudGlhdGUoKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IG1vZHVsZS5ldmFsdWF0b3IoY29udGV4dCwgY29udGV4dC5leHBvcnQpO1xuICAgICAgICByZXR1cm4gZGVmaW5lKG1vZHVsZSwgJ25hbWVzcGFjZScsIG5hbWVzcGFjZSk7XG4gICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbiAgICAgICAgY29uc29sZS53YXJuKGV4Y2VwdGlvbik7XG4gICAgICAgIGRlZmluZShtb2R1bGUsICdleGNlcHRpb24nLCBleGNlcHRpb24pO1xuICAgICAgfVxuICAgIH1cblxuICAgIGFzeW5jIGltcG9ydCh1cmwpIHtcbiAgICAgIGNvbnN0IG1vZHVsZSA9IHRoaXMubWFwW3VybF07XG4gICAgICByZXR1cm4gbW9kdWxlLm5hbWVzcGFjZSB8fCAoYXdhaXQgbW9kdWxlLmV2YWx1YXRlKCkpO1xuICAgIH1cblxuICAgIHJlc29sdmUoc3BlY2lmaWVyLCByZWZlcnJlcikge1xuICAgICAgc3BlY2lmaWVyID0gYCR7KHNwZWNpZmllciAmJiBzcGVjaWZpZXIpIHx8ICcnfWA7XG4gICAgICByZWZlcnJlciA9IGAkeyhyZWZlcnJlciAmJiByZWZlcnJlcikgfHwgJyd9YCB8fCAnJztcbiAgICAgIGNvbnN0IGtleSA9IGBbJHtyZWZlcnJlcn1dWyR7c3BlY2lmaWVyfV1gO1xuICAgICAgY29uc3QgY2FjaGUgPSB0aGlzLnJlc29sdmUuY2FjaGUgfHwgKHRoaXMucmVzb2x2ZS5jYWNoZSA9IHt9KTtcbiAgICAgIGxldCB1cmwgPSBjYWNoZVtrZXldO1xuICAgICAgaWYgKHVybCkgcmV0dXJuIHVybC5saW5rO1xuICAgICAgY29uc3Qge3NjaGVtYSwgZG9tYWlufSA9IFNwZWNpZmllci5wYXJzZShzcGVjaWZpZXIpO1xuICAgICAgY29uc3Qgb3JpZ2luID0gKHNjaGVtYSAmJiBgJHtzY2hlbWF9JHtkb21haW4gfHwgJy8vJ31gKSB8fCBgZmlsZTovLy9gO1xuICAgICAgcmVmZXJyZXIgPVxuICAgICAgICAoIXJlZmVycmVyICYmIG9yaWdpbikgfHxcbiAgICAgICAgKGNhY2hlW2BbJHtyZWZlcnJlcn1dYF0gfHwgKGNhY2hlW2BbJHtyZWZlcnJlcn1dYF0gPSBuZXcgVVJMKHJlZmVycmVyLCBvcmlnaW4pKSkuaHJlZjtcbiAgICAgIHVybCA9IGNhY2hlW2tleV0gPSBuZXcgVVJMKHNwZWNpZmllciwgcmVmZXJyZXIpO1xuICAgICAgLy8gbG9nKHtzcGVjaWZpZXIsIHJlZmVycmVyLCBvcmlnaW4sIHNjaGVtYSwgZG9tYWluLCB1cmw6IHVybC5ocmVmfSk7XG4gICAgICByZXR1cm4gKHVybC5saW5rID0gdXJsLmhyZWYucmVwbGFjZSgvXmZpbGU6XFwvXFwvXFwvLywgJycpKTtcbiAgICB9XG5cbiAgICBsaW5rcyhzb3VyY2UsIHJlZmVycmVyKSB7XG4gICAgICAvLyBsb2coe2RlY2xhcmF0aW9uc30pO1xuICAgICAgbGV0IG1hdGNoO1xuICAgICAgY29uc3QgbGlua3MgPSB7fTtcbiAgICAgIHdoaWxlICgobWF0Y2ggPSBCaW5kaW5nRGVjbGFyYXRpb25zLmV4ZWMoc291cmNlKSkpIHtcbiAgICAgICAgLy8gbG9nKG1hdGNoWzBdKTtcbiAgICAgICAgY29uc3QgW2RlY2xhcmF0aW9uLCBpbnRlbnQsIGJpbmRpbmdzLCBiaW5kaW5nLCAsIHNwZWNpZmllcl0gPSBtYXRjaDtcbiAgICAgICAgY29uc3QgbWFwcGluZ3MgPSAoXG4gICAgICAgICAgKGJpbmRpbmcgJiYgKChiaW5kaW5nLnN0YXJ0c1dpdGgoJyogJykgJiYgYmluZGluZykgfHwgYGRlZmF1bHQgYXMgJHtiaW5kaW5nfWApKSB8fFxuICAgICAgICAgIGJpbmRpbmdzIHx8XG4gICAgICAgICAgJydcbiAgICAgICAgKS5zcGxpdCgvICosICovZyk7XG4gICAgICAgIGNvbnN0IHVybCA9IChzcGVjaWZpZXIgJiYgdGhpcy5yZXNvbHZlKHNwZWNpZmllciwgcmVmZXJyZXIpKSB8fCB1bmRlZmluZWQ7XG4gICAgICAgIC8vIGxvZyh7ZGVjbGFyYXRpb24sIGJpbmRpbmdzLCBiaW5kaW5nLCBzcGVjaWZpZXIsIG1hcHBpbmdzfSk7XG4gICAgICAgIHdoaWxlICgobWF0Y2ggPSBNYXBwaW5ncy5leGVjKG1hcHBpbmdzKSkpIHtcbiAgICAgICAgICBjb25zdCBbLCBpZGVudGlmaWVyLCBiaW5kaW5nID0gaWRlbnRpZmllcl0gPSBtYXRjaDtcbiAgICAgICAgICBsaW5rc1tiaW5kaW5nXSA9IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgYmluZGluZywgdXJsfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGxpbmtzO1xuICAgIH1cblxuICAgIGJpbmQobmFtZXNwYWNlLCAuLi5iaW5kaW5ncykge1xuICAgICAgY29uc3QgZGVzY3JpcHRvcnMgPSB7fTtcbiAgICAgIGZvciAoY29uc3QgYmluZGluZyBvZiBiaW5kaW5ncykge1xuICAgICAgICBjb25zdCB0eXBlID0gdHlwZW9mIGJpbmRpbmc7XG4gICAgICAgIGlmICh0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IChJZGVudGlmaWVyLmV4ZWMoYmluZGluZykgfHwgJycpWzBdO1xuICAgICAgICAgIGlkZW50aWZpZXIgJiYgYmluZChuYW1lc3BhY2UsIGlkZW50aWZpZXIsIGJpbmRpbmcsIHRydWUpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgZm9yIChjb25zdCBpZGVudGlmaWVyIGluIGJpbmRpbmcpIHtcbiAgICAgICAgICAgIGlkZW50aWZpZXIgPT09IChJZGVudGlmaWVyLmV4ZWMoaWRlbnRpZmllcikgfHwgJycpWzBdICYmXG4gICAgICAgICAgICAgIGJpbmQobmFtZXNwYWNlLCBpZGVudGlmaWVyLCBiaW5kaW5nW2lkZW50aWZpZXJdLCB0cnVlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG59KSgpO1xuIiwiaW1wb3J0IHtNb2R1bGVOYW1lc3BhY2VzfSBmcm9tICcuL25hbWVzcGFjZXMubWpzJztcbmltcG9ydCB7TW9kdWxlRXZhbHVhdG9yfSBmcm9tICcuL2V2YWx1YXRvci5tanMnO1xuaW1wb3J0IHtNb2R1bGVTdHJhcHBlcn0gZnJvbSAnLi9zdHJhcHBlci5tanMnO1xuaW1wb3J0IHtjcmVhdGUsIGRlZmluZSwgZnJlZXplLCBzZXRQcm90b3R5cGVPZn0gZnJvbSAnLi9oZWxwZXJzLm1qcyc7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGUge1xuICBjb25zdHJ1Y3Rvcih1cmwsIGV2YWx1YXRvciwgaW1wb3J0cykge1xuICAgIGNvbnN0IGVudW1lcmFibGUgPSBmYWxzZTtcbiAgICBkZWZpbmUodGhpcywgJ3VybCcsIHVybCwgZW51bWVyYWJsZSk7XG4gICAgZGVmaW5lKHRoaXMsICdldmFsdWF0b3InLCBNb2R1bGVFdmFsdWF0b3IoZXZhbHVhdG9yKSwgZW51bWVyYWJsZSk7XG4gICAgZGVmaW5lKHRoaXMsICdjb250ZXh0JywgY3JlYXRlKG51bGwsIGNvbnRleHR1YWxzKSwgZW51bWVyYWJsZSwgZmFsc2UpO1xuICAgIGRlZmluZSh0aGlzLCAnYmluZGluZ3MnLCBjcmVhdGUobnVsbCksIGVudW1lcmFibGUpO1xuICAgIGRlZmluZSh0aGlzLCAnbGlua3MnLCBNb2R1bGUubGlua3MoaW1wb3J0cyB8fCBgJHtldmFsdWF0b3J9YCwgdXJsKSwgZW51bWVyYWJsZSwgZmFsc2UpO1xuICAgIHRoaXMubmFtZXNwYWNlcyB8fCBkZWZpbmUobmV3LnRhcmdldC5wcm90b3R5cGUsICduYW1lc3BhY2VzJywgbmV3IE1vZHVsZU5hbWVzcGFjZXMoKSwgZmFsc2UpO1xuICAgIE1vZHVsZS5tYXBbdXJsXSA9IHRoaXM7XG4gIH1cblxuICBsaW5rKCkge1xuICAgIGNvbnN0IHByb21pc2UgPSBNb2R1bGUubGluayh0aGlzKTtcbiAgICBkZWZpbmUodGhpcywgJ2xpbmsnLCAoKSA9PiBwcm9taXNlKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIGluc3RhbnRpYXRlKCkge1xuICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZSB8fCBNb2R1bGUuaW5zdGFudGlhdGUodGhpcyk7XG4gICAgY29uc3QgcHJvbWlzZSA9IHRoaXMubGluaygpLnRoZW4oKCkgPT4gaW5zdGFuY2UpO1xuICAgIGRlZmluZSh0aGlzLCAnaW5zdGFudGlhdGUnLCAoKSA9PiBwcm9taXNlKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIGV2YWx1YXRlKCkge1xuICAgIGNvbnN0IHByb21pc2UgPSBNb2R1bGUuZXZhbHVhdGUodGhpcykudGhlbigoKSA9PiB0aGlzLm5hbWVzcGFjZSk7XG4gICAgZGVmaW5lKHRoaXMsICdldmFsdWF0ZScsICgpID0+IHByb21pc2UpO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG59XG5cbi8qKiBQcm9wZXJ0aWVzIGluamVjdGVkIGludG8gZXZlcnkgbW9kdWxlIGNvbnRleHQgKi9cbmNvbnN0IGNvbnRleHR1YWxzID0ge307XG5cbk1vZHVsZS5kZWJ1Z2dpbmcgPSAoKCkgPT4ge1xuICBjb25zdCBkZWJ1ZyA9ICh0eXBlLCAuLi5hcmdzKSA9PiB7XG4gICAgY29uc29sZS5sb2codHlwZSwgLi4uYXJncyk7XG4gICAgLy8gdHlwZSBpbiBkZWJ1Z2dpbmcgJiYgZGVidWdnaW5nW3R5cGVdIG51bGwsIGFyZ3MpO1xuICB9O1xuICBjb25zdCBkZWJ1Z2dpbmcgPSAoZGVidWcuZGVidWdnaW5nID0ge30pO1xuICBjb250ZXh0dWFscy5kZWJ1ZyA9IHt2YWx1ZTogZnJlZXplKGRlYnVnKX07XG4gIHJldHVybiBkZWJ1Z2dpbmc7XG59KSgpO1xuXG5zZXRQcm90b3R5cGVPZihNb2R1bGUsIG5ldyBNb2R1bGVTdHJhcHBlcigpKTtcbiIsImltcG9ydCB7ZnJlZXplLCBzZXRQcm90b3R5cGVPZn0gZnJvbSAnLi9oZWxwZXJzLm1qcyc7XG5pbXBvcnQge01vZHVsZX0gZnJvbSAnLi9tb2R1bGUubWpzJztcblxuZXhwb3J0IGNvbnN0IEdsb2JhbFNjb3BlID1cbiAgKHR5cGVvZiBzZWxmID09PSAnb2JqZWN0JyAmJiBzZWxmICYmIHNlbGYuc2VsZikgfHxcbiAgKHR5cGVvZiBnbG9iYWwgPT09ICdvYmplY3QnICYmIGdsb2JhbCAmJiBnbG9iYWwuZ2xvYmFsKSB8fFxuICAoKCkgPT4gKDEsIGV2YWwpKCd0aGlzJykpKCk7XG5cbmNvbnN0IGdsb2JhbHMgPSAoKHtldmFsOiAkZXZhbH0pID0+ICh7XG4gIGV2YWw6ICRldmFsLFxuICBNb2R1bGUsXG59KSkoR2xvYmFsU2NvcGUpO1xuXG5jb25zdCBzY29wZSA9IGZyZWV6ZShzZXRQcm90b3R5cGVPZih7Li4uZ2xvYmFsc30sIEdsb2JhbFNjb3BlKSk7XG5cbmNvbnN0IGxvY2FscyA9IHt9O1xuXG5leHBvcnQgY29uc3QgTW9kdWxlU2NvcGUgPSBuZXcgUHJveHkoc2NvcGUsIHtcbiAgZ2V0OiAodGFyZ2V0LCBwcm9wZXJ0eSwgcmVjZWl2ZXIpID0+IHtcbiAgICBpZiAocHJvcGVydHkgaW4gZ2xvYmFscykgcmV0dXJuIGdsb2JhbHNbcHJvcGVydHldO1xuICAgIGNvbnN0IHZhbHVlID1cbiAgICAgIHByb3BlcnR5IGluIEdsb2JhbFNjb3BlICYmIHR5cGVvZiBwcm9wZXJ0eSA9PT0gJ3N0cmluZycgPyBHbG9iYWxTY29wZVtwcm9wZXJ0eV0gOiB1bmRlZmluZWQ7XG4gICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3QgbG9jYWwgPSBsb2NhbHNbcHJvcGVydHldO1xuICAgICAgY29uc3Qge3Byb3h5fSA9XG4gICAgICAgIChsb2NhbCAmJiBsb2NhbC52YWx1ZSA9PT0gdmFsdWUgJiYgbG9jYWwpIHx8XG4gICAgICAgIChsb2NhbHNbcHJvcGVydHldID0ge1xuICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgIHByb3h5OiBuZXcgUHJveHkodmFsdWUsIHtcbiAgICAgICAgICAgIGNvbnN0cnVjdDogKGNvbnN0cnVjdG9yLCBhcmdBcnJheSwgbmV3VGFyZ2V0KSA9PlxuICAgICAgICAgICAgICBSZWZsZWN0LmNvbnN0cnVjdCh2YWx1ZSwgYXJnQXJyYXksIG5ld1RhcmdldCksXG4gICAgICAgICAgICBhcHBseTogKG1ldGhvZCwgdGhpc0FyZywgYXJnQXJyYXkpID0+XG4gICAgICAgICAgICAgICF0aGlzQXJnIHx8IHRoaXNBcmcgPT09IHJlY2VpdmVyXG4gICAgICAgICAgICAgICAgPyB2YWx1ZSguLi5hcmdBcnJheSlcbiAgICAgICAgICAgICAgICA6IFJlZmxlY3QuYXBwbHkodmFsdWUsIHRoaXNBcmcsIGFyZ0FycmF5KSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgfSk7XG4gICAgICByZXR1cm4gcHJveHk7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZTtcbiAgfSxcbiAgc2V0OiAoZ2xvYmFscywgcHJvcGVydHkpID0+IHtcbiAgICB0aHJvdyBSZWZlcmVuY2VFcnJvcihgJHtwcm9wZXJ0eX0gaXMgbm90IGRlZmluZWRgKTtcbiAgfSxcbn0pO1xuIiwiaW1wb3J0IHtNb2R1bGVTY29wZSwgR2xvYmFsU2NvcGV9IGZyb20gJy4vc2NvcGUubWpzJztcblxuR2xvYmFsU2NvcGUuTW9kdWxlU2NvcGUgPSBNb2R1bGVTY29wZTtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBTyxNQUFNLENBQUMsY0FBYyxFQUFFLHdCQUF3QixDQUFDLEdBQUcsT0FBTyxDQUFDO0FBQ2xFLEFBQU8sTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsY0FBYyxDQUFDLEdBQUcsTUFBTSxDQUFDOztBQUV2RCxBQUFPLE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDOztBQUU3QixBQUFPLE1BQU0sTUFBTSxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsVUFBVSxHQUFHLEtBQUssRUFBRSxZQUFZLEdBQUcsS0FBSztFQUN0RixjQUFjLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUM7O0FBRS9FLEFBQU8sTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxVQUFVLEdBQUcsS0FBSyxFQUFFLFlBQVksR0FBRyxLQUFLO0VBQ2xGLGNBQWMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7O0FBRS9FLEFBQU8sTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxLQUFLLEdBQUcsVUFBVTtFQUNqRSxjQUFjLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSx3QkFBd0IsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQzs7QUFFOUUsQUFBTyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7O0FDWDFDLE1BQU0sZ0JBQWdCLENBQUM7RUFDNUIsTUFBTSxDQUFDLEdBQUcsRUFBRTtJQUNWO01BQ0UsSUFBSSxDQUFDLEdBQUcsQ0FBQztNQUNULE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTtRQUN2QyxTQUFTLEtBQUssSUFBSSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQztPQUN4RSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7TUFDZDtHQUNIO0NBQ0Y7O0FDWkQ7QUFDQSxBQWNBOztBQUVBLEFBQU8sTUFBTSxRQUFRLEdBQUcsZ0NBQWdDLENBQUM7OztBQUd6RCxBQUFPLE1BQU0sT0FBTyxHQUFHLDJCQUEyQixDQUFDOzs7QUFHbkQsQUFBTyxNQUFNLFVBQVUsR0FBRyxxQ0FBcUMsQ0FBQztBQUNoRSxBQUVBO0FBQ0EsQUFBTyxNQUFNLG1CQUFtQixHQUFHLCtGQUErRixDQUFDOztBQUVuSSxBQUFPLE1BQU0sU0FBUyxHQUFHLG1GQUFtRixDQUFDOztBQUU3RyxTQUFTLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSTtFQUM3QixNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7RUFDM0YsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztDQUN0RSxDQUFDOztBQ2hDRixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQzs7QUFFekMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxLQUFLLENBQUM7Ozs0QkFHSixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7OEJBQ3JCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQzs7O0lBR25ELEVBQUUsSUFBSSxDQUFDOzs7QUFHWCxDQUFDLENBQUM7O0FBRUYsTUFBTSxPQUFPLEdBQUcsTUFBTTtFQUNwQixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLEtBQUs7SUFDM0MsSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ2xCLFFBQVEsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUc7TUFDeEMsTUFBTSxHQUFHLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUM7TUFDdEMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ3REO0lBQ0QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7R0FDckUsQ0FBQyxDQUFDOztBQUVMLE1BQU0sYUFBYSxHQUFHLE1BQU07RUFDMUIsQ0FBQyxPQUFPLE1BQU0sS0FBSyxVQUFVO0lBQzNCLHNDQUFzQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNwRSxFQUFFLENBQUM7O0FBRUwsQUFBTyxNQUFNLGVBQWUsR0FBRztFQUM3QixNQUFNO0VBQ04sVUFBVSxHQUFHLENBQUMsT0FBTyxNQUFNLEtBQUssVUFBVSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxNQUFNO0tBQzNFLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7O0FDaEM5QyxTQUFTLGVBQWUsR0FBRyxFQUFFO0FBQ3BDO0VBQ0UsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLE1BQU0saUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDbEUsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLE1BQU0sMEJBQTBCLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDeEUsZUFBZSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFO0lBQ3ZDLENBQUMsTUFBTSxDQUFDLFdBQVcsR0FBRyxDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQztJQUM3RCxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQztHQUNwRSxDQUFDLENBQUM7RUFDSCxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDdEY7O0FDU00sTUFBTSxjQUFjLEdBQUcsQ0FBQyxNQUFNO0VBQ25DLE9BQU8sTUFBTSxjQUFjLENBQUM7SUFDMUIsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFO0FBQ25CLEFBQ0EsS0FBSzs7SUFFRCxJQUFJLEdBQUcsR0FBRztNQUNSLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLE9BQU8sTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDbkY7O0lBRUQsTUFBTSxJQUFJLENBQUMsTUFBTSxFQUFFO01BQ2pCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQztNQUN4QixNQUFNLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLEdBQUcsTUFBTSxDQUFDO01BQ3RELE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztNQUNwQixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7Ozs7TUFJbkIsS0FBSyxNQUFNLE9BQU8sSUFBSSxLQUFLLEVBQUU7UUFDM0IsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDbEQsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTOztRQUVuQixNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7O1FBRWxDLE1BQU0sUUFBUTtVQUNaLEdBQUc7V0FDRixPQUFPLENBQUMsR0FBRyxDQUFDO2FBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLGVBQWUsS0FBSyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvRSxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUU7VUFDdkIsUUFBUSxDQUFDLElBQUk7WUFDWCxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU07Y0FDbEIsVUFBVSxLQUFLLEdBQUc7a0JBQ2QsSUFBSSxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQztrQkFDeEMsSUFBSSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2FBQzFELENBQUM7V0FDSCxDQUFDO1VBQ0YsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNqRCxNQUFNLElBQUksTUFBTSxLQUFLLFFBQVEsRUFBRTtVQUM5QixRQUFRLENBQUMsSUFBSTtZQUNYLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWTtjQUN4QixPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUMzQixDQUFDO1dBQ0gsQ0FBQztTQUNIO09BQ0Y7O01BRUQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQzdCOztJQUVELFdBQVcsQ0FBQyxNQUFNLEVBQUU7TUFDbEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDO01BQ3pCLE1BQU0sU0FBUyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7TUFDeEMsTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQzs7TUFFcEQsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsT0FBTyxLQUFLLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsQ0FBQztNQUN2RSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxLQUFLO1FBQ2xDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO1VBQ3hCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO1VBQzNELElBQUksTUFBTSxLQUFLLFFBQVEsRUFBRSxTQUFTO1VBQ2xDLEdBQUcsSUFBSSxVQUFVO2NBQ2IsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQztjQUNyRCxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDcEY7T0FDRixDQUFDO01BQ0YsY0FBYyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFO1FBQ3hDLEdBQUcsRUFBRSxLQUFLLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLEtBQUssQ0FBQyxDQUFDO09BQ2hFLENBQUMsQ0FBQzs7O01BR0gsTUFBTSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztNQUNqRCxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztNQUNuRixNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO01BQ3BELE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztNQUMxRCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7TUFDakMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO01BQ2hCLE9BQU8sTUFBTSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUN6RDs7SUFFRCxNQUFNLFFBQVEsQ0FBQyxNQUFNLEVBQUU7TUFDckIsTUFBTSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUM7TUFDbEUsSUFBSTtRQUNGLE1BQU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELE9BQU8sTUFBTSxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7T0FDL0MsQ0FBQyxPQUFPLFNBQVMsRUFBRTtRQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO09BQ3hDO0tBQ0Y7O0lBRUQsTUFBTSxNQUFNLENBQUMsR0FBRyxFQUFFO01BQ2hCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7TUFDN0IsT0FBTyxNQUFNLENBQUMsU0FBUyxLQUFLLE1BQU0sTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7S0FDdEQ7O0lBRUQsT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUU7TUFDM0IsU0FBUyxHQUFHLENBQUMsRUFBRSxDQUFDLFNBQVMsSUFBSSxTQUFTLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztNQUNoRCxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxJQUFJLFFBQVEsS0FBSyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztNQUNuRCxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztNQUMxQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQztNQUM5RCxJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7TUFDckIsSUFBSSxHQUFHLEVBQUUsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO01BQ3pCLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztNQUNwRCxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLEVBQUUsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztNQUN0RSxRQUFRO1FBQ04sQ0FBQyxDQUFDLFFBQVEsSUFBSSxNQUFNO1FBQ3BCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7TUFDeEYsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7O01BRWhELFFBQVEsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLEVBQUU7S0FDMUQ7O0lBRUQsS0FBSyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUU7O01BRXRCLElBQUksS0FBSyxDQUFDO01BQ1YsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO01BQ2pCLFFBQVEsS0FBSyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRzs7UUFFakQsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sSUFBSSxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDcEUsTUFBTSxRQUFRLEdBQUc7VUFDZixDQUFDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxLQUFLLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7VUFDOUUsUUFBUTtVQUNSLEVBQUU7VUFDRixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLEtBQUssU0FBUyxDQUFDOztRQUUxRSxRQUFRLEtBQUssR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHO1VBQ3hDLE1BQU0sR0FBRyxVQUFVLEVBQUUsT0FBTyxHQUFHLFVBQVUsQ0FBQyxHQUFHLEtBQUssQ0FBQztVQUNuRCxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDaEU7T0FDRjtNQUNELE9BQU8sS0FBSyxDQUFDO0tBQ2Q7O0lBRUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLFFBQVEsRUFBRTtBQUNqQyxBQUNBLE1BQU0sS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUU7UUFDOUIsTUFBTSxJQUFJLEdBQUcsT0FBTyxPQUFPLENBQUM7UUFDNUIsSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFO1VBQ3ZCLE1BQU0sVUFBVSxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7VUFDdkQsVUFBVSxJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztTQUMxRCxNQUFNLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtVQUM1QixLQUFLLE1BQU0sVUFBVSxJQUFJLE9BQU8sRUFBRTtZQUNoQyxVQUFVLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Y0FDbkQsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1dBQzFEO1NBQ0Y7T0FDRjtLQUNGO0dBQ0YsQ0FBQztDQUNILEdBQUcsQ0FBQzs7QUNyS0UsTUFBTSxNQUFNLENBQUM7RUFDbEIsV0FBVyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFO0lBQ25DLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQztJQUN6QixNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDckMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2xFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUNuRCxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkYsSUFBSSxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLElBQUksZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3RixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztHQUN4Qjs7RUFFRCxJQUFJLEdBQUc7SUFDTCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sT0FBTyxDQUFDLENBQUM7SUFDcEMsT0FBTyxPQUFPLENBQUM7R0FDaEI7O0VBRUQsV0FBVyxHQUFHO0lBQ1osTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxRQUFRLENBQUMsQ0FBQztJQUNqRCxNQUFNLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxNQUFNLE9BQU8sQ0FBQyxDQUFDO0lBQzNDLE9BQU8sT0FBTyxDQUFDO0dBQ2hCOztFQUVELFFBQVEsR0FBRztJQUNULE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2pFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sT0FBTyxDQUFDLENBQUM7SUFDeEMsT0FBTyxPQUFPLENBQUM7R0FDaEI7Q0FDRjs7O0FBR0QsTUFBTSxXQUFXLEdBQUcsRUFBRSxDQUFDOztBQUV2QixNQUFNLENBQUMsU0FBUyxHQUFHLENBQUMsTUFBTTtFQUN4QixNQUFNLEtBQUssR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksS0FBSztJQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDOztHQUU1QixDQUFDO0VBQ0YsTUFBTSxTQUFTLElBQUksS0FBSyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUMsQ0FBQztFQUN6QyxXQUFXLENBQUMsS0FBSyxHQUFHLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0VBQzNDLE9BQU8sU0FBUyxDQUFDO0NBQ2xCLEdBQUcsQ0FBQzs7QUFFTCxjQUFjLENBQUMsTUFBTSxFQUFFLElBQUksY0FBYyxFQUFFLENBQUMsQ0FBQzs7QUMvQ3RDLE1BQU0sV0FBVztFQUN0QixDQUFDLE9BQU8sSUFBSSxLQUFLLFFBQVEsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLElBQUk7R0FDN0MsT0FBTyxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDO0VBQ3ZELENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUM7O0FBRTlCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTTtFQUNuQyxJQUFJLEVBQUUsS0FBSztFQUNYLE1BQU07Q0FDUCxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUM7O0FBRWpCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7O0FBRWhFLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQzs7QUFFbEIsQUFBTyxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUU7RUFDMUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEtBQUs7SUFDbkMsSUFBSSxRQUFRLElBQUksT0FBTyxFQUFFLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xELE1BQU0sS0FBSztNQUNULFFBQVEsSUFBSSxXQUFXLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxTQUFTLENBQUM7SUFDOUYsSUFBSSxLQUFLLElBQUksT0FBTyxLQUFLLEtBQUssVUFBVSxFQUFFO01BQ3hDLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztNQUMvQixNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ1gsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxLQUFLLElBQUksS0FBSztTQUN2QyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUc7VUFDbEIsS0FBSztVQUNMLEtBQUssRUFBRSxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUU7WUFDdEIsU0FBUyxFQUFFLENBQUMsV0FBVyxFQUFFLFFBQVEsRUFBRSxTQUFTO2NBQzFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7WUFDL0MsS0FBSyxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRO2NBQy9CLENBQUMsT0FBTyxJQUFJLE9BQU8sS0FBSyxRQUFRO2tCQUM1QixLQUFLLENBQUMsR0FBRyxRQUFRLENBQUM7a0JBQ2xCLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUM7V0FDOUMsQ0FBQztTQUNILENBQUMsQ0FBQztNQUNMLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxPQUFPLEtBQUssQ0FBQztHQUNkO0VBQ0QsR0FBRyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsS0FBSztJQUMxQixNQUFNLGNBQWMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7R0FDcEQ7Q0FDRixDQUFDLENBQUM7O0FDMUNILFdBQVcsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDIn0=
