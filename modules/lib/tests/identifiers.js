/// Valid Identifiers experiments
//* SEE: https://jsbin.com/gist/1c6148075aa7d39c12ffef4bdc81be6b?source=javascript&result=console
(() => {
  // prettier-ignore
  const THIS = { get() { return this;}, configurable: true };
  const {defineProperty} = Object;

  const toCode = char => `${char || ''}`.codePointAt(0);
  const fromCode = String.fromCodePoint;

  const maps = new class CharacterMaps extends Array {}(
    ['latin', ['a', 'A', '0']],
    ['full', ['ａ', 'Ａ', '０']],
    ['monospace', ['𝚊', '𝙰', '𝟶']],
    ['normal', ['𝖺', '𝖠', '𝟢']],
    ['bold', ['𝗮', '𝗔', '𝟬']],
    ['italic', ['𝘢', '𝘈', '𝟢']],
    ['bold italic', ['𝙖', '𝘼', '𝟬']],
    ['outline', ['𝕒', '𝔸', '𝟘']],
    ['enclosed', ['🅐', '🅰', '⓪ ①']],
    ['circle', ['ⓐ', 'Ⓐ', '⓪ ①']],
    ['decorative', ['⒜', '🄐', '⓪ ①']],
  );

  {
    const {
      styles = (maps.styles = []),
      table = (maps.table = {}),
      mappings = (maps.mappings = {}),
      define = (maps.define = (char, key, style, code) =>
        ((char = char && fromCode((code = toCode(char)))) &&
          (table[code] || (table[char] = table[code] = {char, code, key, style}))) ||
        undefined),
      define: {
        range = (define.range = (chars, key, steps, style) => {
          const defined = [];
          if (chars && chars.length) {
            chars.split && (chars = chars.split(' '));
            for (let i = 0, c, k = toCode(key), n = steps; n--; ) {
              chars.length - i >= 1 ? (c = toCode(chars[i++])) : c++;
              defined.push(define(fromCode(c), fromCode(k++), style));
            }
          }
          return defined;
        }),
      },
      format = (maps.format = (string, style) =>
        (style &&
          string
            .normalize('NFC')
            .replace(/([a-zA-Z0-9])/giu, (a, m) => ((m = mappings[toCode(a)]) && m[style]) || a)) ||
        string),
    } = maps;

    for (const [style, mapping] of maps) {
      styles.push(style);
      let [$a, $A, $0] = (maps[style] = mapping);
      const mapped = [
        ...define.range($a, 'a', 25, style),
        ...define.range($A, 'A', 25, style),
        ...define.range($0, '0', 10, style),
      ];
      for (const mapping of mapped) {
        const {key, code, char} = mapping;
        'mapping' in mapping || defineProperty(mapping, 'mapping', THIS);
        (mapping.map = mappings[code] = mappings[char] =
          mappings[key] || (mappings[key] = table[key].map = {}))[style] = char;
      }
    }

    // console.table(table);
    // console.table(mappings);
  }

  {
    const chars = (from, steps) =>
      from.repeat(steps).replace(/./gu, (c, i) => fromCode(toCode(c) + i));

    console.log(
      ...maps.styles.map(style =>
        maps.format(['', chars('a', 25), chars('A', 25), chars('0', 10), ''].join('\n'), style),
      ),
    );
  }

  {
    const raw = String.raw;
    const identifiers = [];
    const identifier = (...args) => identifiers.push(raw(...args));

    {
      const identifiers =
        'module global this import export default const let var function class from as';

      const ids = [identifiers];
      console.log(
        ...maps.styles.map(
          style => (
            ids.push((style = maps.format(identifiers, style))),
            style.split(' ').map(id => identifier`${id}`),
            `\n${style.trim()}\n`
          ),
        ),
      );
    }

    console.dir(
      [identifiers].map(v =>
        Object.assign(
          {},
          ...v.map(v => {
            const u = v
              // Join non-latin
              // .replace(/(.)([^a-z])/giu, `$1\u{034F}$2`)
              // Join latin (keywords)
              .replace(/^([a-z]+)$/iu, `$1\u{034F}`);
            try {
              // eval(`let ${u}, ${v} = '${v}'; v={${v}: ${v} === ${u}}`);
              eval(`let ${u} = () => (${u}.meta = '${u}', {'${v}': '${v}', ${u}}); v=${u}()`);
            } catch (e) {
              v = {[v]: String(e)};
            }
            return v;
          }),
        ),
      )[0],
    );
  }
})();
