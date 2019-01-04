import {Core} from './core.js';

const {log, warn, dir, group, groupEnd} = console;

const print = (value, header) => {
  log('\n%s', header || '');
  dir(value, {compact: true});
};

const createCore = ({
  // Wire the core to exports namespace object
  exports = {},
  hooks = {
    binding: {get: () => exports.binding, set: value => (exports.binding = value)},
    internalBinding: {get: () => exports.internalBinding, set: value => (exports.internalBinding = value)},
    BuiltinModule: {get: () => exports.BuiltinModule, set: value => (exports.BuiltinModule = value)},
  },
  ...options
} = {}) => ({core: new Core({...options, hooks}), hooks, exports});

{
  {
    const {
      core,
      exports,
      hooks,
      core: {internal},
    } = createCore();

    group('\n\n\u2014 core = new Core()');
    print(exports, 'exports:');
    print(hooks, 'hooks:');
    print(core, 'core:');
    print(internal, 'core.internal:');
    groupEnd();

    core.internal.hook(process);
    group('\n\n\u2014 core.internal.hook(process)');
    print(exports, 'exports:');
    print(internal, 'core.internal:');
    groupEnd();
  }

  {
    const options = {builtins: {config: {}}, entrypoint: import.meta.url};
    const {
      core,
      exports,
      hooks,
      core: {internal},
    } = createCore(options);

    group('\n\n\u2014 core = new Core(%o)', options);
    print(exports, 'exports:');
    print(
      internal.BuiltinModule.require(internal.entrypoint),
      `internal.BuiltinModule.require(internal.entrypoint = "${internal.entrypoint}"):`,
    );
    print(internal, 'core.internal:');
    groupEnd();

    // core.internal.hook(process);
    // group('\n\n— core.internal.hook(process)');
    // print(exports, 'exports:');
    // print(hooks, 'hooks:');
    // print(core, 'core:');
    // print(internal, 'core.internal:');
    // groupEnd();
  }
}
