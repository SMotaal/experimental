/** Markup (render) @author Saleh Abdel Motaal */
function markup(source, options, defaults = markup.defaults) {
  return [...render(source, options, defaults)];
}

/// REGULAR EXPRESSIONS

/** Non-alphanumeric symbol matching expressions (inteded to be extended) */
const matchers = {
  escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
  comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
  quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
  xml: /([\s\n]+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
  // xml: /([\s\n]+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<%|%>|<!--|-->|<[\/\!]?)/gi,
  sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
};

/** Special alpha-numeric symbol test expressions (inteded to be extended) */
const patterns = {
  /** Basic latin Keyword like symbol (inteded to be extended) */
  maybeKeyword: /^[a-z](\w*)$/i,
};

/// SYNTAXES
/** Syntax definitions (inteded to be extended) */
const syntaxes = {default: {patterns, matcher: matchers.sequences}};

/** Mode states (inteded to be extended) */
const modes = {default: {syntax: 'default'}};

/// DEFAULTS
/** Parsing defaults (inteded to be extended) */
const defaults$1 = (markup.defaults = {
  matcher: matchers.sequences,
  syntax: 'default',
  sourceType: 'default',
  renderers: {text: String},
  renderer,
  get syntaxes() {
    return syntaxes;
  },
  set syntaxes(value) {
    if (this !== defaults$1)
      throw Error(
        'Invalid assignment: direct assignment to defaults is not allowed. Use Object.create(defaults) to create a mutable instance of defaults first.',
      );
    Object.defineProperty(this, 'syntaxes', {value});
  },
});

const Null$1 = Object.freeze(Object.create(null));

/// RENDERING
/** Token prototype (inteded to be extended) */
class Token {
  toString() {
    return this.text;
  }
}

async function* renderer(tokens) {
  let i = 0;
  for await (const token of tokens) {
    if (!token) continue;
    // i++ % 100 || (await 0);
    i++ % 10 || (await new Promise(r => setTimeout(r, 1)));
    yield Object.setPrototypeOf(token, Token.prototype);
  }
}

function render(source, options, defaults = markup.defaults) {
  const {syntax, renderer = defaults.renderer, ...tokenizerOptions} = options || defaults;
  const state = {options: tokenizerOptions};
  return renderer((options.tokenize || tokenize$1)(source, state, defaults));
}

/// GROUPING
const Grouper = ({
  /* grouper context */
  syntax,
  goal = syntax,
  quote,
  comment,
  closure,
  span,
  grouping = comment || closure || span || undefined,

  punctuator,
  // terminator = (comment && comment.closer) || undefined,
  spans = (grouping && grouping.spans) || undefined,
  matcher = (grouping && grouping.matcher) || undefined,
  quotes = (grouping && grouping.quotes) || undefined,
  punctuators = {aggregators: {}},
  opener = quote || (grouping && grouping.opener) || undefined,
  closer = quote || (grouping && grouping.closer) || undefined,
  hinter,
  open = (grouping && grouping.open) || undefined,
  close = (grouping && grouping.close) || undefined,
}) => ({
  syntax,
  goal,
  punctuator,
  // terminator,
  spans,
  matcher,
  quotes,
  punctuators,
  opener,
  closer,
  hinter,
  open,
  close,
});

const createGrouper = Grouper;

/// TOKENIZATION

function* contextualizer($, defaults) {
  let grouper;

  $ !== undefined ||
    ($ = (defaults && defaults.syntaxes && defaults.syntaxes.default) || syntaxes.default);

  const initialize = context => {
    context.token ||
      (context.token = (tokenizer => (tokenizer.next(), token => tokenizer.next(token).value))(
        tokenizer(context),
      ));
  };

  if (!$.context) {
    const {
      syntax,
      matcher = ($.matcher = defaults.matcher),
      quotes,
      punctuators = ($.punctuators = {aggregators: {}}),
      punctuators: {aggregators = ($punctuators.aggregators = {})},
      patterns: {
        maybeKeyword = ($.patterns.maybeKeyword =
          ((defaults && defaults.patterns) || patterns).maybeKeyword || undefined),
      } = ($.patterns = {maybeKeyword: null}),
      spans: {[syntax]: spans} = Null$1,
    } = $;

    // matcher.matcher ||
    //   (matcher.matcher = new RegExp(matcher.source, matcher.flags.replace('g', 'y')));

    initialize(
      ($.context = {
        // ... $,
        $,
        punctuators,
        aggregators,
        // matcher: matcher.matcher,
        matcher,
        quotes,
        spans,
      }),
    );
  }

  const {
    syntax: $syntax,
    matcher: $matcher,
    quotes: $quotes,
    punctuators: $punctuators,
    punctuators: {aggregators: $aggregators},
  } = $;

  while (true) {
    if (
      grouper !== (grouper = yield (grouper && grouper.context) || $.context) &&
      grouper &&
      !grouper.context
    ) {
      const {
        goal = $syntax,
        punctuator,
        punctuators = $punctuators,
        aggregators = $aggregators,
        closer,
        spans,
        matcher = $matcher,
        quotes = $quotes,
        forming = goal === $syntax,
      } = grouper;

      // !matcher ||
      //   matcher.matcher ||
      //   (matcher.matcher = new RegExp(matcher.source, matcher.flags.replace('g', 'y')));

      initialize(
        (grouper.context = {
          // ... $.context,
          $,
          punctuator,
          punctuators,
          aggregators,
          closer,
          spans,
          // matcher: matcher && matcher.matcher,
          matcher,
          quotes,
          forming,
        }),
      );
    }
  }
}

function* tokenizer(context) {
  let done, next;

  const {
    $: {
      syntax,
      keywords,
      assigners,
      operators,
      combinators,
      nonbreakers,
      comments,
      closures,
      breakers,
      patterns,
    },
    punctuators,
    aggregators,
    spans,
    quotes,
    forming = true,

    // syntax,
    // keywords,
    // assigners,
    // operators,
    // combinators,
    // nonbreakers,
    // comments,
    // closures,
    // breakers,
    // patterns,
  } = context;

  const {maybeIdentifier, maybeKeyword} = patterns || context;
  const wording = keywords || maybeIdentifier ? true : false;

  const LineEndings = /$/gm;
  const punctuate = text =>
    (nonbreakers && nonbreakers.includes(text) && 'nonbreaker') ||
    (operators && operators.includes(text) && 'operator') ||
    (comments && comments.includes(text) && 'comment') ||
    (spans && spans.includes(text) && 'span') ||
    (quotes && quotes.includes(text) && 'quote') ||
    (closures && closures.includes(text) && 'closure') ||
    (breakers && breakers.includes(text) && 'breaker') ||
    false;
  const aggregate =
    ((assigners && assigners.length) || (combinators && combinators.length)) &&
    (text =>
      (assigners && assigners.includes(text) && 'assigner') ||
      (combinators && combinators.includes(text) && 'combinator') ||
      false);

  while (!done) {
    let token;
    if (next && next.text) {
      const {
        text, // Text for next production
        type, // Type of next production
        // offset, // Index of next production
        // breaks, // Linebreaks in next production
        hint, // Hint of next production
        previous, // Previous production
        parent = (next.parent = (previous && previous.parent) || undefined), // Parent of next production
        last, // Last significant production
      } = next;

      if (type === 'sequence') {
        (next.punctuator =
          (aggregate &&
            previous &&
            (aggregators[text] ||
              (!(text in aggregators) && (aggregators[text] = aggregate(text))))) ||
          (punctuators[text] ||
            (!(text in punctuators) && (punctuators[text] = punctuate(text)))) ||
          undefined) && (next.type = 'punctuator');
      } else if (type === 'whitespace') {
        next.breaks = text.match(LineEndings).length - 1;
      } else if (forming && wording) {
        // type !== 'indent' &&
        const word = text.trim();
        word &&
          ((keywords &&
            keywords.includes(word) &&
            (!last || last.punctuator !== 'nonbreaker' || (previous && previous.breaks > 0)) &&
            (next.type = 'keyword')) ||
            (maybeIdentifier && maybeIdentifier.test(word) && (next.type = 'identifier')));
      } else {
        next.type = 'text';
      }

      previous && (previous.next = next);

      token = next;
    }

    next = yield token;
  }
}

// TODO: <@SMotaal> Refactor
function* tokenize$1(source, state = {}, defaults = markup.defaults) {
  const syntaxes = defaults.syntaxes;

  let {
    match,
    index,
    options: {
      sourceType = (state.options.sourceType = state.options.syntax || defaults.sourceType),
    } = (state.options = {}),
    previous = null,
    mode = (state.mode = modes[sourceType] || modes[defaults.sourceType]),
    mode: {syntax},
    grouping = (state.grouping = {
      hints: new Set(),
      groupings: [],
      groupers: mode.groupers || (mode.groupers = {}),
    }),
  } = state;

  (state.source === (state.source = source) && index >= 0) ||
    (index = state.index = (index > 0 && index % source.length) || 0);

  const top = {type: 'top', text: '', offset: index};

  let done,
    parent = top,
    last;

  let lastContext;

  const {
    [(state.syntax = state.mode.syntax)]: $ = defaults.syntaxes[defaults.syntax],
  } = defaults.syntaxes;

  const $contexting = contextualizer($, defaults);
  let $context = $contexting.next().value;

  // Initial contextual hint (syntax)
  !syntax ||
    (grouping.goal || (grouping.goal = syntax), grouping.hint && grouping.lastSyntax === syntax) ||
    (grouping.hints.add(syntax).delete(grouping.lastSyntax),
    (grouping.hint = [...grouping.hints].join(' ')),
    (grouping.context = state.context || (state.context = grouping.lastSyntax = syntax)));

  while (true) {
    const {
      $: {syntax, matchers, comments, spans, closures},
      // syntax, matchers, comments, spans, closures,

      punctuator: $$punctuator,
      closer: $$closer,
      spans: $$spans,
      // matcher: $$matcher,
      matcher: {
        matcher: $$matcher = ($context.matcher.matcher = new RegExp(
          $context.matcher.source,
          $context.matcher.flags, // .replace('g', 'y'),
        )),
      },
      token,
      // token = ($context.token = (tokenizer => (
      //   tokenizer.next(), token => tokenizer.next(token).value
      // ))(tokenizer($context))),
      forming = true,
    } = $context;

    // Prime Matcher
    // ((state.matcher !== $$matcher && (state.matcher = $$matcher)) ||
    //   state.index !== $$matcher.lastIndex) &&
    //   $$matcher.exec(state.source);

    // Current contextual hint (syntax or hint)
    const hint = grouping.hint;

    while (lastContext === (lastContext = $context)) {
      let next;

      state.last = last;

      const lastIndex = state.index || 0;

      $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
      match = state.match = $$matcher.exec(source);
      done = index === (index = state.index = $$matcher.lastIndex) || !match;

      if (done) return;

      // Current contextual match
      const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

      // Current quasi-contextual fragment
      const pre = source.slice(lastIndex, offset);
      pre &&
        ((next = token({type: 'pre', text: pre, offset: lastIndex, previous, parent, hint, last})),
        yield (previous = next));

      // Current contextual fragment
      const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
      next = token({type, text, offset, previous, parent, hint, last});

      // Current contextual punctuator (from sequence)
      const closing =
        $$closer &&
        ($$closer.test
          ? $$closer.test(text)
          : $$closer === text || (whitespace && whitespace.includes($$closer)));

      let after;
      let punctuator = next.punctuator;

      if (punctuator || closing) {
        // punctuator text closing next parent
        // syntax matchers closures spans $$spans

        let hinter = punctuator ? `${syntax}-${punctuator}` : grouping.hint;
        let closed, opened, grouper;

        if (closing) {
          closed = grouper = closing && grouping.groupings.pop();
          next.closed = closed;
          grouping.groupings.includes(grouper) || grouping.hints.delete(grouper.hinter);
          (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
            (closed.punctuator && (next.punctuator = closed.punctuator));
          after = grouper.close && grouper.close(next, state, $context);

          const previousGrouper = (grouper = grouping.groupings[grouping.groupings.length - 1]);
          grouping.goal = (previousGrouper && previousGrouper.goal) || syntax;
          parent = (parent && parent.parent) || top;
        } else if ($$punctuator !== 'comment') {
          const group = `${hinter},${text}`;
          grouper = grouping.groupers[group];

          if ($$spans && punctuator === 'span') {
            const span = $$spans[text];
            next.punctuator = punctuator = 'span';
            opened =
              grouper ||
              createGrouper({
                syntax,
                goal: syntax,
                span,
                matcher: span.matcher || (matchers && matchers.span) || undefined,
                spans: (spans && spans[text]) || undefined,
                hinter,
                punctuator,
              });
          } else if ($$punctuator !== 'quote') {
            if (punctuator === 'quote') {
              opened =
                grouper ||
                createGrouper({
                  syntax,
                  goal: punctuator,
                  quote: text,
                  matcher: (matchers && matchers.quote) || undefined,
                  spans: (spans && spans[text]) || undefined,
                  hinter,
                  punctuator,
                });
            } else if (punctuator === 'comment') {
              const comment = comments[text];
              opened =
                grouper ||
                createGrouper({
                  syntax,
                  goal: punctuator,
                  comment,
                  matcher: comment.matcher || (matchers && matchers.comment) || undefined,
                  hinter,
                  punctuator,
                });
            } else if (punctuator === 'closure') {
              const closure = (grouper && grouper.closure) || closures[text];
              punctuator = next.punctuator = 'opener';
              // 'opener' !==
              //   (punctuator =
              //     (closure.open &&
              //       (next = closure.open(next, state, previous) || next).punctuator) ||
              //     (next.punctuator = 'opener')) ||
              closure &&
                (opened =
                  grouper ||
                  createGrouper({
                    syntax,
                    goal: syntax,
                    closure,
                    matcher: closure.matcher || (matchers && matchers.closure) || undefined,
                    hinter,
                    punctuator,
                  }));
            }
          }

          if (opened) {
            // after = opened.open && opened.open(next, state, opened);
            grouping.groupers[group] || (grouping.groupers[group] = grouper = opened);
            grouping.groupings.push(grouper), grouping.hints.add(hinter);
            grouping.goal = (grouper && grouper.goal) || syntax;
            parent = next;
          }
        }

        state.context = grouping.context = grouping.goal || syntax;

        if (opened || closed) {
          $context = $contexting.next((state.grouper = grouper || undefined)).value;
          grouping.hint = `${[...grouping.hints].join(' ')} ${
            grouping.context ? `in-${grouping.context}` : ''
          }`;
          opened && (after = opened.open && opened.open(next, state, $context));
        }
      }

      // Current contextual tail token (yield from sequence)
      yield (previous = next);

      // Next reference to last contextual sequence token
      next && !whitespace && forming && (last = next);

      if (after) {
        let tokens, token, nextIndex; //  = after.end || after.index

        if (after.syntax) {
          const {syntax, offset, index} = after;
          const body = index > offset && source.slice(offset, index - 1);
          if (body) {
            body.length > 0 &&
              ((tokens = tokenize$1(body, {options: {syntax}}, defaults)), (nextIndex = index));
            const hint = `${syntax}-in-${$.syntax}`;
            token = token => (
              (token.hint = `${(token.hint && `${token.hint} `) || ''}${hint}`), token
            );
          }
        } else if (after.length) {
          const hint = grouping.hint;
          token = token => (
            (token.hint = `${hint} ${token.type || 'code'}`), $context.token(token)
          );
          (tokens = after).end && (nextIndex = after.end);
        }

        if (tokens) {
          // console.log({token, tokens, nextIndex});
          for (const next of tokens) {
            previous && ((next.previous = previous).next = next);
            token && token(next);
            yield (previous = next);
          }
        }
        nextIndex > index && (state.index = nextIndex);
      }
    }
  }
}

// (next.punctuator = punctuator =
//   (closure.open &&
//     closure.open(next, state, previous) &&
//     (next.punctuator || punctuator)) ||
//   'opener') ||
// (next.punctuator = punctuator =
//   (closure.open && closure.open(next, state, previous)) || 'opener') ||
// if (body.syntax && body.text) {
//   const {syntax, text} = body;
//   const state = {options: {syntax}};
//   const tokens = tokenize(text, state, defaults);
//   for (const token of tokens) yield token;
// }

var parser = /*#__PURE__*/Object.freeze({
  markup: markup,
  matchers: matchers,
  patterns: patterns,
  syntaxes: syntaxes,
  modes: modes,
  defaults: defaults$1,
  renderer: renderer,
  render: render,
  contextualizer: contextualizer,
  tokenizer: tokenizer,
  tokenize: tokenize$1
});

/** @typedef {RegExp|string} Pattern - Valid /(…)/ sub expression */

/// Helpers
const raw = String.raw;

/**
 * Create a sequence match expression from patterns.
 *
 * @param  {...Pattern} patterns
 */
const sequence = (...patterns) =>
  new RegExp(Reflect.apply(raw, null, patterns.map(p => (p && p.source) || p || '')), 'g');

/**
 * Create a maybeIdentifier test (ie [<first>][<other>]*) expression.
 *
 * @param  {Entity} first - Valid ^[<…>] entity
 * @param  {Entity} other - Valid [<…>]*$ entity
 * @param  {string} [flags] - RegExp flags (defaults to 'u')
 * @param  {unknown} [boundary]
 */
const identifier = (first, other, flags = 'u', boundary = /yg/.test(flags) && '\\b') =>
  new RegExp(`${boundary || '^'}[${first}][${other}]*${boundary || '$'}`, flags);

/**
 * Create a sequence pattern from patterns.
 *
 * @param  {...Pattern} patterns
 */
const all = (...patterns) => patterns.map(p => (p && p.exec ? p.source : p)).join('|');

/// Entities

/**
 * The collection of Regular Expressions used to match specific
 * markup sequences in a given context or to test matched sequences verbosely
 * in order to further categorize them. Full support for Unicode Classes and
 * Properties has been included in the ECMAScript specification but certain
 * engines are still implementing them.
 *
 * @type {{[name: string]: {[name: string]: Entity}}}
 */
const entities = {
  es: {
    /** http://www.ecma-international.org/ecma-262/9.0/#prod-IdentifierStart */
    IdentifierStart: raw`_$\p{ID_Start}`,
    /** http://www.ecma-international.org/ecma-262/9.0/#prod-IdentifierPart */
    IdentifierPart: raw`_$\u200c\u200d\p{ID_Continue}`,
  },
};

/** Interoperability (for some browsers) */
(Ranges => {
  const transforms = [];

  if (!supports(raw`\p{ID_Start}`, 'u')) {
    const UnicodePropertyEscapes = /\\p{ *(\w+) *}/g;
    UnicodePropertyEscapes.replace = (m, propertyKey) => {
      if (propertyKey in Ranges) return Ranges[propertyKey].toString();
      throw RangeError(`Cannot rewrite unicode property "${propertyKey}"`);
    };
    transforms.push(expression => {
      let flags = expression && expression.flags;
      let source = expression && `${expression.source || expression || ''}`;
      source &&
        UnicodePropertyEscapes.test(source) &&
        (source = source.replace(UnicodePropertyEscapes, UnicodePropertyEscapes.replace));
      return (flags && new RegExp(source, flags)) || source;
    });
  }

  if (!transforms.length) return;

  for (const key in entities) {
    const sources = entities[key];
    const changes = {};
    for (const id in sources) {
      let source = sources[id];
      if (!source || typeof source !== 'string') continue;
      for (const transform of transforms) source = transform(source);
      !source || source === sources[id] || (changes[id] = source);
    }
    Object.assign(sources, changes);
  }

  // prettier-ignore
  function supports() {try {return !!RegExp(... arguments)} catch (e) { }}
})({
  ID_Start: raw`a-zA-Z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
  ID_Continue: raw`a-zA-Z0-9\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`,
});

// /// Regular Expressions
// export const RegExpUnicodeProperties = /\\p{ *(\w+) *}/g;

// RegExpUnicodeProperties.replace = (m, propertyKey) => {
//   // const property = ASCII[propertyKey] || Unicode[propertyKey];
//   const property = Ranges[propertyKey];
//   if (property) return property.toString();
//   throw RangeError(`Cannot rewrite unicode property "${propertyKey}"`);
// };

// RegExpUnicodeProperties.rewrite = expression => {
//   let flags = expression && expression.flags;
//   let source = expression && `${expression.source || expression || ''}`;
//   source &&
//     RegExpUnicodeProperties.test(source) &&
//     (source = source.replace(RegExpUnicodeProperties, RegExpUnicodeProperties.replace));
//   return (flags && new RegExp(source, flags)) || source;
// };

// /// Interoperability
// export const supported =
//   // TODO: Remove when ssupporting non-unicode runtimes [not in scope]
//   new RegExp(raw`\uFFFF`, 'u') &&
//   supports(
//     UnicodeProperties => new RegExp(raw`\p{L}`, 'u'),
//     UnicodeClasses => new RegExp(raw`\p{ID_Start}\p{ID_Continue}`, 'u'),
//   );

// async function replaceUnsupportedExpressions() {
//   // await Unicode.initialize(); console.log(Unicode);
//   for (const key in entities) {
//     const sources = entities[key];
//     const replacements = {};
//     for (const id in sources)
//       !sources[id] ||
//         typeof (sources[id].source || sources[id]) !== 'string' ||
//         (replacements[id] = RegExpUnicodeProperties.rewrite(sources[id]));
//     Object.assign(sources, replacements);
//   }
//   return;
// }

// function supports(feature, ...features) {
//   if (feature) {
//     try {
//       feature();
//     } catch (exception) {
//       return false;
//     }
//   }
//   return !features.length || Reflect.apply(supports, null, features);
// }

// // TODO: Fix UnicodeRange.merge if not implemented in Firefox soon
// // import {Unicode} from './unicode/unicode.js';

// // TODO: Remove Ranges once UnicodeRange is working
// const Ranges = {
//   // L: 'a-zA-Z',
//   // N: '0-9',
//   ID_Start: raw`a-zA-Z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
//   ID_Continue: raw`a-zA-Z0-9\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`,
// };

// /// Bootstrap
// export const ready = (entities.ready = supported
//   ? Promise.resolve()
//   : replaceUnsupportedExpressions());

/// INTERFACE

const install = (defaults, newSyntaxes = defaults.syntaxes || {}) => {
  Object.assign(newSyntaxes, syntaxes$1);
  defaults.syntaxes === newSyntaxes || (defaults.syntaxes = newSyntaxes);
};

const syntaxes$1 = {};

/// DEFINITIONS
Syntaxes: {
  const closures = string => {
    const pairs = symbols(string);
    const array = new Array(pairs.length);
    array.pairs = pairs;
    let i = 0;
    for (const pair of pairs) {
      const [opener, closer] = pair.split('…');
      array[(array[i++] = opener)] = {opener, closer};
    }
    array.toString = () => string;
    return array;
  };
  const symbols = source =>
    (source &&
      ((typeof source === 'string' && source.split(/ +/)) ||
        (Symbol.iterator in source && [...source]))) ||
    [];
  symbols.from = (...args) => [...new Set([].concat(...args.map(symbols)))];

  CSS: {
    const css = (syntaxes$1.css = {
      ...(modes.css = {syntax: 'css'}),
      comments: closures('/*…*/'),
      closures: closures('{…} (…) […]'),
      quotes: symbols(`' "`),
      assigners: symbols(`:`),
      combinators: symbols('> :: + :'),
      nonbreakers: symbols(`-`),
      breakers: symbols(', ;'),
      patterns: {...patterns},
      matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\*|\*\/|\(|\)|\[|\]|"|'|\{|\}|,|;|\.|\b:\/\/\b|::\b|:(?!active|after|any|any-link|backdrop|before|checked|default|defined|dir|disabled|empty|enabled|first|first-child|first-letter|first-line|first-of-type|focus|focus-visible|focus-within|fullscreen|host|hover|in-range|indeterminate|invalid|lang|last-child|last-of-type|left|link|matches|not|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-child|only-of-type|optional|out-of-range|read-only|required|right|root|scope|target|valid|visited))/g,
      matchers: {
        quote: matchers.escapes,
        comment: matchers.comments,
      },
    });
  }

  HTML: {
    const html = (syntaxes$1.html = {
      ...(modes.html = {syntax: 'html'}),
      keywords: symbols('DOCTYPE doctype'),
      comments: closures('<!--…-->'),
      quotes: [],
      closures: closures('<%…%> <!…> <…/> </…> <…>'),
      patterns: {
        ...patterns,
        closeTag: /<\/\w[^<>{}]*?>/g,
        maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
      },
      matcher: matchers.xml,
      matchers: {
        quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
        comment: /(\n)|(-->)/g,
      },
    });

    {
      const DOCTAGS = symbols('SCRIPT STYLE');
      const TAG = /^[a-z]+$/i;
      // TODO: Check if custom/namespace tags ever need special close logic
      // const TAGLIKE = /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/i;


      html.closures['<'].close = (next, state, context) => {
        const parent = next && next.parent;
        const first = parent && parent.next;
        const tag = first && first.text && TAG.test(first.text) && first.text.toUpperCase();

        if (tag && DOCTAGS.includes(tag)) {
          // TODO: Uncomment once token buffering is implemented
          // tag && (first.type = 'keyword');

          let {source, index} = state;
          const $$matcher = syntaxes$1.html.patterns.closeTag;

          let match; //  = $$matcher.exec(source);
          $$matcher.lastIndex = index;

          // TODO: Check if `<script>`…`</SCRIPT>` is still valid!
          const $$closer = new RegExp(raw`^<\/(?:${first.text.toLowerCase()}|${tag})\b`);

          let syntax = (tag === 'STYLE' && 'css') || '';

          if (!syntax) {
            const openTag = source.slice(parent.offset, index);
            const match = /\stype=.*?\b(.+?)\b/.exec(openTag);
            syntax =
              tag === 'SCRIPT' && (!match || !match[1] || /^module$|javascript/i.test(match[1]))
                ? 'es'
                : '';
            // console.log({syntax, tag, match, openTag});
          }

          while ((match = $$matcher.exec(source))) {
            if ($$closer.test(match[0])) {
              if (syntax) {
                return {offset: index, index: match.index, syntax};
              } else {
                const offset = index;
                const text = source.slice(offset, match.index - 1);
                state.index = match.index;
                return [{text, offset, previous: next, parent}];
              }
            }
          }
        }

      };
      html.closures['<'].quotes = symbols(`' "`);
      html.closures['<'].closer = /\/?>/;

      // TODO: Allow grouping-level patterns for HTML attributes vs text
      // html.closures['<'].patterns = { maybeIdentifier: TAGLIKE };
    }
  }

  Markdown: {
    const BLOCK = '```…``` ~~~…~~~';
    const INLINE = '[…] (…) *…* **…** _…_ __…__ ~…~ ~~…~~';
    const CLOSURES = `${BLOCK} ${INLINE}`;

    const html = syntaxes$1.html;
    const md = (syntaxes$1.md = {
      ...(modes.markdown = modes.md = {syntax: 'md'}),
      comments: closures('<!--…-->'),
      quotes: [],
      closures: closures(`${html.closures} ${CLOSURES}`),
      patterns: {...html.patterns},
      matcher: /(^\s+|\n)|(&#x?[a-f0-9]+;|&[a-z]+;|(?:```+|\~\~\~+|--+|==+|(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|<|>|\(|\)|\[|\]|__?|([*~`])\3?\b|\b([*~`])\4?)|\b[^\n\s\[\]\(\)\<\>&]*[^\n\s\[\]\(\)\<\>&_]\b|[^\n\s\[\]\(\)\<\>&]+(?=__?\b)/gim,
      spans: undefined,
      matchers: {comment: /(\n)|(-->)/g},
    });

    if (md.closures) {
      md.closures['<'] = {...html.closures['<']};

      const previousTextFrom = (token, matcher) => {
        const text = [];
        if (matcher != null) {
          if (matcher.test)
            do token.text && text.push(token.text), (token = token.previous);
            while (!token.text || !matcher.test(token.text));
          else if (matcher.includes)
            do token.text && text.push(token.text), (token = token.previous);
            while (!token.text || !matcher.includes(token.text));
          text.length && text.reverse();
        }
        return text.join('');
      };

      const indenter = (indenting, tabs = 2) => {
        let source = indenting;
        const indent = new RegExp(raw`(?:\t|${' '.repeat(tabs)})`, 'g');
        source = source.replace(/\\?(?=[\(\)\:\?\[\]])/g, '\\');
        source = source.replace(indent, indent.source);
        return new RegExp(`^${source}`, 'm');
      };
      const open = (parent, state, grouper) => {
        const {source, index: start} = state;
        const fence = parent.text;
        const fencing = previousTextFrom(parent, '\n');
        const indenting = fencing.slice(fencing.indexOf('\n') + 1, -fence.length) || '';
        let end = source.indexOf(`\n${fencing}`, start);
        const INDENT = indenter(indenting);
        const CLOSER = new RegExp(raw`\n${INDENT.source.slice(1)}${fence}`, 'g');

        CLOSER.lastIndex = start;
        let closerMatch = CLOSER.exec(source);
        if (closerMatch && closerMatch.index >= start) {
          end = closerMatch.index + 1;
        } else {
          const FENCE = new RegExp(raw`\n?[\>\|\s]*${fence}`, 'g');
          FENCE.lastIndex = start;
          const fenceMatch = FENCE.exec(source);
          if (fenceMatch && fenceMatch.index >= start) {
            end = fenceMatch.index + 1;
          } else return;
        }

        if (end > start) {
          let offset = start;
          let text;

          const body = source.slice(start, end) || '';
          const tokens = [];
          tokens.end = end;
          {
            const [head, ...lines] = body.split(/(\n)/g);
            if (head) {
              // const [, syntax, attributes] = /^(\w.*\b)?\s*(.*)\s*$/.exec(head);
              tokens.push({text: head, type: 'comment', offset, parent}), (offset += head.length);
              // console.log({head, lines, indenting, INDENT});
            }
            for (const line of lines) {
              const [indent] = INDENT.exec(line) || '';
              const inset = (indent && indent.length) || 0;
              if (inset) {
                for (const text of indent.split(/(\s+)/g)) {
                  const type = (text.trim() && 'sequence') || 'whitespace';
                  tokens.push({text, type, offset, parent});
                  offset += text.length;
                }
                text = line.slice(inset);
              } else {
                text = line;
              }
              tokens.push({text, type: 'code', offset, parent}), (offset += text.length);
            }
          }
          // console.log({fencing, body, start, end, offset, lines, tokens});
          if (tokens.length) return tokens;
        }
      };

      md.closures['```'].open = md.closures['~~~'].open = open;

      if (md.closures['```'] && !md.closures['```'].open) {
        md.closures['```'].quotes = html.closures['<'].quotes;
        md.closures['```'].matcher = /(\s*\n)|(```(?=```\s|```$)|^(?:[\s>|]*\s)?\s*)|.*$/gm;
      }

      if (md.closures['~~~'] && !md.closures['~~~'].open) {
        md.closures['~~~'].quotes = html.closures['<'].quotes;
        md.closures['~~~'].matcher = /(\s*\n)|(~~~(?=~~~\s|~~~$)|^(?:[\s>|]*\s)?\s*)|.*$/gm;
      }
    }

    // console.log(md);
  }

  ECMAScript: {
    const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
    const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
    const QUOTES = /`|"|'/g;
    const CLOSURES = /\{|\}|\(|\)|\[|\]/g;

    const es = (syntaxes$1.es = {
      ...(modes.javascript = modes.es = modes.js = modes.ecmascript = {syntax: 'es'}),
      comments: closures('//…\n /*…*/'),
      quotes: symbols(`' " \``),
      closures: closures('{…} (…) […]'),
      spans: {'`': closures('${…}')},
      keywords: symbols(
        // abstract enum interface package  namespace declare type module
        'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set super switch this throw try typeof var void while with yield',
      ),
      assigners: symbols('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
      combinators: symbols('>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'),
      nonbreakers: symbols('.'),
      operators: symbols('++ -- !! ^ ~ ! ...'),
      breakers: symbols(', ;'),
      patterns: {...patterns},
      matcher: sequence`([\s\n]+)|(${all(
        REGEXPS,
        raw`\/=`,
        COMMENTS,
        QUOTES,
        CLOSURES,
        /,|;|\.\.\.|\.|\:|\?|=>/,
        /!==|===|==|=/,
        ...symbols(raw`\+ \- \* & \|`).map(s => `${s}${s}|${s}=|${s}`),
        ...symbols(raw`! \*\* % << >> >>> < > \^ ~`).map(s => `${s}=|${s}`),
      )})`,
      matchers: {
        quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
        // quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        // quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        // "'": /(\n)|(')|(\\.)/g,
        // '"': /(\n)|(")|(\\.)/g,
        // '`': /(\n)|(`|\$\{)|(\\.)/g,
        comment: matchers.comments,
      },
    });

    ECMAScriptExtensions: {
      // const HASHBANG = /^\#\!.*\n/g; // [^] === (?:.*\n)
      // TODO: Undo $ matching once fixed
      const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
      const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g; // [^] === (?:.*\n)
      const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
      const BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
      const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
      const CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
      const ESM = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
      const CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b`;
      const ESX = sequence`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

      const {quotes, closures, spans} = es;
      const syntax = {quotes, closures, spans};
      const matchers$$1 = {};
      ({quote: matchers$$1.quote} = es.matchers);

      const esm = (syntaxes$1.esm = {
        ...(modes.esm = {syntax: 'esm'}),
        keywords: symbols('import export default'),
        ...syntax,
        matcher: ESM,
        matchers: {...matchers$$1, closure: CLOSURE},
      });
      const cjs = (syntaxes$1.cjs = {
        ...(modes.cjs = {syntax: 'cjs'}),
        keywords: symbols('import module exports require'),
        ...syntax,
        matcher: CJS,
        matchers: {...matchers$$1, closure: CJS},
      });
      const esx = (syntaxes$1.esx = {
        ...(modes.esx = {syntax: 'esx'}),
        keywords: symbols.from(esm.keywords, cjs.keywords),
        ...syntax,
        matcher: ESX,
        matchers: {...matchers$$1, closure: ESX},
      });
    }
  }
}

/// Bootstrap
const ready$1 = (async () => {
  await entities.ready;
  syntaxes$1.es.patterns.maybeIdentifier = identifier(
    entities.es.IdentifierStart,
    entities.es.IdentifierPart,
  );
  // console.log({maybeIdentifier: `${syntaxes.es.patterns.maybeIdentifier}`});
})();

// const QUOTES = /`|"\""|""|"(?:[^\"]+|\\.)*(?:"|$)|'\''|''|(?:[^\']+|\\.)*(?:'|$)/g;
// const QUOTES = /`|""|"(?:.*\\.|.*?)*?(?:"|$)|''|'(?:[^\\]*|\\.)*(?:'|$)/g;
// const QUOTES = /`|"(?:\\"|[^\\"]*)*(?:"|$)|'(?:\\.?|[^\\']+)*(?:'|$)|"|'/g;
// const QUOTES = /`|"(?:\\.?|[^\\]*?)*?(?:"|$)|'(?:\\.?|[^\\']*?)*?(?:'|$)/g;

const {assign, defineProperty} = Object;

const document$1 = void null;

class Node {
  get children() {
    return defineProperty(this, 'children', {value: new Set()}).children;
  }
  get childElementCount() {
    return (this.hasOwnProperty('children') && this.children.size) || 0;
  }
  get textContent() {
    return (
      (this.hasOwnProperty('children') && this.children.size && [...this.children].join('')) || ''
    );
  }
  set textContent(text) {
    this.hasOwnProperty('children') && this.children.size && this.children.clear();
    text && this.children.add(new String(text));
  }
  appendChild(element) {
    return element && this.children.add(element), element;
  }
  append(...elements) {
    if (elements.length) for (const element of elements) element && this.children.add(element);
  }
  removeChild(element) {
    element &&
      this.hasOwnProperty('children') &&
      this.children.size &&
      this.children.delete(element);
    return element;
  }
  remove(...elements) {
    if (elements.length && this.hasOwnProperty('children') && this.children.size)
      for (const element of elements) element && this.children.delete(element);
  }
}

class Element extends Node {
  get innerHTML() {
    return this.textContent;
  }
  set innerHTML(text) {
    this.textContent = text;
  }
  get outerHTML() {
    const {className, tag, innerHTML} = this;
    return `<${tag}${(className && ` class="${className}"`) || ''}>${innerHTML || ''}</${tag}>`;
  }
  toString() {
    return this.outerHTML;
  }
  toJSON() {
    return this.toString();
  }
}

class DocumentFragment extends Node {
  toString() {
    return this.textContent;
  }
  toJSON() {
    return (this.childElementCount && [...this.children]) || [];
  }
  [Symbol.iterator]() {
    return ((this.childElementCount && this.children) || '')[Symbol.iterator]();
  }
}

class Text extends String {
  toString() {
    return encodeEntities(super.toString());
  }
}

const createElement = (tag, properties, ...children) => {
  const element = assign(new Element(), {
    tag,
    className: (properties && properties.className) || '',
    properties,
  });
  children.length && defineProperty(element, 'children', {value: new Set(children)});
  return element;
};

const createText = (content = '') => new Text(content);
const encodeEntity = entity => `&#${entity.charCodeAt(0)};`;
const encodeEntities = string => string.replace(/[\u00A0-\u9999<>\&]/gim, encodeEntity);
const createFragment = () => new DocumentFragment();

var pseudo = /*#__PURE__*/Object.freeze({
  document: document$1,
  Node: Node,
  Element: Element,
  DocumentFragment: DocumentFragment,
  Text: Text,
  createElement: createElement,
  createText: createText,
  encodeEntity: encodeEntity,
  encodeEntities: encodeEntities,
  createFragment: createFragment
});

const {document: document$2, Element: Element$1, Node: Node$1, Text: Text$1, DocumentFragment: DocumentFragment$1} =
  'object' === typeof self && (self || 0).window === self && self;

const {createElement: createElement$1, createText: createText$1, createFragment: createFragment$1} = {
  createElement: (tag, properties, ...children) => {
    const element = document$2.createElement(tag);
    properties && Object.assign(element, properties);
    if (!children.length) return element;
    if (element.append) {
      while (children.length > 500) element.append(...children.splice(0, 500));
      children.length && element.append(...children);
    } else if (element.appendChild) {
      for (const child of children) element.appendChild(child);
    }
    return element;
  },

  createText: (content = '') => document$2.createTextNode(content),

  createFragment: () => document$2.createDocumentFragment(),
};

var dom = /*#__PURE__*/Object.freeze({
  document: document$2,
  Element: Element$1,
  Node: Node$1,
  Text: Text$1,
  DocumentFragment: DocumentFragment$1,
  createElement: createElement$1,
  createText: createText$1,
  createFragment: createFragment$1
});

const native = document$2 && dom;

/// OPTIONS
/** The tag name of the element to use for rendering a token. */
const SPAN = 'span';

/** The class name of the element to use for rendering a token. */
const CLASS = 'markup';

/**
 * Intended to prevent unpredictable DOM related overhead by rendering elements
 * using lightweight proxy objects that can be serialized into HTML text.
 */
const HTML_MODE = true;
/// INTERFACE

const renderers = {};

async function* renderer$1(tokens, tokenRenderers = renderers) {
  for await (const token of tokens) {
    const {type = 'text', text, punctuator, breaks} = token;
    const tokenRenderer =
      (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
      (type && tokenRenderers[type]) ||
      (text && tokenRenderers.text);
    const element = tokenRenderer && tokenRenderer(text, token);
    element && (yield element);
  }
}

const install$1 = (defaults, newRenderers = defaults.renderers || {}) => {
  Object.assign(newRenderers, renderers);
  defaults.renderers === newRenderers || (defaults.renderers = newRenderers);
  defaults.renderer = renderer$1;
};

const supported = !!native;
const native$1 = !HTML_MODE && supported;
const implementation = native$1 ? native : pseudo;
const {createElement: createElement$3, createText: createText$3, createFragment: createFragment$3} = implementation;

/// IMPLEMENTATION
const factory = (tag, properties) => (content, token) => {
  if (!content) return;
  typeof content !== 'string' || (content = createText$3(content));
  const element = createElement$3(tag, properties, content);

  element && token && (token.hint && (element.className += ` ${token.hint}`));
  // token.breaks && (element.breaks = token.breaks),
  // token &&
  // (token.form && (element.className += ` maybe-${token.form}`),
  // token.hint && (element.className += ` ${token.hint}`),
  // element && (element.token = token));

  return element;
};

Object.assign(renderers, {
  // whitespace: factory(SPAN, {className: `${CLASS} whitespace`}),
  whitespace: createText$3,
  text: factory(SPAN, {className: CLASS}),

  variable: factory('var', {className: `${CLASS} variable`}),
  keyword: factory(SPAN, {className: `${CLASS} keyword`}),
  identifier: factory(SPAN, {className: `${CLASS} identifier`}),
  operator: factory(SPAN, {className: `${CLASS} punctuator operator`}),
  assigner: factory(SPAN, {className: `${CLASS} punctuator operator assigner`}),
  combinator: factory(SPAN, {className: `${CLASS} punctuator operator combinator`}),
  punctuation: factory(SPAN, {className: `${CLASS} punctuator punctuation`}),
  quote: factory(SPAN, {className: `${CLASS} punctuator quote`}),
  breaker: factory(SPAN, {className: `${CLASS} punctuator breaker`}),
  opener: factory(SPAN, {className: `${CLASS} punctuator opener`}),
  closer: factory(SPAN, {className: `${CLASS} punctuator closer`}),
  span: factory(SPAN, {className: `${CLASS} punctuator span`}),
  sequence: factory(SPAN, {className: `${CLASS} sequence`}),
  literal: factory(SPAN, {className: `${CLASS} literal`}),
  indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
  comment: factory(SPAN, {className: `${CLASS} comment`}),
  code: factory(SPAN, {className: `${CLASS}`}),
});

var dom$1 = /*#__PURE__*/Object.freeze({
  renderers: renderers,
  renderer: renderer$1,
  install: install$1,
  supported: supported,
  native: native$1,
  createElement: createElement$3,
  createText: createText$3,
  createFragment: createFragment$3
});

const raw$1 = String.raw;

/** Create a sequence match expression from patterns. */
const sequence$1 = (...patterns) =>
  new RegExp(Reflect.apply(raw$1, null, patterns.map(p => (p && p.source) || p || '')), 'g');

/** Create a maybeIdentifier test (ie [<first>][<other>]*) expression. */
const identifier$1 = (first, other, flags = 'u', boundary = /yg/.test(flags) && '\\b') =>
  new RegExp(`${boundary || '^'}[${first}][${other}]*${boundary || '$'}`, flags);

/** Create a sequence pattern from patterns. */
const all$1 = (...patterns) => patterns.map(p => (p && p.exec ? p.source : p)).join('|');

const patterns$1 = {
  /** Basic latin Keyword like symbol (inteded to be extended) */
  // maybeKeyword: /^[a-z](\w*)$/i, // TODO: Consider changing to /^[a-z]+$/i
};

/** Entities used to construct patterns. */
const entities$1 = {
  es: {
    IdentifierStart: raw$1`_$\p{ID_Start}`,
    IdentifierPart: raw$1`_$\u200c\u200d\p{ID_Continue}`,
  },
};

/** Interoperability (for some browsers) */
(Ranges => {
  const transforms = [];

  if (!supports(raw$1`\p{ID_Start}`, 'u')) {
    const UnicodePropertyEscapes = /\\p{ *(\w+) *}/g;
    UnicodePropertyEscapes.replace = (m, propertyKey) => {
      if (propertyKey in Ranges) return Ranges[propertyKey].toString();
      throw RangeError(`Cannot rewrite unicode property "${propertyKey}"`);
    };
    transforms.push(expression => {
      let flags = expression && expression.flags;
      let source = expression && `${expression.source || expression || ''}`;
      source &&
        UnicodePropertyEscapes.test(source) &&
        (source = source.replace(UnicodePropertyEscapes, UnicodePropertyEscapes.replace));
      return (flags && new RegExp(source, flags)) || source;
    });
  }

  if (!transforms.length) return;

  for (const key in entities$1) {
    const sources = entities$1[key];
    const changes = {};
    for (const id in sources) {
      let source = sources[id];
      if (!source || typeof source !== 'string') continue;
      for (const transform of transforms) source = transform(source);
      !source || source === sources[id] || (changes[id] = source);
    }
    Object.assign(sources, changes);
  }

  // prettier-ignore
  function supports() {try {return !!RegExp(... arguments)} catch (e) { }}
})({
  ID_Start: raw$1`a-zA-Z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
  ID_Continue: raw$1`a-zA-Z0-9\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`,
});

const mappings = {};

const modes$1 = {
  // Fallback mode
  default: {
    ...(mappings.default = {syntax: 'default'}),
    matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
  },
};

/// DEFINITIONS
Syntaxes: {
  const closures = string => {
    const pairs = symbols(string);
    const array = new Array(pairs.length);
    array.pairs = pairs;
    let i = 0;
    for (const pair of pairs) {
      const [opener, closer] = pair.split('…');
      array[(array[i++] = opener)] = {opener, closer};
    }
    array.toString = () => string;
    return array;
  };
  const symbols = source =>
    (source &&
      ((typeof source === 'string' && source.split(/ +/)) ||
        (Symbol.iterator in source && [...source]))) ||
    [];
  symbols.from = (...args) => [...new Set([].concat(...args.map(symbols)))];

  ECMAScript: {
    const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
    const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
    const QUOTES = /`|"|'/g;
    const CLOSURES = /\{|\}|\(|\)|\[|\]/g;

    const es = (modes$1.es = {
      ...(mappings.javascript = mappings.es = mappings.js = mappings.ecmascript = {syntax: 'es'}),
      comments: closures('//…\n /*…*/'),
      quotes: symbols(`' " \``),
      closures: closures('{…} (…) […]'),
      spans: {'`': closures('${…}')},
      keywords: symbols(
        // abstract enum interface package  namespace declare type module
        'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set super switch this throw try typeof var void while with yield',
      ),
      assigners: symbols('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
      combinators: symbols('>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'),
      nonbreakers: symbols('.'),
      operators: symbols('++ -- !! ^ ~ ! ...'),
      breakers: symbols(', ;'),
      patterns: {
        ...patterns$1,
        maybeIdentifier: identifier$1(entities$1.es.IdentifierStart, entities$1.es.IdentifierPart),
      },
      matcher: sequence$1`([\s\n]+)|(${all$1(
        REGEXPS,
        raw$1`\/=`,
        COMMENTS,
        QUOTES,
        CLOSURES,
        /,|;|\.\.\.|\.|\:|\?|=>/,
        /!==|===|==|=/,
        ...symbols(raw$1`\+ \- \* & \|`).map(s => `${s}${s}|${s}=|${s}`),
        ...symbols(raw$1`! \*\* % << >> >>> < > \^ ~`).map(s => `${s}=|${s}`),
      )})`,
      matchers: {
        quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        "'": /(\n)|(')|(\\.)/g,
        '"': /(\n)|(")|(\\.)/g,
        '`': /(\n)|(`|\$\{)|(\\.)/g,
        comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
      },
    });

    ECMAScriptExtensions: {
      // TODO: Undo $ matching once fixed
      const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
      const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g;
      const STATEMENTS = all$1(QUOTES, CLOSURES, REGEXPS, COMMENTS);
      const BLOCKLEVEL = sequence$1`([\s\n]+)|(${STATEMENTS})`;
      const TOPLEVEL = sequence$1`([\s\n]+)|(${STATEMENTS})`;
      const CLOSURE = sequence$1`(\n+)|(${STATEMENTS})`;
      const ESM = sequence$1`${TOPLEVEL}|\bexport\b|\bimport\b`;
      const CJS = sequence$1`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b`;
      const ESX = sequence$1`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

      const {quotes, closures, spans} = es;
      const syntax = {quotes, closures, spans};
      const matchers = {};
      ({quote: matchers.quote} = es.matchers);

      const mjs = (modes$1.mjs = {
        ...(mappings.mjs = mappings.esm = {syntax: 'mjs'}),
        keywords: symbols('import export default'),
        ...syntax,
        matcher: ESM,
        matchers: {...matchers, closure: CLOSURE},
      });
      const cjs = (modes$1.cjs = {
        ...(mappings.cjs = {syntax: 'cjs'}),
        keywords: symbols('import module exports require'),
        ...syntax,
        matcher: CJS,
        matchers: {...matchers, closure: CJS},
      });
      const esx = (modes$1.esx = {
        ...(mappings.esx = {syntax: 'esx'}),
        keywords: symbols.from(mjs.keywords, cjs.keywords),
        ...syntax,
        matcher: ESX,
        matchers: {...matchers, closure: ESX},
      });
    }
  }
}

class Grouper$1 {
  constructor(context = 'markup', groupers = {}) {
    Object.assign(this, {
      groupers,
      hints: new Set([context]),
      goal: context,
      groupings: [context],
      context,
    });
    // this.groupers = groupers;
    // this.hints = new Set([syntax]);
    // this.goal = syntax;
    // this.groupings = [syntax];
    // this.context = syntax;
  }

  // create({
  //   /* grouper context */
  //   syntax,
  //   goal = syntax,
  //   quote,
  //   comment,
  //   closure,
  //   span,
  //   grouping = comment || closure || span || undefined,

  //   punctuator,
  //   spans = (grouping && grouping.spans) || undefined,
  //   matcher = (grouping && grouping.matcher) || undefined,
  //   quotes = (grouping && grouping.quotes) || undefined,
  //   punctuators = {aggregators: {}},
  //   opener = quote || (grouping && grouping.opener) || undefined,
  //   closer = quote || (grouping && grouping.closer) || undefined,
  //   hinter,
  //   open = (grouping && grouping.open) || undefined,
  //   close = (grouping && grouping.close) || undefined,
  // }) {
  //   return {
  //     syntax,
  //     goal,
  //     punctuator,
  //     spans,
  //     matcher,
  //     quotes,
  //     punctuators,
  //     opener,
  //     closer,
  //     hinter,
  //     open,
  //     close,
  //   };
  // }
}

const createGrouper$1 = (Grouper$1.create = ({
  /* grouper context */
  syntax,
  goal = syntax,
  quote,
  comment,
  closure,
  span,
  grouping = comment || closure || span || undefined,

  punctuator,
  spans = (grouping && grouping.spans) || undefined,
  matcher = (grouping && grouping.matcher) || undefined,
  quotes = (grouping && grouping.quotes) || undefined,
  punctuators = {aggregators: {}},
  opener = quote || (grouping && grouping.opener) || undefined,
  closer = quote || (grouping && grouping.closer) || undefined,
  hinter,
  open = (grouping && grouping.open) || undefined,
  close = (grouping && grouping.close) || undefined,
}) => ({
  syntax,
  goal,
  punctuator,
  spans,
  matcher,
  quotes,
  punctuators,
  opener,
  closer,
  hinter,
  open,
  close,
}));

const Null$2 = Object.freeze(Object.create(null));

/// Tokenizer
/** Tokenizer for a single mode (language) */
class Tokenizer {
  constructor(mode, defaults) {
    this.mode = mode;
    this.defaults = defaults || this.constructor.defaults || undefined;
  }

  /** Token generator from source using tokenizer.mode (or defaults.mode) */
  *tokenize(source, state = {}) {
    let done;

    // Local context
    const contextualizer =
      this.contextualizer || (this.contextualizer = this.constructor.contextualizer(this));
    let context = contextualizer.next().value;
    // if (!context) contextualizer.next().value;
    const {mode, syntax} = context;

    // Local grouping
    const groupers = mode.groupers || (mode.groupers = {});

    const grouping =
      state.grouping ||
      (state.grouping = {
        groupers,
        hints: new Set([syntax]),
        goal: syntax,
        groupings: [syntax],
        context: syntax,
      });

    // const grouping = state.grouping || (state.grouping = new Grouper(syntax, groupers));

    // Local matching
    let {match, index = 0} = state;

    // Local tokens
    let previous, last, parent;
    const top = {type: 'top', text: '', offset: index};

    let lastContext = context;

    while (true) {
      const {
        mode: {syntax, matchers, comments, spans, closures},
        punctuator: $$punctuator,
        closer: $$closer,
        spans: $$spans,
        matcher: $$matcher,
        token,
        forming = true,
      } = context;

      // Current contextual hint (syntax or hint)
      const hint = grouping.hint;

      // console.log({context, grouping, tokenizer: this});

      while (lastContext === (lastContext = context)) {
        let next;

        state.last = last;

        const lastIndex = state.index || 0;

        $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
        match = state.match = $$matcher.exec(source);
        done = index === (index = state.index = $$matcher.lastIndex) || !match;

        if (done) return;

        // Current contextual match
        const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

        // Current quasi-contextual fragment
        const pre = source.slice(lastIndex, offset);
        pre &&
          ((next = token({
            type: 'pre',
            text: pre,
            offset: lastIndex,
            previous,
            parent,
            hint,
            last,
          })),
          yield (previous = next));

        // Current contextual fragment
        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
        next = token({type, text, offset, previous, parent, hint, last});

        // Current contextual punctuator (from sequence)
        const closing =
          $$closer &&
          ($$closer.test
            ? $$closer.test(text)
            : $$closer === text || (whitespace && whitespace.includes($$closer)));

        let after;
        let punctuator = next.punctuator;

        if (punctuator || closing) {
          let hinter = punctuator ? `${syntax}-${punctuator}` : grouping.hint;
          let closed, opened, grouper;

          if (closing) {
            closed = grouper = closing && grouping.groupings.pop();
            next.closed = closed;
            grouping.groupings.includes(grouper) || grouping.hints.delete(grouper.hinter);
            (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
              (closed.punctuator && (next.punctuator = closed.punctuator));
            after = grouper.close && grouper.close(next, state, context);

            const previousGrouper = (grouper = grouping.groupings[grouping.groupings.length - 1]);
            grouping.goal = (previousGrouper && previousGrouper.goal) || syntax;
            parent = (parent && parent.parent) || top;
          } else if ($$punctuator !== 'comment') {
            const group = `${hinter},${text}`;
            grouper = grouping.groupers[group];

            if ($$spans && punctuator === 'span') {
              const span = $$spans[text];
              next.punctuator = punctuator = 'span';
              opened =
                grouper ||
                createGrouper$1({
                  syntax,
                  goal: syntax,
                  span,
                  matcher: span.matcher || (matchers && matchers.span) || undefined,
                  spans: (spans && spans[text]) || undefined,
                  hinter,
                  punctuator,
                });
            } else if ($$punctuator !== 'quote') {
              if (punctuator === 'quote') {
                opened =
                  grouper ||
                  createGrouper$1({
                    syntax,
                    goal: punctuator,
                    quote: text,
                    matcher: (matchers && matchers.quote) || undefined,
                    spans: (spans && spans[text]) || undefined,
                    hinter,
                    punctuator,
                  });
              } else if (punctuator === 'comment') {
                const comment = comments[text];
                opened =
                  grouper ||
                  createGrouper$1({
                    syntax,
                    goal: punctuator,
                    comment,
                    matcher: comment.matcher || (matchers && matchers.comment) || undefined,
                    hinter,
                    punctuator,
                  });
              } else if (punctuator === 'closure') {
                const closure = (grouper && grouper.closure) || closures[text];
                punctuator = next.punctuator = 'opener';
                closure &&
                  (opened =
                    grouper ||
                    createGrouper$1({
                      syntax,
                      goal: syntax,
                      closure,
                      matcher: closure.matcher || (matchers && matchers.closure) || undefined,
                      hinter,
                      punctuator,
                    }));
              }
            }

            if (opened) {
              // after = opened.open && opened.open(next, state, opened);
              grouping.groupers[group] || (grouping.groupers[group] = grouper = opened);
              grouping.groupings.push(grouper), grouping.hints.add(hinter);
              grouping.goal = (grouper && grouper.goal) || syntax;
              parent = next;
            }
          }

          state.context = grouping.context = grouping.goal || syntax;

          if (opened || closed) {
            context = contextualizer.next((state.grouper = grouper || undefined)).value;
            grouping.hint = `${[...grouping.hints].join(' ')} ${
              grouping.context ? `in-${grouping.context}` : ''
            }`;
            opened && (after = opened.open && opened.open(next, state, context));
          }
        }

        // Current contextual tail token (yield from sequence)
        yield (previous = next);

        // Next reference to last contextual sequence token
        next && !whitespace && forming && (last = next);

        if (after) {
          let tokens, token, nextIndex; //  = after.end || after.index

          if (after.syntax) {
            const {syntax, offset, index} = after;
            const body = index > offset && source.slice(offset, index - 1);
            if (body) {
              body.length > 0 &&
                ((tokens = tokenize(body, {options: {syntax}}, defaults)), (nextIndex = index));
              const hint = `${syntax}-in-${$.syntax}`;
              token = token => (
                (token.hint = `${(token.hint && `${token.hint} `) || ''}${hint}`), token
              );
            }
          } else if (after.length) {
            const hint = grouping.hint;
            token = token => (
              (token.hint = `${hint} ${token.type || 'code'}`), context.token(token)
            );
            (tokens = after).end && (nextIndex = after.end);
          }

          if (tokens) {
            // console.log({token, tokens, nextIndex});
            for (const next of tokens) {
              previous && ((next.previous = previous).next = next);
              token && token(next);
              yield (previous = next);
            }
          }
          nextIndex > index && (state.index = nextIndex);
        }
      }
    }
  }

  /**
   * Context generator using tokenizer.mode (or defaults.mode)
   */
  get contextualizer() {
    const value = this.constructor.contextualizer(this);
    Object.defineProperty(this, 'contextualizer', {value});
    return value;
  }

  /**
   * Tokenizer context generator
   */
  static *contextualizer(tokenizer) {
    // Local contextualizer state
    let grouper;

    // Tokenizer mode
    const mode = tokenizer.mode;
    const defaults = tokenizer.defaults;
    mode !== undefined || (mode = (defaults && defaults.mode) || undefined);
    // (mode = (defaults && defaults.syntaxes && defaults.syntaxes.default) || syntaxes.default);
    if (!mode) throw ReferenceError(`Tokenizer.contextualizer invoked without a mode`);

    // TODO: Refactoring
    const initialize = context => {
      context.token ||
        (context.token = (tokenizer => (tokenizer.next(), token => tokenizer.next(token).value))(
          this.tokenizer(context),
        ));
      return context;
    };

    if (!mode.context) {
      const {
        syntax,
        matcher = (mode.matcher = (defaults && defaults.matcher) || undefined),
        quotes,
        punctuators = (mode.punctuators = {aggregators: {}}),
        punctuators: {aggregators = ($punctuators.aggregators = {})},
        patterns: {
          maybeKeyword = (mode.patterns.maybeKeyword =
            ((defaults && defaults.patterns) || patterns$1).maybeKeyword || undefined),
        } = (mode.patterns = {maybeKeyword: null}),
        spans: {[syntax]: spans} = Null$2,
      } = mode;

      initialize(
        (mode.context = {
          mode,
          punctuators,
          aggregators,
          matcher,
          quotes,
          spans,
        }),
      );
    }

    const {
      syntax: $syntax,
      matcher: $matcher,
      quotes: $quotes,
      punctuators: $punctuators,
      punctuators: {aggregators: $aggregators},
    } = mode;

    while (true) {
      if (
        grouper !== (grouper = yield (grouper && grouper.context) || mode.context) &&
        grouper &&
        !grouper.context
      ) {
        const {
          goal = $syntax,
          punctuator,
          punctuators = $punctuators,
          aggregators = $aggregators,
          closer,
          spans,
          matcher = $matcher,
          quotes = $quotes,
          forming = goal === $syntax,
        } = grouper;

        initialize(
          (grouper.context = {
            mode,
            punctuator,
            punctuators,
            aggregators,
            closer,
            spans,
            matcher,
            quotes,
            forming,
          }),
        );
      }
    }
  }

  static *tokenizer(context) {
    let done, next;

    const {
      mode: {
        syntax,
        keywords,
        assigners,
        operators,
        combinators,
        nonbreakers,
        comments,
        closures,
        breakers,
        patterns,
      },
      punctuators,
      aggregators,
      spans,
      quotes,
      forming = true,
    } = context;

    const {maybeIdentifier, maybeKeyword} = patterns || context;
    const wording = keywords || maybeIdentifier ? true : false;

    const LineEndings = /$/gm;
    const punctuate = text =>
      (nonbreakers && nonbreakers.includes(text) && 'nonbreaker') ||
      (operators && operators.includes(text) && 'operator') ||
      (comments && comments.includes(text) && 'comment') ||
      (spans && spans.includes(text) && 'span') ||
      (quotes && quotes.includes(text) && 'quote') ||
      (closures && closures.includes(text) && 'closure') ||
      (breakers && breakers.includes(text) && 'breaker') ||
      false;
    const aggregate =
      ((assigners && assigners.length) || (combinators && combinators.length)) &&
      (text =>
        (assigners && assigners.includes(text) && 'assigner') ||
        (combinators && combinators.includes(text) && 'combinator') ||
        false);

    while (!done) {
      let token;
      if (next && next.text) {
        const {
          text, // Text for next production
          type, // Type of next production
          // offset, // Index of next production
          // breaks, // Linebreaks in next production
          hint, // Hint of next production
          previous, // Previous production
          parent = (next.parent = (previous && previous.parent) || undefined), // Parent of next production
          last, // Last significant production
        } = next;

        if (type === 'sequence') {
          (next.punctuator =
            (aggregate &&
              previous &&
              (aggregators[text] ||
                (!(text in aggregators) && (aggregators[text] = aggregate(text))))) ||
            (punctuators[text] ||
              (!(text in punctuators) && (punctuators[text] = punctuate(text)))) ||
            undefined) && (next.type = 'punctuator');
        } else if (type === 'whitespace') {
          next.breaks = text.match(LineEndings).length - 1;
        } else if (forming && wording) {
          // type !== 'indent' &&
          const word = text.trim();
          word &&
            ((keywords &&
              keywords.includes(word) &&
              (!last || last.punctuator !== 'nonbreaker' || (previous && previous.breaks > 0)) &&
              (next.type = 'keyword')) ||
              (maybeIdentifier && maybeIdentifier.test(word) && (next.type = 'identifier')));
        } else {
          next.type = 'text';
        }

        previous && (previous.next = next);

        token = next;
      }

      next = yield token;
    }
  }
}

const defaults$2 = {
  matcher: modes$1.default.matcher,
  syntax: 'default',
  sourceType: 'default',
  mappings,
  modes: modes$1,
};

const tokenizers = new WeakMap();

function tokenize$2(source, state = {}) {
  let {
    options: {sourceType} = (state.options = {}),
  } = state;
  const {syntax = 'default'} = mappings[sourceType] || Null;
  const mode = modes$1[syntax];
  if (!mode) throw ReferenceError('tokenize invoked without a mode');
  state.options.mode = mode;
  let tokenizer = tokenizers.get(mode);
  tokenizer || tokenizers.set(mode, (tokenizer = new Tokenizer(mode)));
  // console.log({tokenizer, mode, state});
  return tokenizer.tokenize(source);
}

var esparser = /*#__PURE__*/Object.freeze({
  defaults: defaults$2,
  tokenize: tokenize$2
});

// import * as patterns from './markup-patterns.js';

let initialized;

const ready$2 = (async () => void (await ready$1))();

const versions = [
  parser,
  esparser
];

const initialize = () =>
  initialized ||
  (initialized = async () => {
    const {createFragment, supported: supported$$1} = dom$1;

    /**
     * Temporary template element for rendering
     * @type {HTMLTemplateElement?}
     */
    const template =
      supported$$1 &&
      (template =>
        'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) &&
        template)(document.createElement('template'));

    /// API
    const syntaxes$$1 = {};
    const renderers$$1 = {};
    const defaults = {...defaults$1};

    await ready$2;
    /// Defaults
    install(defaults, syntaxes$$1);
    install$1(defaults, renderers$$1);


    // tokenize = (source, options) => parser.tokenize(source, {options}, defaults);
    tokenize$3 = (source, options = {}) => {
      const version = versions[options.version - 1];
      options.tokenize = version.tokenize;
      // const sourceType = options.sourceType;
      return version.tokenize(source, {options}, defaults);
    };

    render$1 = async (source, options) => {
      const fragment = options.fragment || createFragment();

      const elements = render(source, options, defaults);
      let first = await elements.next();

      let logs = (fragment.logs = []);

      if (first && 'value' in first) {
        if (!native$1 && template && 'textContent' in fragment) {
          logs.push(`render method = 'text' in template`);
          const body = [first.value];
          if (!first.done) for await (const element of elements) body.push(element);
          template.innerHTML = body.join('');
          fragment.appendChild(template.content);

          // if (!first.done) {
          //   if (typeof requestAnimationFrame === 'function') {
          //     //  && first.value.token
          //     let lines = 0;
          //     for await (const element of elements) {
          //       // element.token &&
          //       //   element.token.breaks > 0 &&
          //       //   (lines += element.token.breaks) % 2 === 0 &&
          //       lines++ % 10 === 0 &&
          //         ((template.innerHTML = body.splice(0, body.length).join('')),
          //         fragment.appendChild(template.content));
          //       // await new Promise(r => setTimeout(r, 1000))
          //       // await new Promise(requestAnimationFrame)
          //       body.push(element);
          //     }
          //   } else {
          //     for await (const element of elements) body.push(element);
          //     template.innerHTML = body.join(''); // text
          //     fragment.appendChild(template.content);
          //   }
          // }
        } else if ('push' in fragment) {
          logs.push(`render method = 'push' in fragment`);
          fragment.push(first.value);
          if (!first.done) for await (const element of elements) fragment.push(element);
        } else if ('append' in fragment) {
          //  && first.value.nodeType >= 1
          logs.push(`render method = 'append' in fragment`);
          fragment.append(first.value);
          if (!first.done) for await (const element of elements) fragment.append(element);
        }
        // else if ('textContent' in fragment) {
        //   let text = `${first.value}`;
        //   if (!first.done) for await (const element of elements) text += `${element}`;
        //   if (template) {
        //     logs.push(`render method = 'text' in template`);
        //   } else {
        //     logs.push(`render method = 'text' in fragment`);
        //     // TODO: Find a workaround for DocumentFragment.innerHTML
        //     fragment.innerHTML = text;
        //   }
        // }
      }

      return fragment;
    };

    initialized = true;

    return markup$1;
  })();

let render$1 = async (source, options) => {
  await initialize();
  return await render$1(source, options);
};

let tokenize$3 = (source, options) => {
  if (!initialized)
    throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
  else if (initialized.then)
    ;
  return markup$1.tokenize(source, options);
};

const keyFrom = options => (options && JSON.stringify(options)) || '';
const skim = iterable => {
};

const warmup = async (source, options) => {
  const key = (options && keyFrom(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  await (initialized || initialize());
  // let tokens;
  cache.has(source) || (skim(tokenize$3(source, options)), cache.add(source));
  // cache.has(source) || ((tokens => { while (!tokens.next().done); })(tokenize(source, options)), cache.add(source));
  return true;
};

const markup$1 = Object.create(parser, {
  initialize: {get: () => initialize},
  render: {get: () => render$1},
  tokenize: {get: () => tokenize$3},
  warmup: {get: () => warmup},
  dom: {get: () => dom$1},
  modes: {get: () => modes},
});

/// CONSTANTS

const Messages = {
  InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
};

export default markup$1;
export { initialized, ready$2 as ready, render$1 as render, tokenize$3 as tokenize, warmup, markup$1 as markup };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwLm1qcyIsInNvdXJjZXMiOlsiLi4vbWFya3VwL2xpYi9tYXJrdXAtcGFyc2VyLmpzIiwiLi4vbWFya3VwL2xpYi9tYXJrdXAtcGF0dGVybnMuanMiLCIuLi9tYXJrdXAvbGliL21hcmt1cC1tb2Rlcy5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9wc2V1ZG9tL2xpYi9wc2V1ZG8uanMiLCIuLi9tYXJrdXAvcGFja2FnZXMvcHNldWRvbS9saWIvbmF0aXZlLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL3BzZXVkb20vaW5kZXguanMiLCIuLi9tYXJrdXAvbGliL21hcmt1cC1kb20uanMiLCIuLi9tYXJrdXAvcGFja2FnZXMvZXNwcmVzc2lvbnMvbGliL3BhcnNlci9wYXR0ZXJucy5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9lc3ByZXNzaW9ucy9saWIvcGFyc2VyL21vZGVzLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL2VzcHJlc3Npb25zL2xpYi9wYXJzZXIvZ3JvdXBlci5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9lc3ByZXNzaW9ucy9saWIvcGFyc2VyL3Rva2VuaXplci5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9lc3ByZXNzaW9ucy9saWIvcGFyc2VyL3BhcnNlci5qcyIsIi4uL21hcmt1cC9saWIvbWFya3VwLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBNYXJrdXAgKHJlbmRlcikgQGF1dGhvciBTYWxlaCBBYmRlbCBNb3RhYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrdXAoc291cmNlLCBvcHRpb25zLCBkZWZhdWx0cyA9IG1hcmt1cC5kZWZhdWx0cykge1xuICByZXR1cm4gWy4uLnJlbmRlcihzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzKV07XG59XG5cbi8vLyBSRUdVTEFSIEVYUFJFU1NJT05TXG5cbi8qKiBOb24tYWxwaGFudW1lcmljIHN5bWJvbCBtYXRjaGluZyBleHByZXNzaW9ucyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBtYXRjaGVycyA9IHtcbiAgZXNjYXBlczogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcKlxcL3xgfFwifCd8XFwkXFx7KS9nLFxuICBjb21tZW50czogLyhcXG4pfChcXCpcXC98XFxiKD86W2Etel0rXFw6XFwvXFwvfFxcd1tcXHdcXCtcXC5dKlxcd0BbYS16XSspXFxTK3xAW2Etel0rKS9naSxcbiAgcXVvdGVzOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98YHxcInwnfFxcJFxceykvZyxcbiAgeG1sOiAvKFtcXHNcXG5dKyl8KFwifCd8PXwmI3g/W2EtZjAtOV0rO3wmW2Etel0rO3xcXC8/Pnw8JXwlPnw8IS0tfC0tPnw8W1xcL1xcIV0/KD89W2Etel0rXFw6P1thLXpcXC1dKlthLXpdfFthLXpdKykpL2dpLFxuICAvLyB4bWw6IC8oW1xcc1xcbl0rKXwoXCJ8J3w9fCYjeD9bYS1mMC05XSs7fCZbYS16XSs7fFxcLz8+fDwlfCU+fDwhLS18LS0+fDxbXFwvXFwhXT8pL2dpLFxuICBzZXF1ZW5jZXM6IC8oW1xcc1xcbl0rKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXC9cXC98XFwvXFwqfFxcKlxcL3xcXCh8XFwpfFxcW3xcXF18LHw7fFxcLlxcLlxcLnxcXC58XFxiOlxcL1xcL1xcYnw6Onw6fFxcP3xgfFwifCd8XFwkXFx7fFxce3xcXH18PT58PFxcL3xcXC8+fFxcKyt8XFwtK3xcXCorfCYrfFxcfCt8PSt8IT17MCwzfXw8ezEsM309P3w+ezEsMn09Pyl8WytcXC0qLyZ8XiU8Pn4hXT0/L2csXG59O1xuXG4vKiogU3BlY2lhbCBhbHBoYS1udW1lcmljIHN5bWJvbCB0ZXN0IGV4cHJlc3Npb25zIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuZXhwb3J0IGNvbnN0IHBhdHRlcm5zID0ge1xuICAvKiogQmFzaWMgbGF0aW4gS2V5d29yZCBsaWtlIHN5bWJvbCAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbiAgbWF5YmVLZXl3b3JkOiAvXlthLXpdKFxcdyopJC9pLFxufTtcblxuLy8vIFNZTlRBWEVTXG4vKiogU3ludGF4IGRlZmluaXRpb25zIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuZXhwb3J0IGNvbnN0IHN5bnRheGVzID0ge2RlZmF1bHQ6IHtwYXR0ZXJucywgbWF0Y2hlcjogbWF0Y2hlcnMuc2VxdWVuY2VzfX07XG5cbi8qKiBNb2RlIHN0YXRlcyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBtb2RlcyA9IHtkZWZhdWx0OiB7c3ludGF4OiAnZGVmYXVsdCd9fTtcblxuLy8vIERFRkFVTFRTXG4vKiogUGFyc2luZyBkZWZhdWx0cyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBkZWZhdWx0cyA9IChtYXJrdXAuZGVmYXVsdHMgPSB7XG4gIG1hdGNoZXI6IG1hdGNoZXJzLnNlcXVlbmNlcyxcbiAgc3ludGF4OiAnZGVmYXVsdCcsXG4gIHNvdXJjZVR5cGU6ICdkZWZhdWx0JyxcbiAgcmVuZGVyZXJzOiB7dGV4dDogU3RyaW5nfSxcbiAgcmVuZGVyZXIsXG4gIGdldCBzeW50YXhlcygpIHtcbiAgICByZXR1cm4gc3ludGF4ZXM7XG4gIH0sXG4gIHNldCBzeW50YXhlcyh2YWx1ZSkge1xuICAgIGlmICh0aGlzICE9PSBkZWZhdWx0cylcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAnSW52YWxpZCBhc3NpZ25tZW50OiBkaXJlY3QgYXNzaWdubWVudCB0byBkZWZhdWx0cyBpcyBub3QgYWxsb3dlZC4gVXNlIE9iamVjdC5jcmVhdGUoZGVmYXVsdHMpIHRvIGNyZWF0ZSBhIG11dGFibGUgaW5zdGFuY2Ugb2YgZGVmYXVsdHMgZmlyc3QuJyxcbiAgICAgICk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzeW50YXhlcycsIHt2YWx1ZX0pO1xuICB9LFxufSk7XG5cbmNvbnN0IE51bGwgPSBPYmplY3QuZnJlZXplKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuXG4vLy8gUkVOREVSSU5HXG4vKiogVG9rZW4gcHJvdG90eXBlIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuY2xhc3MgVG9rZW4ge1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy50ZXh0O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVuZGVyZXIodG9rZW5zKSB7XG4gIGxldCBpID0gMDtcbiAgZm9yIGF3YWl0IChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICBpZiAoIXRva2VuKSBjb250aW51ZTtcbiAgICAvLyBpKysgJSAxMDAgfHwgKGF3YWl0IDApO1xuICAgIGkrKyAlIDEwIHx8IChhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMSkpKTtcbiAgICB5aWVsZCBPYmplY3Quc2V0UHJvdG90eXBlT2YodG9rZW4sIFRva2VuLnByb3RvdHlwZSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlcihzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzID0gbWFya3VwLmRlZmF1bHRzKSB7XG4gIGNvbnN0IHtzeW50YXgsIHJlbmRlcmVyID0gZGVmYXVsdHMucmVuZGVyZXIsIC4uLnRva2VuaXplck9wdGlvbnN9ID0gb3B0aW9ucyB8fCBkZWZhdWx0cztcbiAgY29uc3Qgc3RhdGUgPSB7b3B0aW9uczogdG9rZW5pemVyT3B0aW9uc307XG4gIHJldHVybiByZW5kZXJlcigob3B0aW9ucy50b2tlbml6ZSB8fCB0b2tlbml6ZSkoc291cmNlLCBzdGF0ZSwgZGVmYXVsdHMpKTtcbn1cblxuLy8vIEdST1VQSU5HXG5jb25zdCBHcm91cGVyID0gKHtcbiAgLyogZ3JvdXBlciBjb250ZXh0ICovXG4gIHN5bnRheCxcbiAgZ29hbCA9IHN5bnRheCxcbiAgcXVvdGUsXG4gIGNvbW1lbnQsXG4gIGNsb3N1cmUsXG4gIHNwYW4sXG4gIGdyb3VwaW5nID0gY29tbWVudCB8fCBjbG9zdXJlIHx8IHNwYW4gfHwgdW5kZWZpbmVkLFxuXG4gIHB1bmN0dWF0b3IsXG4gIC8vIHRlcm1pbmF0b3IgPSAoY29tbWVudCAmJiBjb21tZW50LmNsb3NlcikgfHwgdW5kZWZpbmVkLFxuICBzcGFucyA9IChncm91cGluZyAmJiBncm91cGluZy5zcGFucykgfHwgdW5kZWZpbmVkLFxuICBtYXRjaGVyID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm1hdGNoZXIpIHx8IHVuZGVmaW5lZCxcbiAgcXVvdGVzID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnF1b3RlcykgfHwgdW5kZWZpbmVkLFxuICBwdW5jdHVhdG9ycyA9IHthZ2dyZWdhdG9yczoge319LFxuICBvcGVuZXIgPSBxdW90ZSB8fCAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcub3BlbmVyKSB8fCB1bmRlZmluZWQsXG4gIGNsb3NlciA9IHF1b3RlIHx8IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZXIpIHx8IHVuZGVmaW5lZCxcbiAgaGludGVyLFxuICBvcGVuID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm9wZW4pIHx8IHVuZGVmaW5lZCxcbiAgY2xvc2UgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuY2xvc2UpIHx8IHVuZGVmaW5lZCxcbn0pID0+ICh7XG4gIHN5bnRheCxcbiAgZ29hbCxcbiAgcHVuY3R1YXRvcixcbiAgLy8gdGVybWluYXRvcixcbiAgc3BhbnMsXG4gIG1hdGNoZXIsXG4gIHF1b3RlcyxcbiAgcHVuY3R1YXRvcnMsXG4gIG9wZW5lcixcbiAgY2xvc2VyLFxuICBoaW50ZXIsXG4gIG9wZW4sXG4gIGNsb3NlLFxufSk7XG5cbmNvbnN0IGNyZWF0ZUdyb3VwZXIgPSBHcm91cGVyO1xuXG4vLy8gVE9LRU5JWkFUSU9OXG5cbmV4cG9ydCBmdW5jdGlvbiogY29udGV4dHVhbGl6ZXIoJCwgZGVmYXVsdHMpIHtcbiAgbGV0IGRvbmUsIGdyb3VwZXI7XG5cbiAgJCAhPT0gdW5kZWZpbmVkIHx8XG4gICAgKCQgPSAoZGVmYXVsdHMgJiYgZGVmYXVsdHMuc3ludGF4ZXMgJiYgZGVmYXVsdHMuc3ludGF4ZXMuZGVmYXVsdCkgfHwgc3ludGF4ZXMuZGVmYXVsdCk7XG5cbiAgY29uc3QgaW5pdGlhbGl6ZSA9IGNvbnRleHQgPT4ge1xuICAgIGNvbnRleHQudG9rZW4gfHxcbiAgICAgIChjb250ZXh0LnRva2VuID0gKHRva2VuaXplciA9PiAodG9rZW5pemVyLm5leHQoKSwgdG9rZW4gPT4gdG9rZW5pemVyLm5leHQodG9rZW4pLnZhbHVlKSkoXG4gICAgICAgIHRva2VuaXplcihjb250ZXh0KSxcbiAgICAgICkpO1xuICAgIGNvbnRleHQ7XG4gIH07XG5cbiAgaWYgKCEkLmNvbnRleHQpIHtcbiAgICBjb25zdCB7XG4gICAgICBzeW50YXgsXG4gICAgICBtYXRjaGVyID0gKCQubWF0Y2hlciA9IGRlZmF1bHRzLm1hdGNoZXIpLFxuICAgICAgcXVvdGVzLFxuICAgICAgcHVuY3R1YXRvcnMgPSAoJC5wdW5jdHVhdG9ycyA9IHthZ2dyZWdhdG9yczoge319KSxcbiAgICAgIHB1bmN0dWF0b3JzOiB7YWdncmVnYXRvcnMgPSAoJHB1bmN0dWF0b3JzLmFnZ3JlZ2F0b3JzID0ge30pfSxcbiAgICAgIHBhdHRlcm5zOiB7XG4gICAgICAgIG1heWJlS2V5d29yZCA9ICgkLnBhdHRlcm5zLm1heWJlS2V5d29yZCA9XG4gICAgICAgICAgKChkZWZhdWx0cyAmJiBkZWZhdWx0cy5wYXR0ZXJucykgfHwgcGF0dGVybnMpLm1heWJlS2V5d29yZCB8fCB1bmRlZmluZWQpLFxuICAgICAgfSA9ICgkLnBhdHRlcm5zID0ge21heWJlS2V5d29yZDogbnVsbH0pLFxuICAgICAgc3BhbnM6IHtbc3ludGF4XTogc3BhbnN9ID0gTnVsbCxcbiAgICB9ID0gJDtcblxuICAgIC8vIG1hdGNoZXIubWF0Y2hlciB8fFxuICAgIC8vICAgKG1hdGNoZXIubWF0Y2hlciA9IG5ldyBSZWdFeHAobWF0Y2hlci5zb3VyY2UsIG1hdGNoZXIuZmxhZ3MucmVwbGFjZSgnZycsICd5JykpKTtcblxuICAgIGluaXRpYWxpemUoXG4gICAgICAoJC5jb250ZXh0ID0ge1xuICAgICAgICAvLyAuLi4gJCxcbiAgICAgICAgJCxcbiAgICAgICAgcHVuY3R1YXRvcnMsXG4gICAgICAgIGFnZ3JlZ2F0b3JzLFxuICAgICAgICAvLyBtYXRjaGVyOiBtYXRjaGVyLm1hdGNoZXIsXG4gICAgICAgIG1hdGNoZXIsXG4gICAgICAgIHF1b3RlcyxcbiAgICAgICAgc3BhbnMsXG4gICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgY29uc3Qge1xuICAgIHN5bnRheDogJHN5bnRheCxcbiAgICBtYXRjaGVyOiAkbWF0Y2hlcixcbiAgICBxdW90ZXM6ICRxdW90ZXMsXG4gICAgcHVuY3R1YXRvcnM6ICRwdW5jdHVhdG9ycyxcbiAgICBwdW5jdHVhdG9yczoge2FnZ3JlZ2F0b3JzOiAkYWdncmVnYXRvcnN9LFxuICB9ID0gJDtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIGlmIChcbiAgICAgIGdyb3VwZXIgIT09IChncm91cGVyID0geWllbGQgKGdyb3VwZXIgJiYgZ3JvdXBlci5jb250ZXh0KSB8fCAkLmNvbnRleHQpICYmXG4gICAgICBncm91cGVyICYmXG4gICAgICAhZ3JvdXBlci5jb250ZXh0XG4gICAgKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGdvYWwgPSAkc3ludGF4LFxuICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICBwdW5jdHVhdG9ycyA9ICRwdW5jdHVhdG9ycyxcbiAgICAgICAgYWdncmVnYXRvcnMgPSAkYWdncmVnYXRvcnMsXG4gICAgICAgIGNsb3NlcixcbiAgICAgICAgc3BhbnMsXG4gICAgICAgIG1hdGNoZXIgPSAkbWF0Y2hlcixcbiAgICAgICAgcXVvdGVzID0gJHF1b3RlcyxcbiAgICAgICAgZm9ybWluZyA9IGdvYWwgPT09ICRzeW50YXgsXG4gICAgICB9ID0gZ3JvdXBlcjtcblxuICAgICAgLy8gIW1hdGNoZXIgfHxcbiAgICAgIC8vICAgbWF0Y2hlci5tYXRjaGVyIHx8XG4gICAgICAvLyAgIChtYXRjaGVyLm1hdGNoZXIgPSBuZXcgUmVnRXhwKG1hdGNoZXIuc291cmNlLCBtYXRjaGVyLmZsYWdzLnJlcGxhY2UoJ2cnLCAneScpKSk7XG5cbiAgICAgIGluaXRpYWxpemUoXG4gICAgICAgIChncm91cGVyLmNvbnRleHQgPSB7XG4gICAgICAgICAgLy8gLi4uICQuY29udGV4dCxcbiAgICAgICAgICAkLFxuICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgcHVuY3R1YXRvcnMsXG4gICAgICAgICAgYWdncmVnYXRvcnMsXG4gICAgICAgICAgY2xvc2VyLFxuICAgICAgICAgIHNwYW5zLFxuICAgICAgICAgIC8vIG1hdGNoZXI6IG1hdGNoZXIgJiYgbWF0Y2hlci5tYXRjaGVyLFxuICAgICAgICAgIG1hdGNoZXIsXG4gICAgICAgICAgcXVvdGVzLFxuICAgICAgICAgIGZvcm1pbmcsXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiB0b2tlbml6ZXIoY29udGV4dCkge1xuICBsZXQgZG9uZSwgbmV4dDtcblxuICBjb25zdCB7XG4gICAgJDoge1xuICAgICAgc3ludGF4LFxuICAgICAga2V5d29yZHMsXG4gICAgICBhc3NpZ25lcnMsXG4gICAgICBvcGVyYXRvcnMsXG4gICAgICBjb21iaW5hdG9ycyxcbiAgICAgIG5vbmJyZWFrZXJzLFxuICAgICAgY29tbWVudHMsXG4gICAgICBjbG9zdXJlcyxcbiAgICAgIGJyZWFrZXJzLFxuICAgICAgcGF0dGVybnMsXG4gICAgfSxcbiAgICBwdW5jdHVhdG9ycyxcbiAgICBhZ2dyZWdhdG9ycyxcbiAgICBzcGFucyxcbiAgICBxdW90ZXMsXG4gICAgZm9ybWluZyA9IHRydWUsXG5cbiAgICAvLyBzeW50YXgsXG4gICAgLy8ga2V5d29yZHMsXG4gICAgLy8gYXNzaWduZXJzLFxuICAgIC8vIG9wZXJhdG9ycyxcbiAgICAvLyBjb21iaW5hdG9ycyxcbiAgICAvLyBub25icmVha2VycyxcbiAgICAvLyBjb21tZW50cyxcbiAgICAvLyBjbG9zdXJlcyxcbiAgICAvLyBicmVha2VycyxcbiAgICAvLyBwYXR0ZXJucyxcbiAgfSA9IGNvbnRleHQ7XG5cbiAgY29uc3Qge21heWJlSWRlbnRpZmllciwgbWF5YmVLZXl3b3JkfSA9IHBhdHRlcm5zIHx8IGNvbnRleHQ7XG4gIGNvbnN0IHdvcmRpbmcgPSBrZXl3b3JkcyB8fCBtYXliZUlkZW50aWZpZXIgPyB0cnVlIDogZmFsc2U7XG5cbiAgY29uc3QgTGluZUVuZGluZ3MgPSAvJC9nbTtcbiAgY29uc3QgcHVuY3R1YXRlID0gdGV4dCA9PlxuICAgIChub25icmVha2VycyAmJiBub25icmVha2Vycy5pbmNsdWRlcyh0ZXh0KSAmJiAnbm9uYnJlYWtlcicpIHx8XG4gICAgKG9wZXJhdG9ycyAmJiBvcGVyYXRvcnMuaW5jbHVkZXModGV4dCkgJiYgJ29wZXJhdG9yJykgfHxcbiAgICAoY29tbWVudHMgJiYgY29tbWVudHMuaW5jbHVkZXModGV4dCkgJiYgJ2NvbW1lbnQnKSB8fFxuICAgIChzcGFucyAmJiBzcGFucy5pbmNsdWRlcyh0ZXh0KSAmJiAnc3BhbicpIHx8XG4gICAgKHF1b3RlcyAmJiBxdW90ZXMuaW5jbHVkZXModGV4dCkgJiYgJ3F1b3RlJykgfHxcbiAgICAoY2xvc3VyZXMgJiYgY2xvc3VyZXMuaW5jbHVkZXModGV4dCkgJiYgJ2Nsb3N1cmUnKSB8fFxuICAgIChicmVha2VycyAmJiBicmVha2Vycy5pbmNsdWRlcyh0ZXh0KSAmJiAnYnJlYWtlcicpIHx8XG4gICAgZmFsc2U7XG4gIGNvbnN0IGFnZ3JlZ2F0ZSA9XG4gICAgKChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLmxlbmd0aCkgfHwgKGNvbWJpbmF0b3JzICYmIGNvbWJpbmF0b3JzLmxlbmd0aCkpICYmXG4gICAgKHRleHQgPT5cbiAgICAgIChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLmluY2x1ZGVzKHRleHQpICYmICdhc3NpZ25lcicpIHx8XG4gICAgICAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMuaW5jbHVkZXModGV4dCkgJiYgJ2NvbWJpbmF0b3InKSB8fFxuICAgICAgZmFsc2UpO1xuXG4gIHdoaWxlICghZG9uZSkge1xuICAgIGxldCB0b2tlbiwgcHVuY3R1YXRvcjtcbiAgICBpZiAobmV4dCAmJiBuZXh0LnRleHQpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgdGV4dCwgLy8gVGV4dCBmb3IgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIHR5cGUsIC8vIFR5cGUgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIC8vIG9mZnNldCwgLy8gSW5kZXggb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIC8vIGJyZWFrcywgLy8gTGluZWJyZWFrcyBpbiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgaGludCwgLy8gSGludCBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgcHJldmlvdXMsIC8vIFByZXZpb3VzIHByb2R1Y3Rpb25cbiAgICAgICAgcGFyZW50ID0gKG5leHQucGFyZW50ID0gKHByZXZpb3VzICYmIHByZXZpb3VzLnBhcmVudCkgfHwgdW5kZWZpbmVkKSwgLy8gUGFyZW50IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICBsYXN0LCAvLyBMYXN0IHNpZ25pZmljYW50IHByb2R1Y3Rpb25cbiAgICAgIH0gPSBuZXh0O1xuXG4gICAgICBpZiAodHlwZSA9PT0gJ3NlcXVlbmNlJykge1xuICAgICAgICAobmV4dC5wdW5jdHVhdG9yID1cbiAgICAgICAgICAoYWdncmVnYXRlICYmXG4gICAgICAgICAgICBwcmV2aW91cyAmJlxuICAgICAgICAgICAgKGFnZ3JlZ2F0b3JzW3RleHRdIHx8XG4gICAgICAgICAgICAgICghKHRleHQgaW4gYWdncmVnYXRvcnMpICYmIChhZ2dyZWdhdG9yc1t0ZXh0XSA9IGFnZ3JlZ2F0ZSh0ZXh0KSkpKSkgfHxcbiAgICAgICAgICAocHVuY3R1YXRvcnNbdGV4dF0gfHxcbiAgICAgICAgICAgICghKHRleHQgaW4gcHVuY3R1YXRvcnMpICYmIChwdW5jdHVhdG9yc1t0ZXh0XSA9IHB1bmN0dWF0ZSh0ZXh0KSkpKSB8fFxuICAgICAgICAgIHVuZGVmaW5lZCkgJiYgKG5leHQudHlwZSA9ICdwdW5jdHVhdG9yJyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd3aGl0ZXNwYWNlJykge1xuICAgICAgICBuZXh0LmJyZWFrcyA9IHRleHQubWF0Y2goTGluZUVuZGluZ3MpLmxlbmd0aCAtIDE7XG4gICAgICB9IGVsc2UgaWYgKGZvcm1pbmcgJiYgd29yZGluZykge1xuICAgICAgICAvLyB0eXBlICE9PSAnaW5kZW50JyAmJlxuICAgICAgICBjb25zdCB3b3JkID0gdGV4dC50cmltKCk7XG4gICAgICAgIHdvcmQgJiZcbiAgICAgICAgICAoKGtleXdvcmRzICYmXG4gICAgICAgICAgICBrZXl3b3Jkcy5pbmNsdWRlcyh3b3JkKSAmJlxuICAgICAgICAgICAgKCFsYXN0IHx8IGxhc3QucHVuY3R1YXRvciAhPT0gJ25vbmJyZWFrZXInIHx8IChwcmV2aW91cyAmJiBwcmV2aW91cy5icmVha3MgPiAwKSkgJiZcbiAgICAgICAgICAgIChuZXh0LnR5cGUgPSAna2V5d29yZCcpKSB8fFxuICAgICAgICAgICAgKG1heWJlSWRlbnRpZmllciAmJiBtYXliZUlkZW50aWZpZXIudGVzdCh3b3JkKSAmJiAobmV4dC50eXBlID0gJ2lkZW50aWZpZXInKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dC50eXBlID0gJ3RleHQnO1xuICAgICAgfVxuXG4gICAgICBwcmV2aW91cyAmJiAocHJldmlvdXMubmV4dCA9IG5leHQpO1xuXG4gICAgICB0b2tlbiA9IG5leHQ7XG4gICAgfVxuXG4gICAgbmV4dCA9IHlpZWxkIHRva2VuO1xuICB9XG59XG5cbi8vIFRPRE86IDxAU01vdGFhbD4gUmVmYWN0b3JcbmV4cG9ydCBmdW5jdGlvbiogdG9rZW5pemUoc291cmNlLCBzdGF0ZSA9IHt9LCBkZWZhdWx0cyA9IG1hcmt1cC5kZWZhdWx0cykge1xuICBjb25zdCBzeW50YXhlcyA9IGRlZmF1bHRzLnN5bnRheGVzO1xuXG4gIGxldCB7XG4gICAgbWF0Y2gsXG4gICAgaW5kZXgsXG4gICAgb3B0aW9uczoge1xuICAgICAgc291cmNlVHlwZSA9IChzdGF0ZS5vcHRpb25zLnNvdXJjZVR5cGUgPSBzdGF0ZS5vcHRpb25zLnN5bnRheCB8fCBkZWZhdWx0cy5zb3VyY2VUeXBlKSxcbiAgICB9ID0gKHN0YXRlLm9wdGlvbnMgPSB7fSksXG4gICAgcHJldmlvdXMgPSBudWxsLFxuICAgIG1vZGUgPSAoc3RhdGUubW9kZSA9IG1vZGVzW3NvdXJjZVR5cGVdIHx8IG1vZGVzW2RlZmF1bHRzLnNvdXJjZVR5cGVdKSxcbiAgICBtb2RlOiB7c3ludGF4fSxcbiAgICBncm91cGluZyA9IChzdGF0ZS5ncm91cGluZyA9IHtcbiAgICAgIGhpbnRzOiBuZXcgU2V0KCksXG4gICAgICBncm91cGluZ3M6IFtdLFxuICAgICAgZ3JvdXBlcnM6IG1vZGUuZ3JvdXBlcnMgfHwgKG1vZGUuZ3JvdXBlcnMgPSB7fSksXG4gICAgfSksXG4gIH0gPSBzdGF0ZTtcblxuICAoc3RhdGUuc291cmNlID09PSAoc3RhdGUuc291cmNlID0gc291cmNlKSAmJiBpbmRleCA+PSAwKSB8fFxuICAgIChpbmRleCA9IHN0YXRlLmluZGV4ID0gKGluZGV4ID4gMCAmJiBpbmRleCAlIHNvdXJjZS5sZW5ndGgpIHx8IDApO1xuXG4gIGNvbnN0IHRvcCA9IHt0eXBlOiAndG9wJywgdGV4dDogJycsIG9mZnNldDogaW5kZXh9O1xuXG4gIGxldCBkb25lLFxuICAgIHBhcmVudCA9IHRvcCxcbiAgICBsYXN0O1xuXG4gIGxldCBsYXN0Q29udGV4dDtcblxuICBjb25zdCB7XG4gICAgWyhzdGF0ZS5zeW50YXggPSBzdGF0ZS5tb2RlLnN5bnRheCldOiAkID0gZGVmYXVsdHMuc3ludGF4ZXNbZGVmYXVsdHMuc3ludGF4XSxcbiAgfSA9IGRlZmF1bHRzLnN5bnRheGVzO1xuXG4gIGNvbnN0ICRjb250ZXh0aW5nID0gY29udGV4dHVhbGl6ZXIoJCwgZGVmYXVsdHMpO1xuICBsZXQgJGNvbnRleHQgPSAkY29udGV4dGluZy5uZXh0KCkudmFsdWU7XG5cbiAgLy8gSW5pdGlhbCBjb250ZXh0dWFsIGhpbnQgKHN5bnRheClcbiAgIXN5bnRheCB8fFxuICAgIChncm91cGluZy5nb2FsIHx8IChncm91cGluZy5nb2FsID0gc3ludGF4KSwgZ3JvdXBpbmcuaGludCAmJiBncm91cGluZy5sYXN0U3ludGF4ID09PSBzeW50YXgpIHx8XG4gICAgKGdyb3VwaW5nLmhpbnRzLmFkZChzeW50YXgpLmRlbGV0ZShncm91cGluZy5sYXN0U3ludGF4KSxcbiAgICAoZ3JvdXBpbmcuaGludCA9IFsuLi5ncm91cGluZy5oaW50c10uam9pbignICcpKSxcbiAgICAoZ3JvdXBpbmcuY29udGV4dCA9IHN0YXRlLmNvbnRleHQgfHwgKHN0YXRlLmNvbnRleHQgPSBncm91cGluZy5sYXN0U3ludGF4ID0gc3ludGF4KSkpO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3Qge1xuICAgICAgJDoge3N5bnRheCwgbWF0Y2hlcnMsIGNvbW1lbnRzLCBzcGFucywgY2xvc3VyZXN9LFxuICAgICAgLy8gc3ludGF4LCBtYXRjaGVycywgY29tbWVudHMsIHNwYW5zLCBjbG9zdXJlcyxcblxuICAgICAgcHVuY3R1YXRvcjogJCRwdW5jdHVhdG9yLFxuICAgICAgY2xvc2VyOiAkJGNsb3NlcixcbiAgICAgIHNwYW5zOiAkJHNwYW5zLFxuICAgICAgLy8gbWF0Y2hlcjogJCRtYXRjaGVyLFxuICAgICAgbWF0Y2hlcjoge1xuICAgICAgICBtYXRjaGVyOiAkJG1hdGNoZXIgPSAoJGNvbnRleHQubWF0Y2hlci5tYXRjaGVyID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAkY29udGV4dC5tYXRjaGVyLnNvdXJjZSxcbiAgICAgICAgICAkY29udGV4dC5tYXRjaGVyLmZsYWdzLCAvLyAucmVwbGFjZSgnZycsICd5JyksXG4gICAgICAgICkpLFxuICAgICAgfSxcbiAgICAgIHRva2VuLFxuICAgICAgLy8gdG9rZW4gPSAoJGNvbnRleHQudG9rZW4gPSAodG9rZW5pemVyID0+IChcbiAgICAgIC8vICAgdG9rZW5pemVyLm5leHQoKSwgdG9rZW4gPT4gdG9rZW5pemVyLm5leHQodG9rZW4pLnZhbHVlXG4gICAgICAvLyApKSh0b2tlbml6ZXIoJGNvbnRleHQpKSksXG4gICAgICBmb3JtaW5nID0gdHJ1ZSxcbiAgICB9ID0gJGNvbnRleHQ7XG5cbiAgICAvLyBQcmltZSBNYXRjaGVyXG4gICAgLy8gKChzdGF0ZS5tYXRjaGVyICE9PSAkJG1hdGNoZXIgJiYgKHN0YXRlLm1hdGNoZXIgPSAkJG1hdGNoZXIpKSB8fFxuICAgIC8vICAgc3RhdGUuaW5kZXggIT09ICQkbWF0Y2hlci5sYXN0SW5kZXgpICYmXG4gICAgLy8gICAkJG1hdGNoZXIuZXhlYyhzdGF0ZS5zb3VyY2UpO1xuXG4gICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGhpbnQgKHN5bnRheCBvciBoaW50KVxuICAgIGNvbnN0IGhpbnQgPSBncm91cGluZy5oaW50O1xuXG4gICAgd2hpbGUgKGxhc3RDb250ZXh0ID09PSAobGFzdENvbnRleHQgPSAkY29udGV4dCkpIHtcbiAgICAgIGxldCBuZXh0O1xuXG4gICAgICBzdGF0ZS5sYXN0ID0gbGFzdDtcblxuICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RhdGUuaW5kZXggfHwgMDtcblxuICAgICAgJCRtYXRjaGVyLmxhc3RJbmRleCA9PT0gbGFzdEluZGV4IHx8ICgkJG1hdGNoZXIubGFzdEluZGV4ID0gbGFzdEluZGV4KTtcbiAgICAgIG1hdGNoID0gc3RhdGUubWF0Y2ggPSAkJG1hdGNoZXIuZXhlYyhzb3VyY2UpO1xuICAgICAgZG9uZSA9IGluZGV4ID09PSAoaW5kZXggPSBzdGF0ZS5pbmRleCA9ICQkbWF0Y2hlci5sYXN0SW5kZXgpIHx8ICFtYXRjaDtcblxuICAgICAgaWYgKGRvbmUpIHJldHVybjtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIG1hdGNoXG4gICAgICBjb25zdCB7MDogdGV4dCwgMTogd2hpdGVzcGFjZSwgMjogc2VxdWVuY2UsIGluZGV4OiBvZmZzZXR9ID0gbWF0Y2g7XG5cbiAgICAgIC8vIEN1cnJlbnQgcXVhc2ktY29udGV4dHVhbCBmcmFnbWVudFxuICAgICAgY29uc3QgcHJlID0gc291cmNlLnNsaWNlKGxhc3RJbmRleCwgb2Zmc2V0KTtcbiAgICAgIHByZSAmJlxuICAgICAgICAoKG5leHQgPSB0b2tlbih7dHlwZTogJ3ByZScsIHRleHQ6IHByZSwgb2Zmc2V0OiBsYXN0SW5kZXgsIHByZXZpb3VzLCBwYXJlbnQsIGhpbnQsIGxhc3R9KSksXG4gICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpKTtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGZyYWdtZW50XG4gICAgICBjb25zdCB0eXBlID0gKHdoaXRlc3BhY2UgJiYgJ3doaXRlc3BhY2UnKSB8fCAoc2VxdWVuY2UgJiYgJ3NlcXVlbmNlJykgfHwgJ3RleHQnO1xuICAgICAgbmV4dCA9IHRva2VuKHt0eXBlLCB0ZXh0LCBvZmZzZXQsIHByZXZpb3VzLCBwYXJlbnQsIGhpbnQsIGxhc3R9KTtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIHB1bmN0dWF0b3IgKGZyb20gc2VxdWVuY2UpXG4gICAgICBjb25zdCBjbG9zaW5nID1cbiAgICAgICAgJCRjbG9zZXIgJiZcbiAgICAgICAgKCQkY2xvc2VyLnRlc3RcbiAgICAgICAgICA/ICQkY2xvc2VyLnRlc3QodGV4dClcbiAgICAgICAgICA6ICQkY2xvc2VyID09PSB0ZXh0IHx8ICh3aGl0ZXNwYWNlICYmIHdoaXRlc3BhY2UuaW5jbHVkZXMoJCRjbG9zZXIpKSk7XG5cbiAgICAgIGxldCBhZnRlcjtcbiAgICAgIGxldCBwdW5jdHVhdG9yID0gbmV4dC5wdW5jdHVhdG9yO1xuXG4gICAgICBpZiAocHVuY3R1YXRvciB8fCBjbG9zaW5nKSB7XG4gICAgICAgIC8vIHB1bmN0dWF0b3IgdGV4dCBjbG9zaW5nIG5leHQgcGFyZW50XG4gICAgICAgIC8vIHN5bnRheCBtYXRjaGVycyBjbG9zdXJlcyBzcGFucyAkJHNwYW5zXG5cbiAgICAgICAgbGV0IGhpbnRlciA9IHB1bmN0dWF0b3IgPyBgJHtzeW50YXh9LSR7cHVuY3R1YXRvcn1gIDogZ3JvdXBpbmcuaGludDtcbiAgICAgICAgbGV0IGNsb3NlZCwgb3BlbmVkLCBncm91cGVyO1xuXG4gICAgICAgIGlmIChjbG9zaW5nKSB7XG4gICAgICAgICAgY2xvc2VkID0gZ3JvdXBlciA9IGNsb3NpbmcgJiYgZ3JvdXBpbmcuZ3JvdXBpbmdzLnBvcCgpO1xuICAgICAgICAgIG5leHQuY2xvc2VkID0gY2xvc2VkO1xuICAgICAgICAgIGdyb3VwaW5nLmdyb3VwaW5ncy5pbmNsdWRlcyhncm91cGVyKSB8fCBncm91cGluZy5oaW50cy5kZWxldGUoZ3JvdXBlci5oaW50ZXIpO1xuICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciA9PT0gJ29wZW5lcicgJiYgKG5leHQucHVuY3R1YXRvciA9ICdjbG9zZXInKSkgfHxcbiAgICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciAmJiAobmV4dC5wdW5jdHVhdG9yID0gY2xvc2VkLnB1bmN0dWF0b3IpKTtcbiAgICAgICAgICBhZnRlciA9IGdyb3VwZXIuY2xvc2UgJiYgZ3JvdXBlci5jbG9zZShuZXh0LCBzdGF0ZSwgJGNvbnRleHQpO1xuXG4gICAgICAgICAgY29uc3QgcHJldmlvdXNHcm91cGVyID0gKGdyb3VwZXIgPSBncm91cGluZy5ncm91cGluZ3NbZ3JvdXBpbmcuZ3JvdXBpbmdzLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICBncm91cGluZy5nb2FsID0gKHByZXZpb3VzR3JvdXBlciAmJiBwcmV2aW91c0dyb3VwZXIuZ29hbCkgfHwgc3ludGF4O1xuICAgICAgICAgIHBhcmVudCA9IChwYXJlbnQgJiYgcGFyZW50LnBhcmVudCkgfHwgdG9wO1xuICAgICAgICB9IGVsc2UgaWYgKCQkcHVuY3R1YXRvciAhPT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgY29uc3QgZ3JvdXAgPSBgJHtoaW50ZXJ9LCR7dGV4dH1gO1xuICAgICAgICAgIGdyb3VwZXIgPSBncm91cGluZy5ncm91cGVyc1tncm91cF07XG5cbiAgICAgICAgICBpZiAoJCRzcGFucyAmJiBwdW5jdHVhdG9yID09PSAnc3BhbicpIHtcbiAgICAgICAgICAgIGNvbnN0IHNwYW4gPSAkJHNwYW5zW3RleHRdO1xuICAgICAgICAgICAgbmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9ICdzcGFuJztcbiAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgIGdvYWw6IHN5bnRheCxcbiAgICAgICAgICAgICAgICBzcGFuLFxuICAgICAgICAgICAgICAgIG1hdGNoZXI6IHNwYW4ubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuc3BhbikgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHNwYW5zOiAoc3BhbnMgJiYgc3BhbnNbdGV4dF0pIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkJHB1bmN0dWF0b3IgIT09ICdxdW90ZScpIHtcbiAgICAgICAgICAgIGlmIChwdW5jdHVhdG9yID09PSAncXVvdGUnKSB7XG4gICAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgZ29hbDogcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIHF1b3RlOiB0ZXh0LFxuICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogKG1hdGNoZXJzICYmIG1hdGNoZXJzLnF1b3RlKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBzcGFuczogKHNwYW5zICYmIHNwYW5zW3RleHRdKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgICAgY29uc3QgY29tbWVudCA9IGNvbW1lbnRzW3RleHRdO1xuICAgICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgIGdvYWw6IHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICBjb21tZW50LFxuICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogY29tbWVudC5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5jb21tZW50KSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY2xvc3VyZScpIHtcbiAgICAgICAgICAgICAgY29uc3QgY2xvc3VyZSA9IChncm91cGVyICYmIGdyb3VwZXIuY2xvc3VyZSkgfHwgY2xvc3VyZXNbdGV4dF07XG4gICAgICAgICAgICAgIHB1bmN0dWF0b3IgPSBuZXh0LnB1bmN0dWF0b3IgPSAnb3BlbmVyJztcbiAgICAgICAgICAgICAgLy8gJ29wZW5lcicgIT09XG4gICAgICAgICAgICAgIC8vICAgKHB1bmN0dWF0b3IgPVxuICAgICAgICAgICAgICAvLyAgICAgKGNsb3N1cmUub3BlbiAmJlxuICAgICAgICAgICAgICAvLyAgICAgICAobmV4dCA9IGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpIHx8IG5leHQpLnB1bmN0dWF0b3IpIHx8XG4gICAgICAgICAgICAgIC8vICAgICAobmV4dC5wdW5jdHVhdG9yID0gJ29wZW5lcicpKSB8fFxuICAgICAgICAgICAgICBjbG9zdXJlICYmXG4gICAgICAgICAgICAgICAgKG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgICBnb2FsOiBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgIGNsb3N1cmUsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IGNsb3N1cmUubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuY2xvc3VyZSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG9wZW5lZCkge1xuICAgICAgICAgICAgLy8gYWZ0ZXIgPSBvcGVuZWQub3BlbiAmJiBvcGVuZWQub3BlbihuZXh0LCBzdGF0ZSwgb3BlbmVkKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdyb3VwZXJzW2dyb3VwXSB8fCAoZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdID0gZ3JvdXBlciA9IG9wZW5lZCk7XG4gICAgICAgICAgICBncm91cGluZy5ncm91cGluZ3MucHVzaChncm91cGVyKSwgZ3JvdXBpbmcuaGludHMuYWRkKGhpbnRlcik7XG4gICAgICAgICAgICBncm91cGluZy5nb2FsID0gKGdyb3VwZXIgJiYgZ3JvdXBlci5nb2FsKSB8fCBzeW50YXg7XG4gICAgICAgICAgICBwYXJlbnQgPSBuZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmNvbnRleHQgPSBncm91cGluZy5jb250ZXh0ID0gZ3JvdXBpbmcuZ29hbCB8fCBzeW50YXg7XG5cbiAgICAgICAgaWYgKG9wZW5lZCB8fCBjbG9zZWQpIHtcbiAgICAgICAgICAkY29udGV4dCA9ICRjb250ZXh0aW5nLm5leHQoKHN0YXRlLmdyb3VwZXIgPSBncm91cGVyIHx8IHVuZGVmaW5lZCkpLnZhbHVlO1xuICAgICAgICAgIGdyb3VwaW5nLmhpbnQgPSBgJHtbLi4uZ3JvdXBpbmcuaGludHNdLmpvaW4oJyAnKX0gJHtcbiAgICAgICAgICAgIGdyb3VwaW5nLmNvbnRleHQgPyBgaW4tJHtncm91cGluZy5jb250ZXh0fWAgOiAnJ1xuICAgICAgICAgIH1gO1xuICAgICAgICAgIG9wZW5lZCAmJiAoYWZ0ZXIgPSBvcGVuZWQub3BlbiAmJiBvcGVuZWQub3BlbihuZXh0LCBzdGF0ZSwgJGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgdGFpbCB0b2tlbiAoeWllbGQgZnJvbSBzZXF1ZW5jZSlcbiAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpO1xuXG4gICAgICAvLyBOZXh0IHJlZmVyZW5jZSB0byBsYXN0IGNvbnRleHR1YWwgc2VxdWVuY2UgdG9rZW5cbiAgICAgIG5leHQgJiYgIXdoaXRlc3BhY2UgJiYgZm9ybWluZyAmJiAobGFzdCA9IG5leHQpO1xuXG4gICAgICBpZiAoYWZ0ZXIpIHtcbiAgICAgICAgbGV0IHRva2VucywgdG9rZW4sIG5leHRJbmRleDsgLy8gID0gYWZ0ZXIuZW5kIHx8IGFmdGVyLmluZGV4XG5cbiAgICAgICAgaWYgKGFmdGVyLnN5bnRheCkge1xuICAgICAgICAgIGNvbnN0IHtzeW50YXgsIG9mZnNldCwgaW5kZXh9ID0gYWZ0ZXI7XG4gICAgICAgICAgY29uc3QgYm9keSA9IGluZGV4ID4gb2Zmc2V0ICYmIHNvdXJjZS5zbGljZShvZmZzZXQsIGluZGV4IC0gMSk7XG4gICAgICAgICAgaWYgKGJvZHkpIHtcbiAgICAgICAgICAgIGJvZHkubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgICAoKHRva2VucyA9IHRva2VuaXplKGJvZHksIHtvcHRpb25zOiB7c3ludGF4fX0sIGRlZmF1bHRzKSksIChuZXh0SW5kZXggPSBpbmRleCkpO1xuICAgICAgICAgICAgY29uc3QgaGludCA9IGAke3N5bnRheH0taW4tJHskLnN5bnRheH1gO1xuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAgICh0b2tlbi5oaW50ID0gYCR7KHRva2VuLmhpbnQgJiYgYCR7dG9rZW4uaGludH0gYCkgfHwgJyd9JHtoaW50fWApLCB0b2tlblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYWZ0ZXIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgaGludCA9IGdyb3VwaW5nLmhpbnQ7XG4gICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAodG9rZW4uaGludCA9IGAke2hpbnR9ICR7dG9rZW4udHlwZSB8fCAnY29kZSd9YCksICRjb250ZXh0LnRva2VuKHRva2VuKVxuICAgICAgICAgICk7XG4gICAgICAgICAgKHRva2VucyA9IGFmdGVyKS5lbmQgJiYgKG5leHRJbmRleCA9IGFmdGVyLmVuZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW5zKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coe3Rva2VuLCB0b2tlbnMsIG5leHRJbmRleH0pO1xuICAgICAgICAgIGZvciAoY29uc3QgbmV4dCBvZiB0b2tlbnMpIHtcbiAgICAgICAgICAgIHByZXZpb3VzICYmICgobmV4dC5wcmV2aW91cyA9IHByZXZpb3VzKS5uZXh0ID0gbmV4dCk7XG4gICAgICAgICAgICB0b2tlbiAmJiB0b2tlbihuZXh0KTtcbiAgICAgICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBuZXh0SW5kZXggPiBpbmRleCAmJiAoc3RhdGUuaW5kZXggPSBuZXh0SW5kZXgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyAobmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9XG4vLyAgIChjbG9zdXJlLm9wZW4gJiZcbi8vICAgICBjbG9zdXJlLm9wZW4obmV4dCwgc3RhdGUsIHByZXZpb3VzKSAmJlxuLy8gICAgIChuZXh0LnB1bmN0dWF0b3IgfHwgcHVuY3R1YXRvcikpIHx8XG4vLyAgICdvcGVuZXInKSB8fFxuLy8gKG5leHQucHVuY3R1YXRvciA9IHB1bmN0dWF0b3IgPVxuLy8gICAoY2xvc3VyZS5vcGVuICYmIGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpKSB8fCAnb3BlbmVyJykgfHxcbi8vIGlmIChib2R5LnN5bnRheCAmJiBib2R5LnRleHQpIHtcbi8vICAgY29uc3Qge3N5bnRheCwgdGV4dH0gPSBib2R5O1xuLy8gICBjb25zdCBzdGF0ZSA9IHtvcHRpb25zOiB7c3ludGF4fX07XG4vLyAgIGNvbnN0IHRva2VucyA9IHRva2VuaXplKHRleHQsIHN0YXRlLCBkZWZhdWx0cyk7XG4vLyAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB5aWVsZCB0b2tlbjtcbi8vIH1cbiIsIi8qKiBAdHlwZWRlZiB7UmVnRXhwfHN0cmluZ30gUGF0dGVybiAtIFZhbGlkIC8o4oCmKS8gc3ViIGV4cHJlc3Npb24gKi9cbi8qKiBAdHlwZWRlZiB7c3RyaW5nfHtzb3VyY2U6IHN0cmluZ319IEVudGl0eSAtIFZhbGlkIC9b4oCmXS8gc3ViIGV4cHJlc3Npb24gKi9cblxuZXhwb3J0IHtwYXR0ZXJuc30gZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcblxuLy8vIEhlbHBlcnNcbmV4cG9ydCBjb25zdCByYXcgPSBTdHJpbmcucmF3O1xuXG4vKipcbiAqIENyZWF0ZSBhIHNlcXVlbmNlIG1hdGNoIGV4cHJlc3Npb24gZnJvbSBwYXR0ZXJucy5cbiAqXG4gKiBAcGFyYW0gIHsuLi5QYXR0ZXJufSBwYXR0ZXJuc1xuICovXG5leHBvcnQgY29uc3Qgc2VxdWVuY2UgPSAoLi4ucGF0dGVybnMpID0+XG4gIG5ldyBSZWdFeHAoUmVmbGVjdC5hcHBseShyYXcsIG51bGwsIHBhdHRlcm5zLm1hcChwID0+IChwICYmIHAuc291cmNlKSB8fCBwIHx8ICcnKSksICdnJyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbWF5YmVJZGVudGlmaWVyIHRlc3QgKGllIFs8Zmlyc3Q+XVs8b3RoZXI+XSopIGV4cHJlc3Npb24uXG4gKlxuICogQHBhcmFtICB7RW50aXR5fSBmaXJzdCAtIFZhbGlkIF5bPOKApj5dIGVudGl0eVxuICogQHBhcmFtICB7RW50aXR5fSBvdGhlciAtIFZhbGlkIFs84oCmPl0qJCBlbnRpdHlcbiAqIEBwYXJhbSAge3N0cmluZ30gW2ZsYWdzXSAtIFJlZ0V4cCBmbGFncyAoZGVmYXVsdHMgdG8gJ3UnKVxuICogQHBhcmFtICB7dW5rbm93bn0gW2JvdW5kYXJ5XVxuICovXG5leHBvcnQgY29uc3QgaWRlbnRpZmllciA9IChmaXJzdCwgb3RoZXIsIGZsYWdzID0gJ3UnLCBib3VuZGFyeSA9IC95Zy8udGVzdChmbGFncykgJiYgJ1xcXFxiJykgPT5cbiAgbmV3IFJlZ0V4cChgJHtib3VuZGFyeSB8fCAnXid9WyR7Zmlyc3R9XVske290aGVyfV0qJHtib3VuZGFyeSB8fCAnJCd9YCwgZmxhZ3MpO1xuXG4vKipcbiAqIENyZWF0ZSBhIHNlcXVlbmNlIHBhdHRlcm4gZnJvbSBwYXR0ZXJucy5cbiAqXG4gKiBAcGFyYW0gIHsuLi5QYXR0ZXJufSBwYXR0ZXJuc1xuICovXG5leHBvcnQgY29uc3QgYWxsID0gKC4uLnBhdHRlcm5zKSA9PiBwYXR0ZXJucy5tYXAocCA9PiAocCAmJiBwLmV4ZWMgPyBwLnNvdXJjZSA6IHApKS5qb2luKCd8Jyk7XG5cbi8vLyBFbnRpdGllc1xuXG4vKipcbiAqIFRoZSBjb2xsZWN0aW9uIG9mIFJlZ3VsYXIgRXhwcmVzc2lvbnMgdXNlZCB0byBtYXRjaCBzcGVjaWZpY1xuICogbWFya3VwIHNlcXVlbmNlcyBpbiBhIGdpdmVuIGNvbnRleHQgb3IgdG8gdGVzdCBtYXRjaGVkIHNlcXVlbmNlcyB2ZXJib3NlbHlcbiAqIGluIG9yZGVyIHRvIGZ1cnRoZXIgY2F0ZWdvcml6ZSB0aGVtLiBGdWxsIHN1cHBvcnQgZm9yIFVuaWNvZGUgQ2xhc3NlcyBhbmRcbiAqIFByb3BlcnRpZXMgaGFzIGJlZW4gaW5jbHVkZWQgaW4gdGhlIEVDTUFTY3JpcHQgc3BlY2lmaWNhdGlvbiBidXQgY2VydGFpblxuICogZW5naW5lcyBhcmUgc3RpbGwgaW1wbGVtZW50aW5nIHRoZW0uXG4gKlxuICogQHR5cGUge3tbbmFtZTogc3RyaW5nXToge1tuYW1lOiBzdHJpbmddOiBFbnRpdHl9fX1cbiAqL1xuZXhwb3J0IGNvbnN0IGVudGl0aWVzID0ge1xuICBlczoge1xuICAgIC8qKiBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOS4wLyNwcm9kLUlkZW50aWZpZXJTdGFydCAqL1xuICAgIElkZW50aWZpZXJTdGFydDogcmF3YF8kXFxwe0lEX1N0YXJ0fWAsXG4gICAgLyoqIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi85LjAvI3Byb2QtSWRlbnRpZmllclBhcnQgKi9cbiAgICBJZGVudGlmaWVyUGFydDogcmF3YF8kXFx1MjAwY1xcdTIwMGRcXHB7SURfQ29udGludWV9YCxcbiAgfSxcbn07XG5cbi8qKiBJbnRlcm9wZXJhYmlsaXR5IChmb3Igc29tZSBicm93c2VycykgKi9cbihSYW5nZXMgPT4ge1xuICBjb25zdCB0cmFuc2Zvcm1zID0gW107XG5cbiAgaWYgKCFzdXBwb3J0cyhyYXdgXFxwe0lEX1N0YXJ0fWAsICd1JykpIHtcbiAgICBjb25zdCBVbmljb2RlUHJvcGVydHlFc2NhcGVzID0gL1xcXFxweyAqKFxcdyspICp9L2c7XG4gICAgVW5pY29kZVByb3BlcnR5RXNjYXBlcy5yZXBsYWNlID0gKG0sIHByb3BlcnR5S2V5KSA9PiB7XG4gICAgICBpZiAocHJvcGVydHlLZXkgaW4gUmFuZ2VzKSByZXR1cm4gUmFuZ2VzW3Byb3BlcnR5S2V5XS50b1N0cmluZygpO1xuICAgICAgdGhyb3cgUmFuZ2VFcnJvcihgQ2Fubm90IHJld3JpdGUgdW5pY29kZSBwcm9wZXJ0eSBcIiR7cHJvcGVydHlLZXl9XCJgKTtcbiAgICB9O1xuICAgIHRyYW5zZm9ybXMucHVzaChleHByZXNzaW9uID0+IHtcbiAgICAgIGxldCBmbGFncyA9IGV4cHJlc3Npb24gJiYgZXhwcmVzc2lvbi5mbGFncztcbiAgICAgIGxldCBzb3VyY2UgPSBleHByZXNzaW9uICYmIGAke2V4cHJlc3Npb24uc291cmNlIHx8IGV4cHJlc3Npb24gfHwgJyd9YDtcbiAgICAgIHNvdXJjZSAmJlxuICAgICAgICBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnRlc3Qoc291cmNlKSAmJlxuICAgICAgICAoc291cmNlID0gc291cmNlLnJlcGxhY2UoVW5pY29kZVByb3BlcnR5RXNjYXBlcywgVW5pY29kZVByb3BlcnR5RXNjYXBlcy5yZXBsYWNlKSk7XG4gICAgICByZXR1cm4gKGZsYWdzICYmIG5ldyBSZWdFeHAoc291cmNlLCBmbGFncykpIHx8IHNvdXJjZTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICghdHJhbnNmb3Jtcy5sZW5ndGgpIHJldHVybjtcblxuICBmb3IgKGNvbnN0IGtleSBpbiBlbnRpdGllcykge1xuICAgIGNvbnN0IHNvdXJjZXMgPSBlbnRpdGllc1trZXldO1xuICAgIGNvbnN0IGNoYW5nZXMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGlkIGluIHNvdXJjZXMpIHtcbiAgICAgIGxldCBzb3VyY2UgPSBzb3VyY2VzW2lkXTtcbiAgICAgIGlmICghc291cmNlIHx8IHR5cGVvZiBzb3VyY2UgIT09ICdzdHJpbmcnKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHNvdXJjZSA9IHRyYW5zZm9ybShzb3VyY2UpO1xuICAgICAgIXNvdXJjZSB8fCBzb3VyY2UgPT09IHNvdXJjZXNbaWRdIHx8IChjaGFuZ2VzW2lkXSA9IHNvdXJjZSk7XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24oc291cmNlcywgY2hhbmdlcyk7XG4gIH1cblxuICAvLyBwcmV0dGllci1pZ25vcmVcbiAgZnVuY3Rpb24gc3VwcG9ydHMoKSB7dHJ5IHtyZXR1cm4gISFSZWdFeHAoLi4uIGFyZ3VtZW50cyl9IGNhdGNoIChlKSB7IH19XG59KSh7XG4gIElEX1N0YXJ0OiByYXdgYS16QS1aXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNgLFxuICBJRF9Db250aW51ZTogcmF3YGEtekEtWjAtOVxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDhhMC1cXHUwOGI0XFx1MDhiNi1cXHUwOGJkXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4OFxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmVmXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3YjlcXHVhN2Y3LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY1XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXFx1MjAwY1xcdTIwMGRcXHhiN1xcdTAzMDAtXFx1MDM2ZlxcdTAzODdcXHUwNDgzLVxcdTA0ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNjEwLVxcdTA2MWFcXHUwNjRiLVxcdTA2NjlcXHUwNjcwXFx1MDZkNi1cXHUwNmRjXFx1MDZkZi1cXHUwNmU0XFx1MDZlN1xcdTA2ZThcXHUwNmVhLVxcdTA2ZWRcXHUwNmYwLVxcdTA2ZjlcXHUwNzExXFx1MDczMC1cXHUwNzRhXFx1MDdhNi1cXHUwN2IwXFx1MDdjMC1cXHUwN2M5XFx1MDdlYi1cXHUwN2YzXFx1MDdmZFxcdTA4MTYtXFx1MDgxOVxcdTA4MWItXFx1MDgyM1xcdTA4MjUtXFx1MDgyN1xcdTA4MjktXFx1MDgyZFxcdTA4NTktXFx1MDg1YlxcdTA4ZDMtXFx1MDhlMVxcdTA4ZTMtXFx1MDkwM1xcdTA5M2EtXFx1MDkzY1xcdTA5M2UtXFx1MDk0ZlxcdTA5NTEtXFx1MDk1N1xcdTA5NjJcXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk4MS1cXHUwOTgzXFx1MDliY1xcdTA5YmUtXFx1MDljNFxcdTA5YzdcXHUwOWM4XFx1MDljYi1cXHUwOWNkXFx1MDlkN1xcdTA5ZTJcXHUwOWUzXFx1MDllNi1cXHUwOWVmXFx1MDlmZVxcdTBhMDEtXFx1MGEwM1xcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTY2LVxcdTBhNzFcXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGFiY1xcdTBhYmUtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZTJcXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGFmYS1cXHUwYWZmXFx1MGIwMS1cXHUwYjAzXFx1MGIzY1xcdTBiM2UtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjYyXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiODJcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMC1cXHUwYzA0XFx1MGMzZS1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzYyXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODEtXFx1MGM4M1xcdTBjYmNcXHUwY2JlLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZTJcXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGQwMC1cXHUwZDAzXFx1MGQzYlxcdTBkM2NcXHUwZDNlLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGRcXHUwZDU3XFx1MGQ2MlxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDgyXFx1MGQ4M1xcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRlNi1cXHUwZGVmXFx1MGRmMlxcdTBkZjNcXHUwZTMxXFx1MGUzNC1cXHUwZTNhXFx1MGU0Ny1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGViMVxcdTBlYjQtXFx1MGViOVxcdTBlYmJcXHUwZWJjXFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGYxOFxcdTBmMTlcXHUwZjIwLVxcdTBmMjlcXHUwZjM1XFx1MGYzN1xcdTBmMzlcXHUwZjNlXFx1MGYzZlxcdTBmNzEtXFx1MGY4NFxcdTBmODZcXHUwZjg3XFx1MGY4ZC1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMmItXFx1MTAzZVxcdTEwNDAtXFx1MTA0OVxcdTEwNTYtXFx1MTA1OVxcdTEwNWUtXFx1MTA2MFxcdTEwNjItXFx1MTA2NFxcdTEwNjctXFx1MTA2ZFxcdTEwNzEtXFx1MTA3NFxcdTEwODItXFx1MTA4ZFxcdTEwOGYtXFx1MTA5ZFxcdTEzNWQtXFx1MTM1ZlxcdTEzNjktXFx1MTM3MVxcdTE3MTItXFx1MTcxNFxcdTE3MzItXFx1MTczNFxcdTE3NTJcXHUxNzUzXFx1MTc3MlxcdTE3NzNcXHUxN2I0LVxcdTE3ZDNcXHUxN2RkXFx1MTdlMC1cXHUxN2U5XFx1MTgwYi1cXHUxODBkXFx1MTgxMC1cXHUxODE5XFx1MThhOVxcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk0ZlxcdTE5ZDAtXFx1MTlkYVxcdTFhMTctXFx1MWExYlxcdTFhNTUtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYjAtXFx1MWFiZFxcdTFiMDAtXFx1MWIwNFxcdTFiMzQtXFx1MWI0NFxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiODAtXFx1MWI4MlxcdTFiYTEtXFx1MWJhZFxcdTFiYjAtXFx1MWJiOVxcdTFiZTYtXFx1MWJmM1xcdTFjMjQtXFx1MWMzN1xcdTFjNDAtXFx1MWM0OVxcdTFjNTAtXFx1MWM1OVxcdTFjZDAtXFx1MWNkMlxcdTFjZDQtXFx1MWNlOFxcdTFjZWRcXHUxY2YyLVxcdTFjZjRcXHUxY2Y3LVxcdTFjZjlcXHUxZGMwLVxcdTFkZjlcXHUxZGZiLVxcdTFkZmZcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MmNlZi1cXHUyY2YxXFx1MmQ3ZlxcdTJkZTAtXFx1MmRmZlxcdTMwMmEtXFx1MzAyZlxcdTMwOTlcXHUzMDlhXFx1YTYyMC1cXHVhNjI5XFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2OWVcXHVhNjlmXFx1YTZmMFxcdWE2ZjFcXHVhODAyXFx1YTgwNlxcdWE4MGJcXHVhODIzLVxcdWE4MjdcXHVhODgwXFx1YTg4MVxcdWE4YjQtXFx1YThjNVxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmMVxcdWE4ZmYtXFx1YTkwOVxcdWE5MjYtXFx1YTkyZFxcdWE5NDctXFx1YTk1M1xcdWE5ODAtXFx1YTk4M1xcdWE5YjMtXFx1YTljMFxcdWE5ZDAtXFx1YTlkOVxcdWE5ZTVcXHVhOWYwLVxcdWE5ZjlcXHVhYTI5LVxcdWFhMzZcXHVhYTQzXFx1YWE0Y1xcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTdiLVxcdWFhN2RcXHVhYWIwXFx1YWFiMi1cXHVhYWI0XFx1YWFiN1xcdWFhYjhcXHVhYWJlXFx1YWFiZlxcdWFhYzFcXHVhYWViLVxcdWFhZWZcXHVhYWY1XFx1YWFmNlxcdWFiZTMtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1ZmIxZVxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyZlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmYxMC1cXHVmZjE5XFx1ZmYzZmAsXG59KTtcblxuZXhwb3J0IGNvbnN0IHJlYWR5ID0gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbi8vIC8vLyBSZWd1bGFyIEV4cHJlc3Npb25zXG4vLyBleHBvcnQgY29uc3QgUmVnRXhwVW5pY29kZVByb3BlcnRpZXMgPSAvXFxcXHB7ICooXFx3KykgKn0vZztcblxuLy8gUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmVwbGFjZSA9IChtLCBwcm9wZXJ0eUtleSkgPT4ge1xuLy8gICAvLyBjb25zdCBwcm9wZXJ0eSA9IEFTQ0lJW3Byb3BlcnR5S2V5XSB8fCBVbmljb2RlW3Byb3BlcnR5S2V5XTtcbi8vICAgY29uc3QgcHJvcGVydHkgPSBSYW5nZXNbcHJvcGVydHlLZXldO1xuLy8gICBpZiAocHJvcGVydHkpIHJldHVybiBwcm9wZXJ0eS50b1N0cmluZygpO1xuLy8gICB0aHJvdyBSYW5nZUVycm9yKGBDYW5ub3QgcmV3cml0ZSB1bmljb2RlIHByb3BlcnR5IFwiJHtwcm9wZXJ0eUtleX1cImApO1xuLy8gfTtcblxuLy8gUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmV3cml0ZSA9IGV4cHJlc3Npb24gPT4ge1xuLy8gICBsZXQgZmxhZ3MgPSBleHByZXNzaW9uICYmIGV4cHJlc3Npb24uZmxhZ3M7XG4vLyAgIGxldCBzb3VyY2UgPSBleHByZXNzaW9uICYmIGAke2V4cHJlc3Npb24uc291cmNlIHx8IGV4cHJlc3Npb24gfHwgJyd9YDtcbi8vICAgc291cmNlICYmXG4vLyAgICAgUmVnRXhwVW5pY29kZVByb3BlcnRpZXMudGVzdChzb3VyY2UpICYmXG4vLyAgICAgKHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLCBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXBsYWNlKSk7XG4vLyAgIHJldHVybiAoZmxhZ3MgJiYgbmV3IFJlZ0V4cChzb3VyY2UsIGZsYWdzKSkgfHwgc291cmNlO1xuLy8gfTtcblxuLy8gLy8vIEludGVyb3BlcmFiaWxpdHlcbi8vIGV4cG9ydCBjb25zdCBzdXBwb3J0ZWQgPVxuLy8gICAvLyBUT0RPOiBSZW1vdmUgd2hlbiBzc3VwcG9ydGluZyBub24tdW5pY29kZSBydW50aW1lcyBbbm90IGluIHNjb3BlXVxuLy8gICBuZXcgUmVnRXhwKHJhd2BcXHVGRkZGYCwgJ3UnKSAmJlxuLy8gICBzdXBwb3J0cyhcbi8vICAgICBVbmljb2RlUHJvcGVydGllcyA9PiBuZXcgUmVnRXhwKHJhd2BcXHB7TH1gLCAndScpLFxuLy8gICAgIFVuaWNvZGVDbGFzc2VzID0+IG5ldyBSZWdFeHAocmF3YFxccHtJRF9TdGFydH1cXHB7SURfQ29udGludWV9YCwgJ3UnKSxcbi8vICAgKTtcblxuLy8gYXN5bmMgZnVuY3Rpb24gcmVwbGFjZVVuc3VwcG9ydGVkRXhwcmVzc2lvbnMoKSB7XG4vLyAgIC8vIGF3YWl0IFVuaWNvZGUuaW5pdGlhbGl6ZSgpOyBjb25zb2xlLmxvZyhVbmljb2RlKTtcbi8vICAgZm9yIChjb25zdCBrZXkgaW4gZW50aXRpZXMpIHtcbi8vICAgICBjb25zdCBzb3VyY2VzID0gZW50aXRpZXNba2V5XTtcbi8vICAgICBjb25zdCByZXBsYWNlbWVudHMgPSB7fTtcbi8vICAgICBmb3IgKGNvbnN0IGlkIGluIHNvdXJjZXMpXG4vLyAgICAgICAhc291cmNlc1tpZF0gfHxcbi8vICAgICAgICAgdHlwZW9mIChzb3VyY2VzW2lkXS5zb3VyY2UgfHwgc291cmNlc1tpZF0pICE9PSAnc3RyaW5nJyB8fFxuLy8gICAgICAgICAocmVwbGFjZW1lbnRzW2lkXSA9IFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJld3JpdGUoc291cmNlc1tpZF0pKTtcbi8vICAgICBPYmplY3QuYXNzaWduKHNvdXJjZXMsIHJlcGxhY2VtZW50cyk7XG4vLyAgIH1cbi8vICAgcmV0dXJuO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBzdXBwb3J0cyhmZWF0dXJlLCAuLi5mZWF0dXJlcykge1xuLy8gICBpZiAoZmVhdHVyZSkge1xuLy8gICAgIHRyeSB7XG4vLyAgICAgICBmZWF0dXJlKCk7XG4vLyAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4vLyAgICAgICByZXR1cm4gZmFsc2U7XG4vLyAgICAgfVxuLy8gICB9XG4vLyAgIHJldHVybiAhZmVhdHVyZXMubGVuZ3RoIHx8IFJlZmxlY3QuYXBwbHkoc3VwcG9ydHMsIG51bGwsIGZlYXR1cmVzKTtcbi8vIH1cblxuLy8gLy8gVE9ETzogRml4IFVuaWNvZGVSYW5nZS5tZXJnZSBpZiBub3QgaW1wbGVtZW50ZWQgaW4gRmlyZWZveCBzb29uXG4vLyAvLyBpbXBvcnQge1VuaWNvZGV9IGZyb20gJy4vdW5pY29kZS91bmljb2RlLmpzJztcblxuLy8gLy8gVE9ETzogUmVtb3ZlIFJhbmdlcyBvbmNlIFVuaWNvZGVSYW5nZSBpcyB3b3JraW5nXG4vLyBjb25zdCBSYW5nZXMgPSB7XG4vLyAgIC8vIEw6ICdhLXpBLVonLFxuLy8gICAvLyBOOiAnMC05Jyxcbi8vICAgSURfU3RhcnQ6IHJhd2BhLXpBLVpcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY2AsXG4vLyAgIElEX0NvbnRpbnVlOiByYXdgYS16QS1aMC05XFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcXHUyMDBjXFx1MjAwZFxceGI3XFx1MDMwMC1cXHUwMzZmXFx1MDM4N1xcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2NGItXFx1MDY2OVxcdTA2NzBcXHUwNmQ2LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZTRcXHUwNmU3XFx1MDZlOFxcdTA2ZWEtXFx1MDZlZFxcdTA2ZjAtXFx1MDZmOVxcdTA3MTFcXHUwNzMwLVxcdTA3NGFcXHUwN2E2LVxcdTA3YjBcXHUwN2MwLVxcdTA3YzlcXHUwN2ViLVxcdTA3ZjNcXHUwN2ZkXFx1MDgxNi1cXHUwODE5XFx1MDgxYi1cXHUwODIzXFx1MDgyNS1cXHUwODI3XFx1MDgyOS1cXHUwODJkXFx1MDg1OS1cXHUwODViXFx1MDhkMy1cXHUwOGUxXFx1MDhlMy1cXHUwOTAzXFx1MDkzYS1cXHUwOTNjXFx1MDkzZS1cXHUwOTRmXFx1MDk1MS1cXHUwOTU3XFx1MDk2MlxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2RcXHUwOWQ3XFx1MDllMlxcdTA5ZTNcXHUwOWU2LVxcdTA5ZWZcXHUwOWZlXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMlxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYWZhLVxcdTBhZmZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNjJcXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI4MlxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAwLVxcdTBjMDRcXHUwYzNlLVxcdTBjNDRcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNjJcXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MS1cXHUwYzgzXFx1MGNiY1xcdTBjYmUtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNlMlxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwZDAwLVxcdTBkMDNcXHUwZDNiXFx1MGQzY1xcdTBkM2UtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZFxcdTBkNTdcXHUwZDYyXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODJcXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGU2LVxcdTBkZWZcXHUwZGYyXFx1MGRmM1xcdTBlMzFcXHUwZTM0LVxcdTBlM2FcXHUwZTQ3LVxcdTBlNGVcXHUwZTUwLVxcdTBlNTlcXHUwZWIxXFx1MGViNC1cXHUwZWI5XFx1MGViYlxcdTBlYmNcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2VcXHUwZjNmXFx1MGY3MS1cXHUwZjg0XFx1MGY4NlxcdTBmODdcXHUwZjhkLVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAyYi1cXHUxMDNlXFx1MTA0MC1cXHUxMDQ5XFx1MTA1Ni1cXHUxMDU5XFx1MTA1ZS1cXHUxMDYwXFx1MTA2Mi1cXHUxMDY0XFx1MTA2Ny1cXHUxMDZkXFx1MTA3MS1cXHUxMDc0XFx1MTA4Mi1cXHUxMDhkXFx1MTA4Zi1cXHUxMDlkXFx1MTM1ZC1cXHUxMzVmXFx1MTM2OS1cXHUxMzcxXFx1MTcxMi1cXHUxNzE0XFx1MTczMi1cXHUxNzM0XFx1MTc1MlxcdTE3NTNcXHUxNzcyXFx1MTc3M1xcdTE3YjQtXFx1MTdkM1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxOGE5XFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk0Ni1cXHUxOTRmXFx1MTlkMC1cXHUxOWRhXFx1MWExNy1cXHUxYTFiXFx1MWE1NS1cXHUxYTVlXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWFiMC1cXHUxYWJkXFx1MWIwMC1cXHUxYjA0XFx1MWIzNC1cXHUxYjQ0XFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYjgyXFx1MWJhMS1cXHUxYmFkXFx1MWJiMC1cXHUxYmI5XFx1MWJlNi1cXHUxYmYzXFx1MWMyNC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM1MC1cXHUxYzU5XFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2U4XFx1MWNlZFxcdTFjZjItXFx1MWNmNFxcdTFjZjctXFx1MWNmOVxcdTFkYzAtXFx1MWRmOVxcdTFkZmItXFx1MWRmZlxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyY2VmLVxcdTJjZjFcXHUyZDdmXFx1MmRlMC1cXHUyZGZmXFx1MzAyYS1cXHUzMDJmXFx1MzA5OVxcdTMwOWFcXHVhNjIwLVxcdWE2MjlcXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZVxcdWE2OWZcXHVhNmYwXFx1YTZmMVxcdWE4MDJcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4ODBcXHVhODgxXFx1YThiNC1cXHVhOGM1XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGYxXFx1YThmZi1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTk0Ny1cXHVhOTUzXFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YTlkMC1cXHVhOWQ5XFx1YTllNVxcdWE5ZjAtXFx1YTlmOVxcdWFhMjktXFx1YWEzNlxcdWFhNDNcXHVhYTRjXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2ItXFx1YWE3ZFxcdWFhYjBcXHVhYWIyLVxcdWFhYjRcXHVhYWI3XFx1YWFiOFxcdWFhYmVcXHVhYWJmXFx1YWFjMVxcdWFhZWItXFx1YWFlZlxcdWFhZjVcXHVhYWY2XFx1YWJlMy1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVmYjFlXFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTJmXFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmYCxcbi8vIH07XG5cbi8vIC8vLyBCb290c3RyYXBcbi8vIGV4cG9ydCBjb25zdCByZWFkeSA9IChlbnRpdGllcy5yZWFkeSA9IHN1cHBvcnRlZFxuLy8gICA/IFByb21pc2UucmVzb2x2ZSgpXG4vLyAgIDogcmVwbGFjZVVuc3VwcG9ydGVkRXhwcmVzc2lvbnMoKSk7XG4iLCJpbXBvcnQge21hdGNoZXJzLCBtb2Rlc30gZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcbmltcG9ydCB7cGF0dGVybnMsIGVudGl0aWVzLCBpZGVudGlmaWVyLCBzZXF1ZW5jZSwgYWxsLCByYXd9IGZyb20gJy4vbWFya3VwLXBhdHRlcm5zLmpzJztcblxuLy8vIElOVEVSRkFDRVxuXG5leHBvcnQgY29uc3QgaW5zdGFsbCA9IChkZWZhdWx0cywgbmV3U3ludGF4ZXMgPSBkZWZhdWx0cy5zeW50YXhlcyB8fCB7fSkgPT4ge1xuICBPYmplY3QuYXNzaWduKG5ld1N5bnRheGVzLCBzeW50YXhlcyk7XG4gIGRlZmF1bHRzLnN5bnRheGVzID09PSBuZXdTeW50YXhlcyB8fCAoZGVmYXVsdHMuc3ludGF4ZXMgPSBuZXdTeW50YXhlcyk7XG59O1xuXG5leHBvcnQgY29uc3Qgc3ludGF4ZXMgPSB7fTtcblxuLy8vIERFRklOSVRJT05TXG5TeW50YXhlczoge1xuICAvLy8gSGVscGVyc1xuICAvLyBjb25zdCByYXcgPSBTdHJpbmcucmF3O1xuICBjb25zdCBsaW5lcyA9IHN0cmluZyA9PiBzdHJpbmcuc3BsaXQoL1xcbisvKTtcbiAgY29uc3QgY2xvc3VyZXMgPSBzdHJpbmcgPT4ge1xuICAgIGNvbnN0IHBhaXJzID0gc3ltYm9scyhzdHJpbmcpO1xuICAgIGNvbnN0IGFycmF5ID0gbmV3IEFycmF5KHBhaXJzLmxlbmd0aCk7XG4gICAgYXJyYXkucGFpcnMgPSBwYWlycztcbiAgICBsZXQgaSA9IDA7XG4gICAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG4gICAgICBjb25zdCBbb3BlbmVyLCBjbG9zZXJdID0gcGFpci5zcGxpdCgn4oCmJyk7XG4gICAgICBhcnJheVsoYXJyYXlbaSsrXSA9IG9wZW5lcildID0ge29wZW5lciwgY2xvc2VyfTtcbiAgICB9XG4gICAgYXJyYXkudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9O1xuICBjb25zdCBzeW1ib2xzID0gc291cmNlID0+XG4gICAgKHNvdXJjZSAmJlxuICAgICAgKCh0eXBlb2Ygc291cmNlID09PSAnc3RyaW5nJyAmJiBzb3VyY2Uuc3BsaXQoLyArLykpIHx8XG4gICAgICAgIChTeW1ib2wuaXRlcmF0b3IgaW4gc291cmNlICYmIFsuLi5zb3VyY2VdKSkpIHx8XG4gICAgW107XG4gIHN5bWJvbHMuZnJvbSA9ICguLi5hcmdzKSA9PiBbLi4ubmV3IFNldChbXS5jb25jYXQoLi4uYXJncy5tYXAoc3ltYm9scykpKV07XG5cbiAgLy8gY29uc3QgTElORVMgPSAvKFxcbikvZztcbiAgY29uc3QgTElORSA9IC8kL2c7XG5cbiAgQ1NTOiB7XG4gICAgY29uc3QgY3NzID0gKHN5bnRheGVzLmNzcyA9IHtcbiAgICAgIC4uLihtb2Rlcy5jc3MgPSB7c3ludGF4OiAnY3NzJ30pLFxuICAgICAgY29tbWVudHM6IGNsb3N1cmVzKCcvKuKApiovJyksXG4gICAgICBjbG9zdXJlczogY2xvc3VyZXMoJ3vigKZ9ICjigKYpIFvigKZdJyksXG4gICAgICBxdW90ZXM6IHN5bWJvbHMoYCcgXCJgKSxcbiAgICAgIGFzc2lnbmVyczogc3ltYm9scyhgOmApLFxuICAgICAgY29tYmluYXRvcnM6IHN5bWJvbHMoJz4gOjogKyA6JyksXG4gICAgICBub25icmVha2Vyczogc3ltYm9scyhgLWApLFxuICAgICAgYnJlYWtlcnM6IHN5bWJvbHMoJywgOycpLFxuICAgICAgcGF0dGVybnM6IHsuLi5wYXR0ZXJuc30sXG4gICAgICBtYXRjaGVyOiAvKFtcXHNcXG5dKyl8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98XFwvXFwqfFxcKlxcL3xcXCh8XFwpfFxcW3xcXF18XCJ8J3xcXHt8XFx9fCx8O3xcXC58XFxiOlxcL1xcL1xcYnw6OlxcYnw6KD8hYWN0aXZlfGFmdGVyfGFueXxhbnktbGlua3xiYWNrZHJvcHxiZWZvcmV8Y2hlY2tlZHxkZWZhdWx0fGRlZmluZWR8ZGlyfGRpc2FibGVkfGVtcHR5fGVuYWJsZWR8Zmlyc3R8Zmlyc3QtY2hpbGR8Zmlyc3QtbGV0dGVyfGZpcnN0LWxpbmV8Zmlyc3Qtb2YtdHlwZXxmb2N1c3xmb2N1cy12aXNpYmxlfGZvY3VzLXdpdGhpbnxmdWxsc2NyZWVufGhvc3R8aG92ZXJ8aW4tcmFuZ2V8aW5kZXRlcm1pbmF0ZXxpbnZhbGlkfGxhbmd8bGFzdC1jaGlsZHxsYXN0LW9mLXR5cGV8bGVmdHxsaW5rfG1hdGNoZXN8bm90fG50aC1jaGlsZHxudGgtbGFzdC1jaGlsZHxudGgtbGFzdC1vZi10eXBlfG50aC1vZi10eXBlfG9ubHktY2hpbGR8b25seS1vZi10eXBlfG9wdGlvbmFsfG91dC1vZi1yYW5nZXxyZWFkLW9ubHl8cmVxdWlyZWR8cmlnaHR8cm9vdHxzY29wZXx0YXJnZXR8dmFsaWR8dmlzaXRlZCkpL2csXG4gICAgICBtYXRjaGVyczoge1xuICAgICAgICBxdW90ZTogbWF0Y2hlcnMuZXNjYXBlcyxcbiAgICAgICAgY29tbWVudDogbWF0Y2hlcnMuY29tbWVudHMsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgSFRNTDoge1xuICAgIGNvbnN0IGh0bWwgPSAoc3ludGF4ZXMuaHRtbCA9IHtcbiAgICAgIC4uLihtb2Rlcy5odG1sID0ge3N5bnRheDogJ2h0bWwnfSksXG4gICAgICBrZXl3b3Jkczogc3ltYm9scygnRE9DVFlQRSBkb2N0eXBlJyksXG4gICAgICBjb21tZW50czogY2xvc3VyZXMoJzwhLS3igKYtLT4nKSxcbiAgICAgIHF1b3RlczogW10sXG4gICAgICBjbG9zdXJlczogY2xvc3VyZXMoJzwl4oCmJT4gPCHigKY+IDzigKYvPiA8L+KApj4gPOKApj4nKSxcbiAgICAgIHBhdHRlcm5zOiB7XG4gICAgICAgIC4uLnBhdHRlcm5zLFxuICAgICAgICBjbG9zZVRhZzogLzxcXC9cXHdbXjw+e31dKj8+L2csXG4gICAgICAgIG1heWJlSWRlbnRpZmllcjogL14oPzooPzpbYS16XVtcXC1hLXpdKik/W2Etel0rXFw6KT8oPzpbYS16XVtcXC1hLXpdKik/W2Etel0rJC8sXG4gICAgICB9LFxuICAgICAgbWF0Y2hlcjogbWF0Y2hlcnMueG1sLFxuICAgICAgbWF0Y2hlcnM6IHtcbiAgICAgICAgcXVvdGU6IC8oXFxuKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pfFwifCcpL2csXG4gICAgICAgIGNvbW1lbnQ6IC8oXFxuKXwoLS0+KS9nLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHtcbiAgICAgIGNvbnN0IERPQ1RBR1MgPSBzeW1ib2xzKCdTQ1JJUFQgU1RZTEUnKTtcbiAgICAgIGNvbnN0IFRBRyA9IC9eW2Etel0rJC9pO1xuICAgICAgLy8gVE9ETzogQ2hlY2sgaWYgY3VzdG9tL25hbWVzcGFjZSB0YWdzIGV2ZXIgbmVlZCBzcGVjaWFsIGNsb3NlIGxvZ2ljXG4gICAgICAvLyBjb25zdCBUQUdMSUtFID0gL14oPzooPzpbYS16XVtcXC1hLXpdKik/W2Etel0rXFw6KT8oPzpbYS16XVtcXC1hLXpdKik/W2Etel0rJC9pO1xuXG5cbiAgICAgIGh0bWwuY2xvc3VyZXNbJzwnXS5jbG9zZSA9IChuZXh0LCBzdGF0ZSwgY29udGV4dCkgPT4ge1xuICAgICAgICBjb25zdCBwYXJlbnQgPSBuZXh0ICYmIG5leHQucGFyZW50O1xuICAgICAgICBjb25zdCBmaXJzdCA9IHBhcmVudCAmJiBwYXJlbnQubmV4dDtcbiAgICAgICAgY29uc3QgdGFnID0gZmlyc3QgJiYgZmlyc3QudGV4dCAmJiBUQUcudGVzdChmaXJzdC50ZXh0KSAmJiBmaXJzdC50ZXh0LnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgaWYgKHRhZyAmJiBET0NUQUdTLmluY2x1ZGVzKHRhZykpIHtcbiAgICAgICAgICAvLyBUT0RPOiBVbmNvbW1lbnQgb25jZSB0b2tlbiBidWZmZXJpbmcgaXMgaW1wbGVtZW50ZWRcbiAgICAgICAgICAvLyB0YWcgJiYgKGZpcnN0LnR5cGUgPSAna2V5d29yZCcpO1xuXG4gICAgICAgICAgbGV0IHtzb3VyY2UsIGluZGV4fSA9IHN0YXRlO1xuICAgICAgICAgIGNvbnN0ICQkbWF0Y2hlciA9IHN5bnRheGVzLmh0bWwucGF0dGVybnMuY2xvc2VUYWc7XG5cbiAgICAgICAgICBsZXQgbWF0Y2g7IC8vICA9ICQkbWF0Y2hlci5leGVjKHNvdXJjZSk7XG4gICAgICAgICAgJCRtYXRjaGVyLmxhc3RJbmRleCA9IGluZGV4O1xuXG4gICAgICAgICAgLy8gVE9ETzogQ2hlY2sgaWYgYDxzY3JpcHQ+YOKApmA8L1NDUklQVD5gIGlzIHN0aWxsIHZhbGlkIVxuICAgICAgICAgIGNvbnN0ICQkY2xvc2VyID0gbmV3IFJlZ0V4cChyYXdgXjxcXC8oPzoke2ZpcnN0LnRleHQudG9Mb3dlckNhc2UoKX18JHt0YWd9KVxcYmApO1xuXG4gICAgICAgICAgbGV0IHN5bnRheCA9ICh0YWcgPT09ICdTVFlMRScgJiYgJ2NzcycpIHx8ICcnO1xuXG4gICAgICAgICAgaWYgKCFzeW50YXgpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wZW5UYWcgPSBzb3VyY2Uuc2xpY2UocGFyZW50Lm9mZnNldCwgaW5kZXgpO1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvXFxzdHlwZT0uKj9cXGIoLis/KVxcYi8uZXhlYyhvcGVuVGFnKTtcbiAgICAgICAgICAgIHN5bnRheCA9XG4gICAgICAgICAgICAgIHRhZyA9PT0gJ1NDUklQVCcgJiYgKCFtYXRjaCB8fCAhbWF0Y2hbMV0gfHwgL15tb2R1bGUkfGphdmFzY3JpcHQvaS50ZXN0KG1hdGNoWzFdKSlcbiAgICAgICAgICAgICAgICA/ICdlcydcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coe3N5bnRheCwgdGFnLCBtYXRjaCwgb3BlblRhZ30pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSAkJG1hdGNoZXIuZXhlYyhzb3VyY2UpKSkge1xuICAgICAgICAgICAgaWYgKCQkY2xvc2VyLnRlc3QobWF0Y2hbMF0pKSB7XG4gICAgICAgICAgICAgIGlmIChzeW50YXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge29mZnNldDogaW5kZXgsIGluZGV4OiBtYXRjaC5pbmRleCwgc3ludGF4fTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gc291cmNlLnNsaWNlKG9mZnNldCwgbWF0Y2guaW5kZXggLSAxKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5pbmRleCA9IG1hdGNoLmluZGV4O1xuICAgICAgICAgICAgICAgIHJldHVybiBbe3RleHQsIG9mZnNldCwgcHJldmlvdXM6IG5leHQsIHBhcmVudH1dO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH07XG4gICAgICBodG1sLmNsb3N1cmVzWyc8J10ucXVvdGVzID0gc3ltYm9scyhgJyBcImApO1xuICAgICAgaHRtbC5jbG9zdXJlc1snPCddLmNsb3NlciA9IC9cXC8/Pi87XG5cbiAgICAgIC8vIFRPRE86IEFsbG93IGdyb3VwaW5nLWxldmVsIHBhdHRlcm5zIGZvciBIVE1MIGF0dHJpYnV0ZXMgdnMgdGV4dFxuICAgICAgLy8gaHRtbC5jbG9zdXJlc1snPCddLnBhdHRlcm5zID0geyBtYXliZUlkZW50aWZpZXI6IFRBR0xJS0UgfTtcbiAgICB9XG4gIH1cblxuICBNYXJrZG93bjoge1xuICAgIGNvbnN0IEJMT0NLID0gJ2BgYOKApmBgYCB+fn7igKZ+fn4nO1xuICAgIGNvbnN0IElOTElORSA9ICdb4oCmXSAo4oCmKSAq4oCmKiAqKuKApioqIF/igKZfIF9f4oCmX18gfuKApn4gfn7igKZ+fic7XG4gICAgLyoqXG4gICAgICogVE9ETzogQWRkcmVzcyB1bmV4cGVjdGVkIGNsb3N1cmVzIGluIHBhcnNpbmcgZnJhZ21lbnRlclxuICAgICAqXG4gICAgICogQXMgZmFyIGFzIHRva2VuaXphdGlvbiBnb2VzLCB1bmV4cGVjdGVkIGNsb3N1cmVzIGFyZSBzdGlsbFxuICAgICAqIGNsb3N1cmVzIG5vbmV0aGVsZXNzLiBUaGV5IGFyZSBub3Qgc3BhbnMuXG4gICAgICovXG4gICAgY29uc3QgU1BBTlMgPSAnJzsgLy8gSU5MSU5FXG4gICAgY29uc3QgQ0xPU1VSRVMgPSBTUEFOUyA/IEJMT0NLIDogYCR7QkxPQ0t9ICR7SU5MSU5FfWA7XG5cbiAgICBjb25zdCBodG1sID0gc3ludGF4ZXMuaHRtbDtcbiAgICBjb25zdCBtZCA9IChzeW50YXhlcy5tZCA9IHtcbiAgICAgIC4uLihtb2Rlcy5tYXJrZG93biA9IG1vZGVzLm1kID0ge3N5bnRheDogJ21kJ30pLFxuICAgICAgY29tbWVudHM6IGNsb3N1cmVzKCc8IS0t4oCmLS0+JyksXG4gICAgICBxdW90ZXM6IFtdLFxuICAgICAgY2xvc3VyZXM6IGNsb3N1cmVzKGAke2h0bWwuY2xvc3VyZXN9ICR7Q0xPU1VSRVN9YCksXG4gICAgICBwYXR0ZXJuczogey4uLmh0bWwucGF0dGVybnN9LFxuICAgICAgbWF0Y2hlcjogLyheXFxzK3xcXG4pfCgmI3g/W2EtZjAtOV0rO3wmW2Etel0rO3woPzpgYGArfFxcflxcflxcfit8LS0rfD09K3woPzpcXCN7MSw2fXxcXC18XFxiXFxkK1xcLnxcXGJbYS16XVxcLnxcXGJbaXZ4XStcXC4pKD89XFxzK1xcUyspKXxcInwnfD18XFwvPnw8JXwlPnw8IS0tfC0tPnw8W1xcL1xcIV0/KD89W2Etel0rXFw6P1thLXpcXC1dKlthLXpdfFthLXpdKyl8PHw+fFxcKHxcXCl8XFxbfFxcXXxfXz98KFsqfmBdKVxcMz9cXGJ8XFxiKFsqfmBdKVxcND8pfFxcYlteXFxuXFxzXFxbXFxdXFwoXFwpXFw8XFw+Jl0qW15cXG5cXHNcXFtcXF1cXChcXClcXDxcXD4mX11cXGJ8W15cXG5cXHNcXFtcXF1cXChcXClcXDxcXD4mXSsoPz1fXz9cXGIpL2dpbSxcbiAgICAgIHNwYW5zOiB1bmRlZmluZWQsXG4gICAgICBtYXRjaGVyczoge2NvbW1lbnQ6IC8oXFxuKXwoLS0+KS9nfSxcbiAgICB9KTtcblxuICAgIC8vIG1kLnBhdHRlcm5zLm1heWJlSWRlbnRpZmllciA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChTUEFOUykge1xuICAgICAgbWQuc3BhbnMgPSB7bWQ6IGNsb3N1cmVzKFNQQU5TKX07XG4gICAgICBjb25zdCBzcGFucyA9IFNQQU5TLnNwbGl0KCcgJyk7XG4gICAgICBmb3IgKGNvbnN0IFtvcGVuZXJdIG9mIG1kLnNwYW5zLm1kKSB7XG4gICAgICAgIGNvbnN0IHN1YnNwYW5zID0gc3BhbnMuZmlsdGVyKHNwYW4gPT4gIXNwYW4uc3RhcnRzV2l0aChvcGVuZXIpKTtcbiAgICAgICAgbWQuc3BhbnNbb3BlbmVyXSA9IGNsb3N1cmVzKHN1YnNwYW5zLmpvaW4oJyAnKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1kLmNsb3N1cmVzKSB7XG4gICAgICBtZC5jbG9zdXJlc1snPCddID0gey4uLmh0bWwuY2xvc3VyZXNbJzwnXX07XG5cbiAgICAgIGNvbnN0IFNZTlRBWCA9IC9eXFx3KyQvO1xuXG4gICAgICBjb25zdCBwcmV2aW91c1RleHRGcm9tID0gKHRva2VuLCBtYXRjaGVyKSA9PiB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBbXTtcbiAgICAgICAgaWYgKG1hdGNoZXIgIT0gbnVsbCkge1xuICAgICAgICAgIGlmIChtYXRjaGVyLnRlc3QpXG4gICAgICAgICAgICBkbyB0b2tlbi50ZXh0ICYmIHRleHQucHVzaCh0b2tlbi50ZXh0KSwgKHRva2VuID0gdG9rZW4ucHJldmlvdXMpO1xuICAgICAgICAgICAgd2hpbGUgKCF0b2tlbi50ZXh0IHx8ICFtYXRjaGVyLnRlc3QodG9rZW4udGV4dCkpO1xuICAgICAgICAgIGVsc2UgaWYgKG1hdGNoZXIuaW5jbHVkZXMpXG4gICAgICAgICAgICBkbyB0b2tlbi50ZXh0ICYmIHRleHQucHVzaCh0b2tlbi50ZXh0KSwgKHRva2VuID0gdG9rZW4ucHJldmlvdXMpO1xuICAgICAgICAgICAgd2hpbGUgKCF0b2tlbi50ZXh0IHx8ICFtYXRjaGVyLmluY2x1ZGVzKHRva2VuLnRleHQpKTtcbiAgICAgICAgICB0ZXh0Lmxlbmd0aCAmJiB0ZXh0LnJldmVyc2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGV4dC5qb2luKCcnKTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGluZGVudGVyID0gKGluZGVudGluZywgdGFicyA9IDIpID0+IHtcbiAgICAgICAgbGV0IHNvdXJjZSA9IGluZGVudGluZztcbiAgICAgICAgY29uc3QgaW5kZW50ID0gbmV3IFJlZ0V4cChyYXdgKD86XFx0fCR7JyAnLnJlcGVhdCh0YWJzKX0pYCwgJ2cnKTtcbiAgICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoL1xcXFw/KD89W1xcKFxcKVxcOlxcP1xcW1xcXV0pL2csICdcXFxcJyk7XG4gICAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKGluZGVudCwgaW5kZW50LnNvdXJjZSk7XG4gICAgICAgIHJldHVybiBuZXcgUmVnRXhwKGBeJHtzb3VyY2V9YCwgJ20nKTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IEVNQkVEREVEID0gdHJ1ZTtcbiAgICAgIGNvbnN0IG9wZW4gPSAocGFyZW50LCBzdGF0ZSwgZ3JvdXBlcikgPT4ge1xuICAgICAgICBjb25zdCB7c291cmNlLCBpbmRleDogc3RhcnR9ID0gc3RhdGU7XG4gICAgICAgIGNvbnN0IGZlbmNlID0gcGFyZW50LnRleHQ7XG4gICAgICAgIGNvbnN0IGZlbmNpbmcgPSBwcmV2aW91c1RleHRGcm9tKHBhcmVudCwgJ1xcbicpO1xuICAgICAgICBjb25zdCBpbmRlbnRpbmcgPSBmZW5jaW5nLnNsaWNlKGZlbmNpbmcuaW5kZXhPZignXFxuJykgKyAxLCAtZmVuY2UubGVuZ3RoKSB8fCAnJztcbiAgICAgICAgbGV0IGVuZCA9IHNvdXJjZS5pbmRleE9mKGBcXG4ke2ZlbmNpbmd9YCwgc3RhcnQpO1xuICAgICAgICBjb25zdCBJTkRFTlQgPSBpbmRlbnRlcihpbmRlbnRpbmcpO1xuICAgICAgICBjb25zdCBDTE9TRVIgPSBuZXcgUmVnRXhwKHJhd2BcXG4ke0lOREVOVC5zb3VyY2Uuc2xpY2UoMSl9JHtmZW5jZX1gLCAnZycpO1xuXG4gICAgICAgIENMT1NFUi5sYXN0SW5kZXggPSBzdGFydDtcbiAgICAgICAgbGV0IGNsb3Nlck1hdGNoID0gQ0xPU0VSLmV4ZWMoc291cmNlKTtcbiAgICAgICAgaWYgKGNsb3Nlck1hdGNoICYmIGNsb3Nlck1hdGNoLmluZGV4ID49IHN0YXJ0KSB7XG4gICAgICAgICAgZW5kID0gY2xvc2VyTWF0Y2guaW5kZXggKyAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IEZFTkNFID0gbmV3IFJlZ0V4cChyYXdgXFxuP1tcXD5cXHxcXHNdKiR7ZmVuY2V9YCwgJ2cnKTtcbiAgICAgICAgICBGRU5DRS5sYXN0SW5kZXggPSBzdGFydDtcbiAgICAgICAgICBjb25zdCBmZW5jZU1hdGNoID0gRkVOQ0UuZXhlYyhzb3VyY2UpO1xuICAgICAgICAgIGlmIChmZW5jZU1hdGNoICYmIGZlbmNlTWF0Y2guaW5kZXggPj0gc3RhcnQpIHtcbiAgICAgICAgICAgIGVuZCA9IGZlbmNlTWF0Y2guaW5kZXggKyAxO1xuICAgICAgICAgIH0gZWxzZSByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZW5kID4gc3RhcnQpIHtcbiAgICAgICAgICBsZXQgb2Zmc2V0ID0gc3RhcnQ7XG4gICAgICAgICAgbGV0IHRleHQ7XG5cbiAgICAgICAgICBjb25zdCBib2R5ID0gc291cmNlLnNsaWNlKHN0YXJ0LCBlbmQpIHx8ICcnO1xuICAgICAgICAgIGNvbnN0IHRva2VucyA9IFtdO1xuICAgICAgICAgIHRva2Vucy5lbmQgPSBlbmQ7XG4gICAgICAgICAgaWYgKCFFTUJFRERFRCkge1xuICAgICAgICAgICAgdGV4dCA9IGJvZHk7XG4gICAgICAgICAgICB0b2tlbnMucHVzaCh7dGV4dCwgdHlwZTogJ2NvZGUnLCBvZmZzZXQsIHBhcmVudH0pO1xuICAgICAgICAgICAgb2Zmc2V0ICs9IGJvZHkubGVuZ3RoO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBbaGVhZCwgLi4ubGluZXNdID0gYm9keS5zcGxpdCgvKFxcbikvZyk7XG4gICAgICAgICAgICBpZiAoaGVhZCkge1xuICAgICAgICAgICAgICAvLyBjb25zdCBbLCBzeW50YXgsIGF0dHJpYnV0ZXNdID0gL14oXFx3LipcXGIpP1xccyooLiopXFxzKiQvLmV4ZWMoaGVhZCk7XG4gICAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0OiBoZWFkLCB0eXBlOiAnY29tbWVudCcsIG9mZnNldCwgcGFyZW50fSksIChvZmZzZXQgKz0gaGVhZC5sZW5ndGgpO1xuICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7aGVhZCwgbGluZXMsIGluZGVudGluZywgSU5ERU5UfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgICAgICAgICAgY29uc3QgW2luZGVudF0gPSBJTkRFTlQuZXhlYyhsaW5lKSB8fCAnJztcbiAgICAgICAgICAgICAgY29uc3QgaW5zZXQgPSAoaW5kZW50ICYmIGluZGVudC5sZW5ndGgpIHx8IDA7XG4gICAgICAgICAgICAgIGlmIChpbnNldCkge1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGV4dCBvZiBpbmRlbnQuc3BsaXQoLyhcXHMrKS9nKSkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9ICh0ZXh0LnRyaW0oKSAmJiAnc2VxdWVuY2UnKSB8fCAnd2hpdGVzcGFjZSc7XG4gICAgICAgICAgICAgICAgICB0b2tlbnMucHVzaCh7dGV4dCwgdHlwZSwgb2Zmc2V0LCBwYXJlbnR9KTtcbiAgICAgICAgICAgICAgICAgIG9mZnNldCArPSB0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGV4dCA9IGxpbmUuc2xpY2UoaW5zZXQpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRleHQgPSBsaW5lO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0LCB0eXBlOiAnY29kZScsIG9mZnNldCwgcGFyZW50fSksIChvZmZzZXQgKz0gdGV4dC5sZW5ndGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7ZmVuY2luZywgYm9keSwgc3RhcnQsIGVuZCwgb2Zmc2V0LCBsaW5lcywgdG9rZW5zfSk7XG4gICAgICAgICAgaWYgKHRva2Vucy5sZW5ndGgpIHJldHVybiB0b2tlbnM7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIG1kLmNsb3N1cmVzWydgYGAnXS5vcGVuID0gbWQuY2xvc3VyZXNbJ35+fiddLm9wZW4gPSBvcGVuO1xuXG4gICAgICBpZiAobWQuY2xvc3VyZXNbJ2BgYCddICYmICFtZC5jbG9zdXJlc1snYGBgJ10ub3Blbikge1xuICAgICAgICBtZC5jbG9zdXJlc1snYGBgJ10ucXVvdGVzID0gaHRtbC5jbG9zdXJlc1snPCddLnF1b3RlcztcbiAgICAgICAgbWQuY2xvc3VyZXNbJ2BgYCddLm1hdGNoZXIgPSAvKFxccypcXG4pfChgYGAoPz1gYGBcXHN8YGBgJCl8Xig/OltcXHM+fF0qXFxzKT9cXHMqKXwuKiQvZ207XG4gICAgICB9XG5cbiAgICAgIGlmIChtZC5jbG9zdXJlc1snfn5+J10gJiYgIW1kLmNsb3N1cmVzWyd+fn4nXS5vcGVuKSB7XG4gICAgICAgIG1kLmNsb3N1cmVzWyd+fn4nXS5xdW90ZXMgPSBodG1sLmNsb3N1cmVzWyc8J10ucXVvdGVzO1xuICAgICAgICBtZC5jbG9zdXJlc1snfn5+J10ubWF0Y2hlciA9IC8oXFxzKlxcbil8KH5+fig/PX5+flxcc3x+fn4kKXxeKD86W1xccz58XSpcXHMpP1xccyopfC4qJC9nbTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBjb25zb2xlLmxvZyhtZCk7XG4gIH1cblxuICBFQ01BU2NyaXB0OiB7XG4gICAgY29uc3QgUkVHRVhQUyA9IC9cXC8oPz1bXlxcKlxcL1xcbl1bXlxcbl0qXFwvKSg/OlteXFxcXFxcL1xcblxcdFxcW10rfFxcXFxcXFN8XFxbKD86XFxcXFxcU3xbXlxcXFxcXG5cXHRcXF1dKykrP1xcXSkrP1xcL1thLXpdKi9nO1xuICAgIGNvbnN0IENPTU1FTlRTID0gL1xcL1xcL3xcXC9cXCp8XFwqXFwvfFxcL3xeXFwjXFwhLipcXG4vZztcbiAgICBjb25zdCBRVU9URVMgPSAvYHxcInwnL2c7XG4gICAgY29uc3QgQ0xPU1VSRVMgPSAvXFx7fFxcfXxcXCh8XFwpfFxcW3xcXF0vZztcblxuICAgIGNvbnN0IGVzID0gKHN5bnRheGVzLmVzID0ge1xuICAgICAgLi4uKG1vZGVzLmphdmFzY3JpcHQgPSBtb2Rlcy5lcyA9IG1vZGVzLmpzID0gbW9kZXMuZWNtYXNjcmlwdCA9IHtzeW50YXg6ICdlcyd9KSxcbiAgICAgIGNvbW1lbnRzOiBjbG9zdXJlcygnLy/igKZcXG4gLyrigKYqLycpLFxuICAgICAgcXVvdGVzOiBzeW1ib2xzKGAnIFwiIFxcYGApLFxuICAgICAgY2xvc3VyZXM6IGNsb3N1cmVzKCd74oCmfSAo4oCmKSBb4oCmXScpLFxuICAgICAgc3BhbnM6IHsnYCc6IGNsb3N1cmVzKCcke+KApn0nKX0sXG4gICAgICBrZXl3b3Jkczogc3ltYm9scyhcbiAgICAgICAgLy8gYWJzdHJhY3QgZW51bSBpbnRlcmZhY2UgcGFja2FnZSAgbmFtZXNwYWNlIGRlY2xhcmUgdHlwZSBtb2R1bGVcbiAgICAgICAgJ2FyZ3VtZW50cyBhcyBhc3luYyBhd2FpdCBicmVhayBjYXNlIGNhdGNoIGNsYXNzIGNvbnN0IGNvbnRpbnVlIGRlYnVnZ2VyIGRlZmF1bHQgZGVsZXRlIGRvIGVsc2UgZXhwb3J0IGV4dGVuZHMgZmluYWxseSBmb3IgZnJvbSBmdW5jdGlvbiBnZXQgaWYgaW1wb3J0IGluIGluc3RhbmNlb2YgbGV0IG5ldyBvZiByZXR1cm4gc2V0IHN1cGVyIHN3aXRjaCB0aGlzIHRocm93IHRyeSB0eXBlb2YgdmFyIHZvaWQgd2hpbGUgd2l0aCB5aWVsZCcsXG4gICAgICApLFxuICAgICAgYXNzaWduZXJzOiBzeW1ib2xzKCc9ICs9IC09ICo9IC89ICoqPSAlPSB8PSBePSAmPSA8PD0gPj49ID4+Pj0nKSxcbiAgICAgIGNvbWJpbmF0b3JzOiBzeW1ib2xzKCc+PSA8PSA9PSA9PT0gIT0gIT09IHx8ICYmICEgJiB8ID4gPCA9PiAlICsgLSAqKiAqIC8gPj4gPDwgPj4+ID8gOicpLFxuICAgICAgbm9uYnJlYWtlcnM6IHN5bWJvbHMoJy4nKSxcbiAgICAgIG9wZXJhdG9yczogc3ltYm9scygnKysgLS0gISEgXiB+ICEgLi4uJyksXG4gICAgICBicmVha2Vyczogc3ltYm9scygnLCA7JyksXG4gICAgICBwYXR0ZXJuczogey4uLnBhdHRlcm5zfSxcbiAgICAgIG1hdGNoZXI6IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke2FsbChcbiAgICAgICAgUkVHRVhQUyxcbiAgICAgICAgcmF3YFxcLz1gLFxuICAgICAgICBDT01NRU5UUyxcbiAgICAgICAgUVVPVEVTLFxuICAgICAgICBDTE9TVVJFUyxcbiAgICAgICAgLyx8O3xcXC5cXC5cXC58XFwufFxcOnxcXD98PT4vLFxuICAgICAgICAvIT09fD09PXw9PXw9LyxcbiAgICAgICAgLi4uc3ltYm9scyhyYXdgXFwrIFxcLSBcXCogJiBcXHxgKS5tYXAocyA9PiBgJHtzfSR7c318JHtzfT18JHtzfWApLFxuICAgICAgICAuLi5zeW1ib2xzKHJhd2AhIFxcKlxcKiAlIDw8ID4+ID4+PiA8ID4gXFxeIH5gKS5tYXAocyA9PiBgJHtzfT18JHtzfWApLFxuICAgICAgKX0pYCxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98YHxcInwnfFxcJFxceykvZyxcbiAgICAgICAgLy8gcXVvdGU6IC8oXFxuKXwoYHxcInwnfFxcJFxceyl8KFxcXFwuKS9nLFxuICAgICAgICAvLyBxdW90ZTogLyhcXG4pfChgfFwifCd8XFwkXFx7KXwoXFxcXC4pL2csXG4gICAgICAgIC8vIFwiJ1wiOiAvKFxcbil8KCcpfChcXFxcLikvZyxcbiAgICAgICAgLy8gJ1wiJzogLyhcXG4pfChcIil8KFxcXFwuKS9nLFxuICAgICAgICAvLyAnYCc6IC8oXFxuKXwoYHxcXCRcXHspfChcXFxcLikvZyxcbiAgICAgICAgY29tbWVudDogbWF0Y2hlcnMuY29tbWVudHMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgRUNNQVNjcmlwdEV4dGVuc2lvbnM6IHtcbiAgICAgIC8vIGNvbnN0IEhBU0hCQU5HID0gL15cXCNcXCEuKlxcbi9nOyAvLyBbXl0gPT09ICg/Oi4qXFxuKVxuICAgICAgLy8gVE9ETzogVW5kbyAkIG1hdGNoaW5nIG9uY2UgZml4ZWRcbiAgICAgIGNvbnN0IFFVT1RFUyA9IC9gfFwiKD86W15cXFxcXCJdK3xcXFxcLikqKD86XCJ8JCl8Jyg/OlteXFxcXCddK3xcXFxcLikqKD86J3wkKS9nO1xuICAgICAgY29uc3QgQ09NTUVOVFMgPSAvXFwvXFwvLiooPzpcXG58JCl8XFwvXFwqW15dKj8oPzpcXCpcXC98JCl8XlxcI1xcIS4qXFxuL2c7IC8vIFteXSA9PT0gKD86LipcXG4pXG4gICAgICBjb25zdCBTVEFURU1FTlRTID0gYWxsKFFVT1RFUywgQ0xPU1VSRVMsIFJFR0VYUFMsIENPTU1FTlRTKTtcbiAgICAgIGNvbnN0IEJMT0NLTEVWRUwgPSBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgVE9QTEVWRUwgPSBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgQ0xPU1VSRSA9IHNlcXVlbmNlYChcXG4rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgRVNNID0gc2VxdWVuY2VgJHtUT1BMRVZFTH18XFxiZXhwb3J0XFxifFxcYmltcG9ydFxcYmA7XG4gICAgICBjb25zdCBDSlMgPSBzZXF1ZW5jZWAke0JMT0NLTEVWRUx9fFxcYmV4cG9ydHNcXGJ8XFxibW9kdWxlLmV4cG9ydHNcXGJ8XFxicmVxdWlyZVxcYmA7XG4gICAgICBjb25zdCBFU1ggPSBzZXF1ZW5jZWAke0JMT0NLTEVWRUx9fFxcYmV4cG9ydHNcXGJ8XFxiaW1wb3J0XFxifFxcYm1vZHVsZS5leHBvcnRzXFxifFxcYnJlcXVpcmVcXGJgO1xuXG4gICAgICBjb25zdCB7cXVvdGVzLCBjbG9zdXJlcywgc3BhbnN9ID0gZXM7XG4gICAgICBjb25zdCBzeW50YXggPSB7cXVvdGVzLCBjbG9zdXJlcywgc3BhbnN9O1xuICAgICAgY29uc3QgbWF0Y2hlcnMgPSB7fTtcbiAgICAgICh7cXVvdGU6IG1hdGNoZXJzLnF1b3RlfSA9IGVzLm1hdGNoZXJzKTtcblxuICAgICAgY29uc3QgZXNtID0gKHN5bnRheGVzLmVzbSA9IHtcbiAgICAgICAgLi4uKG1vZGVzLmVzbSA9IHtzeW50YXg6ICdlc20nfSksXG4gICAgICAgIGtleXdvcmRzOiBzeW1ib2xzKCdpbXBvcnQgZXhwb3J0IGRlZmF1bHQnKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBFU00sXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IENMT1NVUkV9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBjanMgPSAoc3ludGF4ZXMuY2pzID0ge1xuICAgICAgICAuLi4obW9kZXMuY2pzID0ge3N5bnRheDogJ2Nqcyd9KSxcbiAgICAgICAga2V5d29yZHM6IHN5bWJvbHMoJ2ltcG9ydCBtb2R1bGUgZXhwb3J0cyByZXF1aXJlJyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogQ0pTLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBDSlN9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlc3ggPSAoc3ludGF4ZXMuZXN4ID0ge1xuICAgICAgICAuLi4obW9kZXMuZXN4ID0ge3N5bnRheDogJ2VzeCd9KSxcbiAgICAgICAga2V5d29yZHM6IHN5bWJvbHMuZnJvbShlc20ua2V5d29yZHMsIGNqcy5rZXl3b3JkcyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogRVNYLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBFU1h9LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbi8vLyBCb290c3RyYXBcbmV4cG9ydCBjb25zdCByZWFkeSA9IChhc3luYyAoKSA9PiB7XG4gIGF3YWl0IGVudGl0aWVzLnJlYWR5O1xuICBzeW50YXhlcy5lcy5wYXR0ZXJucy5tYXliZUlkZW50aWZpZXIgPSBpZGVudGlmaWVyKFxuICAgIGVudGl0aWVzLmVzLklkZW50aWZpZXJTdGFydCxcbiAgICBlbnRpdGllcy5lcy5JZGVudGlmaWVyUGFydCxcbiAgKTtcbiAgLy8gY29uc29sZS5sb2coe21heWJlSWRlbnRpZmllcjogYCR7c3ludGF4ZXMuZXMucGF0dGVybnMubWF5YmVJZGVudGlmaWVyfWB9KTtcbn0pKCk7XG5cbi8vIGNvbnN0IFFVT1RFUyA9IC9gfFwiXFxcIlwifFwiXCJ8XCIoPzpbXlxcXCJdK3xcXFxcLikqKD86XCJ8JCl8J1xcJyd8Jyd8KD86W15cXCddK3xcXFxcLikqKD86J3wkKS9nO1xuLy8gY29uc3QgUVVPVEVTID0gL2B8XCJcInxcIig/Oi4qXFxcXC58Lio/KSo/KD86XCJ8JCl8Jyd8Jyg/OlteXFxcXF0qfFxcXFwuKSooPzonfCQpL2c7XG4vLyBjb25zdCBRVU9URVMgPSAvYHxcIig/OlxcXFxcInxbXlxcXFxcIl0qKSooPzpcInwkKXwnKD86XFxcXC4/fFteXFxcXCddKykqKD86J3wkKXxcInwnL2c7XG4vLyBjb25zdCBRVU9URVMgPSAvYHxcIig/OlxcXFwuP3xbXlxcXFxdKj8pKj8oPzpcInwkKXwnKD86XFxcXC4/fFteXFxcXCddKj8pKj8oPzonfCQpL2c7XG4iLCJjb25zdCB7YXNzaWduLCBkZWZpbmVQcm9wZXJ0eX0gPSBPYmplY3Q7XG5cbmV4cG9ydCBjb25zdCBkb2N1bWVudCA9IHZvaWQgbnVsbDtcblxuZXhwb3J0IGNsYXNzIE5vZGUge1xuICBnZXQgY2hpbGRyZW4oKSB7XG4gICAgcmV0dXJuIGRlZmluZVByb3BlcnR5KHRoaXMsICdjaGlsZHJlbicsIHt2YWx1ZTogbmV3IFNldCgpfSkuY2hpbGRyZW47XG4gIH1cbiAgZ2V0IGNoaWxkRWxlbWVudENvdW50KCkge1xuICAgIHJldHVybiAodGhpcy5oYXNPd25Qcm9wZXJ0eSgnY2hpbGRyZW4nKSAmJiB0aGlzLmNoaWxkcmVuLnNpemUpIHx8IDA7XG4gIH1cbiAgZ2V0IHRleHRDb250ZW50KCkge1xuICAgIHJldHVybiAoXG4gICAgICAodGhpcy5oYXNPd25Qcm9wZXJ0eSgnY2hpbGRyZW4nKSAmJiB0aGlzLmNoaWxkcmVuLnNpemUgJiYgWy4uLnRoaXMuY2hpbGRyZW5dLmpvaW4oJycpKSB8fCAnJ1xuICAgICk7XG4gIH1cbiAgc2V0IHRleHRDb250ZW50KHRleHQpIHtcbiAgICB0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSAmJiB0aGlzLmNoaWxkcmVuLmNsZWFyKCk7XG4gICAgdGV4dCAmJiB0aGlzLmNoaWxkcmVuLmFkZChuZXcgU3RyaW5nKHRleHQpKTtcbiAgfVxuICBhcHBlbmRDaGlsZChlbGVtZW50KSB7XG4gICAgcmV0dXJuIGVsZW1lbnQgJiYgdGhpcy5jaGlsZHJlbi5hZGQoZWxlbWVudCksIGVsZW1lbnQ7XG4gIH1cbiAgYXBwZW5kKC4uLmVsZW1lbnRzKSB7XG4gICAgaWYgKGVsZW1lbnRzLmxlbmd0aCkgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBlbGVtZW50ICYmIHRoaXMuY2hpbGRyZW4uYWRkKGVsZW1lbnQpO1xuICB9XG4gIHJlbW92ZUNoaWxkKGVsZW1lbnQpIHtcbiAgICBlbGVtZW50ICYmXG4gICAgICB0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmXG4gICAgICB0aGlzLmNoaWxkcmVuLnNpemUgJiZcbiAgICAgIHRoaXMuY2hpbGRyZW4uZGVsZXRlKGVsZW1lbnQpO1xuICAgIHJldHVybiBlbGVtZW50O1xuICB9XG4gIHJlbW92ZSguLi5lbGVtZW50cykge1xuICAgIGlmIChlbGVtZW50cy5sZW5ndGggJiYgdGhpcy5oYXNPd25Qcm9wZXJ0eSgnY2hpbGRyZW4nKSAmJiB0aGlzLmNoaWxkcmVuLnNpemUpXG4gICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGVsZW1lbnQgJiYgdGhpcy5jaGlsZHJlbi5kZWxldGUoZWxlbWVudCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEVsZW1lbnQgZXh0ZW5kcyBOb2RlIHtcbiAgZ2V0IGlubmVySFRNTCgpIHtcbiAgICByZXR1cm4gdGhpcy50ZXh0Q29udGVudDtcbiAgfVxuICBzZXQgaW5uZXJIVE1MKHRleHQpIHtcbiAgICB0aGlzLnRleHRDb250ZW50ID0gdGV4dDtcbiAgfVxuICBnZXQgb3V0ZXJIVE1MKCkge1xuICAgIGNvbnN0IHtjbGFzc05hbWUsIHRhZywgaW5uZXJIVE1MfSA9IHRoaXM7XG4gICAgcmV0dXJuIGA8JHt0YWd9JHsoY2xhc3NOYW1lICYmIGAgY2xhc3M9XCIke2NsYXNzTmFtZX1cImApIHx8ICcnfT4ke2lubmVySFRNTCB8fCAnJ308LyR7dGFnfT5gO1xuICB9XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm91dGVySFRNTDtcbiAgfVxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuIHRoaXMudG9TdHJpbmcoKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRG9jdW1lbnRGcmFnbWVudCBleHRlbmRzIE5vZGUge1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy50ZXh0Q29udGVudDtcbiAgfVxuICB0b0pTT04oKSB7XG4gICAgcmV0dXJuICh0aGlzLmNoaWxkRWxlbWVudENvdW50ICYmIFsuLi50aGlzLmNoaWxkcmVuXSkgfHwgW107XG4gIH1cbiAgW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgcmV0dXJuICgodGhpcy5jaGlsZEVsZW1lbnRDb3VudCAmJiB0aGlzLmNoaWxkcmVuKSB8fCAnJylbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBUZXh0IGV4dGVuZHMgU3RyaW5nIHtcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIGVuY29kZUVudGl0aWVzKHN1cGVyLnRvU3RyaW5nKCkpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVFbGVtZW50ID0gKHRhZywgcHJvcGVydGllcywgLi4uY2hpbGRyZW4pID0+IHtcbiAgY29uc3QgZWxlbWVudCA9IGFzc2lnbihuZXcgRWxlbWVudCgpLCB7XG4gICAgdGFnLFxuICAgIGNsYXNzTmFtZTogKHByb3BlcnRpZXMgJiYgcHJvcGVydGllcy5jbGFzc05hbWUpIHx8ICcnLFxuICAgIHByb3BlcnRpZXMsXG4gIH0pO1xuICBjaGlsZHJlbi5sZW5ndGggJiYgZGVmaW5lUHJvcGVydHkoZWxlbWVudCwgJ2NoaWxkcmVuJywge3ZhbHVlOiBuZXcgU2V0KGNoaWxkcmVuKX0pO1xuICByZXR1cm4gZWxlbWVudDtcbn07XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVUZXh0ID0gKGNvbnRlbnQgPSAnJykgPT4gbmV3IFRleHQoY29udGVudCk7XG5leHBvcnQgY29uc3QgZW5jb2RlRW50aXR5ID0gZW50aXR5ID0+IGAmIyR7ZW50aXR5LmNoYXJDb2RlQXQoMCl9O2A7XG5leHBvcnQgY29uc3QgZW5jb2RlRW50aXRpZXMgPSBzdHJpbmcgPT4gc3RyaW5nLnJlcGxhY2UoL1tcXHUwMEEwLVxcdTk5OTk8PlxcJl0vZ2ltLCBlbmNvZGVFbnRpdHkpO1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUZyYWdtZW50ID0gKCkgPT4gbmV3IERvY3VtZW50RnJhZ21lbnQoKTtcbiIsImV4cG9ydCBjb25zdCB7ZG9jdW1lbnQsIEVsZW1lbnQsIE5vZGUsIFRleHQsIERvY3VtZW50RnJhZ21lbnR9ID1cbiAgJ29iamVjdCcgPT09IHR5cGVvZiBzZWxmICYmIChzZWxmIHx8IDApLndpbmRvdyA9PT0gc2VsZiAmJiBzZWxmO1xuXG5leHBvcnQgY29uc3Qge2NyZWF0ZUVsZW1lbnQsIGNyZWF0ZVRleHQsIGNyZWF0ZUZyYWdtZW50fSA9IHtcbiAgY3JlYXRlRWxlbWVudDogKHRhZywgcHJvcGVydGllcywgLi4uY2hpbGRyZW4pID0+IHtcbiAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAgIHByb3BlcnRpZXMgJiYgT2JqZWN0LmFzc2lnbihlbGVtZW50LCBwcm9wZXJ0aWVzKTtcbiAgICBpZiAoIWNoaWxkcmVuLmxlbmd0aCkgcmV0dXJuIGVsZW1lbnQ7XG4gICAgaWYgKGVsZW1lbnQuYXBwZW5kKSB7XG4gICAgICB3aGlsZSAoY2hpbGRyZW4ubGVuZ3RoID4gNTAwKSBlbGVtZW50LmFwcGVuZCguLi5jaGlsZHJlbi5zcGxpY2UoMCwgNTAwKSk7XG4gICAgICBjaGlsZHJlbi5sZW5ndGggJiYgZWxlbWVudC5hcHBlbmQoLi4uY2hpbGRyZW4pO1xuICAgIH0gZWxzZSBpZiAoZWxlbWVudC5hcHBlbmRDaGlsZCkge1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBjaGlsZHJlbikgZWxlbWVudC5hcHBlbmRDaGlsZChjaGlsZCk7XG4gICAgfVxuICAgIHJldHVybiBlbGVtZW50O1xuICB9LFxuXG4gIGNyZWF0ZVRleHQ6IChjb250ZW50ID0gJycpID0+IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNvbnRlbnQpLFxuXG4gIGNyZWF0ZUZyYWdtZW50OiAoKSA9PiBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksXG59O1xuIiwiaW1wb3J0ICogYXMgcHNldWRvIGZyb20gJy4vbGliL3BzZXVkby5qcyc7XG5pbXBvcnQgKiBhcyBkb20gZnJvbSAnLi9saWIvbmF0aXZlLmpzJztcblxuZXhwb3J0IGNvbnN0IG5hdGl2ZSA9IGRvbS5kb2N1bWVudCAmJiBkb207XG5leHBvcnQgY29uc3Qge2NyZWF0ZUVsZW1lbnQsIGNyZWF0ZVRleHQsIGNyZWF0ZUZyYWdtZW50fSA9IG5hdGl2ZSB8fCBwc2V1ZG87XG5leHBvcnQge3BzZXVkb307XG4iLCJpbXBvcnQgKiBhcyBkb20gZnJvbSAnLi4vcGFja2FnZXMvcHNldWRvbS9pbmRleC5qcyc7XG5cbi8vLyBPUFRJT05TXG4vKiogVGhlIHRhZyBuYW1lIG9mIHRoZSBlbGVtZW50IHRvIHVzZSBmb3IgcmVuZGVyaW5nIGEgdG9rZW4uICovXG5jb25zdCBTUEFOID0gJ3NwYW4nO1xuXG4vKiogVGhlIGNsYXNzIG5hbWUgb2YgdGhlIGVsZW1lbnQgdG8gdXNlIGZvciByZW5kZXJpbmcgYSB0b2tlbi4gKi9cbmNvbnN0IENMQVNTID0gJ21hcmt1cCc7XG5cbi8qKlxuICogSW50ZW5kZWQgdG8gcHJldmVudCB1bnByZWRpY3RhYmxlIERPTSByZWxhdGVkIG92ZXJoZWFkIGJ5IHJlbmRlcmluZyBlbGVtZW50c1xuICogdXNpbmcgbGlnaHR3ZWlnaHQgcHJveHkgb2JqZWN0cyB0aGF0IGNhbiBiZSBzZXJpYWxpemVkIGludG8gSFRNTCB0ZXh0LlxuICovXG5jb25zdCBIVE1MX01PREUgPSB0cnVlO1xuLy8vIElOVEVSRkFDRVxuXG5leHBvcnQgY29uc3QgcmVuZGVyZXJzID0ge307XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVuZGVyZXIodG9rZW5zLCB0b2tlblJlbmRlcmVycyA9IHJlbmRlcmVycykge1xuICBmb3IgYXdhaXQgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgIGNvbnN0IHt0eXBlID0gJ3RleHQnLCB0ZXh0LCBwdW5jdHVhdG9yLCBicmVha3N9ID0gdG9rZW47XG4gICAgY29uc3QgdG9rZW5SZW5kZXJlciA9XG4gICAgICAocHVuY3R1YXRvciAmJiAodG9rZW5SZW5kZXJlcnNbcHVuY3R1YXRvcl0gfHwgdG9rZW5SZW5kZXJlcnMub3BlcmF0b3IpKSB8fFxuICAgICAgKHR5cGUgJiYgdG9rZW5SZW5kZXJlcnNbdHlwZV0pIHx8XG4gICAgICAodGV4dCAmJiB0b2tlblJlbmRlcmVycy50ZXh0KTtcbiAgICBjb25zdCBlbGVtZW50ID0gdG9rZW5SZW5kZXJlciAmJiB0b2tlblJlbmRlcmVyKHRleHQsIHRva2VuKTtcbiAgICBlbGVtZW50ICYmICh5aWVsZCBlbGVtZW50KTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgaW5zdGFsbCA9IChkZWZhdWx0cywgbmV3UmVuZGVyZXJzID0gZGVmYXVsdHMucmVuZGVyZXJzIHx8IHt9KSA9PiB7XG4gIE9iamVjdC5hc3NpZ24obmV3UmVuZGVyZXJzLCByZW5kZXJlcnMpO1xuICBkZWZhdWx0cy5yZW5kZXJlcnMgPT09IG5ld1JlbmRlcmVycyB8fCAoZGVmYXVsdHMucmVuZGVyZXJzID0gbmV3UmVuZGVyZXJzKTtcbiAgZGVmYXVsdHMucmVuZGVyZXIgPSByZW5kZXJlcjtcbn07XG5cbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWQgPSAhIWRvbS5uYXRpdmU7XG5leHBvcnQgY29uc3QgbmF0aXZlID0gIUhUTUxfTU9ERSAmJiBzdXBwb3J0ZWQ7XG5jb25zdCBpbXBsZW1lbnRhdGlvbiA9IG5hdGl2ZSA/IGRvbS5uYXRpdmUgOiBkb20ucHNldWRvO1xuZXhwb3J0IGNvbnN0IHtjcmVhdGVFbGVtZW50LCBjcmVhdGVUZXh0LCBjcmVhdGVGcmFnbWVudH0gPSBpbXBsZW1lbnRhdGlvbjtcblxuLy8vIElNUExFTUVOVEFUSU9OXG5jb25zdCBmYWN0b3J5ID0gKHRhZywgcHJvcGVydGllcykgPT4gKGNvbnRlbnQsIHRva2VuKSA9PiB7XG4gIGlmICghY29udGVudCkgcmV0dXJuO1xuICB0eXBlb2YgY29udGVudCAhPT0gJ3N0cmluZycgfHwgKGNvbnRlbnQgPSBjcmVhdGVUZXh0KGNvbnRlbnQpKTtcbiAgY29uc3QgZWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQodGFnLCBwcm9wZXJ0aWVzLCBjb250ZW50KTtcblxuICBlbGVtZW50ICYmIHRva2VuICYmICh0b2tlbi5oaW50ICYmIChlbGVtZW50LmNsYXNzTmFtZSArPSBgICR7dG9rZW4uaGludH1gKSk7XG4gIC8vIHRva2VuLmJyZWFrcyAmJiAoZWxlbWVudC5icmVha3MgPSB0b2tlbi5icmVha3MpLFxuICAvLyB0b2tlbiAmJlxuICAvLyAodG9rZW4uZm9ybSAmJiAoZWxlbWVudC5jbGFzc05hbWUgKz0gYCBtYXliZS0ke3Rva2VuLmZvcm19YCksXG4gIC8vIHRva2VuLmhpbnQgJiYgKGVsZW1lbnQuY2xhc3NOYW1lICs9IGAgJHt0b2tlbi5oaW50fWApLFxuICAvLyBlbGVtZW50ICYmIChlbGVtZW50LnRva2VuID0gdG9rZW4pKTtcblxuICByZXR1cm4gZWxlbWVudDtcbn07XG5cbk9iamVjdC5hc3NpZ24ocmVuZGVyZXJzLCB7XG4gIC8vIHdoaXRlc3BhY2U6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHdoaXRlc3BhY2VgfSksXG4gIHdoaXRlc3BhY2U6IGNyZWF0ZVRleHQsXG4gIHRleHQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogQ0xBU1N9KSxcblxuICB2YXJpYWJsZTogZmFjdG9yeSgndmFyJywge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHZhcmlhYmxlYH0pLFxuICBrZXl3b3JkOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBrZXl3b3JkYH0pLFxuICBpZGVudGlmaWVyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBpZGVudGlmaWVyYH0pLFxuICBvcGVyYXRvcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvcmB9KSxcbiAgYXNzaWduZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igb3BlcmF0b3IgYXNzaWduZXJgfSksXG4gIGNvbWJpbmF0b3I6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igb3BlcmF0b3IgY29tYmluYXRvcmB9KSxcbiAgcHVuY3R1YXRpb246IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgcHVuY3R1YXRpb25gfSksXG4gIHF1b3RlOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIHF1b3RlYH0pLFxuICBicmVha2VyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIGJyZWFrZXJgfSksXG4gIG9wZW5lcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVuZXJgfSksXG4gIGNsb3NlcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBjbG9zZXJgfSksXG4gIHNwYW46IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igc3BhbmB9KSxcbiAgc2VxdWVuY2U6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHNlcXVlbmNlYH0pLFxuICBsaXRlcmFsOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBsaXRlcmFsYH0pLFxuICBpbmRlbnQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHNlcXVlbmNlIGluZGVudGB9KSxcbiAgY29tbWVudDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gY29tbWVudGB9KSxcbiAgY29kZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU31gfSksXG59KTtcbiIsImV4cG9ydCBjb25zdCByYXcgPSBTdHJpbmcucmF3O1xuXG4vKiogQ3JlYXRlIGEgc2VxdWVuY2UgbWF0Y2ggZXhwcmVzc2lvbiBmcm9tIHBhdHRlcm5zLiAqL1xuZXhwb3J0IGNvbnN0IHNlcXVlbmNlID0gKC4uLnBhdHRlcm5zKSA9PlxuICBuZXcgUmVnRXhwKFJlZmxlY3QuYXBwbHkocmF3LCBudWxsLCBwYXR0ZXJucy5tYXAocCA9PiAocCAmJiBwLnNvdXJjZSkgfHwgcCB8fCAnJykpLCAnZycpO1xuXG4vKiogQ3JlYXRlIGEgbWF5YmVJZGVudGlmaWVyIHRlc3QgKGllIFs8Zmlyc3Q+XVs8b3RoZXI+XSopIGV4cHJlc3Npb24uICovXG5leHBvcnQgY29uc3QgaWRlbnRpZmllciA9IChmaXJzdCwgb3RoZXIsIGZsYWdzID0gJ3UnLCBib3VuZGFyeSA9IC95Zy8udGVzdChmbGFncykgJiYgJ1xcXFxiJykgPT5cbiAgbmV3IFJlZ0V4cChgJHtib3VuZGFyeSB8fCAnXid9WyR7Zmlyc3R9XVske290aGVyfV0qJHtib3VuZGFyeSB8fCAnJCd9YCwgZmxhZ3MpO1xuXG4vKiogQ3JlYXRlIGEgc2VxdWVuY2UgcGF0dGVybiBmcm9tIHBhdHRlcm5zLiAqL1xuZXhwb3J0IGNvbnN0IGFsbCA9ICguLi5wYXR0ZXJucykgPT4gcGF0dGVybnMubWFwKHAgPT4gKHAgJiYgcC5leGVjID8gcC5zb3VyY2UgOiBwKSkuam9pbignfCcpO1xuXG5leHBvcnQgY29uc3QgcGF0dGVybnMgPSB7XG4gIC8qKiBCYXNpYyBsYXRpbiBLZXl3b3JkIGxpa2Ugc3ltYm9sIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuICAvLyBtYXliZUtleXdvcmQ6IC9eW2Etel0oXFx3KikkL2ksIC8vIFRPRE86IENvbnNpZGVyIGNoYW5naW5nIHRvIC9eW2Etel0rJC9pXG59O1xuXG4vKiogRW50aXRpZXMgdXNlZCB0byBjb25zdHJ1Y3QgcGF0dGVybnMuICovXG5leHBvcnQgY29uc3QgZW50aXRpZXMgPSB7XG4gIGVzOiB7XG4gICAgSWRlbnRpZmllclN0YXJ0OiByYXdgXyRcXHB7SURfU3RhcnR9YCxcbiAgICBJZGVudGlmaWVyUGFydDogcmF3YF8kXFx1MjAwY1xcdTIwMGRcXHB7SURfQ29udGludWV9YCxcbiAgfSxcbn07XG5cbi8qKiBJbnRlcm9wZXJhYmlsaXR5IChmb3Igc29tZSBicm93c2VycykgKi9cbihSYW5nZXMgPT4ge1xuICBjb25zdCB0cmFuc2Zvcm1zID0gW107XG5cbiAgaWYgKCFzdXBwb3J0cyhyYXdgXFxwe0lEX1N0YXJ0fWAsICd1JykpIHtcbiAgICBjb25zdCBVbmljb2RlUHJvcGVydHlFc2NhcGVzID0gL1xcXFxweyAqKFxcdyspICp9L2c7XG4gICAgVW5pY29kZVByb3BlcnR5RXNjYXBlcy5yZXBsYWNlID0gKG0sIHByb3BlcnR5S2V5KSA9PiB7XG4gICAgICBpZiAocHJvcGVydHlLZXkgaW4gUmFuZ2VzKSByZXR1cm4gUmFuZ2VzW3Byb3BlcnR5S2V5XS50b1N0cmluZygpO1xuICAgICAgdGhyb3cgUmFuZ2VFcnJvcihgQ2Fubm90IHJld3JpdGUgdW5pY29kZSBwcm9wZXJ0eSBcIiR7cHJvcGVydHlLZXl9XCJgKTtcbiAgICB9O1xuICAgIHRyYW5zZm9ybXMucHVzaChleHByZXNzaW9uID0+IHtcbiAgICAgIGxldCBmbGFncyA9IGV4cHJlc3Npb24gJiYgZXhwcmVzc2lvbi5mbGFncztcbiAgICAgIGxldCBzb3VyY2UgPSBleHByZXNzaW9uICYmIGAke2V4cHJlc3Npb24uc291cmNlIHx8IGV4cHJlc3Npb24gfHwgJyd9YDtcbiAgICAgIHNvdXJjZSAmJlxuICAgICAgICBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnRlc3Qoc291cmNlKSAmJlxuICAgICAgICAoc291cmNlID0gc291cmNlLnJlcGxhY2UoVW5pY29kZVByb3BlcnR5RXNjYXBlcywgVW5pY29kZVByb3BlcnR5RXNjYXBlcy5yZXBsYWNlKSk7XG4gICAgICByZXR1cm4gKGZsYWdzICYmIG5ldyBSZWdFeHAoc291cmNlLCBmbGFncykpIHx8IHNvdXJjZTtcbiAgICB9KTtcbiAgfVxuXG4gIGlmICghdHJhbnNmb3Jtcy5sZW5ndGgpIHJldHVybjtcblxuICBmb3IgKGNvbnN0IGtleSBpbiBlbnRpdGllcykge1xuICAgIGNvbnN0IHNvdXJjZXMgPSBlbnRpdGllc1trZXldO1xuICAgIGNvbnN0IGNoYW5nZXMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGlkIGluIHNvdXJjZXMpIHtcbiAgICAgIGxldCBzb3VyY2UgPSBzb3VyY2VzW2lkXTtcbiAgICAgIGlmICghc291cmNlIHx8IHR5cGVvZiBzb3VyY2UgIT09ICdzdHJpbmcnKSBjb250aW51ZTtcbiAgICAgIGZvciAoY29uc3QgdHJhbnNmb3JtIG9mIHRyYW5zZm9ybXMpIHNvdXJjZSA9IHRyYW5zZm9ybShzb3VyY2UpO1xuICAgICAgIXNvdXJjZSB8fCBzb3VyY2UgPT09IHNvdXJjZXNbaWRdIHx8IChjaGFuZ2VzW2lkXSA9IHNvdXJjZSk7XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24oc291cmNlcywgY2hhbmdlcyk7XG4gIH1cblxuICAvLyBwcmV0dGllci1pZ25vcmVcbiAgZnVuY3Rpb24gc3VwcG9ydHMoKSB7dHJ5IHtyZXR1cm4gISFSZWdFeHAoLi4uIGFyZ3VtZW50cyl9IGNhdGNoIChlKSB7IH19XG59KSh7XG4gIElEX1N0YXJ0OiByYXdgYS16QS1aXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNgLFxuICBJRF9Db250aW51ZTogcmF3YGEtekEtWjAtOVxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDhhMC1cXHUwOGI0XFx1MDhiNi1cXHUwOGJkXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4OFxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmVmXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3YjlcXHVhN2Y3LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY1XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXFx1MjAwY1xcdTIwMGRcXHhiN1xcdTAzMDAtXFx1MDM2ZlxcdTAzODdcXHUwNDgzLVxcdTA0ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNjEwLVxcdTA2MWFcXHUwNjRiLVxcdTA2NjlcXHUwNjcwXFx1MDZkNi1cXHUwNmRjXFx1MDZkZi1cXHUwNmU0XFx1MDZlN1xcdTA2ZThcXHUwNmVhLVxcdTA2ZWRcXHUwNmYwLVxcdTA2ZjlcXHUwNzExXFx1MDczMC1cXHUwNzRhXFx1MDdhNi1cXHUwN2IwXFx1MDdjMC1cXHUwN2M5XFx1MDdlYi1cXHUwN2YzXFx1MDdmZFxcdTA4MTYtXFx1MDgxOVxcdTA4MWItXFx1MDgyM1xcdTA4MjUtXFx1MDgyN1xcdTA4MjktXFx1MDgyZFxcdTA4NTktXFx1MDg1YlxcdTA4ZDMtXFx1MDhlMVxcdTA4ZTMtXFx1MDkwM1xcdTA5M2EtXFx1MDkzY1xcdTA5M2UtXFx1MDk0ZlxcdTA5NTEtXFx1MDk1N1xcdTA5NjJcXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk4MS1cXHUwOTgzXFx1MDliY1xcdTA5YmUtXFx1MDljNFxcdTA5YzdcXHUwOWM4XFx1MDljYi1cXHUwOWNkXFx1MDlkN1xcdTA5ZTJcXHUwOWUzXFx1MDllNi1cXHUwOWVmXFx1MDlmZVxcdTBhMDEtXFx1MGEwM1xcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTY2LVxcdTBhNzFcXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGFiY1xcdTBhYmUtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZTJcXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGFmYS1cXHUwYWZmXFx1MGIwMS1cXHUwYjAzXFx1MGIzY1xcdTBiM2UtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjYyXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiODJcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMC1cXHUwYzA0XFx1MGMzZS1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzYyXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODEtXFx1MGM4M1xcdTBjYmNcXHUwY2JlLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZTJcXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGQwMC1cXHUwZDAzXFx1MGQzYlxcdTBkM2NcXHUwZDNlLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGRcXHUwZDU3XFx1MGQ2MlxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDgyXFx1MGQ4M1xcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRlNi1cXHUwZGVmXFx1MGRmMlxcdTBkZjNcXHUwZTMxXFx1MGUzNC1cXHUwZTNhXFx1MGU0Ny1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGViMVxcdTBlYjQtXFx1MGViOVxcdTBlYmJcXHUwZWJjXFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGYxOFxcdTBmMTlcXHUwZjIwLVxcdTBmMjlcXHUwZjM1XFx1MGYzN1xcdTBmMzlcXHUwZjNlXFx1MGYzZlxcdTBmNzEtXFx1MGY4NFxcdTBmODZcXHUwZjg3XFx1MGY4ZC1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMmItXFx1MTAzZVxcdTEwNDAtXFx1MTA0OVxcdTEwNTYtXFx1MTA1OVxcdTEwNWUtXFx1MTA2MFxcdTEwNjItXFx1MTA2NFxcdTEwNjctXFx1MTA2ZFxcdTEwNzEtXFx1MTA3NFxcdTEwODItXFx1MTA4ZFxcdTEwOGYtXFx1MTA5ZFxcdTEzNWQtXFx1MTM1ZlxcdTEzNjktXFx1MTM3MVxcdTE3MTItXFx1MTcxNFxcdTE3MzItXFx1MTczNFxcdTE3NTJcXHUxNzUzXFx1MTc3MlxcdTE3NzNcXHUxN2I0LVxcdTE3ZDNcXHUxN2RkXFx1MTdlMC1cXHUxN2U5XFx1MTgwYi1cXHUxODBkXFx1MTgxMC1cXHUxODE5XFx1MThhOVxcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk0ZlxcdTE5ZDAtXFx1MTlkYVxcdTFhMTctXFx1MWExYlxcdTFhNTUtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYjAtXFx1MWFiZFxcdTFiMDAtXFx1MWIwNFxcdTFiMzQtXFx1MWI0NFxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiODAtXFx1MWI4MlxcdTFiYTEtXFx1MWJhZFxcdTFiYjAtXFx1MWJiOVxcdTFiZTYtXFx1MWJmM1xcdTFjMjQtXFx1MWMzN1xcdTFjNDAtXFx1MWM0OVxcdTFjNTAtXFx1MWM1OVxcdTFjZDAtXFx1MWNkMlxcdTFjZDQtXFx1MWNlOFxcdTFjZWRcXHUxY2YyLVxcdTFjZjRcXHUxY2Y3LVxcdTFjZjlcXHUxZGMwLVxcdTFkZjlcXHUxZGZiLVxcdTFkZmZcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MmNlZi1cXHUyY2YxXFx1MmQ3ZlxcdTJkZTAtXFx1MmRmZlxcdTMwMmEtXFx1MzAyZlxcdTMwOTlcXHUzMDlhXFx1YTYyMC1cXHVhNjI5XFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2OWVcXHVhNjlmXFx1YTZmMFxcdWE2ZjFcXHVhODAyXFx1YTgwNlxcdWE4MGJcXHVhODIzLVxcdWE4MjdcXHVhODgwXFx1YTg4MVxcdWE4YjQtXFx1YThjNVxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmMVxcdWE4ZmYtXFx1YTkwOVxcdWE5MjYtXFx1YTkyZFxcdWE5NDctXFx1YTk1M1xcdWE5ODAtXFx1YTk4M1xcdWE5YjMtXFx1YTljMFxcdWE5ZDAtXFx1YTlkOVxcdWE5ZTVcXHVhOWYwLVxcdWE5ZjlcXHVhYTI5LVxcdWFhMzZcXHVhYTQzXFx1YWE0Y1xcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTdiLVxcdWFhN2RcXHVhYWIwXFx1YWFiMi1cXHVhYWI0XFx1YWFiN1xcdWFhYjhcXHVhYWJlXFx1YWFiZlxcdWFhYzFcXHVhYWViLVxcdWFhZWZcXHVhYWY1XFx1YWFmNlxcdWFiZTMtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1ZmIxZVxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyZlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmYxMC1cXHVmZjE5XFx1ZmYzZmAsXG59KTtcbiIsImltcG9ydCB7cGF0dGVybnMsIGVudGl0aWVzLCBpZGVudGlmaWVyLCBzZXF1ZW5jZSwgYWxsLCByYXd9IGZyb20gJy4vcGF0dGVybnMuanMnO1xuXG5leHBvcnQgY29uc3QgbWFwcGluZ3MgPSB7fTtcblxuZXhwb3J0IGNvbnN0IG1vZGVzID0ge1xuICAvLyBGYWxsYmFjayBtb2RlXG4gIGRlZmF1bHQ6IHtcbiAgICAuLi4obWFwcGluZ3MuZGVmYXVsdCA9IHtzeW50YXg6ICdkZWZhdWx0J30pLFxuICAgIG1hdGNoZXI6IC8oW1xcc1xcbl0rKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXC9cXC98XFwvXFwqfFxcKlxcL3xcXCh8XFwpfFxcW3xcXF18LHw7fFxcLlxcLlxcLnxcXC58XFxiOlxcL1xcL1xcYnw6Onw6fFxcP3xgfFwifCd8XFwkXFx7fFxce3xcXH18PT58PFxcL3xcXC8+fFxcKyt8XFwtK3xcXCorfCYrfFxcfCt8PSt8IT17MCwzfXw8ezEsM309P3w+ezEsMn09Pyl8WytcXC0qLyZ8XiU8Pn4hXT0/L2csXG4gIH0sXG59O1xuXG4vLy8gREVGSU5JVElPTlNcblN5bnRheGVzOiB7XG4gIC8vLyBIZWxwZXJzXG4gIGNvbnN0IGxpbmVzID0gc3RyaW5nID0+IHN0cmluZy5zcGxpdCgvXFxuKy8pO1xuICBjb25zdCBjbG9zdXJlcyA9IHN0cmluZyA9PiB7XG4gICAgY29uc3QgcGFpcnMgPSBzeW1ib2xzKHN0cmluZyk7XG4gICAgY29uc3QgYXJyYXkgPSBuZXcgQXJyYXkocGFpcnMubGVuZ3RoKTtcbiAgICBhcnJheS5wYWlycyA9IHBhaXJzO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICAgIGNvbnN0IFtvcGVuZXIsIGNsb3Nlcl0gPSBwYWlyLnNwbGl0KCfigKYnKTtcbiAgICAgIGFycmF5WyhhcnJheVtpKytdID0gb3BlbmVyKV0gPSB7b3BlbmVyLCBjbG9zZXJ9O1xuICAgIH1cbiAgICBhcnJheS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcbiAgICByZXR1cm4gYXJyYXk7XG4gIH07XG4gIGNvbnN0IHN5bWJvbHMgPSBzb3VyY2UgPT5cbiAgICAoc291cmNlICYmXG4gICAgICAoKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnICYmIHNvdXJjZS5zcGxpdCgvICsvKSkgfHxcbiAgICAgICAgKFN5bWJvbC5pdGVyYXRvciBpbiBzb3VyY2UgJiYgWy4uLnNvdXJjZV0pKSkgfHxcbiAgICBbXTtcbiAgc3ltYm9scy5mcm9tID0gKC4uLmFyZ3MpID0+IFsuLi5uZXcgU2V0KFtdLmNvbmNhdCguLi5hcmdzLm1hcChzeW1ib2xzKSkpXTtcblxuICBFQ01BU2NyaXB0OiB7XG4gICAgY29uc3QgUkVHRVhQUyA9IC9cXC8oPz1bXlxcKlxcL1xcbl1bXlxcbl0qXFwvKSg/OlteXFxcXFxcL1xcblxcdFxcW10rfFxcXFxcXFN8XFxbKD86XFxcXFxcU3xbXlxcXFxcXG5cXHRcXF1dKykrP1xcXSkrP1xcL1thLXpdKi9nO1xuICAgIGNvbnN0IENPTU1FTlRTID0gL1xcL1xcL3xcXC9cXCp8XFwqXFwvfFxcL3xeXFwjXFwhLipcXG4vZztcbiAgICBjb25zdCBRVU9URVMgPSAvYHxcInwnL2c7XG4gICAgY29uc3QgQ0xPU1VSRVMgPSAvXFx7fFxcfXxcXCh8XFwpfFxcW3xcXF0vZztcblxuICAgIGNvbnN0IGVzID0gKG1vZGVzLmVzID0ge1xuICAgICAgLi4uKG1hcHBpbmdzLmphdmFzY3JpcHQgPSBtYXBwaW5ncy5lcyA9IG1hcHBpbmdzLmpzID0gbWFwcGluZ3MuZWNtYXNjcmlwdCA9IHtzeW50YXg6ICdlcyd9KSxcbiAgICAgIGNvbW1lbnRzOiBjbG9zdXJlcygnLy/igKZcXG4gLyrigKYqLycpLFxuICAgICAgcXVvdGVzOiBzeW1ib2xzKGAnIFwiIFxcYGApLFxuICAgICAgY2xvc3VyZXM6IGNsb3N1cmVzKCd74oCmfSAo4oCmKSBb4oCmXScpLFxuICAgICAgc3BhbnM6IHsnYCc6IGNsb3N1cmVzKCcke+KApn0nKX0sXG4gICAgICBrZXl3b3Jkczogc3ltYm9scyhcbiAgICAgICAgLy8gYWJzdHJhY3QgZW51bSBpbnRlcmZhY2UgcGFja2FnZSAgbmFtZXNwYWNlIGRlY2xhcmUgdHlwZSBtb2R1bGVcbiAgICAgICAgJ2FyZ3VtZW50cyBhcyBhc3luYyBhd2FpdCBicmVhayBjYXNlIGNhdGNoIGNsYXNzIGNvbnN0IGNvbnRpbnVlIGRlYnVnZ2VyIGRlZmF1bHQgZGVsZXRlIGRvIGVsc2UgZXhwb3J0IGV4dGVuZHMgZmluYWxseSBmb3IgZnJvbSBmdW5jdGlvbiBnZXQgaWYgaW1wb3J0IGluIGluc3RhbmNlb2YgbGV0IG5ldyBvZiByZXR1cm4gc2V0IHN1cGVyIHN3aXRjaCB0aGlzIHRocm93IHRyeSB0eXBlb2YgdmFyIHZvaWQgd2hpbGUgd2l0aCB5aWVsZCcsXG4gICAgICApLFxuICAgICAgYXNzaWduZXJzOiBzeW1ib2xzKCc9ICs9IC09ICo9IC89ICoqPSAlPSB8PSBePSAmPSA8PD0gPj49ID4+Pj0nKSxcbiAgICAgIGNvbWJpbmF0b3JzOiBzeW1ib2xzKCc+PSA8PSA9PSA9PT0gIT0gIT09IHx8ICYmICEgJiB8ID4gPCA9PiAlICsgLSAqKiAqIC8gPj4gPDwgPj4+ID8gOicpLFxuICAgICAgbm9uYnJlYWtlcnM6IHN5bWJvbHMoJy4nKSxcbiAgICAgIG9wZXJhdG9yczogc3ltYm9scygnKysgLS0gISEgXiB+ICEgLi4uJyksXG4gICAgICBicmVha2Vyczogc3ltYm9scygnLCA7JyksXG4gICAgICBwYXR0ZXJuczoge1xuICAgICAgICAuLi5wYXR0ZXJucyxcbiAgICAgICAgbWF5YmVJZGVudGlmaWVyOiBpZGVudGlmaWVyKGVudGl0aWVzLmVzLklkZW50aWZpZXJTdGFydCwgZW50aXRpZXMuZXMuSWRlbnRpZmllclBhcnQpLFxuICAgICAgfSxcbiAgICAgIG1hdGNoZXI6IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke2FsbChcbiAgICAgICAgUkVHRVhQUyxcbiAgICAgICAgcmF3YFxcLz1gLFxuICAgICAgICBDT01NRU5UUyxcbiAgICAgICAgUVVPVEVTLFxuICAgICAgICBDTE9TVVJFUyxcbiAgICAgICAgLyx8O3xcXC5cXC5cXC58XFwufFxcOnxcXD98PT4vLFxuICAgICAgICAvIT09fD09PXw9PXw9LyxcbiAgICAgICAgLi4uc3ltYm9scyhyYXdgXFwrIFxcLSBcXCogJiBcXHxgKS5tYXAocyA9PiBgJHtzfSR7c318JHtzfT18JHtzfWApLFxuICAgICAgICAuLi5zeW1ib2xzKHJhd2AhIFxcKlxcKiAlIDw8ID4+ID4+PiA8ID4gXFxeIH5gKS5tYXAocyA9PiBgJHtzfT18JHtzfWApLFxuICAgICAgKX0pYCxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiAvKFxcbil8KGB8XCJ8J3xcXCRcXHspfChcXFxcLikvZyxcbiAgICAgICAgXCInXCI6IC8oXFxuKXwoJyl8KFxcXFwuKS9nLFxuICAgICAgICAnXCInOiAvKFxcbil8KFwiKXwoXFxcXC4pL2csXG4gICAgICAgICdgJzogLyhcXG4pfChgfFxcJFxceyl8KFxcXFwuKS9nLFxuICAgICAgICBjb21tZW50czogLyhcXG4pfChcXCpcXC98XFxiKD86W2Etel0rXFw6XFwvXFwvfFxcd1tcXHdcXCtcXC5dKlxcd0BbYS16XSspXFxTK3xAW2Etel0rKS9naSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBFQ01BU2NyaXB0RXh0ZW5zaW9uczoge1xuICAgICAgLy8gVE9ETzogVW5kbyAkIG1hdGNoaW5nIG9uY2UgZml4ZWRcbiAgICAgIGNvbnN0IFFVT1RFUyA9IC9gfFwiKD86W15cXFxcXCJdK3xcXFxcLikqKD86XCJ8JCl8Jyg/OlteXFxcXCddK3xcXFxcLikqKD86J3wkKS9nO1xuICAgICAgY29uc3QgQ09NTUVOVFMgPSAvXFwvXFwvLiooPzpcXG58JCl8XFwvXFwqW15dKj8oPzpcXCpcXC98JCl8XlxcI1xcIS4qXFxuL2c7XG4gICAgICBjb25zdCBTVEFURU1FTlRTID0gYWxsKFFVT1RFUywgQ0xPU1VSRVMsIFJFR0VYUFMsIENPTU1FTlRTKTtcbiAgICAgIGNvbnN0IEJMT0NLTEVWRUwgPSBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgVE9QTEVWRUwgPSBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgQ0xPU1VSRSA9IHNlcXVlbmNlYChcXG4rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgRVNNID0gc2VxdWVuY2VgJHtUT1BMRVZFTH18XFxiZXhwb3J0XFxifFxcYmltcG9ydFxcYmA7XG4gICAgICBjb25zdCBDSlMgPSBzZXF1ZW5jZWAke0JMT0NLTEVWRUx9fFxcYmV4cG9ydHNcXGJ8XFxibW9kdWxlLmV4cG9ydHNcXGJ8XFxicmVxdWlyZVxcYmA7XG4gICAgICBjb25zdCBFU1ggPSBzZXF1ZW5jZWAke0JMT0NLTEVWRUx9fFxcYmV4cG9ydHNcXGJ8XFxiaW1wb3J0XFxifFxcYm1vZHVsZS5leHBvcnRzXFxifFxcYnJlcXVpcmVcXGJgO1xuXG4gICAgICBjb25zdCB7cXVvdGVzLCBjbG9zdXJlcywgc3BhbnN9ID0gZXM7XG4gICAgICBjb25zdCBzeW50YXggPSB7cXVvdGVzLCBjbG9zdXJlcywgc3BhbnN9O1xuICAgICAgY29uc3QgbWF0Y2hlcnMgPSB7fTtcbiAgICAgICh7cXVvdGU6IG1hdGNoZXJzLnF1b3RlfSA9IGVzLm1hdGNoZXJzKTtcblxuICAgICAgY29uc3QgbWpzID0gKG1vZGVzLm1qcyA9IHtcbiAgICAgICAgLi4uKG1hcHBpbmdzLm1qcyA9IG1hcHBpbmdzLmVzbSA9IHtzeW50YXg6ICdtanMnfSksXG4gICAgICAgIGtleXdvcmRzOiBzeW1ib2xzKCdpbXBvcnQgZXhwb3J0IGRlZmF1bHQnKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBFU00sXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IENMT1NVUkV9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBjanMgPSAobW9kZXMuY2pzID0ge1xuICAgICAgICAuLi4obWFwcGluZ3MuY2pzID0ge3N5bnRheDogJ2Nqcyd9KSxcbiAgICAgICAga2V5d29yZHM6IHN5bWJvbHMoJ2ltcG9ydCBtb2R1bGUgZXhwb3J0cyByZXF1aXJlJyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogQ0pTLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBDSlN9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlc3ggPSAobW9kZXMuZXN4ID0ge1xuICAgICAgICAuLi4obWFwcGluZ3MuZXN4ID0ge3N5bnRheDogJ2VzeCd9KSxcbiAgICAgICAga2V5d29yZHM6IHN5bWJvbHMuZnJvbShtanMua2V5d29yZHMsIGNqcy5rZXl3b3JkcyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogRVNYLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBFU1h9LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG4iLCJleHBvcnQgY2xhc3MgR3JvdXBlciB7XG4gIGNvbnN0cnVjdG9yKGNvbnRleHQgPSAnbWFya3VwJywgZ3JvdXBlcnMgPSB7fSkge1xuICAgIE9iamVjdC5hc3NpZ24odGhpcywge1xuICAgICAgZ3JvdXBlcnMsXG4gICAgICBoaW50czogbmV3IFNldChbY29udGV4dF0pLFxuICAgICAgZ29hbDogY29udGV4dCxcbiAgICAgIGdyb3VwaW5nczogW2NvbnRleHRdLFxuICAgICAgY29udGV4dCxcbiAgICB9KTtcbiAgICAvLyB0aGlzLmdyb3VwZXJzID0gZ3JvdXBlcnM7XG4gICAgLy8gdGhpcy5oaW50cyA9IG5ldyBTZXQoW3N5bnRheF0pO1xuICAgIC8vIHRoaXMuZ29hbCA9IHN5bnRheDtcbiAgICAvLyB0aGlzLmdyb3VwaW5ncyA9IFtzeW50YXhdO1xuICAgIC8vIHRoaXMuY29udGV4dCA9IHN5bnRheDtcbiAgfVxuXG4gIC8vIGNyZWF0ZSh7XG4gIC8vICAgLyogZ3JvdXBlciBjb250ZXh0ICovXG4gIC8vICAgc3ludGF4LFxuICAvLyAgIGdvYWwgPSBzeW50YXgsXG4gIC8vICAgcXVvdGUsXG4gIC8vICAgY29tbWVudCxcbiAgLy8gICBjbG9zdXJlLFxuICAvLyAgIHNwYW4sXG4gIC8vICAgZ3JvdXBpbmcgPSBjb21tZW50IHx8IGNsb3N1cmUgfHwgc3BhbiB8fCB1bmRlZmluZWQsXG5cbiAgLy8gICBwdW5jdHVhdG9yLFxuICAvLyAgIHNwYW5zID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnNwYW5zKSB8fCB1bmRlZmluZWQsXG4gIC8vICAgbWF0Y2hlciA9IChncm91cGluZyAmJiBncm91cGluZy5tYXRjaGVyKSB8fCB1bmRlZmluZWQsXG4gIC8vICAgcXVvdGVzID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnF1b3RlcykgfHwgdW5kZWZpbmVkLFxuICAvLyAgIHB1bmN0dWF0b3JzID0ge2FnZ3JlZ2F0b3JzOiB7fX0sXG4gIC8vICAgb3BlbmVyID0gcXVvdGUgfHwgKGdyb3VwaW5nICYmIGdyb3VwaW5nLm9wZW5lcikgfHwgdW5kZWZpbmVkLFxuICAvLyAgIGNsb3NlciA9IHF1b3RlIHx8IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZXIpIHx8IHVuZGVmaW5lZCxcbiAgLy8gICBoaW50ZXIsXG4gIC8vICAgb3BlbiA9IChncm91cGluZyAmJiBncm91cGluZy5vcGVuKSB8fCB1bmRlZmluZWQsXG4gIC8vICAgY2xvc2UgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuY2xvc2UpIHx8IHVuZGVmaW5lZCxcbiAgLy8gfSkge1xuICAvLyAgIHJldHVybiB7XG4gIC8vICAgICBzeW50YXgsXG4gIC8vICAgICBnb2FsLFxuICAvLyAgICAgcHVuY3R1YXRvcixcbiAgLy8gICAgIHNwYW5zLFxuICAvLyAgICAgbWF0Y2hlcixcbiAgLy8gICAgIHF1b3RlcyxcbiAgLy8gICAgIHB1bmN0dWF0b3JzLFxuICAvLyAgICAgb3BlbmVyLFxuICAvLyAgICAgY2xvc2VyLFxuICAvLyAgICAgaGludGVyLFxuICAvLyAgICAgb3BlbixcbiAgLy8gICAgIGNsb3NlLFxuICAvLyAgIH07XG4gIC8vIH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUdyb3VwZXIgPSAoR3JvdXBlci5jcmVhdGUgPSAoe1xuICAvKiBncm91cGVyIGNvbnRleHQgKi9cbiAgc3ludGF4LFxuICBnb2FsID0gc3ludGF4LFxuICBxdW90ZSxcbiAgY29tbWVudCxcbiAgY2xvc3VyZSxcbiAgc3BhbixcbiAgZ3JvdXBpbmcgPSBjb21tZW50IHx8IGNsb3N1cmUgfHwgc3BhbiB8fCB1bmRlZmluZWQsXG5cbiAgcHVuY3R1YXRvcixcbiAgc3BhbnMgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuc3BhbnMpIHx8IHVuZGVmaW5lZCxcbiAgbWF0Y2hlciA9IChncm91cGluZyAmJiBncm91cGluZy5tYXRjaGVyKSB8fCB1bmRlZmluZWQsXG4gIHF1b3RlcyA9IChncm91cGluZyAmJiBncm91cGluZy5xdW90ZXMpIHx8IHVuZGVmaW5lZCxcbiAgcHVuY3R1YXRvcnMgPSB7YWdncmVnYXRvcnM6IHt9fSxcbiAgb3BlbmVyID0gcXVvdGUgfHwgKGdyb3VwaW5nICYmIGdyb3VwaW5nLm9wZW5lcikgfHwgdW5kZWZpbmVkLFxuICBjbG9zZXIgPSBxdW90ZSB8fCAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuY2xvc2VyKSB8fCB1bmRlZmluZWQsXG4gIGhpbnRlcixcbiAgb3BlbiA9IChncm91cGluZyAmJiBncm91cGluZy5vcGVuKSB8fCB1bmRlZmluZWQsXG4gIGNsb3NlID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLmNsb3NlKSB8fCB1bmRlZmluZWQsXG59KSA9PiAoe1xuICBzeW50YXgsXG4gIGdvYWwsXG4gIHB1bmN0dWF0b3IsXG4gIHNwYW5zLFxuICBtYXRjaGVyLFxuICBxdW90ZXMsXG4gIHB1bmN0dWF0b3JzLFxuICBvcGVuZXIsXG4gIGNsb3NlcixcbiAgaGludGVyLFxuICBvcGVuLFxuICBjbG9zZSxcbn0pKTtcbiIsImltcG9ydCB7cGF0dGVybnN9IGZyb20gJy4vcGF0dGVybnMuanMnO1xuaW1wb3J0IHtjcmVhdGVHcm91cGVyLCBHcm91cGVyfSBmcm9tICcuL2dyb3VwZXIuanMnO1xuXG5jb25zdCBOdWxsID0gT2JqZWN0LmZyZWV6ZShPYmplY3QuY3JlYXRlKG51bGwpKTtcblxuLy8vIFRva2VuaXplclxuLyoqIFRva2VuaXplciBmb3IgYSBzaW5nbGUgbW9kZSAobGFuZ3VhZ2UpICovXG5leHBvcnQgY2xhc3MgVG9rZW5pemVyIHtcbiAgY29uc3RydWN0b3IobW9kZSwgZGVmYXVsdHMpIHtcbiAgICB0aGlzLm1vZGUgPSBtb2RlO1xuICAgIHRoaXMuZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCB0aGlzLmNvbnN0cnVjdG9yLmRlZmF1bHRzIHx8IHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKiBUb2tlbiBnZW5lcmF0b3IgZnJvbSBzb3VyY2UgdXNpbmcgdG9rZW5pemVyLm1vZGUgKG9yIGRlZmF1bHRzLm1vZGUpICovXG4gICp0b2tlbml6ZShzb3VyY2UsIHN0YXRlID0ge30pIHtcbiAgICBsZXQgZG9uZTtcblxuICAgIC8vIExvY2FsIGNvbnRleHRcbiAgICBjb25zdCBjb250ZXh0dWFsaXplciA9XG4gICAgICB0aGlzLmNvbnRleHR1YWxpemVyIHx8ICh0aGlzLmNvbnRleHR1YWxpemVyID0gdGhpcy5jb25zdHJ1Y3Rvci5jb250ZXh0dWFsaXplcih0aGlzKSk7XG4gICAgbGV0IGNvbnRleHQgPSBjb250ZXh0dWFsaXplci5uZXh0KCkudmFsdWU7XG4gICAgLy8gaWYgKCFjb250ZXh0KSBjb250ZXh0dWFsaXplci5uZXh0KCkudmFsdWU7XG4gICAgY29uc3Qge21vZGUsIHN5bnRheH0gPSBjb250ZXh0O1xuXG4gICAgLy8gTG9jYWwgZ3JvdXBpbmdcbiAgICBjb25zdCBncm91cGVycyA9IG1vZGUuZ3JvdXBlcnMgfHwgKG1vZGUuZ3JvdXBlcnMgPSB7fSk7XG5cbiAgICBjb25zdCBncm91cGluZyA9XG4gICAgICBzdGF0ZS5ncm91cGluZyB8fFxuICAgICAgKHN0YXRlLmdyb3VwaW5nID0ge1xuICAgICAgICBncm91cGVycyxcbiAgICAgICAgaGludHM6IG5ldyBTZXQoW3N5bnRheF0pLFxuICAgICAgICBnb2FsOiBzeW50YXgsXG4gICAgICAgIGdyb3VwaW5nczogW3N5bnRheF0sXG4gICAgICAgIGNvbnRleHQ6IHN5bnRheCxcbiAgICAgIH0pO1xuXG4gICAgLy8gY29uc3QgZ3JvdXBpbmcgPSBzdGF0ZS5ncm91cGluZyB8fCAoc3RhdGUuZ3JvdXBpbmcgPSBuZXcgR3JvdXBlcihzeW50YXgsIGdyb3VwZXJzKSk7XG5cbiAgICAvLyBMb2NhbCBtYXRjaGluZ1xuICAgIGxldCB7bWF0Y2gsIGluZGV4ID0gMH0gPSBzdGF0ZTtcblxuICAgIC8vIExvY2FsIHRva2Vuc1xuICAgIGxldCBwcmV2aW91cywgbGFzdCwgcGFyZW50O1xuICAgIGNvbnN0IHRvcCA9IHt0eXBlOiAndG9wJywgdGV4dDogJycsIG9mZnNldDogaW5kZXh9O1xuXG4gICAgbGV0IGxhc3RDb250ZXh0ID0gY29udGV4dDtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIG1vZGU6IHtzeW50YXgsIG1hdGNoZXJzLCBjb21tZW50cywgc3BhbnMsIGNsb3N1cmVzfSxcbiAgICAgICAgcHVuY3R1YXRvcjogJCRwdW5jdHVhdG9yLFxuICAgICAgICBjbG9zZXI6ICQkY2xvc2VyLFxuICAgICAgICBzcGFuczogJCRzcGFucyxcbiAgICAgICAgbWF0Y2hlcjogJCRtYXRjaGVyLFxuICAgICAgICB0b2tlbixcbiAgICAgICAgZm9ybWluZyA9IHRydWUsXG4gICAgICB9ID0gY29udGV4dDtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGhpbnQgKHN5bnRheCBvciBoaW50KVxuICAgICAgY29uc3QgaGludCA9IGdyb3VwaW5nLmhpbnQ7XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKHtjb250ZXh0LCBncm91cGluZywgdG9rZW5pemVyOiB0aGlzfSk7XG5cbiAgICAgIHdoaWxlIChsYXN0Q29udGV4dCA9PT0gKGxhc3RDb250ZXh0ID0gY29udGV4dCkpIHtcbiAgICAgICAgbGV0IG5leHQ7XG5cbiAgICAgICAgc3RhdGUubGFzdCA9IGxhc3Q7XG5cbiAgICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RhdGUuaW5kZXggfHwgMDtcblxuICAgICAgICAkJG1hdGNoZXIubGFzdEluZGV4ID09PSBsYXN0SW5kZXggfHwgKCQkbWF0Y2hlci5sYXN0SW5kZXggPSBsYXN0SW5kZXgpO1xuICAgICAgICBtYXRjaCA9IHN0YXRlLm1hdGNoID0gJCRtYXRjaGVyLmV4ZWMoc291cmNlKTtcbiAgICAgICAgZG9uZSA9IGluZGV4ID09PSAoaW5kZXggPSBzdGF0ZS5pbmRleCA9ICQkbWF0Y2hlci5sYXN0SW5kZXgpIHx8ICFtYXRjaDtcblxuICAgICAgICBpZiAoZG9uZSkgcmV0dXJuO1xuXG4gICAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBtYXRjaFxuICAgICAgICBjb25zdCB7MDogdGV4dCwgMTogd2hpdGVzcGFjZSwgMjogc2VxdWVuY2UsIGluZGV4OiBvZmZzZXR9ID0gbWF0Y2g7XG5cbiAgICAgICAgLy8gQ3VycmVudCBxdWFzaS1jb250ZXh0dWFsIGZyYWdtZW50XG4gICAgICAgIGNvbnN0IHByZSA9IHNvdXJjZS5zbGljZShsYXN0SW5kZXgsIG9mZnNldCk7XG4gICAgICAgIHByZSAmJlxuICAgICAgICAgICgobmV4dCA9IHRva2VuKHtcbiAgICAgICAgICAgIHR5cGU6ICdwcmUnLFxuICAgICAgICAgICAgdGV4dDogcHJlLFxuICAgICAgICAgICAgb2Zmc2V0OiBsYXN0SW5kZXgsXG4gICAgICAgICAgICBwcmV2aW91cyxcbiAgICAgICAgICAgIHBhcmVudCxcbiAgICAgICAgICAgIGhpbnQsXG4gICAgICAgICAgICBsYXN0LFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgICB5aWVsZCAocHJldmlvdXMgPSBuZXh0KSk7XG5cbiAgICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGZyYWdtZW50XG4gICAgICAgIGNvbnN0IHR5cGUgPSAod2hpdGVzcGFjZSAmJiAnd2hpdGVzcGFjZScpIHx8IChzZXF1ZW5jZSAmJiAnc2VxdWVuY2UnKSB8fCAndGV4dCc7XG4gICAgICAgIG5leHQgPSB0b2tlbih7dHlwZSwgdGV4dCwgb2Zmc2V0LCBwcmV2aW91cywgcGFyZW50LCBoaW50LCBsYXN0fSk7XG5cbiAgICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIHB1bmN0dWF0b3IgKGZyb20gc2VxdWVuY2UpXG4gICAgICAgIGNvbnN0IGNsb3NpbmcgPVxuICAgICAgICAgICQkY2xvc2VyICYmXG4gICAgICAgICAgKCQkY2xvc2VyLnRlc3RcbiAgICAgICAgICAgID8gJCRjbG9zZXIudGVzdCh0ZXh0KVxuICAgICAgICAgICAgOiAkJGNsb3NlciA9PT0gdGV4dCB8fCAod2hpdGVzcGFjZSAmJiB3aGl0ZXNwYWNlLmluY2x1ZGVzKCQkY2xvc2VyKSkpO1xuXG4gICAgICAgIGxldCBhZnRlcjtcbiAgICAgICAgbGV0IHB1bmN0dWF0b3IgPSBuZXh0LnB1bmN0dWF0b3I7XG5cbiAgICAgICAgaWYgKHB1bmN0dWF0b3IgfHwgY2xvc2luZykge1xuICAgICAgICAgIGxldCBoaW50ZXIgPSBwdW5jdHVhdG9yID8gYCR7c3ludGF4fS0ke3B1bmN0dWF0b3J9YCA6IGdyb3VwaW5nLmhpbnQ7XG4gICAgICAgICAgbGV0IGNsb3NlZCwgb3BlbmVkLCBncm91cGVyO1xuXG4gICAgICAgICAgaWYgKGNsb3NpbmcpIHtcbiAgICAgICAgICAgIGNsb3NlZCA9IGdyb3VwZXIgPSBjbG9zaW5nICYmIGdyb3VwaW5nLmdyb3VwaW5ncy5wb3AoKTtcbiAgICAgICAgICAgIG5leHQuY2xvc2VkID0gY2xvc2VkO1xuICAgICAgICAgICAgZ3JvdXBpbmcuZ3JvdXBpbmdzLmluY2x1ZGVzKGdyb3VwZXIpIHx8IGdyb3VwaW5nLmhpbnRzLmRlbGV0ZShncm91cGVyLmhpbnRlcik7XG4gICAgICAgICAgICAoY2xvc2VkLnB1bmN0dWF0b3IgPT09ICdvcGVuZXInICYmIChuZXh0LnB1bmN0dWF0b3IgPSAnY2xvc2VyJykpIHx8XG4gICAgICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciAmJiAobmV4dC5wdW5jdHVhdG9yID0gY2xvc2VkLnB1bmN0dWF0b3IpKTtcbiAgICAgICAgICAgIGFmdGVyID0gZ3JvdXBlci5jbG9zZSAmJiBncm91cGVyLmNsb3NlKG5leHQsIHN0YXRlLCBjb250ZXh0KTtcblxuICAgICAgICAgICAgY29uc3QgcHJldmlvdXNHcm91cGVyID0gKGdyb3VwZXIgPSBncm91cGluZy5ncm91cGluZ3NbZ3JvdXBpbmcuZ3JvdXBpbmdzLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdvYWwgPSAocHJldmlvdXNHcm91cGVyICYmIHByZXZpb3VzR3JvdXBlci5nb2FsKSB8fCBzeW50YXg7XG4gICAgICAgICAgICBwYXJlbnQgPSAocGFyZW50ICYmIHBhcmVudC5wYXJlbnQpIHx8IHRvcDtcbiAgICAgICAgICB9IGVsc2UgaWYgKCQkcHVuY3R1YXRvciAhPT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgICBjb25zdCBncm91cCA9IGAke2hpbnRlcn0sJHt0ZXh0fWA7XG4gICAgICAgICAgICBncm91cGVyID0gZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdO1xuXG4gICAgICAgICAgICBpZiAoJCRzcGFucyAmJiBwdW5jdHVhdG9yID09PSAnc3BhbicpIHtcbiAgICAgICAgICAgICAgY29uc3Qgc3BhbiA9ICQkc3BhbnNbdGV4dF07XG4gICAgICAgICAgICAgIG5leHQucHVuY3R1YXRvciA9IHB1bmN0dWF0b3IgPSAnc3Bhbic7XG4gICAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgZ29hbDogc3ludGF4LFxuICAgICAgICAgICAgICAgICAgc3BhbixcbiAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IHNwYW4ubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuc3BhbikgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgc3BhbnM6IChzcGFucyAmJiBzcGFuc1t0ZXh0XSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJCRwdW5jdHVhdG9yICE9PSAncXVvdGUnKSB7XG4gICAgICAgICAgICAgIGlmIChwdW5jdHVhdG9yID09PSAncXVvdGUnKSB7XG4gICAgICAgICAgICAgICAgb3BlbmVkID1cbiAgICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgIGdvYWw6IHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIHF1b3RlOiB0ZXh0LFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVyOiAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMucXVvdGUpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgc3BhbnM6IChzcGFucyAmJiBzcGFuc1t0ZXh0XSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb21tZW50ID0gY29tbWVudHNbdGV4dF07XG4gICAgICAgICAgICAgICAgb3BlbmVkID1cbiAgICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgIGdvYWw6IHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIGNvbW1lbnQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IGNvbW1lbnQubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuY29tbWVudCkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY2xvc3VyZScpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjbG9zdXJlID0gKGdyb3VwZXIgJiYgZ3JvdXBlci5jbG9zdXJlKSB8fCBjbG9zdXJlc1t0ZXh0XTtcbiAgICAgICAgICAgICAgICBwdW5jdHVhdG9yID0gbmV4dC5wdW5jdHVhdG9yID0gJ29wZW5lcic7XG4gICAgICAgICAgICAgICAgY2xvc3VyZSAmJlxuICAgICAgICAgICAgICAgICAgKG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgICAgIGdvYWw6IHN5bnRheCxcbiAgICAgICAgICAgICAgICAgICAgICBjbG9zdXJlLFxuICAgICAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IGNsb3N1cmUubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuY2xvc3VyZSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG9wZW5lZCkge1xuICAgICAgICAgICAgICAvLyBhZnRlciA9IG9wZW5lZC5vcGVuICYmIG9wZW5lZC5vcGVuKG5leHQsIHN0YXRlLCBvcGVuZWQpO1xuICAgICAgICAgICAgICBncm91cGluZy5ncm91cGVyc1tncm91cF0gfHwgKGdyb3VwaW5nLmdyb3VwZXJzW2dyb3VwXSA9IGdyb3VwZXIgPSBvcGVuZWQpO1xuICAgICAgICAgICAgICBncm91cGluZy5ncm91cGluZ3MucHVzaChncm91cGVyKSwgZ3JvdXBpbmcuaGludHMuYWRkKGhpbnRlcik7XG4gICAgICAgICAgICAgIGdyb3VwaW5nLmdvYWwgPSAoZ3JvdXBlciAmJiBncm91cGVyLmdvYWwpIHx8IHN5bnRheDtcbiAgICAgICAgICAgICAgcGFyZW50ID0gbmV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzdGF0ZS5jb250ZXh0ID0gZ3JvdXBpbmcuY29udGV4dCA9IGdyb3VwaW5nLmdvYWwgfHwgc3ludGF4O1xuXG4gICAgICAgICAgaWYgKG9wZW5lZCB8fCBjbG9zZWQpIHtcbiAgICAgICAgICAgIGNvbnRleHQgPSBjb250ZXh0dWFsaXplci5uZXh0KChzdGF0ZS5ncm91cGVyID0gZ3JvdXBlciB8fCB1bmRlZmluZWQpKS52YWx1ZTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmhpbnQgPSBgJHtbLi4uZ3JvdXBpbmcuaGludHNdLmpvaW4oJyAnKX0gJHtcbiAgICAgICAgICAgICAgZ3JvdXBpbmcuY29udGV4dCA/IGBpbi0ke2dyb3VwaW5nLmNvbnRleHR9YCA6ICcnXG4gICAgICAgICAgICB9YDtcbiAgICAgICAgICAgIG9wZW5lZCAmJiAoYWZ0ZXIgPSBvcGVuZWQub3BlbiAmJiBvcGVuZWQub3BlbihuZXh0LCBzdGF0ZSwgY29udGV4dCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCB0YWlsIHRva2VuICh5aWVsZCBmcm9tIHNlcXVlbmNlKVxuICAgICAgICB5aWVsZCAocHJldmlvdXMgPSBuZXh0KTtcblxuICAgICAgICAvLyBOZXh0IHJlZmVyZW5jZSB0byBsYXN0IGNvbnRleHR1YWwgc2VxdWVuY2UgdG9rZW5cbiAgICAgICAgbmV4dCAmJiAhd2hpdGVzcGFjZSAmJiBmb3JtaW5nICYmIChsYXN0ID0gbmV4dCk7XG5cbiAgICAgICAgaWYgKGFmdGVyKSB7XG4gICAgICAgICAgbGV0IHRva2VucywgdG9rZW4sIG5leHRJbmRleDsgLy8gID0gYWZ0ZXIuZW5kIHx8IGFmdGVyLmluZGV4XG5cbiAgICAgICAgICBpZiAoYWZ0ZXIuc3ludGF4KSB7XG4gICAgICAgICAgICBjb25zdCB7c3ludGF4LCBvZmZzZXQsIGluZGV4fSA9IGFmdGVyO1xuICAgICAgICAgICAgY29uc3QgYm9keSA9IGluZGV4ID4gb2Zmc2V0ICYmIHNvdXJjZS5zbGljZShvZmZzZXQsIGluZGV4IC0gMSk7XG4gICAgICAgICAgICBpZiAoYm9keSkge1xuICAgICAgICAgICAgICBib2R5Lmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgICAoKHRva2VucyA9IHRva2VuaXplKGJvZHksIHtvcHRpb25zOiB7c3ludGF4fX0sIGRlZmF1bHRzKSksIChuZXh0SW5kZXggPSBpbmRleCkpO1xuICAgICAgICAgICAgICBjb25zdCBoaW50ID0gYCR7c3ludGF4fS1pbi0keyQuc3ludGF4fWA7XG4gICAgICAgICAgICAgIHRva2VuID0gdG9rZW4gPT4gKFxuICAgICAgICAgICAgICAgICh0b2tlbi5oaW50ID0gYCR7KHRva2VuLmhpbnQgJiYgYCR7dG9rZW4uaGludH0gYCkgfHwgJyd9JHtoaW50fWApLCB0b2tlblxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoYWZ0ZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBoaW50ID0gZ3JvdXBpbmcuaGludDtcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4gPT4gKFxuICAgICAgICAgICAgICAodG9rZW4uaGludCA9IGAke2hpbnR9ICR7dG9rZW4udHlwZSB8fCAnY29kZSd9YCksIGNvbnRleHQudG9rZW4odG9rZW4pXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgKHRva2VucyA9IGFmdGVyKS5lbmQgJiYgKG5leHRJbmRleCA9IGFmdGVyLmVuZCk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRva2Vucykge1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coe3Rva2VuLCB0b2tlbnMsIG5leHRJbmRleH0pO1xuICAgICAgICAgICAgZm9yIChjb25zdCBuZXh0IG9mIHRva2Vucykge1xuICAgICAgICAgICAgICBwcmV2aW91cyAmJiAoKG5leHQucHJldmlvdXMgPSBwcmV2aW91cykubmV4dCA9IG5leHQpO1xuICAgICAgICAgICAgICB0b2tlbiAmJiB0b2tlbihuZXh0KTtcbiAgICAgICAgICAgICAgeWllbGQgKHByZXZpb3VzID0gbmV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIG5leHRJbmRleCA+IGluZGV4ICYmIChzdGF0ZS5pbmRleCA9IG5leHRJbmRleCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ29udGV4dCBnZW5lcmF0b3IgdXNpbmcgdG9rZW5pemVyLm1vZGUgKG9yIGRlZmF1bHRzLm1vZGUpXG4gICAqL1xuICBnZXQgY29udGV4dHVhbGl6ZXIoKSB7XG4gICAgY29uc3QgdmFsdWUgPSB0aGlzLmNvbnN0cnVjdG9yLmNvbnRleHR1YWxpemVyKHRoaXMpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY29udGV4dHVhbGl6ZXInLCB7dmFsdWV9KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICAvKipcbiAgICogVG9rZW5pemVyIGNvbnRleHQgZ2VuZXJhdG9yXG4gICAqL1xuICBzdGF0aWMgKmNvbnRleHR1YWxpemVyKHRva2VuaXplcikge1xuICAgIC8vIExvY2FsIGNvbnRleHR1YWxpemVyIHN0YXRlXG4gICAgbGV0IGdyb3VwZXIsIGRvbmU7XG5cbiAgICAvLyBUb2tlbml6ZXIgbW9kZVxuICAgIGNvbnN0IG1vZGUgPSB0b2tlbml6ZXIubW9kZTtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHRva2VuaXplci5kZWZhdWx0cztcbiAgICBtb2RlICE9PSB1bmRlZmluZWQgfHwgKG1vZGUgPSAoZGVmYXVsdHMgJiYgZGVmYXVsdHMubW9kZSkgfHwgdW5kZWZpbmVkKTtcbiAgICAvLyAobW9kZSA9IChkZWZhdWx0cyAmJiBkZWZhdWx0cy5zeW50YXhlcyAmJiBkZWZhdWx0cy5zeW50YXhlcy5kZWZhdWx0KSB8fCBzeW50YXhlcy5kZWZhdWx0KTtcbiAgICBpZiAoIW1vZGUpIHRocm93IFJlZmVyZW5jZUVycm9yKGBUb2tlbml6ZXIuY29udGV4dHVhbGl6ZXIgaW52b2tlZCB3aXRob3V0IGEgbW9kZWApO1xuXG4gICAgLy8gVE9ETzogUmVmYWN0b3JpbmdcbiAgICBjb25zdCBpbml0aWFsaXplID0gY29udGV4dCA9PiB7XG4gICAgICBjb250ZXh0LnRva2VuIHx8XG4gICAgICAgIChjb250ZXh0LnRva2VuID0gKHRva2VuaXplciA9PiAodG9rZW5pemVyLm5leHQoKSwgdG9rZW4gPT4gdG9rZW5pemVyLm5leHQodG9rZW4pLnZhbHVlKSkoXG4gICAgICAgICAgdGhpcy50b2tlbml6ZXIoY29udGV4dCksXG4gICAgICAgICkpO1xuICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfTtcblxuICAgIGlmICghbW9kZS5jb250ZXh0KSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHN5bnRheCxcbiAgICAgICAgbWF0Y2hlciA9IChtb2RlLm1hdGNoZXIgPSAoZGVmYXVsdHMgJiYgZGVmYXVsdHMubWF0Y2hlcikgfHwgdW5kZWZpbmVkKSxcbiAgICAgICAgcXVvdGVzLFxuICAgICAgICBwdW5jdHVhdG9ycyA9IChtb2RlLnB1bmN0dWF0b3JzID0ge2FnZ3JlZ2F0b3JzOiB7fX0pLFxuICAgICAgICBwdW5jdHVhdG9yczoge2FnZ3JlZ2F0b3JzID0gKCRwdW5jdHVhdG9ycy5hZ2dyZWdhdG9ycyA9IHt9KX0sXG4gICAgICAgIHBhdHRlcm5zOiB7XG4gICAgICAgICAgbWF5YmVLZXl3b3JkID0gKG1vZGUucGF0dGVybnMubWF5YmVLZXl3b3JkID1cbiAgICAgICAgICAgICgoZGVmYXVsdHMgJiYgZGVmYXVsdHMucGF0dGVybnMpIHx8IHBhdHRlcm5zKS5tYXliZUtleXdvcmQgfHwgdW5kZWZpbmVkKSxcbiAgICAgICAgfSA9IChtb2RlLnBhdHRlcm5zID0ge21heWJlS2V5d29yZDogbnVsbH0pLFxuICAgICAgICBzcGFuczoge1tzeW50YXhdOiBzcGFuc30gPSBOdWxsLFxuICAgICAgfSA9IG1vZGU7XG5cbiAgICAgIGluaXRpYWxpemUoXG4gICAgICAgIChtb2RlLmNvbnRleHQgPSB7XG4gICAgICAgICAgbW9kZSxcbiAgICAgICAgICBwdW5jdHVhdG9ycyxcbiAgICAgICAgICBhZ2dyZWdhdG9ycyxcbiAgICAgICAgICBtYXRjaGVyLFxuICAgICAgICAgIHF1b3RlcyxcbiAgICAgICAgICBzcGFucyxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IHtcbiAgICAgIHN5bnRheDogJHN5bnRheCxcbiAgICAgIG1hdGNoZXI6ICRtYXRjaGVyLFxuICAgICAgcXVvdGVzOiAkcXVvdGVzLFxuICAgICAgcHVuY3R1YXRvcnM6ICRwdW5jdHVhdG9ycyxcbiAgICAgIHB1bmN0dWF0b3JzOiB7YWdncmVnYXRvcnM6ICRhZ2dyZWdhdG9yc30sXG4gICAgfSA9IG1vZGU7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKFxuICAgICAgICBncm91cGVyICE9PSAoZ3JvdXBlciA9IHlpZWxkIChncm91cGVyICYmIGdyb3VwZXIuY29udGV4dCkgfHwgbW9kZS5jb250ZXh0KSAmJlxuICAgICAgICBncm91cGVyICYmXG4gICAgICAgICFncm91cGVyLmNvbnRleHRcbiAgICAgICkge1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgZ29hbCA9ICRzeW50YXgsXG4gICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICBwdW5jdHVhdG9ycyA9ICRwdW5jdHVhdG9ycyxcbiAgICAgICAgICBhZ2dyZWdhdG9ycyA9ICRhZ2dyZWdhdG9ycyxcbiAgICAgICAgICBjbG9zZXIsXG4gICAgICAgICAgc3BhbnMsXG4gICAgICAgICAgbWF0Y2hlciA9ICRtYXRjaGVyLFxuICAgICAgICAgIHF1b3RlcyA9ICRxdW90ZXMsXG4gICAgICAgICAgZm9ybWluZyA9IGdvYWwgPT09ICRzeW50YXgsXG4gICAgICAgIH0gPSBncm91cGVyO1xuXG4gICAgICAgIGluaXRpYWxpemUoXG4gICAgICAgICAgKGdyb3VwZXIuY29udGV4dCA9IHtcbiAgICAgICAgICAgIG1vZGUsXG4gICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgcHVuY3R1YXRvcnMsXG4gICAgICAgICAgICBhZ2dyZWdhdG9ycyxcbiAgICAgICAgICAgIGNsb3NlcixcbiAgICAgICAgICAgIHNwYW5zLFxuICAgICAgICAgICAgbWF0Y2hlcixcbiAgICAgICAgICAgIHF1b3RlcyxcbiAgICAgICAgICAgIGZvcm1pbmcsXG4gICAgICAgICAgfSksXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhdGljICp0b2tlbml6ZXIoY29udGV4dCkge1xuICAgIGxldCBkb25lLCBuZXh0O1xuXG4gICAgY29uc3Qge1xuICAgICAgbW9kZToge1xuICAgICAgICBzeW50YXgsXG4gICAgICAgIGtleXdvcmRzLFxuICAgICAgICBhc3NpZ25lcnMsXG4gICAgICAgIG9wZXJhdG9ycyxcbiAgICAgICAgY29tYmluYXRvcnMsXG4gICAgICAgIG5vbmJyZWFrZXJzLFxuICAgICAgICBjb21tZW50cyxcbiAgICAgICAgY2xvc3VyZXMsXG4gICAgICAgIGJyZWFrZXJzLFxuICAgICAgICBwYXR0ZXJucyxcbiAgICAgIH0sXG4gICAgICBwdW5jdHVhdG9ycyxcbiAgICAgIGFnZ3JlZ2F0b3JzLFxuICAgICAgc3BhbnMsXG4gICAgICBxdW90ZXMsXG4gICAgICBmb3JtaW5nID0gdHJ1ZSxcbiAgICB9ID0gY29udGV4dDtcblxuICAgIGNvbnN0IHttYXliZUlkZW50aWZpZXIsIG1heWJlS2V5d29yZH0gPSBwYXR0ZXJucyB8fCBjb250ZXh0O1xuICAgIGNvbnN0IHdvcmRpbmcgPSBrZXl3b3JkcyB8fCBtYXliZUlkZW50aWZpZXIgPyB0cnVlIDogZmFsc2U7XG5cbiAgICBjb25zdCBMaW5lRW5kaW5ncyA9IC8kL2dtO1xuICAgIGNvbnN0IHB1bmN0dWF0ZSA9IHRleHQgPT5cbiAgICAgIChub25icmVha2VycyAmJiBub25icmVha2Vycy5pbmNsdWRlcyh0ZXh0KSAmJiAnbm9uYnJlYWtlcicpIHx8XG4gICAgICAob3BlcmF0b3JzICYmIG9wZXJhdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnb3BlcmF0b3InKSB8fFxuICAgICAgKGNvbW1lbnRzICYmIGNvbW1lbnRzLmluY2x1ZGVzKHRleHQpICYmICdjb21tZW50JykgfHxcbiAgICAgIChzcGFucyAmJiBzcGFucy5pbmNsdWRlcyh0ZXh0KSAmJiAnc3BhbicpIHx8XG4gICAgICAocXVvdGVzICYmIHF1b3Rlcy5pbmNsdWRlcyh0ZXh0KSAmJiAncXVvdGUnKSB8fFxuICAgICAgKGNsb3N1cmVzICYmIGNsb3N1cmVzLmluY2x1ZGVzKHRleHQpICYmICdjbG9zdXJlJykgfHxcbiAgICAgIChicmVha2VycyAmJiBicmVha2Vycy5pbmNsdWRlcyh0ZXh0KSAmJiAnYnJlYWtlcicpIHx8XG4gICAgICBmYWxzZTtcbiAgICBjb25zdCBhZ2dyZWdhdGUgPVxuICAgICAgKChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLmxlbmd0aCkgfHwgKGNvbWJpbmF0b3JzICYmIGNvbWJpbmF0b3JzLmxlbmd0aCkpICYmXG4gICAgICAodGV4dCA9PlxuICAgICAgICAoYXNzaWduZXJzICYmIGFzc2lnbmVycy5pbmNsdWRlcyh0ZXh0KSAmJiAnYXNzaWduZXInKSB8fFxuICAgICAgICAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMuaW5jbHVkZXModGV4dCkgJiYgJ2NvbWJpbmF0b3InKSB8fFxuICAgICAgICBmYWxzZSk7XG5cbiAgICB3aGlsZSAoIWRvbmUpIHtcbiAgICAgIGxldCB0b2tlbiwgcHVuY3R1YXRvcjtcbiAgICAgIGlmIChuZXh0ICYmIG5leHQudGV4dCkge1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgdGV4dCwgLy8gVGV4dCBmb3IgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgICAgdHlwZSwgLy8gVHlwZSBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgICAvLyBvZmZzZXQsIC8vIEluZGV4IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICAgIC8vIGJyZWFrcywgLy8gTGluZWJyZWFrcyBpbiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgICBoaW50LCAvLyBIaW50IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICAgIHByZXZpb3VzLCAvLyBQcmV2aW91cyBwcm9kdWN0aW9uXG4gICAgICAgICAgcGFyZW50ID0gKG5leHQucGFyZW50ID0gKHByZXZpb3VzICYmIHByZXZpb3VzLnBhcmVudCkgfHwgdW5kZWZpbmVkKSwgLy8gUGFyZW50IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICAgIGxhc3QsIC8vIExhc3Qgc2lnbmlmaWNhbnQgcHJvZHVjdGlvblxuICAgICAgICB9ID0gbmV4dDtcblxuICAgICAgICBpZiAodHlwZSA9PT0gJ3NlcXVlbmNlJykge1xuICAgICAgICAgIChuZXh0LnB1bmN0dWF0b3IgPVxuICAgICAgICAgICAgKGFnZ3JlZ2F0ZSAmJlxuICAgICAgICAgICAgICBwcmV2aW91cyAmJlxuICAgICAgICAgICAgICAoYWdncmVnYXRvcnNbdGV4dF0gfHxcbiAgICAgICAgICAgICAgICAoISh0ZXh0IGluIGFnZ3JlZ2F0b3JzKSAmJiAoYWdncmVnYXRvcnNbdGV4dF0gPSBhZ2dyZWdhdGUodGV4dCkpKSkpIHx8XG4gICAgICAgICAgICAocHVuY3R1YXRvcnNbdGV4dF0gfHxcbiAgICAgICAgICAgICAgKCEodGV4dCBpbiBwdW5jdHVhdG9ycykgJiYgKHB1bmN0dWF0b3JzW3RleHRdID0gcHVuY3R1YXRlKHRleHQpKSkpIHx8XG4gICAgICAgICAgICB1bmRlZmluZWQpICYmIChuZXh0LnR5cGUgPSAncHVuY3R1YXRvcicpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd3aGl0ZXNwYWNlJykge1xuICAgICAgICAgIG5leHQuYnJlYWtzID0gdGV4dC5tYXRjaChMaW5lRW5kaW5ncykubGVuZ3RoIC0gMTtcbiAgICAgICAgfSBlbHNlIGlmIChmb3JtaW5nICYmIHdvcmRpbmcpIHtcbiAgICAgICAgICAvLyB0eXBlICE9PSAnaW5kZW50JyAmJlxuICAgICAgICAgIGNvbnN0IHdvcmQgPSB0ZXh0LnRyaW0oKTtcbiAgICAgICAgICB3b3JkICYmXG4gICAgICAgICAgICAoKGtleXdvcmRzICYmXG4gICAgICAgICAgICAgIGtleXdvcmRzLmluY2x1ZGVzKHdvcmQpICYmXG4gICAgICAgICAgICAgICghbGFzdCB8fCBsYXN0LnB1bmN0dWF0b3IgIT09ICdub25icmVha2VyJyB8fCAocHJldmlvdXMgJiYgcHJldmlvdXMuYnJlYWtzID4gMCkpICYmXG4gICAgICAgICAgICAgIChuZXh0LnR5cGUgPSAna2V5d29yZCcpKSB8fFxuICAgICAgICAgICAgICAobWF5YmVJZGVudGlmaWVyICYmIG1heWJlSWRlbnRpZmllci50ZXN0KHdvcmQpICYmIChuZXh0LnR5cGUgPSAnaWRlbnRpZmllcicpKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmV4dC50eXBlID0gJ3RleHQnO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJldmlvdXMgJiYgKHByZXZpb3VzLm5leHQgPSBuZXh0KTtcblxuICAgICAgICB0b2tlbiA9IG5leHQ7XG4gICAgICB9XG5cbiAgICAgIG5leHQgPSB5aWVsZCB0b2tlbjtcbiAgICB9XG4gIH1cbn1cbiIsImltcG9ydCB7bWFwcGluZ3MsIG1vZGVzfSBmcm9tICcuL21vZGVzLmpzJztcbmltcG9ydCB7VG9rZW5pemVyfSBmcm9tICcuL3Rva2VuaXplci5qcyc7XG5cbmV4cG9ydCBjb25zdCBkZWZhdWx0cyA9IHtcbiAgbWF0Y2hlcjogbW9kZXMuZGVmYXVsdC5tYXRjaGVyLFxuICBzeW50YXg6ICdkZWZhdWx0JyxcbiAgc291cmNlVHlwZTogJ2RlZmF1bHQnLFxuICBtYXBwaW5ncyxcbiAgbW9kZXMsXG59O1xuXG5jb25zdCB0b2tlbml6ZXJzID0gbmV3IFdlYWtNYXAoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHRva2VuaXplKHNvdXJjZSwgc3RhdGUgPSB7fSkge1xuICBsZXQge1xuICAgIG9wdGlvbnM6IHtzb3VyY2VUeXBlfSA9IChzdGF0ZS5vcHRpb25zID0ge30pLFxuICB9ID0gc3RhdGU7XG4gIGNvbnN0IHtzeW50YXggPSAnZGVmYXVsdCd9ID0gbWFwcGluZ3Nbc291cmNlVHlwZV0gfHwgTnVsbDtcbiAgY29uc3QgbW9kZSA9IG1vZGVzW3N5bnRheF07XG4gIGlmICghbW9kZSkgdGhyb3cgUmVmZXJlbmNlRXJyb3IoJ3Rva2VuaXplIGludm9rZWQgd2l0aG91dCBhIG1vZGUnKTtcbiAgc3RhdGUub3B0aW9ucy5tb2RlID0gbW9kZTtcbiAgbGV0IHRva2VuaXplciA9IHRva2VuaXplcnMuZ2V0KG1vZGUpO1xuICB0b2tlbml6ZXIgfHwgdG9rZW5pemVycy5zZXQobW9kZSwgKHRva2VuaXplciA9IG5ldyBUb2tlbml6ZXIobW9kZSkpKTtcbiAgLy8gY29uc29sZS5sb2coe3Rva2VuaXplciwgbW9kZSwgc3RhdGV9KTtcbiAgcmV0dXJuIHRva2VuaXplci50b2tlbml6ZShzb3VyY2UpO1xufVxuXG4iLCJpbXBvcnQgKiBhcyBtb2RlcyBmcm9tICcuL21hcmt1cC1tb2Rlcy5qcyc7XG5pbXBvcnQgKiBhcyBkb20gZnJvbSAnLi9tYXJrdXAtZG9tLmpzJztcbmltcG9ydCAqIGFzIHBhcnNlciBmcm9tICcuL21hcmt1cC1wYXJzZXIuanMnO1xuaW1wb3J0ICogYXMgZXNwYXJzZXIgZnJvbSAnLi4vcGFja2FnZXMvZXNwcmVzc2lvbnMvbGliL3BhcnNlci9wYXJzZXIuanMnO1xuLy8gaW1wb3J0ICogYXMgcGF0dGVybnMgZnJvbSAnLi9tYXJrdXAtcGF0dGVybnMuanMnO1xuXG5leHBvcnQgbGV0IGluaXRpYWxpemVkO1xuXG5leHBvcnQgY29uc3QgcmVhZHkgPSAoYXN5bmMgKCkgPT4gdm9pZCAoYXdhaXQgbW9kZXMucmVhZHkpKSgpO1xuXG5jb25zdCB2ZXJzaW9ucyA9IFtcbiAgcGFyc2VyLFxuICBlc3BhcnNlclxuXTtcblxuY29uc3QgaW5pdGlhbGl6ZSA9ICgpID0+XG4gIGluaXRpYWxpemVkIHx8XG4gIChpbml0aWFsaXplZCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB7Y3JlYXRlRnJhZ21lbnQsIHN1cHBvcnRlZH0gPSBkb207XG5cbiAgICAvKipcbiAgICAgKiBUZW1wb3JhcnkgdGVtcGxhdGUgZWxlbWVudCBmb3IgcmVuZGVyaW5nXG4gICAgICogQHR5cGUge0hUTUxUZW1wbGF0ZUVsZW1lbnQ/fVxuICAgICAqL1xuICAgIGNvbnN0IHRlbXBsYXRlID1cbiAgICAgIHN1cHBvcnRlZCAmJlxuICAgICAgKHRlbXBsYXRlID0+XG4gICAgICAgICdIVE1MVGVtcGxhdGVFbGVtZW50JyA9PT0gKHRlbXBsYXRlICYmIHRlbXBsYXRlLmNvbnN0cnVjdG9yICYmIHRlbXBsYXRlLmNvbnN0cnVjdG9yLm5hbWUpICYmXG4gICAgICAgIHRlbXBsYXRlKShkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpKTtcblxuICAgIC8vLyBBUElcbiAgICBjb25zdCBzeW50YXhlcyA9IHt9O1xuICAgIGNvbnN0IHJlbmRlcmVycyA9IHt9O1xuICAgIGNvbnN0IGRlZmF1bHRzID0gey4uLnBhcnNlci5kZWZhdWx0c307XG5cbiAgICBhd2FpdCByZWFkeTtcbiAgICAvLy8gRGVmYXVsdHNcbiAgICBtb2Rlcy5pbnN0YWxsKGRlZmF1bHRzLCBzeW50YXhlcyk7XG4gICAgZG9tLmluc3RhbGwoZGVmYXVsdHMsIHJlbmRlcmVycyk7XG5cblxuICAgIC8vIHRva2VuaXplID0gKHNvdXJjZSwgb3B0aW9ucykgPT4gcGFyc2VyLnRva2VuaXplKHNvdXJjZSwge29wdGlvbnN9LCBkZWZhdWx0cyk7XG4gICAgdG9rZW5pemUgPSAoc291cmNlLCBvcHRpb25zID0ge30pID0+IHtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSB2ZXJzaW9uc1tvcHRpb25zLnZlcnNpb24gLSAxXTtcbiAgICAgIG9wdGlvbnMudG9rZW5pemUgPSB2ZXJzaW9uLnRva2VuaXplO1xuICAgICAgLy8gY29uc3Qgc291cmNlVHlwZSA9IG9wdGlvbnMuc291cmNlVHlwZTtcbiAgICAgIHJldHVybiB2ZXJzaW9uLnRva2VuaXplKHNvdXJjZSwge29wdGlvbnN9LCBkZWZhdWx0cyk7XG4gICAgfTtcblxuICAgIHJlbmRlciA9IGFzeW5jIChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gb3B0aW9ucy5mcmFnbWVudCB8fCBjcmVhdGVGcmFnbWVudCgpO1xuXG4gICAgICBjb25zdCBlbGVtZW50cyA9IHBhcnNlci5yZW5kZXIoc291cmNlLCBvcHRpb25zLCBkZWZhdWx0cyk7XG4gICAgICBsZXQgZmlyc3QgPSBhd2FpdCBlbGVtZW50cy5uZXh0KCk7XG5cbiAgICAgIGxldCBsb2dzID0gKGZyYWdtZW50LmxvZ3MgPSBbXSk7XG5cbiAgICAgIGlmIChmaXJzdCAmJiAndmFsdWUnIGluIGZpcnN0KSB7XG4gICAgICAgIGlmICghZG9tLm5hdGl2ZSAmJiB0ZW1wbGF0ZSAmJiAndGV4dENvbnRlbnQnIGluIGZyYWdtZW50KSB7XG4gICAgICAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3RleHQnIGluIHRlbXBsYXRlYCk7XG4gICAgICAgICAgY29uc3QgYm9keSA9IFtmaXJzdC52YWx1ZV07XG4gICAgICAgICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGJvZHkucHVzaChlbGVtZW50KTtcbiAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBib2R5LmpvaW4oJycpO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRlbXBsYXRlLmNvbnRlbnQpO1xuXG4gICAgICAgICAgLy8gaWYgKCFmaXJzdC5kb25lKSB7XG4gICAgICAgICAgLy8gICBpZiAodHlwZW9mIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIC8vICAgICAvLyAgJiYgZmlyc3QudmFsdWUudG9rZW5cbiAgICAgICAgICAvLyAgICAgbGV0IGxpbmVzID0gMDtcbiAgICAgICAgICAvLyAgICAgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgICAgICAgLy8gICAgICAgLy8gZWxlbWVudC50b2tlbiAmJlxuICAgICAgICAgIC8vICAgICAgIC8vICAgZWxlbWVudC50b2tlbi5icmVha3MgPiAwICYmXG4gICAgICAgICAgLy8gICAgICAgLy8gICAobGluZXMgKz0gZWxlbWVudC50b2tlbi5icmVha3MpICUgMiA9PT0gMCAmJlxuICAgICAgICAgIC8vICAgICAgIGxpbmVzKysgJSAxMCA9PT0gMCAmJlxuICAgICAgICAgIC8vICAgICAgICAgKCh0ZW1wbGF0ZS5pbm5lckhUTUwgPSBib2R5LnNwbGljZSgwLCBib2R5Lmxlbmd0aCkuam9pbignJykpLFxuICAgICAgICAgIC8vICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY29udGVudCkpO1xuICAgICAgICAgIC8vICAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxMDAwKSlcbiAgICAgICAgICAvLyAgICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4gICAgICAgICAgLy8gICAgICAgYm9keS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAgIC8vICAgICBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGJvZHkucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAvLyAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gYm9keS5qb2luKCcnKTsgLy8gdGV4dFxuICAgICAgICAgIC8vICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jb250ZW50KTtcbiAgICAgICAgICAvLyAgIH1cbiAgICAgICAgICAvLyB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ3B1c2gnIGluIGZyYWdtZW50KSB7XG4gICAgICAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3B1c2gnIGluIGZyYWdtZW50YCk7XG4gICAgICAgICAgZnJhZ21lbnQucHVzaChmaXJzdC52YWx1ZSk7XG4gICAgICAgICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGZyYWdtZW50LnB1c2goZWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2FwcGVuZCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgICAvLyAgJiYgZmlyc3QudmFsdWUubm9kZVR5cGUgPj0gMVxuICAgICAgICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICdhcHBlbmQnIGluIGZyYWdtZW50YCk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kKGZpcnN0LnZhbHVlKTtcbiAgICAgICAgICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZnJhZ21lbnQuYXBwZW5kKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGVsc2UgaWYgKCd0ZXh0Q29udGVudCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgLy8gICBsZXQgdGV4dCA9IGAke2ZpcnN0LnZhbHVlfWA7XG4gICAgICAgIC8vICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHRleHQgKz0gYCR7ZWxlbWVudH1gO1xuICAgICAgICAvLyAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAvLyAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3RleHQnIGluIHRlbXBsYXRlYCk7XG4gICAgICAgIC8vICAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICd0ZXh0JyBpbiBmcmFnbWVudGApO1xuICAgICAgICAvLyAgICAgLy8gVE9ETzogRmluZCBhIHdvcmthcm91bmQgZm9yIERvY3VtZW50RnJhZ21lbnQuaW5uZXJIVE1MXG4gICAgICAgIC8vICAgICBmcmFnbWVudC5pbm5lckhUTUwgPSB0ZXh0O1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcblxuICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIHJldHVybiBtYXJrdXA7XG4gIH0pKCk7XG5cbmV4cG9ydCBsZXQgcmVuZGVyID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICBhd2FpdCBpbml0aWFsaXplKCk7XG4gIHJldHVybiBhd2FpdCByZW5kZXIoc291cmNlLCBvcHRpb25zKTtcbn07XG5cbmV4cG9ydCBsZXQgdG9rZW5pemUgPSAoc291cmNlLCBvcHRpb25zKSA9PiB7XG4gIGlmICghaW5pdGlhbGl6ZWQpXG4gICAgdGhyb3cgRXJyb3IoYE1hcmt1cDogdG9rZW5pemUo4oCmKSBjYWxsZWQgYmVmb3JlIGluaXRpYWxpemF0aW9uLiAke01lc3NhZ2VzLkluaXRpYWxpemVGaXJzdH1gKTtcbiAgZWxzZSBpZiAoaW5pdGlhbGl6ZWQudGhlbilcbiAgICBFcnJvcihgTWFya3VwOiB0b2tlbml6ZSjigKYpIGNhbGxlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb24uICR7TWVzc2FnZXMuSW5pdGlhbGl6ZUZpcnN0fWApO1xuICByZXR1cm4gbWFya3VwLnRva2VuaXplKHNvdXJjZSwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBrZXlGcm9tID0gb3B0aW9ucyA9PiAob3B0aW9ucyAmJiBKU09OLnN0cmluZ2lmeShvcHRpb25zKSkgfHwgJyc7XG5jb25zdCBza2ltID0gaXRlcmFibGUgPT4ge1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlcmFibGUpO1xufTtcblxuZXhwb3J0IGNvbnN0IHdhcm11cCA9IGFzeW5jIChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgY29uc3Qga2V5ID0gKG9wdGlvbnMgJiYga2V5RnJvbShvcHRpb25zKSkgfHwgJyc7XG4gIGxldCBjYWNoZSA9ICh3YXJtdXAuY2FjaGUgfHwgKHdhcm11cC5jYWNoZSA9IG5ldyBNYXAoKSkpLmdldChrZXkpO1xuICBjYWNoZSB8fCB3YXJtdXAuY2FjaGUuc2V0KGtleSwgKGNhY2hlID0gbmV3IFNldCgpKSk7XG4gIGF3YWl0IChpbml0aWFsaXplZCB8fCBpbml0aWFsaXplKCkpO1xuICAvLyBsZXQgdG9rZW5zO1xuICBjYWNoZS5oYXMoc291cmNlKSB8fCAoc2tpbSh0b2tlbml6ZShzb3VyY2UsIG9wdGlvbnMpKSwgY2FjaGUuYWRkKHNvdXJjZSkpO1xuICAvLyBjYWNoZS5oYXMoc291cmNlKSB8fCAoKHRva2VucyA9PiB7IHdoaWxlICghdG9rZW5zLm5leHQoKS5kb25lKTsgfSkodG9rZW5pemUoc291cmNlLCBvcHRpb25zKSksIGNhY2hlLmFkZChzb3VyY2UpKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5leHBvcnQgY29uc3QgbWFya3VwID0gT2JqZWN0LmNyZWF0ZShwYXJzZXIsIHtcbiAgaW5pdGlhbGl6ZToge2dldDogKCkgPT4gaW5pdGlhbGl6ZX0sXG4gIHJlbmRlcjoge2dldDogKCkgPT4gcmVuZGVyfSxcbiAgdG9rZW5pemU6IHtnZXQ6ICgpID0+IHRva2VuaXplfSxcbiAgd2FybXVwOiB7Z2V0OiAoKSA9PiB3YXJtdXB9LFxuICBkb206IHtnZXQ6ICgpID0+IGRvbX0sXG4gIG1vZGVzOiB7Z2V0OiAoKSA9PiBwYXJzZXIubW9kZXN9LFxufSk7XG5cbi8vLyBDT05TVEFOVFNcblxuY29uc3QgTWVzc2FnZXMgPSB7XG4gIEluaXRpYWxpemVGaXJzdDogYFRyeSBjYWxsaW5nIE1hcmt1cC5pbml0aWFsaXplKCkudGhlbijigKYpIGZpcnN0LmAsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYXJrdXA7XG4iXSwibmFtZXMiOlsiZGVmYXVsdHMiLCJOdWxsIiwidG9rZW5pemUiLCJzeW50YXhlcyIsIm1hdGNoZXJzIiwicmVhZHkiLCJkb2N1bWVudCIsIkVsZW1lbnQiLCJOb2RlIiwiVGV4dCIsIkRvY3VtZW50RnJhZ21lbnQiLCJjcmVhdGVFbGVtZW50IiwiY3JlYXRlVGV4dCIsImNyZWF0ZUZyYWdtZW50IiwiZG9tLmRvY3VtZW50IiwicmVuZGVyZXIiLCJpbnN0YWxsIiwiZG9tLm5hdGl2ZSIsIm5hdGl2ZSIsImRvbS5wc2V1ZG8iLCJyYXciLCJzZXF1ZW5jZSIsImlkZW50aWZpZXIiLCJhbGwiLCJwYXR0ZXJucyIsImVudGl0aWVzIiwibW9kZXMiLCJHcm91cGVyIiwiY3JlYXRlR3JvdXBlciIsIm1vZGVzLnJlYWR5Iiwic3VwcG9ydGVkIiwiZG9tIiwicmVuZGVyZXJzIiwicGFyc2VyLmRlZmF1bHRzIiwibW9kZXMuaW5zdGFsbCIsImRvbS5pbnN0YWxsIiwicmVuZGVyIiwicGFyc2VyLnJlbmRlciIsIm1hcmt1cCIsInBhcnNlci5tb2RlcyJdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQSxBQUFPLFNBQVMsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUU7RUFDbEUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztDQUMvQzs7Ozs7QUFLRCxBQUFPLE1BQU0sUUFBUSxHQUFHO0VBQ3RCLE9BQU8sRUFBRSxvREFBb0Q7RUFDN0QsUUFBUSxFQUFFLGtFQUFrRTtFQUM1RSxNQUFNLEVBQUUsK0NBQStDO0VBQ3ZELEdBQUcsRUFBRSwyR0FBMkc7O0VBRWhILFNBQVMsRUFBRSxrTUFBa007Q0FDOU0sQ0FBQzs7O0FBR0YsQUFBTyxNQUFNLFFBQVEsR0FBRzs7RUFFdEIsWUFBWSxFQUFFLGVBQWU7Q0FDOUIsQ0FBQzs7OztBQUlGLEFBQU8sTUFBTSxRQUFRLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDOzs7QUFHM0UsQUFBTyxNQUFNLEtBQUssR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDOzs7O0FBSXBELEFBQU8sTUFBTUEsVUFBUSxJQUFJLE1BQU0sQ0FBQyxRQUFRLEdBQUc7RUFDekMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTO0VBQzNCLE1BQU0sRUFBRSxTQUFTO0VBQ2pCLFVBQVUsRUFBRSxTQUFTO0VBQ3JCLFNBQVMsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUM7RUFDekIsUUFBUTtFQUNSLElBQUksUUFBUSxHQUFHO0lBQ2IsT0FBTyxRQUFRLENBQUM7R0FDakI7RUFDRCxJ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
