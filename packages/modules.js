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

  const ModuleScope = new Proxy(
    freeze(
      setPrototypeOf(
        (({eval: $eval}) => ({
          eval: $eval,
          Module,
        }))(GlobalScope),
        GlobalScope,
      ),
    ),
    {
      get: (globals, property, receiver) =>
        property in globals ? globals[property] : GlobalScope[property],
      set: (globals, property) => {
        throw ReferenceError(`${property} is not defined`);
      },
    },
  );

  GlobalScope.ModuleScope = ModuleScope;

}());
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kdWxlcy5qcyIsInNvdXJjZXMiOlsiLi4vbW9kdWxlcy9saWIvaGVscGVycy5tanMiLCIuLi9tb2R1bGVzL2xpYi9uYW1lc3BhY2VzLm1qcyIsIi4uL21vZHVsZXMvbGliL2V4cHJlc3Npb25zLm1qcyIsIi4uL21vZHVsZXMvbGliL2V2YWx1YXRvci5tanMiLCIuLi9tb2R1bGVzL2xpYi9uYW1lc3BhY2UubWpzIiwiLi4vbW9kdWxlcy9saWIvc3RyYXBwZXIubWpzIiwiLi4vbW9kdWxlcy9saWIvbW9kdWxlLm1qcyIsIi4uL21vZHVsZXMvbGliL3Njb3BlLm1qcyIsIi4uL21vZHVsZXMvbGliL21vZHVsZXMubWpzIl0sInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBjb25zdCB7ZGVmaW5lUHJvcGVydHksIGdldE93blByb3BlcnR5RGVzY3JpcHRvcn0gPSBSZWZsZWN0O1xuZXhwb3J0IGNvbnN0IHtjcmVhdGUsIGZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9ID0gT2JqZWN0O1xuXG5leHBvcnQgY29uc3Qgbm9vcCA9ICgpID0+IHt9O1xuXG5leHBvcnQgY29uc3QgZGVmaW5lID0gKHRhcmdldCwgcHJvcGVydHksIHZhbHVlLCBlbnVtZXJhYmxlID0gZmFsc2UsIGNvbmZpZ3VyYWJsZSA9IGZhbHNlKSA9PlxuICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BlcnR5LCB7dmFsdWUsIGVudW1lcmFibGUsIGNvbmZpZ3VyYWJsZX0pICYmIHZhbHVlO1xuXG5leHBvcnQgY29uc3QgYmluZCA9ICh0YXJnZXQsIHByb3BlcnR5LCBnZXQsIGVudW1lcmFibGUgPSBmYWxzZSwgY29uZmlndXJhYmxlID0gZmFsc2UpID0+XG4gIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcGVydHksIHtnZXQsIHNldDogbm9vcCwgY29uZmlndXJhYmxlLCBlbnVtZXJhYmxlfSk7XG5cbmV4cG9ydCBjb25zdCBjb3B5ID0gKHRhcmdldCwgc291cmNlLCBpZGVudGlmaWVyLCBhbGlhcyA9IGlkZW50aWZpZXIpID0+XG4gIGRlZmluZVByb3BlcnR5KHRhcmdldCwgYWxpYXMsIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIGlkZW50aWZpZXIpKTtcblxuZXhwb3J0IGNvbnN0IFJlc29sdmVkUHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZSgpO1xuIiwiaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vbW9kdWxlLm1qcyc7XG5pbXBvcnQge2RlZmluZSwgYmluZH0gZnJvbSAnLi9oZWxwZXJzLm1qcyc7XG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVOYW1lc3BhY2VzIHtcbiAgaW1wb3J0KHVybCkge1xuICAgIHJldHVybiAoXG4gICAgICB0aGlzW3VybF0gfHxcbiAgICAgIGRlZmluZSh0aGlzLCB1cmwsIE1vZHVsZS5pbXBvcnQodXJsKS50aGVuKFxuICAgICAgICBuYW1lc3BhY2UgPT4gKGJpbmQodGhpcywgdXJsLCAoKSA9PiBuYW1lc3BhY2UsIHRydWUsIGZhbHNlKSwgbmFtZXNwYWNlKSxcbiAgICAgICksIHRydWUsIHRydWUpXG4gICAgKTtcbiAgfVxufVxuIiwiLy8vIEVDTUFTY3JpcHQgRXhwcmVzc2lvbnNcblxuLyoqIEVDTUFTY3JpcHQgcXVvdGVkIHN0cmluZ3M6IGAn4oCmJ2Agb3IgYFwi4oCmXCJgICAqL1xuZXhwb3J0IGNvbnN0IFN0cmluZ0xpdGVyYWwgPSAvXCIoPzpbXlxcXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnKD86W15cXFxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG5cbi8qKiBFQ01BU2NyaXB0IGNvbW1lbnRzICovXG5leHBvcnQgY29uc3QgQ29tbWVudHMgPSAvXFwvXFwvLiooPzpcXG58JCl8XFwvXFwqW15dKj8oPzpcXCpcXC98JCl8XlxcI1xcIS4qXFxuL2c7XG5cbi8qKiBFQ01BU2NyaXB0IHJlZ3VsYXIgZXhwcmVzc2lvbnMgICovXG5leHBvcnQgY29uc3QgUmVnRXhwcyA9IC9cXC8oPz1bXlxcKlxcL1xcbl1bXlxcbl0qXFwvKSg/OlteXFxcXFxcL1xcblxcdFxcW10rfFxcXFxcXFN8XFxbKD86XFxcXFxcU3xbXlxcXFxcXG5cXHRcXF1dKykrP1xcXSkrP1xcL1thLXpdKi9nO1xuXG4vLy8gQ3VzdG9tIEV4cHJlc3Npb25zXG5cbi8qKiBDb21tYSB3aXRoIHN1cnJvdW5kaW5nIHdoaXRlc3BhY2UgKi9cbmV4cG9ydCBjb25zdCBTZXBhcmF0b3IgPSAvW1xcc1xcbl0qLFtcXHNcXG5dKi87XG5cbi8qKiBNYXBwZWQgYmluZGluZzogYElkZW50aWZpZXIgYXMgQmluZGluZ0lkZW50aWZpZXJgICovXG5leHBvcnQgY29uc3QgTWFwcGluZ3MgPSAvKFteXFxzLF0rKSg/OiArYXMgKyhbXlxccyxdKykpPy9nO1xuXG4vKiogUXVvdGVkIGV4cG9ydCBtYXBwaW5nczogYGV4cG9ydCB74oCmfWAgKi9cbmV4cG9ydCBjb25zdCBFeHBvcnRzID0gL2BleHBvcnQgKnsoW159YDtcXCpdKil9YC9nbTtcblxuLyoqIE5vdGhpbmcgYnV0IElkZW50aWZpZXIgQ2hhcmFjdGVycyAqL1xuZXhwb3J0IGNvbnN0IElkZW50aWZpZXIgPSAvW15cXG5cXHNcXChcXClcXHtcXH1cXC09KyovJWBcIid+ISYuOl48PixdKy87XG5cbmV4cG9ydCBjb25zdCBCaW5kaW5ncyA9IC9cXGIoaW1wb3J0fGV4cG9ydClcXGIgKyg/OnsgKihbXn1dKj8pICp9fChbKl0gK2FzICtcXFMrfFxcUyspfCkoPzogK2Zyb21cXGJ8KSg/OiArKFsnXCJdKSguKj8pXFw0fCg/OmNvbnN0fGxldHx2YXIpICsoPzp7ICooW159XSo/KSAqfXxcXFMrKXwpL2c7XG5cbmV4cG9ydCBjb25zdCBCaW5kaW5nRGVjbGFyYXRpb25zID0gL1xcYihpbXBvcnR8ZXhwb3J0KVxcYiArKD86eyAqKFtefV0qPykgKn18KFsqXSArYXMgK1xcUyt8XFxTKyl8KSg/OiArZnJvbVxcYnwpKD86ICsoWydcIl0pKC4qPylcXDR8KS9nO1xuXG5leHBvcnQgY29uc3QgU3BlY2lmaWVyID0gL14oPzooW2Etel0rW14vXSo/OilcXC97MCwyfShcXGJbXi9dK1xcLz8pPykoXFwuezAsMn1cXC8pPyhbXiM/XSo/KShcXD9bXiNdKj8pPygjLio/KT8kL3U7XG5cblNwZWNpZmllci5wYXJzZSA9IHNwZWNpZmllciA9PiB7XG4gIGNvbnN0IFt1cmwsIHNjaGVtYSwgZG9tYWluLCByb290LCBwYXRoLCBxdWVyeSwgZnJhZ21lbnRdID0gU3BlY2lmaWVyLmV4ZWMoc3BlY2lmaWVyKSB8fCAnJztcbiAgcmV0dXJuIHt1cmwsIHNjaGVtYSwgZG9tYWluLCByb290LCBwYXRoLCBxdWVyeSwgZnJhZ21lbnQsIHNwZWNpZmllcn07XG59O1xuIiwiaW1wb3J0IHtFeHBvcnRzLCBNYXBwaW5nc30gZnJvbSAnLi9leHByZXNzaW9ucy5tanMnO1xuXG5jb25zdCBldmFsdWF0ZSA9IGNvZGUgPT4gKDEsIGV2YWwpKGNvZGUpO1xuXG5jb25zdCB3cmFwID0gKGJvZHksIHNvdXJjZSkgPT4gYFxuKChtb2R1bGUsIGV4cG9ydHMpID0+IHtcbiAgbW9kdWxlLmRlYnVnKCdtb2R1bGUtdXJsJywgbW9kdWxlLm1ldGEudXJsKTtcbiAgbW9kdWxlLmRlYnVnKCdib2R5LXRleHQnLCAke0pTT04uc3RyaW5naWZ5KGJvZHkpfSk7XG4gIG1vZHVsZS5kZWJ1Zygnc291cmNlLXRleHQnLCAke0pTT04uc3RyaW5naWZ5KHNvdXJjZSl9KTtcbiAgd2l0aChtb2R1bGUuc2NvcGUpIChmdW5jdGlvbiAoKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgJHtib2R5fVxuICB9KSgpO1xufSlcbmA7XG5cbmNvbnN0IHJld3JpdGUgPSBzb3VyY2UgPT5cbiAgc291cmNlLnJlcGxhY2UoRXhwb3J0cywgKG1hdGNoLCBtYXBwaW5ncykgPT4ge1xuICAgIGxldCBiaW5kaW5ncyA9IFtdO1xuICAgIHdoaWxlICgobWF0Y2ggPSBNYXBwaW5ncy5leGVjKG1hcHBpbmdzKSkpIHtcbiAgICAgIGNvbnN0IFssIGlkZW50aWZpZXIsIGJpbmRpbmddID0gbWF0Y2g7XG4gICAgICBiaW5kaW5ncy5wdXNoKGAke2JpbmRpbmcgfHwgJygpJ30gPT4gJHtpZGVudGlmaWVyfWApO1xuICAgIH1cbiAgICByZXR1cm4gKGJpbmRpbmdzLmxlbmd0aCAmJiBgZXhwb3J0cygke2JpbmRpbmdzLmpvaW4oJywgJyl9KWApIHx8ICcnO1xuICB9KTtcblxuY29uc3QgcGFyc2VGdW5jdGlvbiA9IHNvdXJjZSA9PlxuICAodHlwZW9mIHNvdXJjZSA9PT0gJ2Z1bmN0aW9uJyAmJlxuICAgIC9eXFwobW9kdWxlLCBleHBvcnRzXFwpICo9PiAqeyhbXl0qKX0kfC8uZXhlYyhgJHtzb3VyY2V9YC50cmltKCkpWzFdKSB8fFxuICAnJztcblxuZXhwb3J0IGNvbnN0IE1vZHVsZUV2YWx1YXRvciA9IChcbiAgc291cmNlLFxuICBzb3VyY2VUZXh0ID0gKHR5cGVvZiBzb3VyY2UgPT09ICdmdW5jdGlvbicgJiYgcGFyc2VGdW5jdGlvbihzb3VyY2UpKSB8fCBzb3VyY2UsXG4pID0+IGV2YWx1YXRlKHdyYXAocmV3cml0ZShzb3VyY2VUZXh0KSwgc291cmNlVGV4dCkpO1xuIiwiaW1wb3J0IHtjcmVhdGUsIGZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5leHBvcnQgZnVuY3Rpb24gTW9kdWxlTmFtZXNwYWNlKCkge31cbntcbiAgY29uc3QgdG9QcmltaXRpdmUgPSBzZXRQcm90b3R5cGVPZigoKSA9PiAnTW9kdWxlTmFtZXNwYWNlJywgbnVsbCk7XG4gIGNvbnN0IHRvU3RyaW5nID0gc2V0UHJvdG90eXBlT2YoKCkgPT4gJ2NsYXNzIE1vZHVsZU5hbWVzcGFjZSB7fScsIG51bGwpO1xuICBNb2R1bGVOYW1lc3BhY2UucHJvdG90eXBlID0gY3JlYXRlKG51bGwsIHtcbiAgICBbU3ltYm9sLnRvUHJpbWl0aXZlXToge3ZhbHVlOiB0b1ByaW1pdGl2ZSwgZW51bWVyYWJsZTogZmFsc2V9LFxuICAgIFtTeW1ib2wudG9TdHJpbmdUYWddOiB7dmFsdWU6ICdNb2R1bGVOYW1lc3BhY2UnLCBlbnVtZXJhYmxlOiBmYWxzZX0sXG4gIH0pO1xuICBmcmVlemUoc2V0UHJvdG90eXBlT2YoTW9kdWxlTmFtZXNwYWNlLCBjcmVhdGUobnVsbCwge3RvU3RyaW5nOiB7dmFsdWU6IHRvU3RyaW5nfX0pKSk7XG59XG4iLCJpbXBvcnQge01vZHVsZVNjb3BlfSBmcm9tICcuL3Njb3BlLm1qcyc7XG5pbXBvcnQge01vZHVsZU5hbWVzcGFjZX0gZnJvbSAnLi9uYW1lc3BhY2UubWpzJztcbmltcG9ydCB7SWRlbnRpZmllciwgTWFwcGluZ3MsIEJpbmRpbmdEZWNsYXJhdGlvbnMsIFNwZWNpZmllcn0gZnJvbSAnLi9leHByZXNzaW9ucy5tanMnO1xuXG4vLyBpbXBvcnQge01vZHVsZX0gZnJvbSAnLi9tb2R1bGUubWpzJztcblxuaW1wb3J0IHtcbiAgbm9vcCxcbiAgZGVmaW5lLFxuICBkZWZpbmVQcm9wZXJ0eSxcbiAgYmluZCxcbiAgY29weSxcbiAgY3JlYXRlLFxuICBmcmVlemUsXG4gIHNldFByb3RvdHlwZU9mLFxuICBSZXNvbHZlZFByb21pc2UsXG59IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5jb25zdCBFTlVNRVJBQkxFID0gdHJ1ZTtcblxuZXhwb3J0IGNvbnN0IE1vZHVsZVN0cmFwcGVyID0gKCgpID0+IHtcbiAgcmV0dXJuIGNsYXNzIE1vZHVsZVN0cmFwcGVyIHtcbiAgICAqc3RyYXAobW9kdWxlKSB7XG4gICAgICBjb25zdCByZWNvcmRzID0gbmV3IFdlYWtNYXAoKTtcbiAgICB9XG5cbiAgICBnZXQgbWFwKCkge1xuICAgICAgaWYgKHRoaXMgIT09IHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlKSByZXR1cm4gZGVmaW5lKHRoaXMsICdtYXAnLCBjcmVhdGUobnVsbCkpO1xuICAgIH1cblxuICAgIGFzeW5jIGxpbmsobW9kdWxlKSB7XG4gICAgICBjb25zdCBlbnVtZXJhYmxlID0gdHJ1ZTtcbiAgICAgIGNvbnN0IHtuYW1lc3BhY2VzLCBjb250ZXh0LCBiaW5kaW5ncywgbGlua3N9ID0gbW9kdWxlO1xuICAgICAgY29uc3QgcHJvbWlzZXMgPSBbXTtcbiAgICAgIGNvbnN0IGltcG9ydHMgPSB7fTtcbiAgICAgIC8vIGNvbnN0IGRlcGVuZGVuY2llcyA9IHtbbW9kdWxlLnVybF06IHRydWV9O1xuXG4gICAgICAvLyBsZXQgY29udGV4dDtcbiAgICAgIGZvciAoY29uc3QgYmluZGluZyBpbiBsaW5rcykge1xuICAgICAgICBjb25zdCBsaW5rID0gbGlua3NbYmluZGluZ107XG4gICAgICAgIGNvbnN0IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgdXJsfSA9IGxpbms7XG4gICAgICAgIGlmICghdXJsKSBjb250aW51ZTtcbiAgICAgICAgLy8gbG9nKHtzcGVjaWZpZXIsIGlkZW50aWZpZXIsIHVybH0pO1xuICAgICAgICBjb25zdCBuYW1lc3BhY2UgPSBuYW1lc3BhY2VzW3VybF07XG4gICAgICAgIC8vIGNvbnN0IGxpbmtlZCA9IGRlcGVuZGVuY2llc1t1cmxdIHx8IChkZXBlbmRlbmNpZXNbdXJsXSA9IHRoaXMubWFwW3VybF0ubGluaygpKTtcbiAgICAgICAgY29uc3QgaW1wb3J0ZWQgPVxuICAgICAgICAgIHVybCAmJlxuICAgICAgICAgIChpbXBvcnRzW3VybF0gfHxcbiAgICAgICAgICAgIChpbXBvcnRzW3VybF0gPSAobmFtZXNwYWNlICYmIFJlc29sdmVkUHJvbWlzZSkgfHwgbmFtZXNwYWNlcy5pbXBvcnQodXJsKSkpO1xuICAgICAgICBpZiAoaW50ZW50ID09PSAnaW1wb3J0Jykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgICAgICBpbXBvcnRlZC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgaWRlbnRpZmllciA9PT0gJyonXG4gICAgICAgICAgICAgICAgPyBjb3B5KGJpbmRpbmdzLCBuYW1lc3BhY2VzLCB1cmwsIGJpbmRpbmcpXG4gICAgICAgICAgICAgICAgOiBjb3B5KGJpbmRpbmdzLCBuYW1lc3BhY2VzW3VybF0sIGlkZW50aWZpZXIsIGJpbmRpbmcpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBiaW5kKGJpbmRpbmdzLCBiaW5kaW5nLCBub29wLCBlbnVtZXJhYmxlLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmIChpbnRlbnQgPT09ICdleHBvcnQnKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgIGltcG9ydGVkLnRoZW4oYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICBjb250ZXh0LmV4cG9ydC5mcm9tKGxpbmspO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gICAgfVxuXG4gICAgaW5zdGFudGlhdGUobW9kdWxlKSB7XG4gICAgICBjb25zdCBlbnVtZXJhYmxlID0gZmFsc2U7XG4gICAgICBjb25zdCBuYW1lc3BhY2UgPSBuZXcgTW9kdWxlTmFtZXNwYWNlKCk7XG4gICAgICBjb25zdCB7Y29udGV4dCwgYmluZGluZ3MsIG5hbWVzcGFjZXMsIHVybH0gPSBtb2R1bGU7XG5cbiAgICAgIGNvbnRleHQuZXhwb3J0ID0gKC4uLmV4cG9ydHMpID0+IHZvaWQgdGhpcy5iaW5kKG5hbWVzcGFjZSwgLi4uZXhwb3J0cyk7XG4gICAgICBjb250ZXh0LmV4cG9ydC5mcm9tID0gKC4uLmxpbmtzKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3QgbGluayBvZiBsaW5rcykge1xuICAgICAgICAgIGNvbnN0IHtpbnRlbnQsIHNwZWNpZmllciwgaWRlbnRpZmllciwgYmluZGluZywgdXJsfSA9IGxpbms7XG4gICAgICAgICAgaWYgKGludGVudCAhPT0gJ2V4cG9ydCcpIGNvbnRpbnVlO1xuICAgICAgICAgIHVybCBpbiBuYW1lc3BhY2VzXG4gICAgICAgICAgICA/IGNvcHkobmFtZXNwYWNlLCBuYW1lc3BhY2VzW3VybF0sIGlkZW50aWZpZXIsIGJpbmRpbmcpXG4gICAgICAgICAgICA6IGJpbmQobmFtZXNwYWNlLCBiaW5kaW5nLCAoKSA9PiBuYW1lc3BhY2VzW3VybF1baWRlbnRpZmllcl0sIGVudW1lcmFibGUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGRlZmluZVByb3BlcnR5KGNvbnRleHQuZXhwb3J0LCAnZGVmYXVsdCcsIHtcbiAgICAgICAgc2V0OiB2YWx1ZSA9PiB2b2lkIHRoaXMuYmluZChuYW1lc3BhY2UsIHtkZWZhdWx0OiAoKSA9PiB2YWx1ZX0pLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIGNvbnRleHQuZXhwb3J0LmRlZmF1bHQgPSB2YWx1ZSA9PiB2b2lkIHRoaXMuYmluZChuYW1lc3BhY2UsIHtkZWZhdWx0OiAoKSA9PiB2YWx1ZX0pO1xuXG4gICAgICBkZWZpbmUoYmluZGluZ3MsICdtb2R1bGUnLCBjb250ZXh0LCBmYWxzZSwgdHJ1ZSk7XG4gICAgICBkZWZpbmUoY29udGV4dCwgJ3Njb3BlJywgc2V0UHJvdG90eXBlT2YoYmluZGluZ3MsIE1vZHVsZVNjb3BlKSwgZW51bWVyYWJsZSwgZmFsc2UpO1xuICAgICAgZGVmaW5lKGNvbnRleHQsICdtZXRhJywgY3JlYXRlKG51bGwpLCBmYWxzZSwgZmFsc2UpO1xuICAgICAgZGVmaW5lKGNvbnRleHQuc2NvcGUsICdtZXRhJywgY29udGV4dC5tZXRhLCBmYWxzZSwgZmFsc2UpO1xuICAgICAgZGVmaW5lKGNvbnRleHQubWV0YSwgJ3VybCcsIHVybCk7XG4gICAgICBmcmVlemUoY29udGV4dCk7XG4gICAgICByZXR1cm4gZGVmaW5lKG1vZHVsZSwgJ2luc3RhbmNlJywge25hbWVzcGFjZSwgY29udGV4dH0pO1xuICAgIH1cblxuICAgIGFzeW5jIGV2YWx1YXRlKG1vZHVsZSkge1xuICAgICAgY29uc3Qge2JpbmRpbmdzLCBuYW1lc3BhY2UsIGNvbnRleHR9ID0gYXdhaXQgbW9kdWxlLmluc3RhbnRpYXRlKCk7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBtb2R1bGUuZXZhbHVhdG9yKGNvbnRleHQsIGNvbnRleHQuZXhwb3J0KTtcbiAgICAgICAgcmV0dXJuIGRlZmluZShtb2R1bGUsICduYW1lc3BhY2UnLCBuYW1lc3BhY2UpO1xuICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihleGNlcHRpb24pO1xuICAgICAgICBkZWZpbmUobW9kdWxlLCAnZXhjZXB0aW9uJywgZXhjZXB0aW9uKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBhc3luYyBpbXBvcnQodXJsKSB7XG4gICAgICBjb25zdCBtb2R1bGUgPSB0aGlzLm1hcFt1cmxdO1xuICAgICAgcmV0dXJuIG1vZHVsZS5uYW1lc3BhY2UgfHwgKGF3YWl0IG1vZHVsZS5ldmFsdWF0ZSgpKTtcbiAgICB9XG5cbiAgICByZXNvbHZlKHNwZWNpZmllciwgcmVmZXJyZXIpIHtcbiAgICAgIHNwZWNpZmllciA9IGAkeyhzcGVjaWZpZXIgJiYgc3BlY2lmaWVyKSB8fCAnJ31gO1xuICAgICAgcmVmZXJyZXIgPSBgJHsocmVmZXJyZXIgJiYgcmVmZXJyZXIpIHx8ICcnfWAgfHwgJyc7XG4gICAgICBjb25zdCBrZXkgPSBgWyR7cmVmZXJyZXJ9XVske3NwZWNpZmllcn1dYDtcbiAgICAgIGNvbnN0IGNhY2hlID0gdGhpcy5yZXNvbHZlLmNhY2hlIHx8ICh0aGlzLnJlc29sdmUuY2FjaGUgPSB7fSk7XG4gICAgICBsZXQgdXJsID0gY2FjaGVba2V5XTtcbiAgICAgIGlmICh1cmwpIHJldHVybiB1cmwubGluaztcbiAgICAgIGNvbnN0IHtzY2hlbWEsIGRvbWFpbn0gPSBTcGVjaWZpZXIucGFyc2Uoc3BlY2lmaWVyKTtcbiAgICAgIGNvbnN0IG9yaWdpbiA9IChzY2hlbWEgJiYgYCR7c2NoZW1hfSR7ZG9tYWluIHx8ICcvLyd9YCkgfHwgYGZpbGU6Ly8vYDtcbiAgICAgIHJlZmVycmVyID1cbiAgICAgICAgKCFyZWZlcnJlciAmJiBvcmlnaW4pIHx8XG4gICAgICAgIChjYWNoZVtgWyR7cmVmZXJyZXJ9XWBdIHx8IChjYWNoZVtgWyR7cmVmZXJyZXJ9XWBdID0gbmV3IFVSTChyZWZlcnJlciwgb3JpZ2luKSkpLmhyZWY7XG4gICAgICB1cmwgPSBjYWNoZVtrZXldID0gbmV3IFVSTChzcGVjaWZpZXIsIHJlZmVycmVyKTtcbiAgICAgIC8vIGxvZyh7c3BlY2lmaWVyLCByZWZlcnJlciwgb3JpZ2luLCBzY2hlbWEsIGRvbWFpbiwgdXJsOiB1cmwuaHJlZn0pO1xuICAgICAgcmV0dXJuICh1cmwubGluayA9IHVybC5ocmVmLnJlcGxhY2UoL15maWxlOlxcL1xcL1xcLy8sICcnKSk7XG4gICAgfVxuXG4gICAgbGlua3Moc291cmNlLCByZWZlcnJlcikge1xuICAgICAgLy8gbG9nKHtkZWNsYXJhdGlvbnN9KTtcbiAgICAgIGxldCBtYXRjaDtcbiAgICAgIGNvbnN0IGxpbmtzID0ge307XG4gICAgICB3aGlsZSAoKG1hdGNoID0gQmluZGluZ0RlY2xhcmF0aW9ucy5leGVjKHNvdXJjZSkpKSB7XG4gICAgICAgIC8vIGxvZyhtYXRjaFswXSk7XG4gICAgICAgIGNvbnN0IFtkZWNsYXJhdGlvbiwgaW50ZW50LCBiaW5kaW5ncywgYmluZGluZywgLCBzcGVjaWZpZXJdID0gbWF0Y2g7XG4gICAgICAgIGNvbnN0IG1hcHBpbmdzID0gKFxuICAgICAgICAgIChiaW5kaW5nICYmICgoYmluZGluZy5zdGFydHNXaXRoKCcqICcpICYmIGJpbmRpbmcpIHx8IGBkZWZhdWx0IGFzICR7YmluZGluZ31gKSkgfHxcbiAgICAgICAgICBiaW5kaW5ncyB8fFxuICAgICAgICAgICcnXG4gICAgICAgICkuc3BsaXQoLyAqLCAqL2cpO1xuICAgICAgICBjb25zdCB1cmwgPSAoc3BlY2lmaWVyICYmIHRoaXMucmVzb2x2ZShzcGVjaWZpZXIsIHJlZmVycmVyKSkgfHwgdW5kZWZpbmVkO1xuICAgICAgICAvLyBsb2coe2RlY2xhcmF0aW9uLCBiaW5kaW5ncywgYmluZGluZywgc3BlY2lmaWVyLCBtYXBwaW5nc30pO1xuICAgICAgICB3aGlsZSAoKG1hdGNoID0gTWFwcGluZ3MuZXhlYyhtYXBwaW5ncykpKSB7XG4gICAgICAgICAgY29uc3QgWywgaWRlbnRpZmllciwgYmluZGluZyA9IGlkZW50aWZpZXJdID0gbWF0Y2g7XG4gICAgICAgICAgbGlua3NbYmluZGluZ10gPSB7aW50ZW50LCBzcGVjaWZpZXIsIGlkZW50aWZpZXIsIGJpbmRpbmcsIHVybH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBsaW5rcztcbiAgICB9XG5cbiAgICBiaW5kKG5hbWVzcGFjZSwgLi4uYmluZGluZ3MpIHtcbiAgICAgIGNvbnN0IGRlc2NyaXB0b3JzID0ge307XG4gICAgICBmb3IgKGNvbnN0IGJpbmRpbmcgb2YgYmluZGluZ3MpIHtcbiAgICAgICAgY29uc3QgdHlwZSA9IHR5cGVvZiBiaW5kaW5nO1xuICAgICAgICBpZiAodHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGNvbnN0IGlkZW50aWZpZXIgPSAoSWRlbnRpZmllci5leGVjKGJpbmRpbmcpIHx8ICcnKVswXTtcbiAgICAgICAgICBpZGVudGlmaWVyICYmIGJpbmQobmFtZXNwYWNlLCBpZGVudGlmaWVyLCBiaW5kaW5nLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGZvciAoY29uc3QgaWRlbnRpZmllciBpbiBiaW5kaW5nKSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyID09PSAoSWRlbnRpZmllci5leGVjKGlkZW50aWZpZXIpIHx8ICcnKVswXSAmJlxuICAgICAgICAgICAgICBiaW5kKG5hbWVzcGFjZSwgaWRlbnRpZmllciwgYmluZGluZ1tpZGVudGlmaWVyXSwgdHJ1ZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xufSkoKTtcbiIsImltcG9ydCB7TW9kdWxlTmFtZXNwYWNlc30gZnJvbSAnLi9uYW1lc3BhY2VzLm1qcyc7XG5pbXBvcnQge01vZHVsZUV2YWx1YXRvcn0gZnJvbSAnLi9ldmFsdWF0b3IubWpzJztcbmltcG9ydCB7TW9kdWxlU3RyYXBwZXJ9IGZyb20gJy4vc3RyYXBwZXIubWpzJztcbmltcG9ydCB7Y3JlYXRlLCBkZWZpbmUsIGZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9IGZyb20gJy4vaGVscGVycy5tanMnO1xuXG5leHBvcnQgY2xhc3MgTW9kdWxlIHtcbiAgY29uc3RydWN0b3IodXJsLCBldmFsdWF0b3IsIGltcG9ydHMpIHtcbiAgICBjb25zdCBlbnVtZXJhYmxlID0gZmFsc2U7XG4gICAgZGVmaW5lKHRoaXMsICd1cmwnLCB1cmwsIGVudW1lcmFibGUpO1xuICAgIGRlZmluZSh0aGlzLCAnZXZhbHVhdG9yJywgTW9kdWxlRXZhbHVhdG9yKGV2YWx1YXRvciksIGVudW1lcmFibGUpO1xuICAgIGRlZmluZSh0aGlzLCAnY29udGV4dCcsIGNyZWF0ZShudWxsLCBjb250ZXh0dWFscyksIGVudW1lcmFibGUsIGZhbHNlKTtcbiAgICBkZWZpbmUodGhpcywgJ2JpbmRpbmdzJywgY3JlYXRlKG51bGwpLCBlbnVtZXJhYmxlKTtcbiAgICBkZWZpbmUodGhpcywgJ2xpbmtzJywgTW9kdWxlLmxpbmtzKGltcG9ydHMgfHwgYCR7ZXZhbHVhdG9yfWAsIHVybCksIGVudW1lcmFibGUsIGZhbHNlKTtcbiAgICB0aGlzLm5hbWVzcGFjZXMgfHwgZGVmaW5lKG5ldy50YXJnZXQucHJvdG90eXBlLCAnbmFtZXNwYWNlcycsIG5ldyBNb2R1bGVOYW1lc3BhY2VzKCksIGZhbHNlKTtcbiAgICBNb2R1bGUubWFwW3VybF0gPSB0aGlzO1xuICB9XG5cbiAgbGluaygpIHtcbiAgICBjb25zdCBwcm9taXNlID0gTW9kdWxlLmxpbmsodGhpcyk7XG4gICAgZGVmaW5lKHRoaXMsICdsaW5rJywgKCkgPT4gcHJvbWlzZSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICBpbnN0YW50aWF0ZSgpIHtcbiAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2UgfHwgTW9kdWxlLmluc3RhbnRpYXRlKHRoaXMpO1xuICAgIGNvbnN0IHByb21pc2UgPSB0aGlzLmxpbmsoKS50aGVuKCgpID0+IGluc3RhbmNlKTtcbiAgICBkZWZpbmUodGhpcywgJ2luc3RhbnRpYXRlJywgKCkgPT4gcHJvbWlzZSk7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICBldmFsdWF0ZSgpIHtcbiAgICBjb25zdCBwcm9taXNlID0gTW9kdWxlLmV2YWx1YXRlKHRoaXMpLnRoZW4oKCkgPT4gdGhpcy5uYW1lc3BhY2UpO1xuICAgIGRlZmluZSh0aGlzLCAnZXZhbHVhdGUnLCAoKSA9PiBwcm9taXNlKTtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxufVxuXG4vKiogUHJvcGVydGllcyBpbmplY3RlZCBpbnRvIGV2ZXJ5IG1vZHVsZSBjb250ZXh0ICovXG5jb25zdCBjb250ZXh0dWFscyA9IHt9O1xuXG5Nb2R1bGUuZGVidWdnaW5nID0gKCgpID0+IHtcbiAgY29uc3QgZGVidWcgPSAodHlwZSwgLi4uYXJncykgPT4ge1xuICAgIGNvbnNvbGUubG9nKHR5cGUsIC4uLmFyZ3MpO1xuICAgIC8vIHR5cGUgaW4gZGVidWdnaW5nICYmIGRlYnVnZ2luZ1t0eXBlXSBudWxsLCBhcmdzKTtcbiAgfTtcbiAgY29uc3QgZGVidWdnaW5nID0gKGRlYnVnLmRlYnVnZ2luZyA9IHt9KTtcbiAgY29udGV4dHVhbHMuZGVidWcgPSB7dmFsdWU6IGZyZWV6ZShkZWJ1Zyl9O1xuICByZXR1cm4gZGVidWdnaW5nO1xufSkoKTtcblxuc2V0UHJvdG90eXBlT2YoTW9kdWxlLCBuZXcgTW9kdWxlU3RyYXBwZXIoKSk7XG4iLCJpbXBvcnQge2ZyZWV6ZSwgc2V0UHJvdG90eXBlT2Z9IGZyb20gJy4vaGVscGVycy5tanMnO1xuaW1wb3J0IHtNb2R1bGV9IGZyb20gJy4vbW9kdWxlLm1qcyc7XG5cbmV4cG9ydCBjb25zdCBHbG9iYWxTY29wZSA9XG4gICh0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZiAmJiBzZWxmLnNlbGYpIHx8XG4gICh0eXBlb2YgZ2xvYmFsID09PSAnb2JqZWN0JyAmJiBnbG9iYWwgJiYgZ2xvYmFsLmdsb2JhbCkgfHxcbiAgKCgpID0+ICgxLCBldmFsKSgndGhpcycpKSgpO1xuXG5leHBvcnQgY29uc3QgTW9kdWxlU2NvcGUgPSBuZXcgUHJveHkoXG4gIGZyZWV6ZShcbiAgICBzZXRQcm90b3R5cGVPZihcbiAgICAgICgoe2V2YWw6ICRldmFsfSkgPT4gKHtcbiAgICAgICAgZXZhbDogJGV2YWwsXG4gICAgICAgIE1vZHVsZSxcbiAgICAgIH0pKShHbG9iYWxTY29wZSksXG4gICAgICBHbG9iYWxTY29wZSxcbiAgICApLFxuICApLFxuICB7XG4gICAgZ2V0OiAoZ2xvYmFscywgcHJvcGVydHksIHJlY2VpdmVyKSA9PlxuICAgICAgcHJvcGVydHkgaW4gZ2xvYmFscyA/IGdsb2JhbHNbcHJvcGVydHldIDogR2xvYmFsU2NvcGVbcHJvcGVydHldLFxuICAgIHNldDogKGdsb2JhbHMsIHByb3BlcnR5KSA9PiB7XG4gICAgICB0aHJvdyBSZWZlcmVuY2VFcnJvcihgJHtwcm9wZXJ0eX0gaXMgbm90IGRlZmluZWRgKTtcbiAgICB9LFxuICB9LFxuKTtcbiIsImltcG9ydCB7TW9kdWxlU2NvcGUsIEdsb2JhbFNjb3BlfSBmcm9tICcuL3Njb3BlLm1qcyc7XG5cbkdsb2JhbFNjb3BlLk1vZHVsZVNjb3BlID0gTW9kdWxlU2NvcGU7XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0VBQU8sTUFBTSxDQUFDLGNBQWMsRUFBRSx3QkFBd0IsQ0FBQyxHQUFHLE9BQU8sQ0FBQztBQUNsRSxFQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxHQUFHLE1BQU0sQ0FBQzs7QUFFdkQsRUFBTyxNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQzs7QUFFN0IsRUFBTyxNQUFNLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFVBQVUsR0FBRyxLQUFLLEVBQUUsWUFBWSxHQUFHLEtBQUs7RUFDeEYsRUFBRSxjQUFjLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUM7O0FBRS9FLEVBQU8sTUFBTSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxVQUFVLEdBQUcsS0FBSyxFQUFFLFlBQVksR0FBRyxLQUFLO0VBQ3BGLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQzs7QUFFL0UsRUFBTyxNQUFNLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLEtBQUssR0FBRyxVQUFVO0VBQ25FLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsd0JBQXdCLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7O0FBRTlFLEVBQU8sTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDOztFQ1gxQyxNQUFNLGdCQUFnQixDQUFDO0VBQzlCLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRTtFQUNkLElBQUk7RUFDSixNQUFNLElBQUksQ0FBQyxHQUFHLENBQUM7RUFDZixNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSTtFQUMvQyxRQUFRLFNBQVMsS0FBSyxJQUFJLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLFNBQVMsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDO0VBQy9FLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO0VBQ3BCLE1BQU07RUFDTixHQUFHO0VBQ0gsQ0FBQzs7RUNaRDtBQUNBLEFBY0E7RUFDQTtBQUNBLEVBQU8sTUFBTSxRQUFRLEdBQUcsZ0NBQWdDLENBQUM7O0VBRXpEO0FBQ0EsRUFBTyxNQUFNLE9BQU8sR0FBRywyQkFBMkIsQ0FBQzs7RUFFbkQ7QUFDQSxFQUFPLE1BQU0sVUFBVSxHQUFHLHFDQUFxQyxDQUFDO0FBQ2hFLEFBRUE7QUFDQSxFQUFPLE1BQU0sbUJBQW1CLEdBQUcsK0ZBQStGLENBQUM7O0FBRW5JLEVBQU8sTUFBTSxTQUFTLEdBQUcsbUZBQW1GLENBQUM7O0VBRTdHLFNBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxJQUFJO0VBQy9CLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0VBQzdGLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztFQUN2RSxDQUFDLENBQUM7O0VDaENGLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDOztFQUV6QyxNQUFNLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLEtBQUssQ0FBQzs7OzRCQUdKLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQzs4QkFDckIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7SUFHbkQsRUFBRSxJQUFJLENBQUM7OztBQUdYLENBQUMsQ0FBQzs7RUFFRixNQUFNLE9BQU8sR0FBRyxNQUFNO0VBQ3RCLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxLQUFLO0VBQy9DLElBQUksSUFBSSxRQUFRLEdBQUcsRUFBRSxDQUFDO0VBQ3RCLElBQUksUUFBUSxLQUFLLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRztFQUM5QyxNQUFNLE1BQU0sR0FBRyxVQUFVLEVBQUUsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO0VBQzVDLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzNELEtBQUs7RUFDTCxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO0VBQ3hFLEdBQUcsQ0FBQyxDQUFDOztFQUVMLE1BQU0sYUFBYSxHQUFHLE1BQU07RUFDNUIsRUFBRSxDQUFDLE9BQU8sTUFBTSxLQUFLLFVBQVU7RUFDL0IsSUFBSSxzQ0FBc0MsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDdEUsRUFBRSxFQUFFLENBQUM7O0FBRUwsRUFBTyxNQUFNLGVBQWUsR0FBRztFQUMvQixFQUFFLE1BQU07RUFDUixFQUFFLFVBQVUsR0FBRyxDQUFDLE9BQU8sTUFBTSxLQUFLLFVBQVUsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssTUFBTTtFQUNoRixLQUFLLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7O0VDaEM5QyxTQUFTLGVBQWUsR0FBRyxFQUFFO0VBQ3BDO0VBQ0EsRUFBRSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsTUFBTSxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQztFQUNwRSxFQUFFLE1BQU0sUUFBUSxHQUFHLGNBQWMsQ0FBQyxNQUFNLDBCQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDO0VBQzFFLEVBQUUsZUFBZSxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUMsSUFBSSxFQUFFO0VBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDO0VBQ2pFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsS0FBSyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUM7RUFDdkUsR0FBRyxDQUFDLENBQUM7RUFDTCxFQUFFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN2RixDQUFDOztFQ1NNLE1BQU0sY0FBYyxHQUFHLENBQUMsTUFBTTtFQUNyQyxFQUFFLE9BQU8sTUFBTSxjQUFjLENBQUM7RUFDOUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUU7QUFDbkIsRUFDQSxLQUFLOztFQUVMLElBQUksSUFBSSxHQUFHLEdBQUc7RUFDZCxNQUFNLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLE9BQU8sTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDeEYsS0FBSzs7RUFFTCxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sRUFBRTtFQUN2QixNQUFNLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQztFQUM5QixNQUFNLE1BQU0sQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUM7RUFDNUQsTUFBTSxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUM7RUFDMUIsTUFBTSxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUM7RUFDekI7O0VBRUE7RUFDQSxNQUFNLEtBQUssTUFBTSxPQUFPLElBQUksS0FBSyxFQUFFO0VBQ25DLFFBQVEsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0VBQ3BDLFFBQVEsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztFQUMxRCxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsU0FBUztFQUMzQjtFQUNBLFFBQVEsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzFDO0VBQ0EsUUFBUSxNQUFNLFFBQVE7RUFDdEIsVUFBVSxHQUFHO0VBQ2IsV0FBVyxPQUFPLENBQUMsR0FBRyxDQUFDO0VBQ3ZCLGFBQWEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxJQUFJLGVBQWUsS0FBSyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUN2RixRQUFRLElBQUksTUFBTSxLQUFLLFFBQVEsRUFBRTtFQUNqQyxVQUFVLFFBQVEsQ0FBQyxJQUFJO0VBQ3ZCLFlBQVksUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNO0VBQ2hDLGNBQWMsVUFBVSxLQUFLLEdBQUc7RUFDaEMsa0JBQWtCLElBQUksQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUM7RUFDMUQsa0JBQWtCLElBQUksQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQztFQUN2RSxhQUFhLENBQUM7RUFDZCxXQUFXLENBQUM7RUFDWixVQUFVLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDMUQsU0FBUyxNQUFNLElBQUksTUFBTSxLQUFLLFFBQVEsRUFBRTtFQUN4QyxVQUFVLFFBQVEsQ0FBQyxJQUFJO0VBQ3ZCLFlBQVksUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZO0VBQ3RDLGNBQWMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDeEMsYUFBYSxDQUFDO0VBQ2QsV0FBVyxDQUFDO0VBQ1osU0FBUztFQUNULE9BQU87O0VBRVAsTUFBTSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDbEMsS0FBSzs7RUFFTCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUU7RUFDeEIsTUFBTSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUM7RUFDL0IsTUFBTSxNQUFNLFNBQVMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0VBQzlDLE1BQU0sTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQzs7RUFFMUQsTUFBTSxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxPQUFPLEtBQUssS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDO0VBQzdFLE1BQU0sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEtBQUssS0FBSztFQUMxQyxRQUFRLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO0VBQ2xDLFVBQVUsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7RUFDckUsVUFBVSxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUUsU0FBUztFQUM1QyxVQUFVLEdBQUcsSUFBSSxVQUFVO0VBQzNCLGNBQWMsSUFBSSxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsVUFBVSxFQUFFLE9BQU8sQ0FBQztFQUNuRSxjQUFjLElBQUksQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztFQUM3RixTQUFTO0VBQ1QsT0FBTyxDQUFDO0VBQ1IsTUFBTSxjQUFjLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUU7RUFDaEQsUUFBUSxHQUFHLEVBQUUsS0FBSyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFLLENBQUMsQ0FBQztFQUN2RSxPQUFPLENBQUMsQ0FBQzs7RUFFVDs7RUFFQSxNQUFNLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7RUFDdkQsTUFBTSxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsUUFBUSxFQUFFLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztFQUN6RixNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDMUQsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDaEUsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7RUFDdkMsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7RUFDdEIsTUFBTSxPQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDOUQsS0FBSzs7RUFFTCxJQUFJLE1BQU0sUUFBUSxDQUFDLE1BQU0sRUFBRTtFQUMzQixNQUFNLE1BQU0sQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO0VBQ3hFLE1BQU0sSUFBSTtFQUNWLFFBQVEsTUFBTSxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7RUFDeEQsUUFBUSxPQUFPLE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO0VBQ3RELE9BQU8sQ0FBQyxPQUFPLFNBQVMsRUFBRTtFQUMxQixRQUFRLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7RUFDaEMsUUFBUSxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztFQUMvQyxPQUFPO0VBQ1AsS0FBSzs7RUFFTCxJQUFJLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRTtFQUN0QixNQUFNLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDbkMsTUFBTSxPQUFPLE1BQU0sQ0FBQyxTQUFTLEtBQUssTUFBTSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztFQUMzRCxLQUFLOztFQUVMLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxRQUFRLEVBQUU7RUFDakMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUMsU0FBUyxJQUFJLFNBQVMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO0VBQ3RELE1BQU0sUUFBUSxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsSUFBSSxRQUFRLEtBQUssRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7RUFDekQsTUFBTSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUNoRCxNQUFNLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0VBQ3BFLE1BQU0sSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQzNCLE1BQU0sSUFBSSxHQUFHLEVBQUUsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO0VBQy9CLE1BQU0sTUFBTSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzFELE1BQU0sTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxFQUFFLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7RUFDNUUsTUFBTSxRQUFRO0VBQ2QsUUFBUSxDQUFDLENBQUMsUUFBUSxJQUFJLE1BQU07RUFDNUIsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO0VBQzlGLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7RUFDdEQ7RUFDQSxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLEVBQUU7RUFDL0QsS0FBSzs7RUFFTCxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFO0VBQzVCO0VBQ0EsTUFBTSxJQUFJLEtBQUssQ0FBQztFQUNoQixNQUFNLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQztFQUN2QixNQUFNLFFBQVEsS0FBSyxHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRztFQUN6RDtFQUNBLFFBQVEsTUFBTSxDQUFDLFdBQVcs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
