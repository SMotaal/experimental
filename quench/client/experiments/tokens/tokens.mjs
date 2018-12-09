import {Matcher, Token, Kind, UnknownKind, TextKind} from '../../modules/markup.mjs';

(source => {
  const SeparatorKind = Kind('separator');
  const EnclosureKind = Kind('enclosure');
  const OperatorKind = Kind('operator');
  const PunctuatorKind = Kind('punctuator');

  const expression = /(.*?)(?:(([\p{Z}\s\n]+)|([\p{Ps}\p{Pe}\p{Pi}\p{Pf}'"`])|([\p{Sm}*&|^-]+)|(\p{Po}|\B(?![_-])\p{P}\B))|$)/gu;
  const map = {
    [SeparatorKind]: 'ᵂᴴ',
    [EnclosureKind]: 'ᴱᴺ',
    [OperatorKind]: 'ᴼᴾ',
    [PunctuatorKind]: 'ᴾᵁ',
    [UnknownKind]: 'ᵁᴺ',
  };
  const groups = Object.getOwnPropertySymbols(map);
  const matcher = new Matcher(expression, undefined, groups);

  console.log({matcher, Matcher});
  console.log([...matcher.tokenize(source)]);
  // for (const token of matcher.tokenize(source)) console.log(token);
  console.log(matcher.debug(source, map));
})(
  String.raw`

<body>
  <a href="http://www.server.com/#frag?q=1">email@server.com</a>
	<script type="module">
		import { X, Y, Z } from 'y';
    const [
      ${'i\u{034F}d_'}, $i\0d$$, i,
      v = (X &= !2^2) && (i += -1.0),
      y = v|0b10101111 ** 1e-6.5 + i++,
      ƒ = async () => ({})
    ] = X.length+1>=1?X[Symbol.iterator]():[];
    var /*UID*/ ${'$º1, $aº1, $·1, $a·1, a٠1, π'} = ${'`pi`'};
    var /*U_ID*/ ${
      // https://mathiasbynens.be/notes/javascript-identifiers
      String.raw`ಠ_ಠ,  ლ_ಠ益ಠ_ლ, foo\u0032bar, Hͫ̆̒̐ͣ̊̄ͯ͗͏̵̗̻̰̠̬͝ͅE̴̷̬͎̱̘͇͍̾ͦ͊͒͊̓̓̐_̫̠̱̩̭̤͈̑̎̋ͮͩ̒͑̾͋͘Ç̳͕̯̭̱̲̣̠̜͋̍O̴̦̗̯̹̼ͭ̐ͨ̊̈͘͠M̶̝̠̭̭̤̻͓͑̓̊ͣͤ̎͟͠E̢̞̮̹͍̞̳̣ͣͪ͐̈T̡̯̳̭̜̠͕͌̈́̽̿ͤ̿̅̑Ḧ̱̱̺̰̳̹̘̰́̏ͪ̂̽͂̀͠`
    };
  </script>
	<style>
		@import url('styles.css');
	</style>
</body>
`,
);

////////////////////////////////////////////////////////////////////////////////

// // class Tokenizer {
// //   constructor(source) {}
// //   *tokenize() {}
// // }
// console.log(Tokenizer, new Tokenizer());

////////////////////////////////////////////////////////////////////////////////

// const map = {separator: 'ᵂ', enclosure: 'ᴱ', operator: 'ᴼ', punctuator: 'ᴾ'};
// const [keys, tags] = [Object.keys(map), Object.values(map)];
// console.log(
//   source.replace(
//     /(.*?)(([\p{Z}\s\n]+)|([\p{Ps}\p{Pe}\p{Pi}\p{Pf}'"`])|([\p{Sm}*&|^]+)|((?![@]\b)\p{Po}|\B(?![_-])\p{P}\B)|$)/gu,
//     (m, segment, sequence, ...args) =>
//       `${segment ? `❲${segment}❳` : ''}${sequence ? `⟪${tags[[args.findIndex(Boolean)]] || ''}${sequence}⟫` : ''}`,
//   ),
// );

////////////////////////////////////////////////////////////////////////////////
// constructor(source = '(.*?)', flags = source && source.flags, map = source && source.map) {
//   super(source, !flags ? 'g' : flags.includes('g') || flags.includes('y') ? flags : `g${flags}`);

//   Object.defineProperties({
//     keys: {value: source.keys || Object.freeze(map ? Object.keys(map) : [])},
//     tags: {value: source.tags || Object.freeze(map ? Object.values(map) : [])},
//     map: {value: map || {}},
//   });
// }

////////////////////////////////////////////////////////////////////////////////

// /(?=(([\p{Z}\s\n]+)|([\p{Ps}\p{Pe}\p{Pi}\p{Pf}'"`])|([\p{Sm}*&|!]+)|((?![@]\b)\p{Po}|\B(?![_-])\p{P}\B)))(?:\1|.*?)/gu,
// (segment, sequence, ...args) =>
//   sequence ? `⟨${tags[[args.findIndex(Boolean)]] || ''}${sequence}⟩` : segment ? `⦗${segment}⦘` : '',

////////////////////////////////////////////////////////////////////////////////

// punctuator: 'ᴾ', // 𝙿𝚌𝚍𝚜𝚎𝚒𝚏𝚘  // 𝙿𝚌𝚍𝚜𝚎𝚒𝚏𝚘 // 𝙿𝚜𝙿𝚎
// base64: '𝙱64',
// id: '𝙸𝙳',
// number: '𝙽𝚄𝙼',
// segment: '𝚂𝙴𝙶',

// (m, segment, sequence, separator, enclosure, operator, punctuator) => {
// const args = [separator, enclosure, operator, punctuator];
// const index = args.findIndex(Boolean);
// const key = map[keys[index]];
// const sequence = index > -1 ? `⟪${key || ''}${args[index]}⟫` : '';

////////////////////////////////////////////////////////////////////////////////

// const src = 'rich-editor.js';
// const src = 'rich-editor-example.html';
// const src = '../../../../modules/lib/tests/identifiers.js';
// typeof require === 'function' ? `${require('fs').readFileSync(`${__dirname}/${src}`)}` :

////////////////////////////////////////////////////////////////////////////////

// Zs, Ps, Pe, base64, S, P, ID, number, word
// const keys = 'ℤ𝕤, ℙ𝕤, ℙ𝚎, 𝕓𝟞𝟜, 𝕊, ℙ, 𝕀𝔻, 𝕕, 𝕨'.split(', ');
// const keys = 'ℤ𝕤,  𝕠,  𝕔, 𝕓,  𝕤,  𝕡,  𝕚, 𝕕, 𝕨'.split(/, +/);
// const keys = 'separator,  closure, base64,  operator,  punctuator,  id, number, segment'.split(/, +/);

// const keys = 'Zs, Ps, Pe, base64, S, P, ID, number, word'.split(', ');
// const keys = 'separator,  enclosure, base64,  operator,  punctuator,  id, number, segment'.split(/, +/);

// /([\p{Z}\s\n]+)|([\p{Ps}\p{Pe}\p{Pi}\p{Pf}'"`])|(base64,[A-Za-z0-9+/]+=?=?)|([\p{Sm}*]+)|(\B\p{Po}\B)|(\0\p{ID_Start}[\p{ID_Continue}]*)|(\0[+\-]?(?:\d[eE][+\-]?)?(?:\d*\.\d+|\d+)|\d+[a-z]\w+)|(\0[^\s\p{Zs}\p{P}\p{Sm}]+(?=[\s\p{P}]|$))/gu,
// (m, Z, PsPe, base64, S, P, ID, number, word) => {
// const args = [Z, PsPe, base64, S, P, ID, number, word];
// const sequence = index > -1 ? `⟪${(key && `${key}⋅`) || ''}${args[index]}⟫` : '';
// return index > -1 ? `⟬${(key && `${key}⋅`) || ''}${args[index]}⟭` : m;

////////////////////////////////////////////////////////////////////////////////

// /(?<ℤ𝕤>\p{Zs}+)|(?<ℙ𝕤>\p{Ps}+)|(?<ℙ𝚎>\p{Pe}+)|(?<𝕓𝟞𝟜>base64,[A-Za-z0-9+/]+=?=?)|(?<𝕊>[\p{Sm}*]+)|(?<ℙ>\p{P})|(?<𝕀𝔻>\p{ID_Start}[\p{ID_Continue}]*)|(?<𝕕>[+\-]?(?:\d[eE][+\-]?)?(?:\d*\.\d+|\d+)|\d+[a-z]\w+)|(?<𝕨>(?=\b\S+|\S*\w)[^\s\p{Zs}\p{P}\p{Sm}]+)/gu,
// (m, ...args) =>
//   `❲${([args.group, args.match] = Object.entries((args.groups = args.pop())).find(([k, v]) => v))[0].replace(
//     'ℤ𝕤',
//     '',
//   )}${args.match || m}❳`

////////////////////////////////////////////////////////////////////////////////
// const Kind = kind => Symbol.for(kind);
// const TextKind = Kind('text');
// const UnknownKind = '';

// function Matcher() {
//   class Token {
//     constructor(text, group, index, match, state) {
//       Object.defineProperties(this, {
//         text: {value: text, writable: false, enumerable: true},
//         group: {value: group, writable: false, enumerable: true},
//         index: {value: index, writable: false, enumerable: true},
//         match: {value: match, writable: false, enumerable: false},
//         state: {value: state, writable: false, enumerable: false},
//       });
//     }
//   }
//   Matcher = class Matcher extends RegExp {
//     constructor(source = '(.*?)', flags = source && source.flags, groups = source && source.groups) {
//       super(source, !flags ? 'g' : flags.includes('g') || flags.includes('y') ? flags : `g${flags}`);
//       Object.defineProperties(this, {
//         groups: {value: source.groups || Object.freeze(groups || [])},
//       });
//     }

//     *tokenize(source, index = 0) {
//       let match, lastIndex, nextIndex, token;
//       this.lastIndex = index = (index > 0 && index) || 0;
//       const state = Object.create(null, {
//         source: {value: source, enumerable: false},
//         index: {value: index, writable: true, enumerable: true},
//         match: {value: undefined, writable: true, enumerable: false},
//       });
//       const groups = this.groups;
//       const groupCount = groups.length;
//       while (true) {
//         match = match = this.exec(source);
//         if (!match || !match[0]) return;
//         const [, text, sequence, ...args] = (state.match = match);
//         lastIndex = match.index;
//         nextIndex = this.lastIndex;
//         match.text = text;
//         match.sequence = sequence;
//         let group = UnknownKind;
//         if (sequence) for (let i = 0, n = groupCount; (!args[i] && n--) || !(group = groups[i]); i++);
//         match.group = group;
//         if (text) {
//           const nextIndex = (state.index = lastIndex + text.length);
//           yield (token = new Token(text, TextKind, lastIndex, match, state));
//           if (state.index !== nextIndex) {
//             this.lastIndex = state.index;
//             continue;
//           }
//           lastIndex = nextIndex;
//         }
//         if (sequence) {
//           state.index = nextIndex;
//           yield (token = new Token(sequence, group, lastIndex, match, state));
//           state.index === nextIndex || (this.lastIndex = state.index);
//         }
//       }
//     }

//     debug(source, map) {
//       let output = '';
//       for (const token of matcher.tokenize(source)) {
//         const {text, group, index} = token;
//         if (!text) continue;
//         const tag = (map && map[group || UnknownKind]) || map[TextKind];
//         let slice = source.slice(index, index + text.length);
//         slice = slice === text ? '' : `≢${slice}`;
//         output += group !== TextKind ? `⟪${tag}${text}${slice}⟫` : `❲${text}${slice}❳`;
//       }
//       return output;
//     }
//   };

//   if (new.target) return new Matcher(...arguments);
// }
