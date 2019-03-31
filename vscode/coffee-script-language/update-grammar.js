const https = require('https'); // await import('https').catch(Error);
const fetch = (...args) =>
  new Promise((resolve, reject) => {
    https
      .get(...args, response => {
        let body = '';
        response.text = async () => body;
        response.setEncoding('utf8');
        response.on('data', chunk => (body += chunk));
        response.on('end', () => resolve(response));
      })
      .on('error', reject);
  });

function execute() {
  var module = {exports: {}};
  var exports = module.exports;
  eval(arguments[0]);
  return exports;
}

(async () => {
  const sourceURL = 'https://raw.githubusercontent.com/Microsoft/vscode/master/build/npm/update-grammar.js';

  const source = (await (await fetch(sourceURL)).text()) || '';
  const {argv} = process;

  const header = (source.match(/\/\*[^]*?\*\//) || '')[0];
  header && console.log(`\n${header.replace(/^\s*\/?\*\W*|\*\/?$/gm, '').trim()}\n`);

  const args = ['atom/language-coffee-script', 'grammars/coffeescript.cson', './syntaxes/coffeescript.tmLanguage.json'];
  argv.length > 2 || argv.splice(2, argv.length, ...args);

  execute(source);
})();
