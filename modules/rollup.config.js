const bundles = {
  markup: {
    input: 'markup/lib/markup.js',
    context: 'this',
    output: { exports: 'named'},
  },
  modules: {
    // input: 'modules/lib/module-scope.mjs',
    input: 'modules/lib/modules.mjs',
    context: 'this',
    // output: { name: 'ModuleScope'},
  },
};
const output = {sourcemap: 'inline'};

const bundle = (name, format = 'umd', extension = format === 'es' ? '.mjs' : '.js') => {
  const file = `packages/${name}${extension}`;
  return Object.assign({}, bundles[name], {
    output: Object.assign({file, format, name}, output, bundles[name].output),
  });
};

export default [
  bundle('markup'),
  bundle('markup', 'es'),
  bundle('modules', 'iife', '.js'),
  // bundle('modules', 'iife', '.js'),
  // bundle('modules', 'es'),
];
