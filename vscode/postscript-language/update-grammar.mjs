let require, __filename, __dirname;

(async (execute, fetch) => {
  const defaultArguments = [
    'textmate/postscript.tmbundle',
    'Syntaxes/Postscript.tmLanguage',
    './syntaxes/postscript.tmLanguage.json',
  ];
  const sourceURL = 'https://raw.githubusercontent.com/Microsoft/vscode/master/build/npm/update-grammar.js';
  const source = (await (await fetch(sourceURL)).text()) || '';

  const Module = await import('module');
  const {fileURLToPath} = await import('url');
  __filename = fileURLToPath(new URL(import.meta.url));
  __dirname = fileURLToPath(new URL('.', import.meta.url));
  require = Module.createRequireFromPath(__filename);

  const {argv} = process;
  argv.length > 2 || argv.splice(2, argv.length, ...defaultArguments);
  argv[1] = sourceURL;

  const header = (source.match(/\/\*[^]*?\*\//) || '')[0];
  header && console.log(`\n${header.replace(/^\s*\/?\*\W*|\*\/?$/gm, '').trim()}\n`);

  execute(`var module = {exports: {}}, exports = module.exports;\n\n${source}`);
})(
  function execute() {
    return eval(arguments[0]);
  },
  (...args) =>
    new Promise(async (resolve, reject) => {
      (await import('https'))
        .get(...args, response => {
          let body = '';
          response.text = async () => body;
          response.setEncoding('utf8');
          response.on('data', chunk => (body += chunk));
          response.on('end', () => resolve(response));
        })
        .on('error', reject);
    }),
);

// import https from 'https'; // await import('https').catch(Error);
// import module from 'module';

// const require = module.createRequireFromPath(new URL(import.meta.url).pathname);

// Promise.all([import('url'), import('module')]).then(async function() {
//   __fileanme = arguments[0][0].fileURLToPath(new URL(import.meta.url));
//   __dirname = arguments[0][0].fileURLToPath(new URL('.', import.meta.url));
//   require = arguments[0][1].createRequireFromPath(__filename);
//   return function() {
//     return eval(arguments[0]);
//   };
// }),
