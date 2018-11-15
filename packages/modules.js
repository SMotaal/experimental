(function () {
  'use strict';

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

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlcy5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy9saWIvaGVscGVycy5tanMiLCIuLi9tb2R1bGVzL2xpYi9uYW1lc3BhY2VzLm1qcyIsIi4uL21vZHVsZXMvbGliL2V4cHJlc3Npb25zLm1qcyIsIi4uL21vZHVsZXMvbGliL2V2YWx1YXRvci5tanMiLCIuLi9tb2R1bGVzL2xpYi9uYW1lc3BhY2UubWpzIiwiLi4vbW9kdWxlcy9saWIvc3RyYXBwZXIubWpzIiwiLi4vbW9kdWxlcy9saWIvbW9kdWxlLm1qcyIsIi4uL21vZHVsZXMvbGliL3Njb3BlLm1qcyIsIi4uL21vZHVsZXMvbGliL21vZHVsZXMubWpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCB7ZGVmaW5lUHJvcGVydHksIGdldE93blByb3BlcnR5RGVzY3JpcHRvcn0gPSBSZWZsZWN0O1xuZXhwb3J0IGNvbnN0IHtjcmVhdGUsIGZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9ID0gT2JqZWN0O1xuXG5leHBvcnQgY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xuXG5leHBvcnQgY29uc3QgZGVmaW5lID0gKHRhcmdldCwgcHJvcGVydHksIHZhbHVlLCBlbnVtZXJhYmxlID0gZmFsc2UsIGNvbmZpZ3VyYWJsZSA9IGZhbHNlKSA9PlxuICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5LCB7dmFsdWUsIGVudW1lcmFibGUsIGNvbmZpZ3VyYWJsZX0pICYmIHZhbHVlO1xuXG5leHBvcnQgY29uc3QgYmluZCA9ICh0YXJnZXQsIHByb3BlcnR5LCBnZXQsIGVudW1lcmFibGUgPSBmYWxzZSwgY29uZmlndXJhYmxlID0gZmFsc2UpID0+XG4gIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHksIHtnZXQsIHNldDogbm9vcCwgY29uZmlndXJhYmxlLCBlbnVtZXJhYmxlfSk7XG5cbmV4cG9ydCBjb25zdCBjb3B5ID0gKHRhcmdldCwgc291cmNlLCBpZGVudGlmaWVyLCBhbGlhcyA9IGlkZW50aWZpZXIpID0+XG4gIGRlZmluZVByb3BlcnR5KHRhcmdldCwgYWxpYXMsIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGlkZW50aWZpZXIpKTtcblxuZXhwb3J0IGNvbnN0IFJlc29sdmVkUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuIiwiaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vbW9kdWxlLm1qcyc7XG5pbXBvcnQge2RlZmluZSwgYmluZH0gZnJvbSAnLi9oZWxwZXJzLm1qcyc7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVOYW1lc3BhY2VzIHtcbiAgaW1wb3J0KHVybCkge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzW3VybF0gfHxcbiAgICAgIGRlZmluZSh0aGlzLCB1cmwsIE1vZHVsZS5pbXBvcnQodXJsKS50aGVuKFxuICAgICAgICBuYW1lc3BhY2UgPT4gKGJpbmQodGhpcywgdXJsLCAoKSA9PiBuYW1lc3BhY2UsIHRydWUsIGZhbHNlKSwgbmFtZXNwYWNlKSxcbiAgICAgICksIHRydWUsIHRydWUpXG4gICAgKTtcbiAgfVxufVxuIiwiLy8vIEVDTUFTY3JpcHQgRXhwcmVzc2lvbnNcblxuLyoqIEVDTUFTY3JpcHQgcXVvdGVkIHN0cmluZ3M6IGAn4oCmJ2Agb3IgYFwi4oCmXCJgICAqL1xuZXhwb3J0IGNvbnN0IFN0cmluZ0xpdGVyYWwgPSAvXCIoPzpbXlxcXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnKD86W15cXFxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG5cbi8qKiBFQ01BU2NyaXB0IGNvbW1lbnRzICovXG5leHBvcnQgY29uc3QgQ29tbWVudHMgPSAvXFwvXFwvLiooPzpcXG58JCl8XFwvXFwqW15dKj8oPzpcXCpcXC98JCl8XlxcI1xcIS4qXFxuL2c7XG5cbi8qKiBFQ01BU2NyaXB0IHJlZ3VsYXIgZXhwcmVzc2lvbnMgICovXG5leHBvcnQgY29uc3QgUmVnRXhwcyA9IC9cXC8oPz1bXlxcKlxcL1xcbl1bXlxcbl0qXFwvKSg/OlteXFxcXFxcL1xcblxcdFxcW10rfFxcXFxcXFN8XFxbKD86XFxcXFxcU3xbXlxcXFxcXG5cXHRcXF1dKykrP1xcXSkrP1xcL1thLXpdKi9nO1xuXG4vLy8gQ3VzdG9tIEV4cHJlc3Npb25zXG5cbi8qKiBDb21tYSB3aXRoIHN1cnJvdW5kaW5nIHdoaXRlc3BhY2UgKi9cbmV4cG9ydCBjb25zdCBTZXBhcmF0b3IgPSAvW1xcc1xcbl0qLFtcXHNcXG5dKi87XG5cbi8qKiBNYXBwZWQgYmluZGluZzogYElkZW50aWZpZXIgYXMgQmluZGluZ0lkZW50aWZpZXJgICovXG5leHBvcnQgY29uc3QgTWFwcGluZ3MgPSAvKFteXFxzLF0rKSg/OiArYXMgKyhbXlxccyxdKykpPy9nO1xuXG4vKiogUXVvdGVkIGV4cG9ydCBtYXBwaW5nczogYGV4cG9ydCB74oCmfWAgKi9cbmV4cG9ydCBjb25zdCBFeHBvcnRzID0gL2BleHBvcnQgKnsoW159YDtcXCpdKil9YC9nbTtcblxuLyoqIE5vdGhpbmcgYnV0IElkZW50aWZpZXIgQ2hhcmFjdGVycyAqL1xuZXhwb3J0IGNvbnN0IElkZW50aWZpZXIgPSAvW15cXG5cXHNcXChcXClcXHtcXH1cXC09KyovJWBcIid+ISYuOl48PixdKy87XG5cbmV4cG9ydCBjb25zdCBCaW5kaW5ncyA9IC9cXGIoaW1wb3J0fGV4cG9ydClcXGIgKyg/OnsgKihbXn1dKj8pICp9fChbKl0gK2FzICtcXFMrfFxcUyspfCkoPzogK2Zyb21cXGJ8KSg/OiArKFsnXCJdKSguKj8pXFw0fCg/OmNvbnN0fGxldHx2YXIpICsoPzp7ICooW159XSo/KSAqfXxcXFMrKXwpL2c7XG5cbmV4cG9ydCBjb25zdCBCaW5kaW5nRGVjbGFyYXRpb25zID0gL1xcYihpbXBvcnR8ZXhwb3J0KVxcYiArKD86eyAqKFtefV0qPykgKn18KFsqXSArYXMgK1xcUyt8XFxTKyl8KSg/OiArZnJvbVxcYnwpKD86ICsoWydcIl0pKC4qPylcXDR8KS9nO1xuXG5leHBvcnQgY29uc3QgU3BlY2lmaWVyID0gL14oPzooW2Etel0rW14vXSo/OilcXC97MCwyfShcXGJbXi9dK1xcLz8pPykoXFwuezAsMn1cXC8pPyhbXiM/XSo/KShcXD9bXiNdKj8pPygjLio/KT8kL3U7XG5cblNwZWNpZmllci5wYXJzZSA9IHNwZWNpZmllciA9PiB7XG4gIGNvbnN0IFt1cmwsIHNjaGVtYSwgZG9tYWluLCByb290LCBwYXRoLCBxdWVyeSwgZnJhZ21lbnRdID0gU3BlY2lmaWVyLmV4ZWMoc3BlY2lmaWVyKSB8fCAnJztcbiAgcmV0dXJuIHt1cmwsIHNjaGVtYSwgZG9tYWluLCByb290LCBwYXRoLCBxdWVyeSwgZnJhZ21lbnQsIHNwZWNpZmllcn07XG59O1xuIiwiaW1wb3J0IHtFeHBvcnRzLCBNYXBwaW5nc30gZnJvbSAnLi9leHByZXNzaW9ucy5tanMnO1xuXG5jb25zdCBldmFsdWF0ZSA9IGNvZGUgPT4gKDEsIGV2YWwpKGNvZGUpO1xuXG5jb25zdCB3cmFwID0gKGJvZHksIHNvdXJjZSkgPT4gYFxuKChtb2R1bGUsIGV4cG9ydHMpID0+IHtcbiAgbW9kdWxlLmRlYnVnKCdtb2R1bGUtdXJsJywgbW9kdWxlLm1ldGEudXJsKTtcbiAgbW9kdWxlLmRlYnVnKCdib2R5LXRleHQnLCAke0pTT04uc3RyaW5naWZ5KGJvZHkpfSk7XG4gIG1vZHVsZS5kZWJ1Zygnc291cmNlLXRleHQnLCAke0pTT04uc3RyaW5naWZ5KHNvdXJjZSl9KTtcbiAgd2l0aChtb2R1bGUuc2NvcGUpIChmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgJHtib2R5fVxuICB9KSgpO1xufSlcbmA7XG5cbmNvbnN0IHJld3JpdGUgPSBzb3VyY2UgPT5cbiAgc291cmNlLnJlcGxhY2UoRXhwb3J0cywgKG1hdGNoLCBtYXBwaW5ncykgPT4ge1xuICAgIGxldCBiaW5kaW5ncyA9IFtdO1xuICAgIHdoaWxlICgobWF0Y2ggPSBNYXBwaW5ncy5leGVjKG1hcHBpbmdzKSkpIHtcbiAgICAgIGNvbnN0IFssIGlkZW50aWZpZXIsIGJpbmRpbmddID0gbWF0Y2g7XG4gICAgICBiaW5kaW5ncy5wdXNoKGAke2JpbmRpbmcgfHwgJygpJ30gPT4gJHtpZGVudGlmaWVyfWApO1xuICAgIH1cbiAgICByZXR1cm4gKGJpbmRpbmdzLmxlbmd0aCAmJiBgZXhwb3J0cygke2JpbmRpbmdzLmpvaW4oJywgJyl9KWApIHx8ICcnO1xuICB9KTtcblxuY29uc3QgcGFyc2VGdW5jdGlvbiA9IHNvdXJjZSA9PlxuICAodHlwZW9mIHNvdXJjZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIC9eXFwobW9kdWxlLCBleHBvcnRzXFwpICo9PiAqeyhbXl0qKX0kfC8uZXhlYyhgJHtzb3VyY2V9YC50cmltKCkpWzFdKSB8fFxuICAnJztcblxuZXhwb3J0IGNvbnN0IE1vZHVsZUV2YWx1YXRvciA9IChcbiAgc291cmNlLFxuICBzb3VyY2VUZXh0ID0gKHR5cGVvZiBzb3VyY2UgPT09ICdmdW5jdGlvbicgJiYgcGFyc2VGdW5jdGlvbihzb3VyY2UpKSB8fCBzb3VyY2UsXG4pID0+IGV2YWx1YXRlKHdyYXAocmV3cml0ZShzb3VyY2VUZXh0KSwgc291cmNlVGV4dCkpO1xuIiwiaW1wb3J0IHtjcmVhdGUsIGZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gTW9kdWxlTmFtZXNwYWNlKCkge31cbntcbiAgY29uc3QgdG9QcmltaXRpdmUgPSBzZXRQcm90b3R5cGVPZigoKSA9PiAnTW9kdWxlTmFtZXNwYWNlJywgbnVsbCk7XG4gIGNvbnN0IHRvU3RyaW5nID0gc2V0UHJvdG90eXBlT2YoKCkgPT4gJ2NsYXNzIE1vZHVsZU5hbWVzcGFjZSB7fScsIG51bGwpO1xuICBNb2R1bGVOYW1lc3BhY2UucHJvdG90eXBlID0gY3JlYXRlKG51bGwsIHtcbiAgICBbU3ltYm9sLnRvUHJpbWl0aXZlXToge3ZhbHVlOiB0b1ByaW1pdGl2ZSwgZW51bWVyYWJsZTogZmFsc2V9LFxuICAgIFtTeW1ib2wudG9TdHJpbmdUYWddOiB7dmFsdWU6ICdNb2R1bGVOYW1lc3BhY2UnLCBlbnVtZXJhYmxlOiBmYWxzZX0sXG4gIH0pO1xuICBmcmVlemUoc2V0UHJvdG90eXBlT2YoTW9kdWxlTmFtZXNwYWNlLCBjcmVhdGUobnVsbCwge3RvU3RyaW5nOiB7dmFsdWU6IHRvU3RyaW5nfX0pKSk7XG59XG4iLCJpbXBvcnQge01vZHVsZVNjb3BlfSBmcm9tICcuL3Njb3BlLm1qcyc7XG5pbXBvcnQge01vZHVsZU5hbWVzcGFjZX0gZnJvbSAnLi9uYW1lc3BhY2UubWpzJztcbmltcG9ydCB7SWRlbnRpZmllciwgTWFwcGluZ3MsIEJpbmRpbmdEZWNsYXJhdGlvbnMsIFNwZWNpZmllcn0gZnJvbSAnLi9leHByZXNzaW9ucy5tanMnO1xuXG4vLyBpbXBvcnQge01vZHVsZX0gZnJvbSAnLi9tb2R1bGUubWpzJztcblxuaW1wb3J0IHtcbiAgbm9vcCxcbiAgZGVmaW5lLFxuICBkZWZpbmVQcm9wZXJ0eSxcbiAgYmluZCxcbiAgY29weSxcbiAgY3JlYXRlLFxuICBmcmVlemUsXG4gIHNldFByb3RvdHlwZU9mLFxuICBSZXNvbHZlZFByb21pc2UsXG59IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5jb25zdCBFTlVNRVJBQkxFID0gdHJ1ZTtcblxuZXhwb3J0IGNvbnN0IE1vZHVsZVN0cmFwcGVyID0gKCgpID0+IHtcbiAgcmV0dXJuIGNsYXNzIE1vZHVsZVN0cmFwcGVyIHtcbiAgICAqc3RyYXAobW9kdWxlKSB7XG4gICAgICBjb25zdCByZWNvcmRzID0gbmV3IFdlYWtNYXAoKTtcbiAgICB9XG5cbiAgICBnZXQgbWFwKCkge1xuICAgICAgaWYgKHRoaXMgIT09IHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlKSByZXR1cm4gZGVmaW5lKHRoaXMsICdtYXAnLCBjcmVhdGUobnVsbCkpO1xuICAgIH1cblxuICAgIGFzeW5jIGxpbmsobW9kdWxlKSB7XG4gICAgICBjb25zdCBlbnVtZXJhYmxlID0gdHJ1ZTtcbiAgICAgIGNvbnN0IHtuYW1lc3BhY2VzLCBjb250ZXh0LCBiaW5kaW5ncywgbGlua3N9ID0gbW9kdWxlO1xuICAgICAgY29uc3QgcHJvbWlzZXMgPSBbXTtcbiAgICAgIGNvbnN0IGltcG9ydHMgPSB7fTtcbiAgICAgIC8vIGNvbnN0IGRlcGVuZGVuY2llcyA9IHtbbW9kdWxlLnVybF06IHRydWV9O1xuXG4gICAgICAvLyBsZXQgY29udGV4dDtcbiAgICAgIGZvciAoY29uc3QgYmluZGluZyBpbiBsaW5rcykge1xuICAgICAgICBjb25zdCBsaW5rID0gbGlua3NbYmluZGluZ107XG4gICAgICAgIGNvbnN0IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgdXJsfSA9IGxpbms7XG4gICAgICAgIGlmICghdXJsKSBjb250aW51ZTtcbiAgICAgICAgLy8gbG9nKHtzcGVjaWZpZXIsIGlkZW50aWZpZXIsIHVybH0pO1xuICAgICAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW3VybF07XG4gICAgICAgIC8vIGNvbnN0IGxpbmtlZCA9IGRlcGVuZGVuY2llc1t1cmxdIHx8IChkZXBlbmRlbmNpZXNbdXJsXSA9IHRoaXMubWFwW3VybF0ubGluaygpKTtcbiAgICAgICAgY29uc3QgaW1wb3J0ZWQgPVxuICAgICAgICAgIHVybCAmJlxuICAgICAgICAgIChpbXBvcnRzW3VybF0gfHxcbiAgICAgICAgICAgIChpbXBvcnRzW3VybF0gPSAobmFtZXNwYWNlICYmIFJlc29sdmVkUHJvbWlzZSkgfHwgbmFtZXNwYWNlcy5pbXBvcnQodXJsKSkpO1xuICAgICAgICBpZiAoaW50ZW50ID09PSAnaW1wb3J0Jykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgICAgICBpbXBvcnRlZC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgaWRlbnRpZmllciA9PT0gJyonXG4gICAgICAgICAgICAgICAgPyBjb3B5KGJpbmRpbmdzLCBuYW1lc3BhY2VzLCB1cmwsIGJpbmRpbmcpXG4gICAgICAgICAgICAgICAgOiBjb3B5KGJpbmRpbmdzLCBuYW1lc3BhY2VzW3VybF0sIGlkZW50aWZpZXIsIGJpbmRpbmcpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBiaW5kKGJpbmRpbmdzLCBiaW5kaW5nLCBub29wLCBlbnVtZXJhYmxlLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnRlbnQgPT09ICdleHBvcnQnKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgIGltcG9ydGVkLnRoZW4oYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICBjb250ZXh0LmV4cG9ydC5mcm9tKGxpbmspO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgaW5zdGFudGlhdGUobW9kdWxlKSB7XG4gICAgICBjb25zdCBlbnVtZXJhYmxlID0gZmFsc2U7XG4gICAgICBjb25zdCBuYW1lc3BhY2UgPSBuZXcgTW9kdWxlTmFtZXNwYWNlKCk7XG4gICAgICBjb25zdCB7Y29udGV4dCwgYmluZGluZ3MsIG5hbWVzcGFjZXMsIHVybH0gPSBtb2R1bGU7XG5cbiAgICAgIGNvbnRleHQuZXhwb3J0ID0gKC4uLmV4cG9ydHMpID0+IHZvaWQgdGhpcy5iaW5kKG5hbWVzcGFjZSwgLi4uZXhwb3J0cyk7XG4gICAgICBjb250ZXh0LmV4cG9ydC5mcm9tID0gKC4uLmxpbmtzKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgbGluayBvZiBsaW5rcykge1xuICAgICAgICAgIGNvbnN0IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgYmluZGluZywgdXJsfSA9IGxpbms7XG4gICAgICAgICAgaWYgKGludGVudCAhPT0gJ2V4cG9ydCcpIGNvbnRpbnVlO1xuICAgICAgICAgIHVybCBpbiBuYW1lc3BhY2VzXG4gICAgICAgICAgICA/IGNvcHkobmFtZXNwYWNlLCBuYW1lc3BhY2VzW3VybF0sIGlkZW50aWZpZXIsIGJpbmRpbmcpXG4gICAgICAgICAgICA6IGJpbmQobmFtZXNwYWNlLCBiaW5kaW5nLCAoKSA9PiBuYW1lc3BhY2VzW3VybF1baWRlbnRpZmllcl0sIGVudW1lcmFibGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGRlZmluZVByb3BlcnR5KGNvbnRleHQuZXhwb3J0LCAnZGVmYXVsdCcsIHtcbiAgICAgICAgc2V0OiB2YWx1ZSA9PiB2b2lkIHRoaXMuYmluZChuYW1lc3BhY2UsIHtkZWZhdWx0OiAoKSA9PiB2YWx1ZX0pLFxuICAgICAgfSk7XG4gICAgICAvLyBjb250ZXh0LmV4cG9ydC5kZWZhdWx0ID0gdmFsdWUgPT4gdm9pZCB0aGlzLmJpbmQobmFtZXNwYWNlLCB7ZGVmYXVsdDogKCkgPT4gdmFsdWV9KTtcblxuICAgICAgZGVmaW5lKGJpbmRpbmdzLCAnbW9kdWxlJywgY29udGV4dCwgZmFsc2UsIHRydWUpO1xuICAgICAgZGVmaW5lKGNvbnRleHQsICdzY29wZScsIHNldFByb3RvdHlwZU9mKGJpbmRpbmdzLCBNb2R1bGVTY29wZSksIGVudW1lcmFibGUsIGZhbHNlKTtcbiAgICAgIGRlZmluZShjb250ZXh0LCAnbWV0YScsIGNyZWF0ZShudWxsKSwgZmFsc2UsIGZhbHNlKTtcbiAgICAgIGRlZmluZShjb250ZXh0LnNjb3BlLCAnbWV0YScsIGNvbnRleHQubWV0YSwgZmFsc2UsIGZhbHNlKTtcbiAgICAgIGRlZmluZShjb250ZXh0Lm1ldGEsICd1cmwnLCB1cmwpO1xuICAgICAgZnJlZXplKGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGRlZmluZShtb2R1bGUsICdpbnN0YW5jZScsIHtuYW1lc3BhY2UsIGNvbnRleHR9KTtcbiAgICB9XG5cbiAgICBhc3luYyBldmFsdWF0ZShtb2R1bGUpIHtcbiAgICAgIGNvbnN0IHtiaW5kaW5ncywgbmFtZXNwYWNlLCBjb250ZXh0fSA9IGF3YWl0IG1vZHVsZS5pbnN0YW50aWF0ZSgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgbW9kdWxlLmV2YWx1YXRvcihjb250ZXh0LCBjb250ZXh0LmV4cG9ydCk7XG4gICAgICAgIHJldHVybiBkZWZpbmUobW9kdWxlLCAnbmFtZXNwYWNlJywgbmFtZXNwYWNlKTtcbiAgICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgICBjb25zb2xlLndhcm4oZXhjZXB0aW9uKTtcbiAgICAgICAgZGVmaW5lKG1vZHVsZSwgJ2V4Y2VwdGlvbicsIGV4Y2VwdGlvbik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgYXN5bmMgaW1wb3J0KHVybCkge1xuICAgICAgY29uc3QgbW9kdWxlID0gdGhpcy5tYXBbdXJsXTtcbiAgICAgIHJldHVybiBtb2R1bGUubmFtZXNwYWNlIHx8IChhd2FpdCBtb2R1bGUuZXZhbHVhdGUoKSk7XG4gICAgfVxuXG4gICAgcmVzb2x2ZShzcGVjaWZpZXIsIHJlZmVycmVyKSB7XG4gICAgICBzcGVjaWZpZXIgPSBgJHsoc3BlY2lmaWVyICYmIHNwZWNpZmllcikgfHwgJyd9YDtcbiAgICAgIHJlZmVycmVyID0gYCR7KHJlZmVycmVyICYmIHJlZmVycmVyKSB8fCAnJ31gIHx8ICcnO1xuICAgICAgY29uc3Qga2V5ID0gYFske3JlZmVycmVyfV1bJHtzcGVjaWZpZXJ9XWA7XG4gICAgICBjb25zdCBjYWNoZSA9IHRoaXMucmVzb2x2ZS5jYWNoZSB8fCAodGhpcy5yZXNvbHZlLmNhY2hlID0ge30pO1xuICAgICAgbGV0IHVybCA9IGNhY2hlW2tleV07XG4gICAgICBpZiAodXJsKSByZXR1cm4gdXJsLmxpbms7XG4gICAgICBjb25zdCB7c2NoZW1hLCBkb21haW59ID0gU3BlY2lmaWVyLnBhcnNlKHNwZWNpZmllcik7XG4gICAgICBjb25zdCBvcmlnaW4gPSAoc2NoZW1hICYmIGAke3NjaGVtYX0ke2RvbWFpbiB8fCAnLy8nfWApIHx8IGBmaWxlOi8vL2A7XG4gICAgICByZWZlcnJlciA9XG4gICAgICAgICghcmVmZXJyZXIgJiYgb3JpZ2luKSB8fFxuICAgICAgICAoY2FjaGVbYFske3JlZmVycmVyfV1gXSB8fCAoY2FjaGVbYFske3JlZmVycmVyfV1gXSA9IG5ldyBVUkwocmVmZXJyZXIsIG9yaWdpbikpKS5ocmVmO1xuICAgICAgdXJsID0gY2FjaGVba2V5XSA9IG5ldyBVUkwoc3BlY2lmaWVyLCByZWZlcnJlcik7XG4gICAgICAvLyBsb2coe3NwZWNpZmllciwgcmVmZXJyZXIsIG9yaWdpbiwgc2NoZW1hLCBkb21haW4sIHVybDogdXJsLmhyZWZ9KTtcbiAgICAgIHJldHVybiAodXJsLmxpbmsgPSB1cmwuaHJlZi5yZXBsYWNlKC9eZmlsZTpcXC9cXC9cXC8vLCAnJykpO1xuICAgIH1cblxuICAgIGxpbmtzKHNvdXJjZSwgcmVmZXJyZXIpIHtcbiAgICAgIC8vIGxvZyh7ZGVjbGFyYXRpb25zfSk7XG4gICAgICBsZXQgbWF0Y2g7XG4gICAgICBjb25zdCBsaW5rcyA9IHt9O1xuICAgICAgd2hpbGUgKChtYXRjaCA9IEJpbmRpbmdEZWNsYXJhdGlvbnMuZXhlYyhzb3VyY2UpKSkge1xuICAgICAgICAvLyBsb2cobWF0Y2hbMF0pO1xuICAgICAgICBjb25zdCBbZGVjbGFyYXRpb24sIGludGVudCwgYmluZGluZ3MsIGJpbmRpbmcsICwgc3BlY2lmaWVyXSA9IG1hdGNoO1xuICAgICAgICBjb25zdCBtYXBwaW5ncyA9IChcbiAgICAgICAgICAoYmluZGluZyAmJiAoKGJpbmRpbmcuc3RhcnRzV2l0aCgnKiAnKSAmJiBiaW5kaW5nKSB8fCBgZGVmYXVsdCBhcyAke2JpbmRpbmd9YCkpIHx8XG4gICAgICAgICAgYmluZGluZ3MgfHxcbiAgICAgICAgICAnJ1xuICAgICAgICApLnNwbGl0KC8gKiwgKi9nKTtcbiAgICAgICAgY29uc3QgdXJsID0gKHNwZWNpZmllciAmJiB0aGlzLnJlc29sdmUoc3BlY2lmaWVyLCByZWZlcnJlcikpIHx8IHVuZGVmaW5lZDtcbiAgICAgICAgLy8gbG9nKHtkZWNsYXJhdGlvbiwgYmluZGluZ3MsIGJpbmRpbmcsIHNwZWNpZmllciwgbWFwcGluZ3N9KTtcbiAgICAgICAgd2hpbGUgKChtYXRjaCA9IE1hcHBpbmdzLmV4ZWMobWFwcGluZ3MpKSkge1xuICAgICAgICAgIGNvbnN0IFssIGlkZW50aWZpZXIsIGJpbmRpbmcgPSBpZGVudGlmaWVyXSA9IG1hdGNoO1xuICAgICAgICAgIGxpbmtzW2JpbmRpbmddID0ge2ludGVudCwgc3BlY2lmaWVyLCBpZGVudGlmaWVyLCBiaW5kaW5nLCB1cmx9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbGlua3M7XG4gICAgfVxuXG4gICAgYmluZChuYW1lc3BhY2UsIC4uLmJpbmRpbmdzKSB7XG4gICAgICBjb25zdCBkZXNjcmlwdG9ycyA9IHt9O1xuICAgICAgZm9yIChjb25zdCBiaW5kaW5nIG9mIGJpbmRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHR5cGUgPSB0eXBlb2YgYmluZGluZztcbiAgICAgICAgaWYgKHR5cGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBjb25zdCBpZGVudGlmaWVyID0gKElkZW50aWZpZXIuZXhlYyhiaW5kaW5nKSB8fCAnJylbMF07XG4gICAgICAgICAgaWRlbnRpZmllciAmJiBiaW5kKG5hbWVzcGFjZSwgaWRlbnRpZmllciwgYmluZGluZywgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGlkZW50aWZpZXIgaW4gYmluZGluZykge1xuICAgICAgICAgICAgaWRlbnRpZmllciA9PT0gKElkZW50aWZpZXIuZXhlYyhpZGVudGlmaWVyKSB8fCAnJylbMF0gJiZcbiAgICAgICAgICAgICAgYmluZChuYW1lc3BhY2UsIGlkZW50aWZpZXIsIGJpbmRpbmdbaWRlbnRpZmllcl0sIHRydWUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbn0pKCk7XG4iLCJpbXBvcnQge01vZHVsZU5hbWVzcGFjZXN9IGZyb20gJy4vbmFtZXNwYWNlcy5tanMnO1xuaW1wb3J0IHtNb2R1bGVFdmFsdWF0b3J9IGZyb20gJy4vZXZhbHVhdG9yLm1qcyc7XG5pbXBvcnQge01vZHVsZVN0cmFwcGVyfSBmcm9tICcuL3N0cmFwcGVyLm1qcyc7XG5pbXBvcnQge2NyZWF0ZSwgZGVmaW5lLCBmcmVlemUsIHNldFByb3RvdHlwZU9mfSBmcm9tICcuL2hlbHBlcnMubWpzJztcblxuZXhwb3J0IGNsYXNzIE1vZHVsZSB7XG4gIGNvbnN0cnVjdG9yKHVybCwgZXZhbHVhdG9yLCBpbXBvcnRzKSB7XG4gICAgY29uc3QgZW51bWVyYWJsZSA9IGZhbHNlO1xuICAgIGRlZmluZSh0aGlzLCAndXJsJywgdXJsLCBlbnVtZXJhYmxlKTtcbiAgICBkZWZpbmUodGhpcywgJ2V2YWx1YXRvcicsIE1vZHVsZUV2YWx1YXRvcihldmFsdWF0b3IpLCBlbnVtZXJhYmxlKTtcbiAgICBkZWZpbmUodGhpcywgJ2NvbnRleHQnLCBjcmVhdGUobnVsbCwgY29udGV4dHVhbHMpLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgZGVmaW5lKHRoaXMsICdiaW5kaW5ncycsIGNyZWF0ZShudWxsKSwgZW51bWVyYWJsZSk7XG4gICAgZGVmaW5lKHRoaXMsICdsaW5rcycsIE1vZHVsZS5saW5rcyhpbXBvcnRzIHx8IGAke2V2YWx1YXRvcn1gLCB1cmwpLCBlbnVtZXJhYmxlLCBmYWxzZSk7XG4gICAgdGhpcy5uYW1lc3BhY2VzIHx8IGRlZmluZShuZXcudGFyZ2V0LnByb3RvdHlwZSwgJ25hbWVzcGFjZXMnLCBuZXcgTW9kdWxlTmFtZXNwYWNlcygpLCBmYWxzZSk7XG4gICAgTW9kdWxlLm1hcFt1cmxdID0gdGhpcztcbiAgfVxuXG4gIGxpbmsoKSB7XG4gICAgY29uc3QgcHJvbWlzZSA9IE1vZHVsZS5saW5rKHRoaXMpO1xuICAgIGRlZmluZSh0aGlzLCAnbGluaycsICgpID0+IHByb21pc2UpO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgaW5zdGFudGlhdGUoKSB7XG4gICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlIHx8IE1vZHVsZS5pbnN0YW50aWF0ZSh0aGlzKTtcbiAgICBjb25zdCBwcm9taXNlID0gdGhpcy5saW5rKCkudGhlbigoKSA9PiBpbnN0YW5jZSk7XG4gICAgZGVmaW5lKHRoaXMsICdpbnN0YW50aWF0ZScsICgpID0+IHByb21pc2UpO1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgZXZhbHVhdGUoKSB7XG4gICAgY29uc3QgcHJvbWlzZSA9IE1vZHVsZS5ldmFsdWF0ZSh0aGlzKS50aGVuKCgpID0+IHRoaXMubmFtZXNwYWNlKTtcbiAgICBkZWZpbmUodGhpcywgJ2V2YWx1YXRlJywgKCkgPT4gcHJvbWlzZSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cbn1cblxuLyoqIFByb3BlcnRpZXMgaW5qZWN0ZWQgaW50byBldmVyeSBtb2R1bGUgY29udGV4dCAqL1xuY29uc3QgY29udGV4dHVhbHMgPSB7fTtcblxuTW9kdWxlLmRlYnVnZ2luZyA9ICgoKSA9PiB7XG4gIGNvbnN0IGRlYnVnID0gKHR5cGUsIC4uLmFyZ3MpID0+IHtcbiAgICBjb25zb2xlLmxvZyh0eXBlLCAuLi5hcmdzKTtcbiAgICAvLyB0eXBlIGluIGRlYnVnZ2luZyAmJiBkZWJ1Z2dpbmdbdHlwZV0gbnVsbCwgYXJncyk7XG4gIH07XG4gIGNvbnN0IGRlYnVnZ2luZyA9IChkZWJ1Zy5kZWJ1Z2dpbmcgPSB7fSk7XG4gIGNvbnRleHR1YWxzLmRlYnVnID0ge3ZhbHVlOiBmcmVlemUoZGVidWcpfTtcbiAgcmV0dXJuIGRlYnVnZ2luZztcbn0pKCk7XG5cbnNldFByb3RvdHlwZU9mKE1vZHVsZSwgbmV3IE1vZHVsZVN0cmFwcGVyKCkpO1xuIiwiaW1wb3J0IHtmcmVlemUsIHNldFByb3RvdHlwZU9mfSBmcm9tICcuL2hlbHBlcnMubWpzJztcbmltcG9ydCB7TW9kdWxlfSBmcm9tICcuL21vZHVsZS5tanMnO1xuXG5leHBvcnQgY29uc3QgR2xvYmFsU2NvcGUgPVxuICAodHlwZW9mIHNlbGYgPT09ICdvYmplY3QnICYmIHNlbGYgJiYgc2VsZi5zZWxmKSB8fFxuICAodHlwZW9mIGdsb2JhbCA9PT0gJ29iamVjdCcgJiYgZ2xvYmFsICYmIGdsb2JhbC5nbG9iYWwpIHx8XG4gICgoKSA9PiAoMSwgZXZhbCkoJ3RoaXMnKSkoKTtcblxuY29uc3QgZ2xvYmFscyA9ICgoe2V2YWw6ICRldmFsfSkgPT4gKHtcbiAgZXZhbDogJGV2YWwsXG4gIE1vZHVsZSxcbn0pKShHbG9iYWxTY29wZSk7XG5cbmNvbnN0IHNjb3BlID0gZnJlZXplKHNldFByb3RvdHlwZU9mKHsuLi5nbG9iYWxzfSwgR2xvYmFsU2NvcGUpKTtcblxuY29uc3QgbG9jYWxzID0ge307XG5cbmV4cG9ydCBjb25zdCBNb2R1bGVTY29wZSA9IG5ldyBQcm94eShzY29wZSwge1xuICBnZXQ6ICh0YXJnZXQsIHByb3BlcnR5LCByZWNlaXZlcikgPT4ge1xuICAgIGlmIChwcm9wZXJ0eSBpbiBnbG9iYWxzKSByZXR1cm4gZ2xvYmFsc1twcm9wZXJ0eV07XG4gICAgY29uc3QgdmFsdWUgPVxuICAgICAgcHJvcGVydHkgaW4gR2xvYmFsU2NvcGUgJiYgdHlwZW9mIHByb3BlcnR5ID09PSAnc3RyaW5nJyA/IEdsb2JhbFNjb3BlW3Byb3BlcnR5XSA6IHVuZGVmaW5lZDtcbiAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBsb2NhbCA9IGxvY2Fsc1twcm9wZXJ0eV07XG4gICAgICBjb25zdCB7cHJveHl9ID1cbiAgICAgICAgKGxvY2FsICYmIGxvY2FsLnZhbHVlID09PSB2YWx1ZSAmJiBsb2NhbCkgfHxcbiAgICAgICAgKGxvY2Fsc1twcm9wZXJ0eV0gPSB7XG4gICAgICAgICAgdmFsdWUsXG4gICAgICAgICAgcHJveHk6IG5ldyBQcm94eSh2YWx1ZSwge1xuICAgICAgICAgICAgY29uc3RydWN0OiAoY29uc3RydWN0b3IsIGFyZ0FycmF5LCBuZXdUYXJnZXQpID0+XG4gICAgICAgICAgICAgIFJlZmxlY3QuY29uc3RydWN0KHZhbHVlLCBhcmdBcnJheSwgbmV3VGFyZ2V0KSxcbiAgICAgICAgICAgIGFwcGx5OiAobWV0aG9kLCB0aGlzQXJnLCBhcmdBcnJheSkgPT5cbiAgICAgICAgICAgICAgIXRoaXNBcmcgfHwgdGhpc0FyZyA9PT0gcmVjZWl2ZXJcbiAgICAgICAgICAgICAgICA/IHZhbHVlKC4uLmFyZ0FycmF5KVxuICAgICAgICAgICAgICAgIDogUmVmbGVjdC5hcHBseSh2YWx1ZSwgdGhpc0FyZywgYXJnQXJyYXkpLFxuICAgICAgICAgIH0pLFxuICAgICAgICB9KTtcbiAgICAgIHJldHVybiBwcm94eTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9LFxuICBzZXQ6IChnbG9iYWxzLCBwcm9wZXJ0eSkgPT4ge1xuICAgIHRocm93IFJlZmVyZW5jZUVycm9yKGAke3Byb3BlcnR5fSBpcyBub3QgZGVmaW5lZGApO1xuICB9LFxufSk7XG4iLCJpbXBvcnQge01vZHVsZVNjb3BlLCBHbG9iYWxTY29wZX0gZnJvbSAnLi9zY29wZS5tanMnO1xuXG5HbG9iYWxTY29wZS5Nb2R1bGVTY29wZSA9IE1vZHVsZVNjb3BlO1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztFQUFPLE1BQU0sQ0FBQyxjQUFjLEVBQUUsd0JBQXdCLENBQUMsR0FBRyxPQUFPLENBQUM7QUFDbEUsRUFBTyxNQUFNLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxjQUFjLENBQUMsR0FBRyxNQUFNLENBQUM7O0FBRXZELEVBQU8sTUFBTSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUM7O0FBRTdCLEVBQU8sTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxVQUFVLEdBQUcsS0FBSyxFQUFFLFlBQVksR0FBRyxLQUFLO0VBQ3hGLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDLElBQUksS0FB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QUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzFELE1BQU0sTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDNUUsTUFBTSxRQUFRO0VBQ2QsUUFBUSxDQUFDLENBQUMsUUFBUSxJQUFJLE1BQU07RUFDNUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO0VBQzlGLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7RUFDdEQ7RUFDQSxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLEVBQUU7RUFDL0QsS0FBSzs7RUFFTCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFO0VBQzVCO0VBQ0EsTUFBTSxJQUFJLEtBQUssQ0FBQztFQUNoQixNQUFNLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztFQUN2QixNQUFNLFFBQVEsS0FBSyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRztFQUN6RDtFQUNBLFFBQVEsTUFBTSxDQUFDLFdBQVcsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sSUFBSSxTQUFTLENBQUMsR0FBRyxLQUFLLENBQUM7RUFDNUUsUUFBUSxNQUFNLFFBQVEsR0FBRztFQUN6QixVQUFVLENBQUMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztFQUN4RixVQUFVLFFBQVE7RUFDbEIsVUFBVSxFQUFFO0VBQ1osVUFBVSxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDMUIsUUFBUSxNQUFNLEdBQUcsR0FBRyxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsS0FBSyxTQUFTLENBQUM7RUFDbEY7RUFDQSxRQUFRLFFBQVEsS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUc7RUFDbEQsVUFBVSxNQUFNLEdBQUcsVUFBVSxFQUFFLE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxLQUFLLENBQUM7RUFDN0QsVUFBVSxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDekUsU0FBUztFQUNULE9BQU87RUFDUCxNQUFNLE9BQU8sS0FBSyxDQUFDO0VBQ25CLEtBQUs7O0VBRUwsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsUUFBUSxFQUFFO0FBQ2pDLEVBQ0EsTUFBTSxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtFQUN0QyxRQUFRLE1BQU0sSUFBSSxHQUFHLE9BQU8sT0FBTyxDQUFDO0VBQ3BDLFFBQVEsSUFBSSxJQUFJLEtBQUssVUFBVSxFQUFFO0VBQ2pDLFVBQVUsTUFBTSxVQUFVLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztFQUNqRSxVQUFVLFVBQVUsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDbkUsU0FBUyxNQUFNLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRTtFQUN0QyxVQUFVLEtBQUssTUFBTSxVQUFVLElBQUksT0FBTyxFQUFFO0VBQzVDLFlBQVksVUFBVSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0VBQ2pFLGNBQWMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0VBQ3JFLFdBQVc7RUFDWCxTQUFTO0VBQ1QsT0FBTztFQUNQLEtBQUs7RUFDTCxHQUFHLENBQUM7RUFDSixDQUFDLEdBQUcsQ0FBQzs7RUNyS0UsTUFBTSxNQUFNLENBQUM7RUFDcEIsRUFBRSxXQUFXLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUU7RUFDdkMsSUFBSSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUM7RUFDN0IsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsVUFBVSxDQUFDLENBQUM7RUFDekMsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxlQUFlLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7RUFDdEUsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztFQUMxRSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztFQUN2RCxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztFQUMzRixJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENB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
