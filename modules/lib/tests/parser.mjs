/* CONCLUSION: the markup parser is the way to go :) */

const all = (...patterns) => patterns.map(p => (p && p.exec ? p.source : p)).join('|');

const FromSpecifier = /'[^\n]*'|"[^\n]*"/m; // (?= *;? *$)
const ImportBindings = /(?:(?:.*?, *|){ *([^}]*?) *}|\* +as +.*?|.*?)(?= +from)/g;
const ExportBindings = /{ *([^}]*?) *}|\*/g;

const raw = String.raw;
const source = source => `${(source && source.source) || source || ''}`;
const regexp = (strings, ...values) => raw(strings, ...values.map(source)).replace(/\n */g, '');
const Replacer = (source, flag = 'g') =>
  new RegExp(
    `${source.source || source || '.'}`,
    `${flag}${(source.flags && source.flags.replace(/([yg])/g, '')) || ''}`,
  );

const ImportDeclaration = new RegExp(
  regexp`import +(?:(?:${ImportBindings}) +from +|)(?:['"].+?)(?= *;? *$)`,
  'm',
);
const ExportDeclaration = new RegExp(
  regexp`export +(?:
    default +
    |(?:${ExportBindings}) +from +['"].+?(?= *;? *$)
    |(?:(?:async +)?function\*?|class) +[^\s\n(]+
    |(?:const|var|let) +((?:(?:[^\n\{\[=;]+(?: *= *[^,\n]+(?=,|;))?|{[^]+(?=} *=)}|\[[^]+\](?=] *=))(?: *,[\n\s]*|))+))`,
  'm',
);
const ModuleDeclaration = new RegExp(
  regexp`^( *)(?=(import|export(?: +(?:async +function\*?|function\*?|class|const|var|let|default)|)) *([{\[*'"]|[^\s(,;]+))(?:${
    ImportDeclaration.source
  }|${ExportDeclaration.source})( *;?)`,
  'm',
);

regexp`${ImportDeclaration}|${ExportDeclaration}`;

function* matches(string, expression, match) {
  expression = Replacer(expression);
  while ((match = expression.exec(string)) && (match[0].length > 0 || expression.lastIndex++))
    yield match;
}

{
  const modules = [
    raw`
  import '../level-1/direct-exports';
  import direct_exports_default from '../level-1/direct-exports';
  import * as direct_exports from '../level-1/direct-exports';
  import {g1, g2, g1 as g2} from '../level-1/direct-exports';
  export {default as export_direct_imports_default } from '../level-1/direct-exports';
  export var q;
  export const TWO = 2, THREE;
  export let {
    a: [
      b,
      { c: {
          d = ({[0]: z} = '') => {
            throw Error('Error');
            z = 1;
          }
        } = {},
        e: f = {y: 1, x: q},
      } = w,
    ],
  } = defaults;
  export default defaults;

  /* Exported Top-level Functions and Classes */
  export function g1() {}
  export async function g2() {}
  export async function* g3() {}
  export class G1 {}
`,
  ];

  // const matcher = ImportDeclaration;
  // const matcher = ExportDeclaration;
  const matcher = ModuleDeclaration;
  const replacer = Replacer(matcher);

  let i = 0;

  for (const module of modules) {
    console.group(module);
    console.time(`parsing #${i}`);
    let result;
    for (let n = 1000; n--; ) {
      const matches = [];
      const exports = [];
      const links = [];
      const ambigious = [];
      const bindings = [];
      const output = module.replace(replacer, (text, inset, intent, predicate, ...rest) => {
        const [tail, index, source] = rest.splice(-3, 3);
        const classifier = intent.replace(/\s+/g, ' ');
        // const [, from] = /\bfrom +['"](.*)['"]/.exec(text) || '';
        const [, from] = /['"](.*)['"][ ;]*$/.exec(text) || ''; // (?:\bfrom)? +
        const result = {from, text, classifier, predicate, rest, from, index};
        matches.push(result);

        let replacement = text;
        let entities;

        switch (classifier) {
          case 'export default':
            bindings.push(classifier);
            return `${inset}exports.default = `;
          case 'export const':
          case 'export let':
          case 'export var':
            // destructuring
            if (rest[2]) {
              if (predicate === '{') entities = rest[2].slice(0, rest[2].lastIndexOf('}') + 1);
              else if (predicate === '[') entities = rest[2].slice(0, rest[2].lastIndexOf(']') + 1);
              if (entities && typeof entities === 'string') {
                if (entities.includes('='))
                  entities = entities
                    // normalize spacing
                    .replace(/[\s\n]*( => | = |[{}\[\]():,]|(?=[\s\n]))[\s\n]*/g, ' $1 ')
                    .replace(/\s+/g, ' ')
                    // filter
                    .replace(/( = [(]) (.*?) ([)] => )/g, '$1/* */$3')
                    // pick
                    .replace(
                      /([\[{,:] )((?!\d)[^\s\[\]{}(),;:=><!&+\-*/]+)( [,}\]=] )/g,
                      '$1«$2»$3',
                    )
                    // extract
                    .replace(/.*?«([^»]+)»[^«]*/g, '$1 ')
                    .trim()
                    .split(' ');
                else entities = [entities];
              }
            }
          case 'export class':
          case 'export function':
          case 'export function*':
          case 'export async function':
          case 'export async function*':
            exports.push(...(entities || [predicate]));
            replacement = `${inset}${text.slice(7 + inset.length)}`;
            break;
          default:
            if (from) {
              const link = text.slice(inset.length, -tail.length);
              links.push(link);
              replacement = `${inset}/* ${link} */`;
            } else {
              ambigious.push(result);
            }
        }
        return replacement;
      });
      if (exports.length) {
        bindings.push(`export { ${exports.join(', ')} }`);
      }
      result = {exports, links, bindings, ambigious, output}; // matches,
    }
    if (result.exports && result.exports.length) {
    }
    console.timeEnd(`parsing #${i++}`);
    const {output, ...details} = result;
    console.log(details);
    console.log(output);

    // for (const match of matches(module, matcher)) console.log('%O %O %s', match[1], match[2], match[0]);
    console.groupEnd();
  }
  // [modules[0]]
  //   .concat([...matches(modules[0], ModuleDeclarations)].map(v => v[0]))
  //   .map(v => console.log(v));
}

// new RegExp(raw({raw: strings.raw.map(source)}, values.map(source)));

// const ExportDeclaration = /default +|((?:async +)?function\*? +|class +)[^\s\n(]+|(?:const +|var +|let +)(?:[^\s\{\[]=,;]+|{[^]*}(?= *=.+?[;\n])|\[[^]*\](?= *=.+?[;,\n]))/

// regexp`^ *(?=(import|export(?: +(?:async +function\*?|function\*?|class|const|var|let|default)|)) *([^\s({,;\[]+))(?:${
