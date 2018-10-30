(function() {
  with ((arguments.return = new arguments[0]('export const a')).ModuleContext) {
    (function*() {
      'use strict';
      yield () => {
        const a = (export_const_a = 1);
        const args = arguments;
        console.log('args', args);
        for (const ƒ of [() => this, () => arguments]) {
          try {
            console.log(ƒ, ƒ());
          } catch (exception) {
            console.warn(ƒ, exception);
          }
        }
      };
    })().next().value();
  }
  console.log(arguments.return);
  return arguments.return;
})(
  {}.constructor(function() {
    const Object = {}.constructor;
    const {create, freeze, defineProperties, getOwnPropertyDescriptors} = Object;
    const [global = this || freeze(create(null)), Module, Throw] = arguments;

    {
      const ReturnTrue = () => true;
      const ReturnNull = () => null;

      /// Global Context
      const GlobalContext = create(
        new Proxy(global, {
          set: ReturnTrue,
          delete: ReturnTrue,
          setPrototypeOf: ReturnTrue,
          getPrototypeOf: ReturnNull,
          get: (target, property) => {
            if (property === 'this') return undefined;
            if (property === 'arguments') Throw(ReferenceError, `"arguments" cannot be set`);
            const value = target[property];
            return (value && typeof value === 'function' && value.bind(target)) || value;
          },
        }),
        {[Symbol.toStringTag]: {value: 'GlobalContext'}},
      );

      const CreateExportBinding = (module, name, immutable = false) => {
        name in module.Bindings && Throw(ReferenceError, `${name} is already declared`);
        module.Bindings[name] = freeze({
          module,
          name,
          get: () => module.Values[name],
          set: value => {
            if (immutable && name in module.Values)
              Throw(ReferenceError, `${name} is immutable and cannot be set`);
            module.Values[name] = value;
          },
        });
      };

      const DefaultBindings = {
        this: freeze({set: () => Throw(ReferenceError, `"this" cannot be set`)}),
        arguments: freeze({set: () => Throw(ReferenceError, `"arguments" cannot be set`)}),
      };

      const CreateModuleContext = (module, Exports) => {
        module.Values = {};
        module.Bindings = {
          ...DefaultBindings,
        };

        for (const expression of Exports) {
          const parts = expression.split(' ');
          const [, type, name] = parts;
          CreateExportBinding(module, name, type === 'const');
          module.Bindings[parts.join('_')] = module.Bindings[name];
          // {set: module.Bindings[name].set};
        }

        module.ModuleContext = new Proxy(GlobalContext, {
          // has: (target, property) => property in module.Bindings,
          has: ReturnTrue,
          get: (target, property) => {
            if (!property || !property.length) return;
            console.log('get', target, property);
            const value =
              property in module.Bindings
                ? module.Values[property]
                : property in GlobalContext
                  ? GlobalContext[property]
                  : Throw(ReferenceError, `"${property}" is not defined`);
            return value;
          },
          set: (target, property, value) => {
            console.log('set', target, property, value);
            property in module.Bindings
              ? module.Bindings[property].set(value)
              : Throw(ReferenceError, `"${property}" is not declared`);
            return true;
          },
          defineProperty: (target, property, descriptor) => {
            console.log('defineProperty', target, property, descriptor);
            return true;
          },
          delete: ReturnTrue,
          setPrototypeOf: ReturnTrue,
          getPrototypeOf: ReturnNull,
        });
        // {[Symbol.toStringTag]: {value: 'ModuleContext'}},
      };

      defineProperties(
        Module,
        getOwnPropertyDescriptors(freeze({GlobalContext, CreateModuleContext})),
      );
    }

    /// Module Context
    {
      freeze(Module);
    }

    return Module;
  })(
    (typeof self === 'object' && self && self.self === self && self) ||
      (typeof global === 'object' && global && global.global === global && global) ||
      undefined,
    class Module {
      constructor(...Exports) {
        Module.CreateModuleContext(this, Exports);
      }
    },
    (Error, ...args) => {
      throw new Error(...args);
    },
  ),
);
