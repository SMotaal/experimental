/**
 * Baseline markup fragmenter @author Saleh Abdel Motaal
 *
 * @description Fragmenting is the process of converting markup into
 * compositional fragments derived from tokens.
 */
function markup(source, options, defaults = markup.defaults) {
  return [...render(source, options, defaults)];
}

/// REGULAR EXPRESSIONS

/**
 * Non-alphanumeric symbol matching expressions (inteded to be extended)
 *
 * @description Matchers are used by the token generator to scan for symbols,
 * allowing them to select a specific matcher for each context. The following
 * expressions are the most basic ones, intended to be used for unit tests only
 * whereas normally these matchers are replaced by ones defined separately.
 *
 * @see {markup-modes.js}
 */
const matchers = {
  escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
  comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
  quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
  xml: /([\s\n]+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
  sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
};

/**
 * Special alpha-numeric symbol test expressions (inteded to be extended)
 *
 * @description Patterns are used to further qualify sequences commonly needed
 * by the token generator as well as the hooks defined in custom modes. This
 * guarentees a single source of truth for things like keyword, identifier,
 * tag-name… etc.
 */
const patterns = {
  /** Basic latin Keyword like symbol (inteded to be extended) */
  maybeKeyword: /^[a-z](\w*)$/i,
};

/// SYNTAXES
/**
 * Syntax definitions (inteded to be extended)
 *
 * @description Syntaxes are extensible human-friendly concise definitions used
 * by the token generator to progressively synthesize the more volatile but
 * highly optimized structures needed for scanning and parsing different
 * grammars across different syntaxes and modes.
 */
const syntaxes = {default: {patterns, matcher: matchers.sequences}};

/**
 * Mode states (inteded to be extended)
 *
 * @description Modes provide the necessary mapping between the label of a
 * particular top-level syntax (ie language) and the actual syntax definitions.
 */
const modes = {default: {syntax: 'default'}};

/// DEFAULTS
/**
 * Parsing defaults (inteded to be extended)
 *
 * @description Defaults provide a configurable side-channel used to safely
 * integrate custom modes without direct coupling to the parser.
 */
const defaults = (markup.defaults = {
  matcher: matchers.sequences,
  syntax: 'default',
  sourceType: 'default',
  renderers: {text: String},
  renderer,
  get syntaxes() {
    return syntaxes;
  },
  set syntaxes(value) {
    if (this !== defaults)
      throw Error(
        'Invalid assignment: direct assignment to defaults is not allowed. Use Object.create(defaults) to create a mutable instance of defaults first.',
      );
    Object.defineProperty(this, 'syntaxes', {value});
  },
});

const Null = Object.freeze(Object.create(null));

/// RENDERING
/**
 * Token prototype (inteded to be extended)
 *
 * @description Token is a prototype that can be extended to create complex
 * constructs like those used for syntax trees, or other directions not baked
 * into the current design.
 */
class Token {
  toString() {
    return this.text;
  }
}

/**
 * Asynchronous rendering interface
 *
 * @description Rendeing is the point in which the usually synchronous token
 * generation process downstreams into an usually asynchronous fragmentation
 * pipeline, a design choice that makes it possible to benefit synchronous
 * execution speeds in the tokenization and be able to suspend it, without
 * incurring asynchronous overhead (ie Promises) needlessly by defering it
 * downstream. Synchronous workflows be implemented by hooking directly into
 * the tokens iterator which is not asynchronous by default.
 */
function render(source, options, defaults = markup.defaults) {
  const {syntax, renderer = defaults.renderer, ...tokenizerOptions} = options || defaults;
  const state = {options: tokenizerOptions};
  return renderer(tokenize(source, state, defaults));
}

/** Asynchronous renderer */
async function* renderer(tokens) {
  let i = 0;
  for await (const token of tokens) {
    if (!token) continue;
    // i++ % 100 || (await 0);
    i++ % 500 || (await new Promise(r => setTimeout(r, 1)));
    yield Object.setPrototypeOf(token, Token.prototype);
  }
}

/** Synchronous renderer */
renderer.sync = function* renderer(tokens) {
  for (const token of tokens) {
    token && (yield Object.setPrototypeOf(token, Token.prototype));
  }
};

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

  const {
    syntax: $syntax,
    matcher: $matcher = ($.matcher = defaults.matcher),
    quotes: $quotes,

    punctuators: $punctuators = ($.punctuators = {aggregators: {}}),
    punctuators: {aggregators: $aggregators = ($.punctuators.aggregators = {})},

    patterns: $patterns = ($.patterns = {maybeKeyword: null}),
    patterns: {
      maybeKeyword = ($.patterns.maybeKeyword =
        ((defaults && defaults.patterns) || patterns).maybeKeyword || undefined),
    },

    spans: $spans = ($.spans = Null),

    keywords: $keywords,
    assigners: $assigners,
    operators: $operators,
    combinators: $combinators,
    nonbreakers: $nonbreakers,
    comments: $comments,
    closures: $closures,
    breakers: $breakers,

    root: $root = ($.root = {
      syntax: $syntax,
      keywords: $keywords,
      assigners: $assigners,
      operators: $operators,
      combinators: $combinators,
      nonbreakers: $nonbreakers,
      comments: $comments,
      closures: $closures,
      breakers: $breakers,
      patterns: $patterns,
    }),

    context: $context = initialize(
      ($.context = {
        // $,
        ...$root,
        punctuators: $punctuators,
        aggregators: $aggregators,
        matcher: $matcher, // matcher: matcher.matcher,
        quotes: $quotes,
        spans: $spans[$syntax],
      }),
    ),
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

      // !matcher || matcher.matcher || (matcher.matcher = new RegExp(matcher.source, matcher.flags.replace('g', 'y')));

      initialize(
        (grouper.context = {
          // $,
          ...$root, // ... $.context,
          punctuator,
          punctuators,
          aggregators,
          closer,
          spans,
          matcher, // matcher: matcher && matcher.matcher,
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
    $ = Null, // $: { syntax, keywords, assigners, operators, combinators, nonbreakers, comments, closures, breakers, patterns },

    syntax = $.syntax,
    keywords = $.keywords,
    assigners = $.assigners,
    operators = $.operators,
    combinators = $.combinators,
    nonbreakers = $.nonbreakers,
    comments = $.comments,
    closures = $.closures,
    breakers = $.breakers,
    patterns = $.patterns,

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

// TODO: <@SMotaal> Refactor
function* tokenize(source, state = {}, defaults = markup.defaults) {
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
      $ = Null, // $: {syntax, matchers, comments, spans, closures},

      syntax = $.syntax,
      matchers = $.matchers,
      comments = $.comments,
      spans = $.spans,
      closures = $.closures,

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
              ((tokens = tokenize(body, {options: {syntax}}, defaults)), (nextIndex = index));
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

// xml: /([\s\n]+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<%|%>|<!--|-->|<[\/\!]?)/gi,

var parser = /*#__PURE__*/Object.freeze({
  markup: markup,
  matchers: matchers,
  patterns: patterns,
  syntaxes: syntaxes,
  modes: modes,
  defaults: defaults,
  Token: Token,
  render: render,
  renderer: renderer,
  contextualizer: contextualizer,
  tokenizer: tokenizer,
  tokenize: tokenize
});

/** @typedef {RegExp|string} Pattern - Valid /(…)/ sub expression */

/// Expressions
const raw = String.raw;

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

/// Helpers
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

/// Regular Expressions
const RegExpUnicodeProperties = /\\p{ *(\w+) *}/g;

RegExpUnicodeProperties.replace = (m, propertyKey) => {
  // const property = ASCII[propertyKey] || Unicode[propertyKey];
  const property = Ranges[propertyKey];
  if (property) return property.toString();
  throw RangeError(`Cannot rewrite unicode property "${propertyKey}"`);
};

RegExpUnicodeProperties.rewrite = expression => {
  let flags = expression && expression.flags;
  let source = expression && `${expression.source || expression || ''}`;
  source &&
    RegExpUnicodeProperties.test(source) &&
    (source = source.replace(RegExpUnicodeProperties, RegExpUnicodeProperties.replace));
  return (flags && new RegExp(source, flags)) || source;
};

/// Interoperability
const supported =
  // TODO: Remove when ssupporting non-unicode runtimes [not in scope]
  new RegExp(raw`\uFFFF`, 'u') &&
  supports(
    UnicodeProperties => new RegExp(raw`\p{L}`, 'u'),
    UnicodeClasses => new RegExp(raw`\p{ID_Start}\p{ID_Continue}`, 'u'),
  );

async function replaceUnsupportedExpressions() {
  // await Unicode.initialize(); console.log(Unicode);
  for (const key in entities) {
    const sources = entities[key];
    const replacements = {};
    for (const id in sources)
      !sources[id] ||
        typeof (sources[id].source || sources[id]) !== 'string' ||
        (replacements[id] = RegExpUnicodeProperties.rewrite(sources[id]));
    Object.assign(sources, replacements);
  }
  return;
}

function supports(feature, ...features) {
  if (feature) {
    try {
      feature();
    } catch (exception) {
      return false;
    }
  }
  return !features.length || Reflect.apply(supports, null, features);
}

// TODO: Fix UnicodeRange.merge if not implemented in Firefox soon
// import {Unicode} from './unicode/unicode.js';

// TODO: Remove Ranges once UnicodeRange is working
const Ranges = {
  // L: 'a-zA-Z',
  // N: '0-9',
  ID_Start: raw`a-zA-Z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
  ID_Continue: raw`a-zA-Z0-9\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`,
};

/// Bootstrap
const ready = (entities.ready = supported
  ? Promise.resolve()
  : replaceUnsupportedExpressions());

/// INTERFACE

const install = (defaults$$1, newSyntaxes = defaults$$1.syntaxes || {}) => {
  Object.assign(newSyntaxes, syntaxes$1);
  defaults$$1.syntaxes === newSyntaxes || (defaults$$1.syntaxes = newSyntaxes);
};

const syntaxes$1 = {};

/// DEFINITIONS
Syntaxes: {
  /// Helpers
  const raw = String.raw;
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
      ...(modes.javascript = modes.es = modes.js = {syntax: 'es'}),
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
        quote: matchers.quotes,
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

const supported$1 = !!native;
const native$1 = !HTML_MODE && supported$1;
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
  supported: supported$1,
  native: native$1,
  createElement: createElement$3,
  createText: createText$3,
  createFragment: createFragment$3
});

// import * as patterns from './markup-patterns.js';

let initialized;

const ready$2 = (async () => void (await ready$1))();

const initialize = () =>
  initialized ||
  (initialized = async () => {
    const {createFragment, supported} = dom$1;

    /**
     * Temporary template element for rendering
     * @type {HTMLTemplateElement?}
     */
    const template =
      supported &&
      (template =>
        'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) &&
        template)(document.createElement('template'));

    /// API
    const syntaxes$$1 = {};
    const renderers$$1 = {};
    const defaults$$1 = {...defaults};

    await ready$2;
    /// Defaults
    install(defaults$$1, syntaxes$$1);
    install$1(defaults$$1, renderers$$1);

    tokenize$1 = (source, options) => tokenize(source, {options}, defaults$$1);

    render$1 = async (source, options) => {
      const fragment = options.fragment || createFragment();

      const elements = render(source, options, defaults$$1);
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

let tokenize$1 = (source, options) => {
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
  cache.has(source) || (skim(tokenize$1(source, options)), cache.add(source));
  // cache.has(source) || ((tokens => { while (!tokens.next().done); })(tokenize(source, options)), cache.add(source));
  return true;
};

const markup$1 = Object.create(parser, {
  initialize: {get: () => initialize},
  render: {get: () => render$1},
  tokenize: {get: () => tokenize$1},
  warmup: {get: () => warmup},
  dom: {get: () => dom$1},
  modes: {get: () => modes},
});

/// CONSTANTS

const Messages = {
  InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
};

export default markup$1;
export { initialized, ready$2 as ready, render$1 as render, tokenize$1 as tokenize, warmup, markup$1 as markup };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwLm1qcyIsInNvdXJjZXMiOlsiLi4vbWFya3VwL2xpYi9tYXJrdXAtcGFyc2VyLmpzIiwiLi4vbWFya3VwL2xpYi9tYXJrdXAtcGF0dGVybnMuanMiLCIuLi9tYXJrdXAvbGliL21hcmt1cC1tb2Rlcy5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9wc2V1ZG9tL2xpYi9wc2V1ZG8uanMiLCIuLi9tYXJrdXAvcGFja2FnZXMvcHNldWRvbS9saWIvbmF0aXZlLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL3BzZXVkb20vaW5kZXguanMiLCIuLi9tYXJrdXAvbGliL21hcmt1cC1kb20uanMiLCIuLi9tYXJrdXAvbGliL21hcmt1cC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEJhc2VsaW5lIG1hcmt1cCBmcmFnbWVudGVyIEBhdXRob3IgU2FsZWggQWJkZWwgTW90YWFsXG4gKlxuICogQGRlc2NyaXB0aW9uIEZyYWdtZW50aW5nIGlzIHRoZSBwcm9jZXNzIG9mIGNvbnZlcnRpbmcgbWFya3VwIGludG9cbiAqIGNvbXBvc2l0aW9uYWwgZnJhZ21lbnRzIGRlcml2ZWQgZnJvbSB0b2tlbnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrdXAoc291cmNlLCBvcHRpb25zLCBkZWZhdWx0cyA9IG1hcmt1cC5kZWZhdWx0cykge1xuICByZXR1cm4gWy4uLnJlbmRlcihzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzKV07XG59XG5cbi8vLyBSRUdVTEFSIEVYUFJFU1NJT05TXG5cbi8qKlxuICogTm9uLWFscGhhbnVtZXJpYyBzeW1ib2wgbWF0Y2hpbmcgZXhwcmVzc2lvbnMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpXG4gKlxuICogQGRlc2NyaXB0aW9uIE1hdGNoZXJzIGFyZSB1c2VkIGJ5IHRoZSB0b2tlbiBnZW5lcmF0b3IgdG8gc2NhbiBmb3Igc3ltYm9scyxcbiAqIGFsbG93aW5nIHRoZW0gdG8gc2VsZWN0IGEgc3BlY2lmaWMgbWF0Y2hlciBmb3IgZWFjaCBjb250ZXh0LiBUaGUgZm9sbG93aW5nXG4gKiBleHByZXNzaW9ucyBhcmUgdGhlIG1vc3QgYmFzaWMgb25lcywgaW50ZW5kZWQgdG8gYmUgdXNlZCBmb3IgdW5pdCB0ZXN0cyBvbmx5XG4gKiB3aGVyZWFzIG5vcm1hbGx5IHRoZXNlIG1hdGNoZXJzIGFyZSByZXBsYWNlZCBieSBvbmVzIGRlZmluZWQgc2VwYXJhdGVseS5cbiAqXG4gKiBAc2VlIHttYXJrdXAtbW9kZXMuanN9XG4gKi9cbmV4cG9ydCBjb25zdCBtYXRjaGVycyA9IHtcbiAgZXNjYXBlczogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcKlxcL3xgfFwifCd8XFwkXFx7KS9nLFxuICBjb21tZW50czogLyhcXG4pfChcXCpcXC98XFxiKD86W2Etel0rXFw6XFwvXFwvfFxcd1tcXHdcXCtcXC5dKlxcd0BbYS16XSspXFxTK3xAW2Etel0rKS9naSxcbiAgcXVvdGVzOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98YHxcInwnfFxcJFxceykvZyxcbiAgeG1sOiAvKFtcXHNcXG5dKyl8KFwifCd8PXwmI3g/W2EtZjAtOV0rO3wmW2Etel0rO3xcXC8/Pnw8JXwlPnw8IS0tfC0tPnw8W1xcL1xcIV0/KD89W2Etel0rXFw6P1thLXpcXC1dKlthLXpdfFthLXpdKykpL2dpLFxuICBzZXF1ZW5jZXM6IC8oW1xcc1xcbl0rKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXC9cXC98XFwvXFwqfFxcKlxcL3xcXCh8XFwpfFxcW3xcXF18LHw7fFxcLlxcLlxcLnxcXC58XFxiOlxcL1xcL1xcYnw6Onw6fFxcP3xgfFwifCd8XFwkXFx7fFxce3xcXH18PT58PFxcL3xcXC8+fFxcKyt8XFwtK3xcXCorfCYrfFxcfCt8PSt8IT17MCwzfXw8ezEsM309P3w+ezEsMn09Pyl8WytcXC0qLyZ8XiU8Pn4hXT0/L2csXG59O1xuXG4vKipcbiAqIFNwZWNpYWwgYWxwaGEtbnVtZXJpYyBzeW1ib2wgdGVzdCBleHByZXNzaW9ucyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZClcbiAqXG4gKiBAZGVzY3JpcHRpb24gUGF0dGVybnMgYXJlIHVzZWQgdG8gZnVydGhlciBxdWFsaWZ5IHNlcXVlbmNlcyBjb21tb25seSBuZWVkZWRcbiAqIGJ5IHRoZSB0b2tlbiBnZW5lcmF0b3IgYXMgd2VsbCBhcyB0aGUgaG9va3MgZGVmaW5lZCBpbiBjdXN0b20gbW9kZXMuIFRoaXNcbiAqIGd1YXJlbnRlZXMgYSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciB0aGluZ3MgbGlrZSBrZXl3b3JkLCBpZGVudGlmaWVyLFxuICogdGFnLW5hbWXigKYgZXRjLlxuICovXG5leHBvcnQgY29uc3QgcGF0dGVybnMgPSB7XG4gIC8qKiBCYXNpYyBsYXRpbiBLZXl3b3JkIGxpa2Ugc3ltYm9sIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuICBtYXliZUtleXdvcmQ6IC9eW2Etel0oXFx3KikkL2ksXG59O1xuXG4vLy8gU1lOVEFYRVNcbi8qKlxuICogU3ludGF4IGRlZmluaXRpb25zIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKVxuICpcbiAqIEBkZXNjcmlwdGlvbiBTeW50YXhlcyBhcmUgZXh0ZW5zaWJsZSBodW1hbi1mcmllbmRseSBjb25jaXNlIGRlZmluaXRpb25zIHVzZWRcbiAqIGJ5IHRoZSB0b2tlbiBnZW5lcmF0b3IgdG8gcHJvZ3Jlc3NpdmVseSBzeW50aGVzaXplIHRoZSBtb3JlIHZvbGF0aWxlIGJ1dFxuICogaGlnaGx5IG9wdGltaXplZCBzdHJ1Y3R1cmVzIG5lZWRlZCBmb3Igc2Nhbm5pbmcgYW5kIHBhcnNpbmcgZGlmZmVyZW50XG4gKiBncmFtbWFycyBhY3Jvc3MgZGlmZmVyZW50IHN5bnRheGVzIGFuZCBtb2Rlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IHN5bnRheGVzID0ge2RlZmF1bHQ6IHtwYXR0ZXJucywgbWF0Y2hlcjogbWF0Y2hlcnMuc2VxdWVuY2VzfX07XG5cbi8qKlxuICogTW9kZSBzdGF0ZXMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpXG4gKlxuICogQGRlc2NyaXB0aW9uIE1vZGVzIHByb3ZpZGUgdGhlIG5lY2Vzc2FyeSBtYXBwaW5nIGJldHdlZW4gdGhlIGxhYmVsIG9mIGFcbiAqIHBhcnRpY3VsYXIgdG9wLWxldmVsIHN5bnRheCAoaWUgbGFuZ3VhZ2UpIGFuZCB0aGUgYWN0dWFsIHN5bnRheCBkZWZpbml0aW9ucy5cbiAqL1xuZXhwb3J0IGNvbnN0IG1vZGVzID0ge2RlZmF1bHQ6IHtzeW50YXg6ICdkZWZhdWx0J319O1xuXG4vLy8gREVGQVVMVFNcbi8qKlxuICogUGFyc2luZyBkZWZhdWx0cyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZClcbiAqXG4gKiBAZGVzY3JpcHRpb24gRGVmYXVsdHMgcHJvdmlkZSBhIGNvbmZpZ3VyYWJsZSBzaWRlLWNoYW5uZWwgdXNlZCB0byBzYWZlbHlcbiAqIGludGVncmF0ZSBjdXN0b20gbW9kZXMgd2l0aG91dCBkaXJlY3QgY291cGxpbmcgdG8gdGhlIHBhcnNlci5cbiAqL1xuZXhwb3J0IGNvbnN0IGRlZmF1bHRzID0gKG1hcmt1cC5kZWZhdWx0cyA9IHtcbiAgbWF0Y2hlcjogbWF0Y2hlcnMuc2VxdWVuY2VzLFxuICBzeW50YXg6ICdkZWZhdWx0JyxcbiAgc291cmNlVHlwZTogJ2RlZmF1bHQnLFxuICByZW5kZXJlcnM6IHt0ZXh0OiBTdHJpbmd9LFxuICByZW5kZXJlcixcbiAgZ2V0IHN5bnRheGVzKCkge1xuICAgIHJldHVybiBzeW50YXhlcztcbiAgfSxcbiAgc2V0IHN5bnRheGVzKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMgIT09IGRlZmF1bHRzKVxuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIGFzc2lnbm1lbnQ6IGRpcmVjdCBhc3NpZ25tZW50IHRvIGRlZmF1bHRzIGlzIG5vdCBhbGxvd2VkLiBVc2UgT2JqZWN0LmNyZWF0ZShkZWZhdWx0cykgdG8gY3JlYXRlIGEgbXV0YWJsZSBpbnN0YW5jZSBvZiBkZWZhdWx0cyBmaXJzdC4nLFxuICAgICAgKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N5bnRheGVzJywge3ZhbHVlfSk7XG4gIH0sXG59KTtcblxuY29uc3QgTnVsbCA9IE9iamVjdC5mcmVlemUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbi8vLyBSRU5ERVJJTkdcbi8qKlxuICogVG9rZW4gcHJvdG90eXBlIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKVxuICpcbiAqIEBkZXNjcmlwdGlvbiBUb2tlbiBpcyBhIHByb3RvdHlwZSB0aGF0IGNhbiBiZSBleHRlbmRlZCB0byBjcmVhdGUgY29tcGxleFxuICogY29uc3RydWN0cyBsaWtlIHRob3NlIHVzZWQgZm9yIHN5bnRheCB0cmVlcywgb3Igb3RoZXIgZGlyZWN0aW9ucyBub3QgYmFrZWRcbiAqIGludG8gdGhlIGN1cnJlbnQgZGVzaWduLlxuICovXG5leHBvcnQgY2xhc3MgVG9rZW4ge1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy50ZXh0O1xuICB9XG59XG5cbi8qKlxuICogQXN5bmNocm9ub3VzIHJlbmRlcmluZyBpbnRlcmZhY2VcbiAqXG4gKiBAZGVzY3JpcHRpb24gUmVuZGVpbmcgaXMgdGhlIHBvaW50IGluIHdoaWNoIHRoZSB1c3VhbGx5IHN5bmNocm9ub3VzIHRva2VuXG4gKiBnZW5lcmF0aW9uIHByb2Nlc3MgZG93bnN0cmVhbXMgaW50byBhbiB1c3VhbGx5IGFzeW5jaHJvbm91cyBmcmFnbWVudGF0aW9uXG4gKiBwaXBlbGluZSwgYSBkZXNpZ24gY2hvaWNlIHRoYXQgbWFrZXMgaXQgcG9zc2libGUgdG8gYmVuZWZpdCBzeW5jaHJvbm91c1xuICogZXhlY3V0aW9uIHNwZWVkcyBpbiB0aGUgdG9rZW5pemF0aW9uIGFuZCBiZSBhYmxlIHRvIHN1c3BlbmQgaXQsIHdpdGhvdXRcbiAqIGluY3VycmluZyBhc3luY2hyb25vdXMgb3ZlcmhlYWQgKGllIFByb21pc2VzKSBuZWVkbGVzc2x5IGJ5IGRlZmVyaW5nIGl0XG4gKiBkb3duc3RyZWFtLiBTeW5jaHJvbm91cyB3b3JrZmxvd3MgYmUgaW1wbGVtZW50ZWQgYnkgaG9va2luZyBkaXJlY3RseSBpbnRvXG4gKiB0aGUgdG9rZW5zIGl0ZXJhdG9yIHdoaWNoIGlzIG5vdCBhc3luY2hyb25vdXMgYnkgZGVmYXVsdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlcihzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzID0gbWFya3VwLmRlZmF1bHRzKSB7XG4gIGNvbnN0IHtzeW50YXgsIHJlbmRlcmVyID0gZGVmYXVsdHMucmVuZGVyZXIsIC4uLnRva2VuaXplck9wdGlvbnN9ID0gb3B0aW9ucyB8fCBkZWZhdWx0cztcbiAgY29uc3Qgc3RhdGUgPSB7b3B0aW9uczogdG9rZW5pemVyT3B0aW9uc307XG4gIHJldHVybiByZW5kZXJlcih0b2tlbml6ZShzb3VyY2UsIHN0YXRlLCBkZWZhdWx0cykpO1xufVxuXG4vKiogQXN5bmNocm9ub3VzIHJlbmRlcmVyICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlbmRlcmVyKHRva2Vucykge1xuICBsZXQgaSA9IDA7XG4gIGZvciBhd2FpdCAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgaWYgKCF0b2tlbikgY29udGludWU7XG4gICAgLy8gaSsrICUgMTAwIHx8IChhd2FpdCAwKTtcbiAgICBpKysgJSA1MDAgfHwgKGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxKSkpO1xuICAgIHlpZWxkIE9iamVjdC5zZXRQcm90b3R5cGVPZih0b2tlbiwgVG9rZW4ucHJvdG90eXBlKTtcbiAgfVxufVxuXG4vKiogU3luY2hyb25vdXMgcmVuZGVyZXIgKi9cbnJlbmRlcmVyLnN5bmMgPSBmdW5jdGlvbiogcmVuZGVyZXIodG9rZW5zKSB7XG4gIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgdG9rZW4gJiYgKHlpZWxkIE9iamVjdC5zZXRQcm90b3R5cGVPZih0b2tlbiwgVG9rZW4ucHJvdG90eXBlKSk7XG4gIH1cbn07XG5cbi8vLyBHUk9VUElOR1xuY29uc3QgR3JvdXBlciA9ICh7XG4gIC8qIGdyb3VwZXIgY29udGV4dCAqL1xuICBzeW50YXgsXG4gIGdvYWwgPSBzeW50YXgsXG4gIHF1b3RlLFxuICBjb21tZW50LFxuICBjbG9zdXJlLFxuICBzcGFuLFxuICBncm91cGluZyA9IGNvbW1lbnQgfHwgY2xvc3VyZSB8fCBzcGFuIHx8IHVuZGVmaW5lZCxcblxuICBwdW5jdHVhdG9yLFxuICBzcGFucyA9IChncm91cGluZyAmJiBncm91cGluZy5zcGFucykgfHwgdW5kZWZpbmVkLFxuICBtYXRjaGVyID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm1hdGNoZXIpIHx8IHVuZGVmaW5lZCxcbiAgcXVvdGVzID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnF1b3RlcykgfHwgdW5kZWZpbmVkLFxuICBwdW5jdHVhdG9ycyA9IHthZ2dyZWdhdG9yczoge319LFxuICBvcGVuZXIgPSBxdW90ZSB8fCAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcub3BlbmVyKSB8fCB1bmRlZmluZWQsXG4gIGNsb3NlciA9IHF1b3RlIHx8IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZXIpIHx8IHVuZGVmaW5lZCxcbiAgaGludGVyLFxuICBvcGVuID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm9wZW4pIHx8IHVuZGVmaW5lZCxcbiAgY2xvc2UgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuY2xvc2UpIHx8IHVuZGVmaW5lZCxcbn0pID0+ICh7XG4gIHN5bnRheCxcbiAgZ29hbCxcbiAgcHVuY3R1YXRvcixcbiAgc3BhbnMsXG4gIG1hdGNoZXIsXG4gIHF1b3RlcyxcbiAgcHVuY3R1YXRvcnMsXG4gIG9wZW5lcixcbiAgY2xvc2VyLFxuICBoaW50ZXIsXG4gIG9wZW4sXG4gIGNsb3NlLFxufSk7XG5cbmNvbnN0IGNyZWF0ZUdyb3VwZXIgPSBHcm91cGVyO1xuXG4vLy8gVE9LRU5JWkFUSU9OXG5cbmV4cG9ydCBmdW5jdGlvbiogY29udGV4dHVhbGl6ZXIoJCwgZGVmYXVsdHMpIHtcbiAgbGV0IGRvbmUsIGdyb3VwZXI7XG5cbiAgJCAhPT0gdW5kZWZpbmVkIHx8XG4gICAgKCQgPSAoZGVmYXVsdHMgJiYgZGVmYXVsdHMuc3ludGF4ZXMgJiYgZGVmYXVsdHMuc3ludGF4ZXMuZGVmYXVsdCkgfHwgc3ludGF4ZXMuZGVmYXVsdCk7XG5cbiAgY29uc3QgaW5pdGlhbGl6ZSA9IGNvbnRleHQgPT4ge1xuICAgIGNvbnRleHQudG9rZW4gfHxcbiAgICAgIChjb250ZXh0LnRva2VuID0gKHRva2VuaXplciA9PiAodG9rZW5pemVyLm5leHQoKSwgdG9rZW4gPT4gdG9rZW5pemVyLm5leHQodG9rZW4pLnZhbHVlKSkoXG4gICAgICAgIHRva2VuaXplcihjb250ZXh0KSxcbiAgICAgICkpO1xuICAgIGNvbnRleHQ7XG4gIH07XG5cbiAgY29uc3Qge1xuICAgIHN5bnRheDogJHN5bnRheCxcbiAgICBtYXRjaGVyOiAkbWF0Y2hlciA9ICgkLm1hdGNoZXIgPSBkZWZhdWx0cy5tYXRjaGVyKSxcbiAgICBxdW90ZXM6ICRxdW90ZXMsXG5cbiAgICBwdW5jdHVhdG9yczogJHB1bmN0dWF0b3JzID0gKCQucHVuY3R1YXRvcnMgPSB7YWdncmVnYXRvcnM6IHt9fSksXG4gICAgcHVuY3R1YXRvcnM6IHthZ2dyZWdhdG9yczogJGFnZ3JlZ2F0b3JzID0gKCQucHVuY3R1YXRvcnMuYWdncmVnYXRvcnMgPSB7fSl9LFxuXG4gICAgcGF0dGVybnM6ICRwYXR0ZXJucyA9ICgkLnBhdHRlcm5zID0ge21heWJlS2V5d29yZDogbnVsbH0pLFxuICAgIHBhdHRlcm5zOiB7XG4gICAgICBtYXliZUtleXdvcmQgPSAoJC5wYXR0ZXJucy5tYXliZUtleXdvcmQgPVxuICAgICAgICAoKGRlZmF1bHRzICYmIGRlZmF1bHRzLnBhdHRlcm5zKSB8fCBwYXR0ZXJucykubWF5YmVLZXl3b3JkIHx8IHVuZGVmaW5lZCksXG4gICAgfSxcblxuICAgIHNwYW5zOiAkc3BhbnMgPSAoJC5zcGFucyA9IE51bGwpLFxuXG4gICAga2V5d29yZHM6ICRrZXl3b3JkcyxcbiAgICBhc3NpZ25lcnM6ICRhc3NpZ25lcnMsXG4gICAgb3BlcmF0b3JzOiAkb3BlcmF0b3JzLFxuICAgIGNvbWJpbmF0b3JzOiAkY29tYmluYXRvcnMsXG4gICAgbm9uYnJlYWtlcnM6ICRub25icmVha2VycyxcbiAgICBjb21tZW50czogJGNvbW1lbnRzLFxuICAgIGNsb3N1cmVzOiAkY2xvc3VyZXMsXG4gICAgYnJlYWtlcnM6ICRicmVha2VycyxcblxuICAgIHJvb3Q6ICRyb290ID0gKCQucm9vdCA9IHtcbiAgICAgIHN5bnRheDogJHN5bnRheCxcbiAgICAgIGtleXdvcmRzOiAka2V5d29yZHMsXG4gICAgICBhc3NpZ25lcnM6ICRhc3NpZ25lcnMsXG4gICAgICBvcGVyYXRvcnM6ICRvcGVyYXRvcnMsXG4gICAgICBjb21iaW5hdG9yczogJGNvbWJpbmF0b3JzLFxuICAgICAgbm9uYnJlYWtlcnM6ICRub25icmVha2VycyxcbiAgICAgIGNvbW1lbnRzOiAkY29tbWVudHMsXG4gICAgICBjbG9zdXJlczogJGNsb3N1cmVzLFxuICAgICAgYnJlYWtlcnM6ICRicmVha2VycyxcbiAgICAgIHBhdHRlcm5zOiAkcGF0dGVybnMsXG4gICAgfSksXG5cbiAgICBjb250ZXh0OiAkY29udGV4dCA9IGluaXRpYWxpemUoXG4gICAgICAoJC5jb250ZXh0ID0ge1xuICAgICAgICAvLyAkLFxuICAgICAgICAuLi4kcm9vdCxcbiAgICAgICAgcHVuY3R1YXRvcnM6ICRwdW5jdHVhdG9ycyxcbiAgICAgICAgYWdncmVnYXRvcnM6ICRhZ2dyZWdhdG9ycyxcbiAgICAgICAgbWF0Y2hlcjogJG1hdGNoZXIsIC8vIG1hdGNoZXI6IG1hdGNoZXIubWF0Y2hlcixcbiAgICAgICAgcXVvdGVzOiAkcXVvdGVzLFxuICAgICAgICBzcGFuczogJHNwYW5zWyRzeW50YXhdLFxuICAgICAgfSksXG4gICAgKSxcbiAgfSA9ICQ7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBpZiAoXG4gICAgICBncm91cGVyICE9PSAoZ3JvdXBlciA9IHlpZWxkIChncm91cGVyICYmIGdyb3VwZXIuY29udGV4dCkgfHwgJC5jb250ZXh0KSAmJlxuICAgICAgZ3JvdXBlciAmJlxuICAgICAgIWdyb3VwZXIuY29udGV4dFxuICAgICkge1xuICAgICAgY29uc3Qge1xuICAgICAgICBnb2FsID0gJHN5bnRheCxcbiAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgcHVuY3R1YXRvcnMgPSAkcHVuY3R1YXRvcnMsXG4gICAgICAgIGFnZ3JlZ2F0b3JzID0gJGFnZ3JlZ2F0b3JzLFxuICAgICAgICBjbG9zZXIsXG4gICAgICAgIHNwYW5zLFxuICAgICAgICBtYXRjaGVyID0gJG1hdGNoZXIsXG4gICAgICAgIHF1b3RlcyA9ICRxdW90ZXMsXG4gICAgICAgIGZvcm1pbmcgPSBnb2FsID09PSAkc3ludGF4LFxuICAgICAgfSA9IGdyb3VwZXI7XG5cbiAgICAgIC8vICFtYXRjaGVyIHx8IG1hdGNoZXIubWF0Y2hlciB8fCAobWF0Y2hlci5tYXRjaGVyID0gbmV3IFJlZ0V4cChtYXRjaGVyLnNvdXJjZSwgbWF0Y2hlci5mbGFncy5yZXBsYWNlKCdnJywgJ3knKSkpO1xuXG4gICAgICBpbml0aWFsaXplKFxuICAgICAgICAoZ3JvdXBlci5jb250ZXh0ID0ge1xuICAgICAgICAgIC8vICQsXG4gICAgICAgICAgLi4uJHJvb3QsIC8vIC4uLiAkLmNvbnRleHQsXG4gICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICBwdW5jdHVhdG9ycyxcbiAgICAgICAgICBhZ2dyZWdhdG9ycyxcbiAgICAgICAgICBjbG9zZXIsXG4gICAgICAgICAgc3BhbnMsXG4gICAgICAgICAgbWF0Y2hlciwgLy8gbWF0Y2hlcjogbWF0Y2hlciAmJiBtYXRjaGVyLm1hdGNoZXIsXG4gICAgICAgICAgcXVvdGVzLFxuICAgICAgICAgIGZvcm1pbmcsXG4gICAgICAgIH0pLFxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiB0b2tlbml6ZXIoY29udGV4dCkge1xuICBsZXQgZG9uZSwgbmV4dDtcblxuICBjb25zdCB7XG4gICAgJCA9IE51bGwsIC8vICQ6IHsgc3ludGF4LCBrZXl3b3JkcywgYXNzaWduZXJzLCBvcGVyYXRvcnMsIGNvbWJpbmF0b3JzLCBub25icmVha2VycywgY29tbWVudHMsIGNsb3N1cmVzLCBicmVha2VycywgcGF0dGVybnMgfSxcblxuICAgIHN5bnRheCA9ICQuc3ludGF4LFxuICAgIGtleXdvcmRzID0gJC5rZXl3b3JkcyxcbiAgICBhc3NpZ25lcnMgPSAkLmFzc2lnbmVycyxcbiAgICBvcGVyYXRvcnMgPSAkLm9wZXJhdG9ycyxcbiAgICBjb21iaW5hdG9ycyA9ICQuY29tYmluYXRvcnMsXG4gICAgbm9uYnJlYWtlcnMgPSAkLm5vbmJyZWFrZXJzLFxuICAgIGNvbW1lbnRzID0gJC5jb21tZW50cyxcbiAgICBjbG9zdXJlcyA9ICQuY2xvc3VyZXMsXG4gICAgYnJlYWtlcnMgPSAkLmJyZWFrZXJzLFxuICAgIHBhdHRlcm5zID0gJC5wYXR0ZXJucyxcblxuICAgIHB1bmN0dWF0b3JzLFxuICAgIGFnZ3JlZ2F0b3JzLFxuICAgIHNwYW5zLFxuICAgIHF1b3RlcyxcbiAgICBmb3JtaW5nID0gdHJ1ZSxcbiAgfSA9IGNvbnRleHQ7XG5cbiAgY29uc3Qge21heWJlSWRlbnRpZmllciwgbWF5YmVLZXl3b3JkfSA9IHBhdHRlcm5zIHx8IGNvbnRleHQ7XG4gIGNvbnN0IHdvcmRpbmcgPSBrZXl3b3JkcyB8fCBtYXliZUlkZW50aWZpZXIgPyB0cnVlIDogZmFsc2U7XG5cbiAgY29uc3QgTGluZUVuZGluZ3MgPSAvJC9nbTtcbiAgY29uc3QgcHVuY3R1YXRlID0gdGV4dCA9PlxuICAgIChub25icmVha2VycyAmJiBub25icmVha2Vycy5pbmNsdWRlcyh0ZXh0KSAmJiAnbm9uYnJlYWtlcicpIHx8XG4gICAgKG9wZXJhdG9ycyAmJiBvcGVyYXRvcnMuaW5jbHVkZXModGV4dCkgJiYgJ29wZXJhdG9yJykgfHxcbiAgICAoY29tbWVudHMgJiYgY29tbWVudHMuaW5jbHVkZXModGV4dCkgJiYgJ2NvbW1lbnQnKSB8fFxuICAgIChzcGFucyAmJiBzcGFucy5pbmNsdWRlcyh0ZXh0KSAmJiAnc3BhbicpIHx8XG4gICAgKHF1b3RlcyAmJiBxdW90ZXMuaW5jbHVkZXModGV4dCkgJiYgJ3F1b3RlJykgfHxcbiAgICAoY2xvc3VyZXMgJiYgY2xvc3VyZXMuaW5jbHVkZXModGV4dCkgJiYgJ2Nsb3N1cmUnKSB8fFxuICAgIChicmVha2VycyAmJiBicmVha2Vycy5pbmNsdWRlcyh0ZXh0KSAmJiAnYnJlYWtlcicpIHx8XG4gICAgZmFsc2U7XG4gIGNvbnN0IGFnZ3JlZ2F0ZSA9XG4gICAgKChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLmxlbmd0aCkgfHwgKGNvbWJpbmF0b3JzICYmIGNvbWJpbmF0b3JzLmxlbmd0aCkpICYmXG4gICAgKHRleHQgPT5cbiAgICAgIChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLmluY2x1ZGVzKHRleHQpICYmICdhc3NpZ25lcicpIHx8XG4gICAgICAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMuaW5jbHVkZXModGV4dCkgJiYgJ2NvbWJpbmF0b3InKSB8fFxuICAgICAgZmFsc2UpO1xuXG4gIHdoaWxlICghZG9uZSkge1xuICAgIGxldCB0b2tlbiwgcHVuY3R1YXRvcjtcbiAgICBpZiAobmV4dCAmJiBuZXh0LnRleHQpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgdGV4dCwgLy8gVGV4dCBmb3IgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIHR5cGUsIC8vIFR5cGUgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIC8vIG9mZnNldCwgLy8gSW5kZXggb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIC8vIGJyZWFrcywgLy8gTGluZWJyZWFrcyBpbiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgaGludCwgLy8gSGludCBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgcHJldmlvdXMsIC8vIFByZXZpb3VzIHByb2R1Y3Rpb25cbiAgICAgICAgcGFyZW50ID0gKG5leHQucGFyZW50ID0gKHByZXZpb3VzICYmIHByZXZpb3VzLnBhcmVudCkgfHwgdW5kZWZpbmVkKSwgLy8gUGFyZW50IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICBsYXN0LCAvLyBMYXN0IHNpZ25pZmljYW50IHByb2R1Y3Rpb25cbiAgICAgIH0gPSBuZXh0O1xuXG4gICAgICBpZiAodHlwZSA9PT0gJ3NlcXVlbmNlJykge1xuICAgICAgICAobmV4dC5wdW5jdHVhdG9yID1cbiAgICAgICAgICAoYWdncmVnYXRlICYmXG4gICAgICAgICAgICBwcmV2aW91cyAmJlxuICAgICAgICAgICAgKGFnZ3JlZ2F0b3JzW3RleHRdIHx8XG4gICAgICAgICAgICAgICghKHRleHQgaW4gYWdncmVnYXRvcnMpICYmIChhZ2dyZWdhdG9yc1t0ZXh0XSA9IGFnZ3JlZ2F0ZSh0ZXh0KSkpKSkgfHxcbiAgICAgICAgICAocHVuY3R1YXRvcnNbdGV4dF0gfHxcbiAgICAgICAgICAgICghKHRleHQgaW4gcHVuY3R1YXRvcnMpICYmIChwdW5jdHVhdG9yc1t0ZXh0XSA9IHB1bmN0dWF0ZSh0ZXh0KSkpKSB8fFxuICAgICAgICAgIHVuZGVmaW5lZCkgJiYgKG5leHQudHlwZSA9ICdwdW5jdHVhdG9yJyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd3aGl0ZXNwYWNlJykge1xuICAgICAgICBuZXh0LmJyZWFrcyA9IHRleHQubWF0Y2goTGluZUVuZGluZ3MpLmxlbmd0aCAtIDE7XG4gICAgICB9IGVsc2UgaWYgKGZvcm1pbmcgJiYgd29yZGluZykge1xuICAgICAgICAvLyB0eXBlICE9PSAnaW5kZW50JyAmJlxuICAgICAgICBjb25zdCB3b3JkID0gdGV4dC50cmltKCk7XG4gICAgICAgIHdvcmQgJiZcbiAgICAgICAgICAoKGtleXdvcmRzICYmXG4gICAgICAgICAgICBrZXl3b3Jkcy5pbmNsdWRlcyh3b3JkKSAmJlxuICAgICAgICAgICAgKCFsYXN0IHx8IGxhc3QucHVuY3R1YXRvciAhPT0gJ25vbmJyZWFrZXInIHx8IChwcmV2aW91cyAmJiBwcmV2aW91cy5icmVha3MgPiAwKSkgJiZcbiAgICAgICAgICAgIChuZXh0LnR5cGUgPSAna2V5d29yZCcpKSB8fFxuICAgICAgICAgICAgKG1heWJlSWRlbnRpZmllciAmJiBtYXliZUlkZW50aWZpZXIudGVzdCh3b3JkKSAmJiAobmV4dC50eXBlID0gJ2lkZW50aWZpZXInKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dC50eXBlID0gJ3RleHQnO1xuICAgICAgfVxuXG4gICAgICBwcmV2aW91cyAmJiAocHJldmlvdXMubmV4dCA9IG5leHQpO1xuXG4gICAgICB0b2tlbiA9IG5leHQ7XG4gICAgfVxuXG4gICAgbmV4dCA9IHlpZWxkIHRva2VuO1xuICB9XG59XG5cbi8vIFRPRE86IDxAU01vdGFhbD4gUmVmYWN0b3JcbmV4cG9ydCBmdW5jdGlvbiogdG9rZW5pemUoc291cmNlLCBzdGF0ZSA9IHt9LCBkZWZhdWx0cyA9IG1hcmt1cC5kZWZhdWx0cykge1xuICBjb25zdCBzeW50YXhlcyA9IGRlZmF1bHRzLnN5bnRheGVzO1xuXG4gIGxldCB7XG4gICAgbWF0Y2gsXG4gICAgaW5kZXgsXG4gICAgb3B0aW9uczoge1xuICAgICAgc291cmNlVHlwZSA9IChzdGF0ZS5vcHRpb25zLnNvdXJjZVR5cGUgPSBzdGF0ZS5vcHRpb25zLnN5bnRheCB8fCBkZWZhdWx0cy5zb3VyY2VUeXBlKSxcbiAgICB9ID0gKHN0YXRlLm9wdGlvbnMgPSB7fSksXG4gICAgcHJldmlvdXMgPSBudWxsLFxuICAgIG1vZGUgPSAoc3RhdGUubW9kZSA9IG1vZGVzW3NvdXJjZVR5cGVdIHx8IG1vZGVzW2RlZmF1bHRzLnNvdXJjZVR5cGVdKSxcbiAgICBtb2RlOiB7c3ludGF4fSxcbiAgICBncm91cGluZyA9IChzdGF0ZS5ncm91cGluZyA9IHtcbiAgICAgIGhpbnRzOiBuZXcgU2V0KCksXG4gICAgICBncm91cGluZ3M6IFtdLFxuICAgICAgZ3JvdXBlcnM6IG1vZGUuZ3JvdXBlcnMgfHwgKG1vZGUuZ3JvdXBlcnMgPSB7fSksXG4gICAgfSksXG4gIH0gPSBzdGF0ZTtcblxuICAoc3RhdGUuc291cmNlID09PSAoc3RhdGUuc291cmNlID0gc291cmNlKSAmJiBpbmRleCA+PSAwKSB8fFxuICAgIChpbmRleCA9IHN0YXRlLmluZGV4ID0gKGluZGV4ID4gMCAmJiBpbmRleCAlIHNvdXJjZS5sZW5ndGgpIHx8IDApO1xuXG4gIGNvbnN0IHRvcCA9IHt0eXBlOiAndG9wJywgdGV4dDogJycsIG9mZnNldDogaW5kZXh9O1xuXG4gIGxldCBkb25lLFxuICAgIHBhcmVudCA9IHRvcCxcbiAgICBsYXN0O1xuXG4gIGxldCBsYXN0Q29udGV4dDtcblxuICBjb25zdCB7XG4gICAgWyhzdGF0ZS5zeW50YXggPSBzdGF0ZS5tb2RlLnN5bnRheCldOiAkID0gZGVmYXVsdHMuc3ludGF4ZXNbZGVmYXVsdHMuc3ludGF4XSxcbiAgfSA9IGRlZmF1bHRzLnN5bnRheGVzO1xuXG4gIGNvbnN0ICRjb250ZXh0aW5nID0gY29udGV4dHVhbGl6ZXIoJCwgZGVmYXVsdHMpO1xuICBsZXQgJGNvbnRleHQgPSAkY29udGV4dGluZy5uZXh0KCkudmFsdWU7XG5cbiAgLy8gSW5pdGlhbCBjb250ZXh0dWFsIGhpbnQgKHN5bnRheClcbiAgIXN5bnRheCB8fFxuICAgIChncm91cGluZy5nb2FsIHx8IChncm91cGluZy5nb2FsID0gc3ludGF4KSwgZ3JvdXBpbmcuaGludCAmJiBncm91cGluZy5sYXN0U3ludGF4ID09PSBzeW50YXgpIHx8XG4gICAgKGdyb3VwaW5nLmhpbnRzLmFkZChzeW50YXgpLmRlbGV0ZShncm91cGluZy5sYXN0U3ludGF4KSxcbiAgICAoZ3JvdXBpbmcuaGludCA9IFsuLi5ncm91cGluZy5oaW50c10uam9pbignICcpKSxcbiAgICAoZ3JvdXBpbmcuY29udGV4dCA9IHN0YXRlLmNvbnRleHQgfHwgKHN0YXRlLmNvbnRleHQgPSBncm91cGluZy5sYXN0U3ludGF4ID0gc3ludGF4KSkpO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3Qge1xuICAgICAgJCA9IE51bGwsIC8vICQ6IHtzeW50YXgsIG1hdGNoZXJzLCBjb21tZW50cywgc3BhbnMsIGNsb3N1cmVzfSxcblxuICAgICAgc3ludGF4ID0gJC5zeW50YXgsXG4gICAgICBtYXRjaGVycyA9ICQubWF0Y2hlcnMsXG4gICAgICBjb21tZW50cyA9ICQuY29tbWVudHMsXG4gICAgICBzcGFucyA9ICQuc3BhbnMsXG4gICAgICBjbG9zdXJlcyA9ICQuY2xvc3VyZXMsXG5cbiAgICAgIHB1bmN0dWF0b3I6ICQkcHVuY3R1YXRvcixcbiAgICAgIGNsb3NlcjogJCRjbG9zZXIsXG4gICAgICBzcGFuczogJCRzcGFucyxcbiAgICAgIC8vIG1hdGNoZXI6ICQkbWF0Y2hlcixcbiAgICAgIG1hdGNoZXI6IHtcbiAgICAgICAgbWF0Y2hlcjogJCRtYXRjaGVyID0gKCRjb250ZXh0Lm1hdGNoZXIubWF0Y2hlciA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgJGNvbnRleHQubWF0Y2hlci5zb3VyY2UsXG4gICAgICAgICAgJGNvbnRleHQubWF0Y2hlci5mbGFncywgLy8gLnJlcGxhY2UoJ2cnLCAneScpLFxuICAgICAgICApKSxcbiAgICAgIH0sXG4gICAgICB0b2tlbixcbiAgICAgIC8vIHRva2VuID0gKCRjb250ZXh0LnRva2VuID0gKHRva2VuaXplciA9PiAoXG4gICAgICAvLyAgIHRva2VuaXplci5uZXh0KCksIHRva2VuID0+IHRva2VuaXplci5uZXh0KHRva2VuKS52YWx1ZVxuICAgICAgLy8gKSkodG9rZW5pemVyKCRjb250ZXh0KSkpLFxuICAgICAgZm9ybWluZyA9IHRydWUsXG4gICAgfSA9ICRjb250ZXh0O1xuXG4gICAgLy8gUHJpbWUgTWF0Y2hlclxuICAgIC8vICgoc3RhdGUubWF0Y2hlciAhPT0gJCRtYXRjaGVyICYmIChzdGF0ZS5tYXRjaGVyID0gJCRtYXRjaGVyKSkgfHxcbiAgICAvLyAgIHN0YXRlLmluZGV4ICE9PSAkJG1hdGNoZXIubGFzdEluZGV4KSAmJlxuICAgIC8vICAgJCRtYXRjaGVyLmV4ZWMoc3RhdGUuc291cmNlKTtcblxuICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBoaW50IChzeW50YXggb3IgaGludClcbiAgICBjb25zdCBoaW50ID0gZ3JvdXBpbmcuaGludDtcblxuICAgIHdoaWxlIChsYXN0Q29udGV4dCA9PT0gKGxhc3RDb250ZXh0ID0gJGNvbnRleHQpKSB7XG4gICAgICBsZXQgbmV4dDtcblxuICAgICAgc3RhdGUubGFzdCA9IGxhc3Q7XG5cbiAgICAgIGNvbnN0IGxhc3RJbmRleCA9IHN0YXRlLmluZGV4IHx8IDA7XG5cbiAgICAgICQkbWF0Y2hlci5sYXN0SW5kZXggPT09IGxhc3RJbmRleCB8fCAoJCRtYXRjaGVyLmxhc3RJbmRleCA9IGxhc3RJbmRleCk7XG4gICAgICBtYXRjaCA9IHN0YXRlLm1hdGNoID0gJCRtYXRjaGVyLmV4ZWMoc291cmNlKTtcbiAgICAgIGRvbmUgPSBpbmRleCA9PT0gKGluZGV4ID0gc3RhdGUuaW5kZXggPSAkJG1hdGNoZXIubGFzdEluZGV4KSB8fCAhbWF0Y2g7XG5cbiAgICAgIGlmIChkb25lKSByZXR1cm47XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBtYXRjaFxuICAgICAgY29uc3QgezA6IHRleHQsIDE6IHdoaXRlc3BhY2UsIDI6IHNlcXVlbmNlLCBpbmRleDogb2Zmc2V0fSA9IG1hdGNoO1xuXG4gICAgICAvLyBDdXJyZW50IHF1YXNpLWNvbnRleHR1YWwgZnJhZ21lbnRcbiAgICAgIGNvbnN0IHByZSA9IHNvdXJjZS5zbGljZShsYXN0SW5kZXgsIG9mZnNldCk7XG4gICAgICBwcmUgJiZcbiAgICAgICAgKChuZXh0ID0gdG9rZW4oe3R5cGU6ICdwcmUnLCB0ZXh0OiBwcmUsIG9mZnNldDogbGFzdEluZGV4LCBwcmV2aW91cywgcGFyZW50LCBoaW50LCBsYXN0fSkpLFxuICAgICAgICB5aWVsZCAocHJldmlvdXMgPSBuZXh0KSk7XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBmcmFnbWVudFxuICAgICAgY29uc3QgdHlwZSA9ICh3aGl0ZXNwYWNlICYmICd3aGl0ZXNwYWNlJykgfHwgKHNlcXVlbmNlICYmICdzZXF1ZW5jZScpIHx8ICd0ZXh0JztcbiAgICAgIG5leHQgPSB0b2tlbih7dHlwZSwgdGV4dCwgb2Zmc2V0LCBwcmV2aW91cywgcGFyZW50LCBoaW50LCBsYXN0fSk7XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBwdW5jdHVhdG9yIChmcm9tIHNlcXVlbmNlKVxuICAgICAgY29uc3QgY2xvc2luZyA9XG4gICAgICAgICQkY2xvc2VyICYmXG4gICAgICAgICgkJGNsb3Nlci50ZXN0XG4gICAgICAgICAgPyAkJGNsb3Nlci50ZXN0KHRleHQpXG4gICAgICAgICAgOiAkJGNsb3NlciA9PT0gdGV4dCB8fCAod2hpdGVzcGFjZSAmJiB3aGl0ZXNwYWNlLmluY2x1ZGVzKCQkY2xvc2VyKSkpO1xuXG4gICAgICBsZXQgYWZ0ZXI7XG4gICAgICBsZXQgcHVuY3R1YXRvciA9IG5leHQucHVuY3R1YXRvcjtcblxuICAgICAgaWYgKHB1bmN0dWF0b3IgfHwgY2xvc2luZykge1xuICAgICAgICAvLyBwdW5jdHVhdG9yIHRleHQgY2xvc2luZyBuZXh0IHBhcmVudFxuICAgICAgICAvLyBzeW50YXggbWF0Y2hlcnMgY2xvc3VyZXMgc3BhbnMgJCRzcGFuc1xuXG4gICAgICAgIGxldCBoaW50ZXIgPSBwdW5jdHVhdG9yID8gYCR7c3ludGF4fS0ke3B1bmN0dWF0b3J9YCA6IGdyb3VwaW5nLmhpbnQ7XG4gICAgICAgIGxldCBjbG9zZWQsIG9wZW5lZCwgZ3JvdXBlcjtcblxuICAgICAgICBpZiAoY2xvc2luZykge1xuICAgICAgICAgIGNsb3NlZCA9IGdyb3VwZXIgPSBjbG9zaW5nICYmIGdyb3VwaW5nLmdyb3VwaW5ncy5wb3AoKTtcbiAgICAgICAgICBuZXh0LmNsb3NlZCA9IGNsb3NlZDtcbiAgICAgICAgICBncm91cGluZy5ncm91cGluZ3MuaW5jbHVkZXMoZ3JvdXBlcikgfHwgZ3JvdXBpbmcuaGludHMuZGVsZXRlKGdyb3VwZXIuaGludGVyKTtcbiAgICAgICAgICAoY2xvc2VkLnB1bmN0dWF0b3IgPT09ICdvcGVuZXInICYmIChuZXh0LnB1bmN0dWF0b3IgPSAnY2xvc2VyJykpIHx8XG4gICAgICAgICAgICAoY2xvc2VkLnB1bmN0dWF0b3IgJiYgKG5leHQucHVuY3R1YXRvciA9IGNsb3NlZC5wdW5jdHVhdG9yKSk7XG4gICAgICAgICAgYWZ0ZXIgPSBncm91cGVyLmNsb3NlICYmIGdyb3VwZXIuY2xvc2UobmV4dCwgc3RhdGUsICRjb250ZXh0KTtcblxuICAgICAgICAgIGNvbnN0IHByZXZpb3VzR3JvdXBlciA9IChncm91cGVyID0gZ3JvdXBpbmcuZ3JvdXBpbmdzW2dyb3VwaW5nLmdyb3VwaW5ncy5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgZ3JvdXBpbmcuZ29hbCA9IChwcmV2aW91c0dyb3VwZXIgJiYgcHJldmlvdXNHcm91cGVyLmdvYWwpIHx8IHN5bnRheDtcbiAgICAgICAgICBwYXJlbnQgPSAocGFyZW50ICYmIHBhcmVudC5wYXJlbnQpIHx8IHRvcDtcbiAgICAgICAgfSBlbHNlIGlmICgkJHB1bmN0dWF0b3IgIT09ICdjb21tZW50Jykge1xuICAgICAgICAgIGNvbnN0IGdyb3VwID0gYCR7aGludGVyfSwke3RleHR9YDtcbiAgICAgICAgICBncm91cGVyID0gZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdO1xuXG4gICAgICAgICAgaWYgKCQkc3BhbnMgJiYgcHVuY3R1YXRvciA9PT0gJ3NwYW4nKSB7XG4gICAgICAgICAgICBjb25zdCBzcGFuID0gJCRzcGFuc1t0ZXh0XTtcbiAgICAgICAgICAgIG5leHQucHVuY3R1YXRvciA9IHB1bmN0dWF0b3IgPSAnc3Bhbic7XG4gICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICBnb2FsOiBzeW50YXgsXG4gICAgICAgICAgICAgICAgc3BhbixcbiAgICAgICAgICAgICAgICBtYXRjaGVyOiBzcGFuLm1hdGNoZXIgfHwgKG1hdGNoZXJzICYmIG1hdGNoZXJzLnNwYW4pIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBzcGFuczogKHNwYW5zICYmIHNwYW5zW3RleHRdKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJCRwdW5jdHVhdG9yICE9PSAncXVvdGUnKSB7XG4gICAgICAgICAgICBpZiAocHVuY3R1YXRvciA9PT0gJ3F1b3RlJykge1xuICAgICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgIGdvYWw6IHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICBxdW90ZTogdGV4dCxcbiAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IChtYXRjaGVycyAmJiBtYXRjaGVycy5xdW90ZSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgc3BhbnM6IChzcGFucyAmJiBzcGFuc1t0ZXh0XSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHVuY3R1YXRvciA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBjb21tZW50c1t0ZXh0XTtcbiAgICAgICAgICAgICAgb3BlbmVkID1cbiAgICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICBnb2FsOiBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgY29tbWVudCxcbiAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IGNvbW1lbnQubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuY29tbWVudCkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHVuY3R1YXRvciA9PT0gJ2Nsb3N1cmUnKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGNsb3N1cmUgPSAoZ3JvdXBlciAmJiBncm91cGVyLmNsb3N1cmUpIHx8IGNsb3N1cmVzW3RleHRdO1xuICAgICAgICAgICAgICBwdW5jdHVhdG9yID0gbmV4dC5wdW5jdHVhdG9yID0gJ29wZW5lcic7XG4gICAgICAgICAgICAgIC8vICdvcGVuZXInICE9PVxuICAgICAgICAgICAgICAvLyAgIChwdW5jdHVhdG9yID1cbiAgICAgICAgICAgICAgLy8gICAgIChjbG9zdXJlLm9wZW4gJiZcbiAgICAgICAgICAgICAgLy8gICAgICAgKG5leHQgPSBjbG9zdXJlLm9wZW4obmV4dCwgc3RhdGUsIHByZXZpb3VzKSB8fCBuZXh0KS5wdW5jdHVhdG9yKSB8fFxuICAgICAgICAgICAgICAvLyAgICAgKG5leHQucHVuY3R1YXRvciA9ICdvcGVuZXInKSkgfHxcbiAgICAgICAgICAgICAgY2xvc3VyZSAmJlxuICAgICAgICAgICAgICAgIChvcGVuZWQgPVxuICAgICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgICAgZ29hbDogc3ludGF4LFxuICAgICAgICAgICAgICAgICAgICBjbG9zdXJlLFxuICAgICAgICAgICAgICAgICAgICBtYXRjaGVyOiBjbG9zdXJlLm1hdGNoZXIgfHwgKG1hdGNoZXJzICYmIG1hdGNoZXJzLmNsb3N1cmUpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChvcGVuZWQpIHtcbiAgICAgICAgICAgIC8vIGFmdGVyID0gb3BlbmVkLm9wZW4gJiYgb3BlbmVkLm9wZW4obmV4dCwgc3RhdGUsIG9wZW5lZCk7XG4gICAgICAgICAgICBncm91cGluZy5ncm91cGVyc1tncm91cF0gfHwgKGdyb3VwaW5nLmdyb3VwZXJzW2dyb3VwXSA9IGdyb3VwZXIgPSBvcGVuZWQpO1xuICAgICAgICAgICAgZ3JvdXBpbmcuZ3JvdXBpbmdzLnB1c2goZ3JvdXBlciksIGdyb3VwaW5nLmhpbnRzLmFkZChoaW50ZXIpO1xuICAgICAgICAgICAgZ3JvdXBpbmcuZ29hbCA9IChncm91cGVyICYmIGdyb3VwZXIuZ29hbCkgfHwgc3ludGF4O1xuICAgICAgICAgICAgcGFyZW50ID0gbmV4dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBzdGF0ZS5jb250ZXh0ID0gZ3JvdXBpbmcuY29udGV4dCA9IGdyb3VwaW5nLmdvYWwgfHwgc3ludGF4O1xuXG4gICAgICAgIGlmIChvcGVuZWQgfHwgY2xvc2VkKSB7XG4gICAgICAgICAgJGNvbnRleHQgPSAkY29udGV4dGluZy5uZXh0KChzdGF0ZS5ncm91cGVyID0gZ3JvdXBlciB8fCB1bmRlZmluZWQpKS52YWx1ZTtcbiAgICAgICAgICBncm91cGluZy5oaW50ID0gYCR7Wy4uLmdyb3VwaW5nLmhpbnRzXS5qb2luKCcgJyl9ICR7XG4gICAgICAgICAgICBncm91cGluZy5jb250ZXh0ID8gYGluLSR7Z3JvdXBpbmcuY29udGV4dH1gIDogJydcbiAgICAgICAgICB9YDtcbiAgICAgICAgICBvcGVuZWQgJiYgKGFmdGVyID0gb3BlbmVkLm9wZW4gJiYgb3BlbmVkLm9wZW4obmV4dCwgc3RhdGUsICRjb250ZXh0KSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIHRhaWwgdG9rZW4gKHlpZWxkIGZyb20gc2VxdWVuY2UpXG4gICAgICB5aWVsZCAocHJldmlvdXMgPSBuZXh0KTtcblxuICAgICAgLy8gTmV4dCByZWZlcmVuY2UgdG8gbGFzdCBjb250ZXh0dWFsIHNlcXVlbmNlIHRva2VuXG4gICAgICBuZXh0ICYmICF3aGl0ZXNwYWNlICYmIGZvcm1pbmcgJiYgKGxhc3QgPSBuZXh0KTtcblxuICAgICAgaWYgKGFmdGVyKSB7XG4gICAgICAgIGxldCB0b2tlbnMsIHRva2VuLCBuZXh0SW5kZXg7IC8vICA9IGFmdGVyLmVuZCB8fCBhZnRlci5pbmRleFxuXG4gICAgICAgIGlmIChhZnRlci5zeW50YXgpIHtcbiAgICAgICAgICBjb25zdCB7c3ludGF4LCBvZmZzZXQsIGluZGV4fSA9IGFmdGVyO1xuICAgICAgICAgIGNvbnN0IGJvZHkgPSBpbmRleCA+IG9mZnNldCAmJiBzb3VyY2Uuc2xpY2Uob2Zmc2V0LCBpbmRleCAtIDEpO1xuICAgICAgICAgIGlmIChib2R5KSB7XG4gICAgICAgICAgICBib2R5Lmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgKCh0b2tlbnMgPSB0b2tlbml6ZShib2R5LCB7b3B0aW9uczoge3N5bnRheH19LCBkZWZhdWx0cykpLCAobmV4dEluZGV4ID0gaW5kZXgpKTtcbiAgICAgICAgICAgIGNvbnN0IGhpbnQgPSBgJHtzeW50YXh9LWluLSR7JC5zeW50YXh9YDtcbiAgICAgICAgICAgIHRva2VuID0gdG9rZW4gPT4gKFxuICAgICAgICAgICAgICAodG9rZW4uaGludCA9IGAkeyh0b2tlbi5oaW50ICYmIGAke3Rva2VuLmhpbnR9IGApIHx8ICcnfSR7aGludH1gKSwgdG9rZW5cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGFmdGVyLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IGhpbnQgPSBncm91cGluZy5oaW50O1xuICAgICAgICAgIHRva2VuID0gdG9rZW4gPT4gKFxuICAgICAgICAgICAgKHRva2VuLmhpbnQgPSBgJHtoaW50fSAke3Rva2VuLnR5cGUgfHwgJ2NvZGUnfWApLCAkY29udGV4dC50b2tlbih0b2tlbilcbiAgICAgICAgICApO1xuICAgICAgICAgICh0b2tlbnMgPSBhZnRlcikuZW5kICYmIChuZXh0SW5kZXggPSBhZnRlci5lbmQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRva2Vucykge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHt0b2tlbiwgdG9rZW5zLCBuZXh0SW5kZXh9KTtcbiAgICAgICAgICBmb3IgKGNvbnN0IG5leHQgb2YgdG9rZW5zKSB7XG4gICAgICAgICAgICBwcmV2aW91cyAmJiAoKG5leHQucHJldmlvdXMgPSBwcmV2aW91cykubmV4dCA9IG5leHQpO1xuICAgICAgICAgICAgdG9rZW4gJiYgdG9rZW4obmV4dCk7XG4gICAgICAgICAgICB5aWVsZCAocHJldmlvdXMgPSBuZXh0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbmV4dEluZGV4ID4gaW5kZXggJiYgKHN0YXRlLmluZGV4ID0gbmV4dEluZGV4KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gKG5leHQucHVuY3R1YXRvciA9IHB1bmN0dWF0b3IgPVxuLy8gICAoY2xvc3VyZS5vcGVuICYmXG4vLyAgICAgY2xvc3VyZS5vcGVuKG5leHQsIHN0YXRlLCBwcmV2aW91cykgJiZcbi8vICAgICAobmV4dC5wdW5jdHVhdG9yIHx8IHB1bmN0dWF0b3IpKSB8fFxuLy8gICAnb3BlbmVyJykgfHxcbi8vIChuZXh0LnB1bmN0dWF0b3IgPSBwdW5jdHVhdG9yID1cbi8vICAgKGNsb3N1cmUub3BlbiAmJiBjbG9zdXJlLm9wZW4obmV4dCwgc3RhdGUsIHByZXZpb3VzKSkgfHwgJ29wZW5lcicpIHx8XG4vLyBpZiAoYm9keS5zeW50YXggJiYgYm9keS50ZXh0KSB7XG4vLyAgIGNvbnN0IHtzeW50YXgsIHRleHR9ID0gYm9keTtcbi8vICAgY29uc3Qgc3RhdGUgPSB7b3B0aW9uczoge3N5bnRheH19O1xuLy8gICBjb25zdCB0b2tlbnMgPSB0b2tlbml6ZSh0ZXh0LCBzdGF0ZSwgZGVmYXVsdHMpO1xuLy8gICBmb3IgKGNvbnN0IHRva2VuIG9mIHRva2VucykgeWllbGQgdG9rZW47XG4vLyB9XG5cbi8vIHhtbDogLyhbXFxzXFxuXSspfChcInwnfD18JiN4P1thLWYwLTldKzt8JlthLXpdKzt8XFwvPz58PCV8JT58PCEtLXwtLT58PFtcXC9cXCFdPykvZ2ksXG4iLCIvKiogQHR5cGVkZWYge1JlZ0V4cHxzdHJpbmd9IFBhdHRlcm4gLSBWYWxpZCAvKOKApikvIHN1YiBleHByZXNzaW9uICovXG4vKiogQHR5cGVkZWYge3N0cmluZ3x7c291cmNlOiBzdHJpbmd9fSBFbnRpdHkgLSBWYWxpZCAvW+KApl0vIHN1YiBleHByZXNzaW9uICovXG5cbmV4cG9ydCB7cGF0dGVybnN9IGZyb20gJy4vbWFya3VwLXBhcnNlci5qcyc7XG5cbi8vLyBFeHByZXNzaW9uc1xuY29uc3QgcmF3ID0gU3RyaW5nLnJhdztcblxuLyoqXG4gKiBUaGUgY29sbGVjdGlvbiBvZiBSZWd1bGFyIEV4cHJlc3Npb25zIHVzZWQgdG8gbWF0Y2ggc3BlY2lmaWNcbiAqIG1hcmt1cCBzZXF1ZW5jZXMgaW4gYSBnaXZlbiBjb250ZXh0IG9yIHRvIHRlc3QgbWF0Y2hlZCBzZXF1ZW5jZXMgdmVyYm9zZWx5XG4gKiBpbiBvcmRlciB0byBmdXJ0aGVyIGNhdGVnb3JpemUgdGhlbS4gRnVsbCBzdXBwb3J0IGZvciBVbmljb2RlIENsYXNzZXMgYW5kXG4gKiBQcm9wZXJ0aWVzIGhhcyBiZWVuIGluY2x1ZGVkIGluIHRoZSBFQ01BU2NyaXB0IHNwZWNpZmljYXRpb24gYnV0IGNlcnRhaW5cbiAqIGVuZ2luZXMgYXJlIHN0aWxsIGltcGxlbWVudGluZyB0aGVtLlxuICpcbiAqIEB0eXBlIHt7W25hbWU6IHN0cmluZ106IHtbbmFtZTogc3RyaW5nXTogRW50aXR5fX19XG4gKi9cbmV4cG9ydCBjb25zdCBlbnRpdGllcyA9IHtcbiAgZXM6IHtcbiAgICAvKiogaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzkuMC8jcHJvZC1JZGVudGlmaWVyU3RhcnQgKi9cbiAgICBJZGVudGlmaWVyU3RhcnQ6IHJhd2BfJFxccHtJRF9TdGFydH1gLFxuICAgIC8qKiBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOS4wLyNwcm9kLUlkZW50aWZpZXJQYXJ0ICovXG4gICAgSWRlbnRpZmllclBhcnQ6IHJhd2BfJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfWAsXG4gIH0sXG59O1xuXG4vLy8gSGVscGVyc1xuLyoqXG4gKiBDcmVhdGUgYSBzZXF1ZW5jZSBtYXRjaCBleHByZXNzaW9uIGZyb20gcGF0dGVybnMuXG4gKlxuICogQHBhcmFtICB7Li4uUGF0dGVybn0gcGF0dGVybnNcbiAqL1xuZXhwb3J0IGNvbnN0IHNlcXVlbmNlID0gKC4uLnBhdHRlcm5zKSA9PlxuICBuZXcgUmVnRXhwKFJlZmxlY3QuYXBwbHkocmF3LCBudWxsLCBwYXR0ZXJucy5tYXAocCA9PiAocCAmJiBwLnNvdXJjZSkgfHwgcCB8fCAnJykpLCAnZycpO1xuXG4vKipcbiAqIENyZWF0ZSBhIG1heWJlSWRlbnRpZmllciB0ZXN0IChpZSBbPGZpcnN0Pl1bPG90aGVyPl0qKSBleHByZXNzaW9uLlxuICpcbiAqIEBwYXJhbSAge0VudGl0eX0gZmlyc3QgLSBWYWxpZCBeWzzigKY+XSBlbnRpdHlcbiAqIEBwYXJhbSAge0VudGl0eX0gb3RoZXIgLSBWYWxpZCBbPOKApj5dKiQgZW50aXR5XG4gKiBAcGFyYW0gIHtzdHJpbmd9IFtmbGFnc10gLSBSZWdFeHAgZmxhZ3MgKGRlZmF1bHRzIHRvICd1JylcbiAqIEBwYXJhbSAge3Vua25vd259IFtib3VuZGFyeV1cbiAqL1xuZXhwb3J0IGNvbnN0IGlkZW50aWZpZXIgPSAoZmlyc3QsIG90aGVyLCBmbGFncyA9ICd1JywgYm91bmRhcnkgPSAveWcvLnRlc3QoZmxhZ3MpICYmICdcXFxcYicpID0+XG4gIG5ldyBSZWdFeHAoYCR7Ym91bmRhcnkgfHwgJ14nfVske2ZpcnN0fV1bJHtvdGhlcn1dKiR7Ym91bmRhcnkgfHwgJyQnfWAsIGZsYWdzKTtcblxuLyoqXG4gKiBDcmVhdGUgYSBzZXF1ZW5jZSBwYXR0ZXJuIGZyb20gcGF0dGVybnMuXG4gKlxuICogQHBhcmFtICB7Li4uUGF0dGVybn0gcGF0dGVybnNcbiAqL1xuZXhwb3J0IGNvbnN0IGFsbCA9ICguLi5wYXR0ZXJucykgPT4gcGF0dGVybnMubWFwKHAgPT4gKHAgJiYgcC5leGVjID8gcC5zb3VyY2UgOiBwKSkuam9pbignfCcpO1xuXG4vLy8gUmVndWxhciBFeHByZXNzaW9uc1xuZXhwb3J0IGNvbnN0IFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzID0gL1xcXFxweyAqKFxcdyspICp9L2c7XG5cblJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJlcGxhY2UgPSAobSwgcHJvcGVydHlLZXkpID0+IHtcbiAgLy8gY29uc3QgcHJvcGVydHkgPSBBU0NJSVtwcm9wZXJ0eUtleV0gfHwgVW5pY29kZVtwcm9wZXJ0eUtleV07XG4gIGNvbnN0IHByb3BlcnR5ID0gUmFuZ2VzW3Byb3BlcnR5S2V5XTtcbiAgaWYgKHByb3BlcnR5KSByZXR1cm4gcHJvcGVydHkudG9TdHJpbmcoKTtcbiAgdGhyb3cgUmFuZ2VFcnJvcihgQ2Fubm90IHJld3JpdGUgdW5pY29kZSBwcm9wZXJ0eSBcIiR7cHJvcGVydHlLZXl9XCJgKTtcbn07XG5cblJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJld3JpdGUgPSBleHByZXNzaW9uID0+IHtcbiAgbGV0IGZsYWdzID0gZXhwcmVzc2lvbiAmJiBleHByZXNzaW9uLmZsYWdzO1xuICBsZXQgc291cmNlID0gZXhwcmVzc2lvbiAmJiBgJHtleHByZXNzaW9uLnNvdXJjZSB8fCBleHByZXNzaW9uIHx8ICcnfWA7XG4gIHNvdXJjZSAmJlxuICAgIFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnRlc3Qoc291cmNlKSAmJlxuICAgIChzb3VyY2UgPSBzb3VyY2UucmVwbGFjZShSZWdFeHBVbmljb2RlUHJvcGVydGllcywgUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmVwbGFjZSkpO1xuICByZXR1cm4gKGZsYWdzICYmIG5ldyBSZWdFeHAoc291cmNlLCBmbGFncykpIHx8IHNvdXJjZTtcbn07XG5cbi8vLyBJbnRlcm9wZXJhYmlsaXR5XG5leHBvcnQgY29uc3Qgc3VwcG9ydGVkID1cbiAgLy8gVE9ETzogUmVtb3ZlIHdoZW4gc3N1cHBvcnRpbmcgbm9uLXVuaWNvZGUgcnVudGltZXMgW25vdCBpbiBzY29wZV1cbiAgbmV3IFJlZ0V4cChyYXdgXFx1RkZGRmAsICd1JykgJiZcbiAgc3VwcG9ydHMoXG4gICAgVW5pY29kZVByb3BlcnRpZXMgPT4gbmV3IFJlZ0V4cChyYXdgXFxwe0x9YCwgJ3UnKSxcbiAgICBVbmljb2RlQ2xhc3NlcyA9PiBuZXcgUmVnRXhwKHJhd2BcXHB7SURfU3RhcnR9XFxwe0lEX0NvbnRpbnVlfWAsICd1JyksXG4gICk7XG5cbmFzeW5jIGZ1bmN0aW9uIHJlcGxhY2VVbnN1cHBvcnRlZEV4cHJlc3Npb25zKCkge1xuICAvLyBhd2FpdCBVbmljb2RlLmluaXRpYWxpemUoKTsgY29uc29sZS5sb2coVW5pY29kZSk7XG4gIGZvciAoY29uc3Qga2V5IGluIGVudGl0aWVzKSB7XG4gICAgY29uc3Qgc291cmNlcyA9IGVudGl0aWVzW2tleV07XG4gICAgY29uc3QgcmVwbGFjZW1lbnRzID0ge307XG4gICAgZm9yIChjb25zdCBpZCBpbiBzb3VyY2VzKVxuICAgICAgIXNvdXJjZXNbaWRdIHx8XG4gICAgICAgIHR5cGVvZiAoc291cmNlc1tpZF0uc291cmNlIHx8IHNvdXJjZXNbaWRdKSAhPT0gJ3N0cmluZycgfHxcbiAgICAgICAgKHJlcGxhY2VtZW50c1tpZF0gPSBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXdyaXRlKHNvdXJjZXNbaWRdKSk7XG4gICAgT2JqZWN0LmFzc2lnbihzb3VyY2VzLCByZXBsYWNlbWVudHMpO1xuICB9XG4gIHJldHVybjtcbn1cblxuZnVuY3Rpb24gc3VwcG9ydHMoZmVhdHVyZSwgLi4uZmVhdHVyZXMpIHtcbiAgaWYgKGZlYXR1cmUpIHtcbiAgICB0cnkge1xuICAgICAgZmVhdHVyZSgpO1xuICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gIWZlYXR1cmVzLmxlbmd0aCB8fCBSZWZsZWN0LmFwcGx5KHN1cHBvcnRzLCBudWxsLCBmZWF0dXJlcyk7XG59XG5cbi8vIFRPRE86IEZpeCBVbmljb2RlUmFuZ2UubWVyZ2UgaWYgbm90IGltcGxlbWVudGVkIGluIEZpcmVmb3ggc29vblxuLy8gaW1wb3J0IHtVbmljb2RlfSBmcm9tICcuL3VuaWNvZGUvdW5pY29kZS5qcyc7XG5cbi8vIFRPRE86IFJlbW92ZSBSYW5nZXMgb25jZSBVbmljb2RlUmFuZ2UgaXMgd29ya2luZ1xuY29uc3QgUmFuZ2VzID0ge1xuICAvLyBMOiAnYS16QS1aJyxcbiAgLy8gTjogJzAtOScsXG4gIElEX1N0YXJ0OiByYXdgYS16QS1aXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNgLFxuICBJRF9Db250aW51ZTogcmF3YGEtekEtWjAtOVxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDhhMC1cXHUwOGI0XFx1MDhiNi1cXHUwOGJkXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4OFxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmVmXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3YjlcXHVhN2Y3LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY1XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXFx1MjAwY1xcdTIwMGRcXHhiN1xcdTAzMDAtXFx1MDM2ZlxcdTAzODdcXHUwNDgzLVxcdTA0ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNjEwLVxcdTA2MWFcXHUwNjRiLVxcdTA2NjlcXHUwNjcwXFx1MDZkNi1cXHUwNmRjXFx1MDZkZi1cXHUwNmU0XFx1MDZlN1xcdTA2ZThcXHUwNmVhLVxcdTA2ZWRcXHUwNmYwLVxcdTA2ZjlcXHUwNzExXFx1MDczMC1cXHUwNzRhXFx1MDdhNi1cXHUwN2IwXFx1MDdjMC1cXHUwN2M5XFx1MDdlYi1cXHUwN2YzXFx1MDdmZFxcdTA4MTYtXFx1MDgxOVxcdTA4MWItXFx1MDgyM1xcdTA4MjUtXFx1MDgyN1xcdTA4MjktXFx1MDgyZFxcdTA4NTktXFx1MDg1YlxcdTA4ZDMtXFx1MDhlMVxcdTA4ZTMtXFx1MDkwM1xcdTA5M2EtXFx1MDkzY1xcdTA5M2UtXFx1MDk0ZlxcdTA5NTEtXFx1MDk1N1xcdTA5NjJcXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk4MS1cXHUwOTgzXFx1MDliY1xcdTA5YmUtXFx1MDljNFxcdTA5YzdcXHUwOWM4XFx1MDljYi1cXHUwOWNkXFx1MDlkN1xcdTA5ZTJcXHUwOWUzXFx1MDllNi1cXHUwOWVmXFx1MDlmZVxcdTBhMDEtXFx1MGEwM1xcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTY2LVxcdTBhNzFcXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGFiY1xcdTBhYmUtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZTJcXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGFmYS1cXHUwYWZmXFx1MGIwMS1cXHUwYjAzXFx1MGIzY1xcdTBiM2UtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjYyXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiODJcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMC1cXHUwYzA0XFx1MGMzZS1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzYyXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODEtXFx1MGM4M1xcdTBjYmNcXHUwY2JlLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZTJcXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGQwMC1cXHUwZDAzXFx1MGQzYlxcdTBkM2NcXHUwZDNlLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGRcXHUwZDU3XFx1MGQ2MlxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDgyXFx1MGQ4M1xcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRlNi1cXHUwZGVmXFx1MGRmMlxcdTBkZjNcXHUwZTMxXFx1MGUzNC1cXHUwZTNhXFx1MGU0Ny1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGViMVxcdTBlYjQtXFx1MGViOVxcdTBlYmJcXHUwZWJjXFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGYxOFxcdTBmMTlcXHUwZjIwLVxcdTBmMjlcXHUwZjM1XFx1MGYzN1xcdTBmMzlcXHUwZjNlXFx1MGYzZlxcdTBmNzEtXFx1MGY4NFxcdTBmODZcXHUwZjg3XFx1MGY4ZC1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMmItXFx1MTAzZVxcdTEwNDAtXFx1MTA0OVxcdTEwNTYtXFx1MTA1OVxcdTEwNWUtXFx1MTA2MFxcdTEwNjItXFx1MTA2NFxcdTEwNjctXFx1MTA2ZFxcdTEwNzEtXFx1MTA3NFxcdTEwODItXFx1MTA4ZFxcdTEwOGYtXFx1MTA5ZFxcdTEzNWQtXFx1MTM1ZlxcdTEzNjktXFx1MTM3MVxcdTE3MTItXFx1MTcxNFxcdTE3MzItXFx1MTczNFxcdTE3NTJcXHUxNzUzXFx1MTc3MlxcdTE3NzNcXHUxN2I0LVxcdTE3ZDNcXHUxN2RkXFx1MTdlMC1cXHUxN2U5XFx1MTgwYi1cXHUxODBkXFx1MTgxMC1cXHUxODE5XFx1MThhOVxcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk0ZlxcdTE5ZDAtXFx1MTlkYVxcdTFhMTctXFx1MWExYlxcdTFhNTUtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYjAtXFx1MWFiZFxcdTFiMDAtXFx1MWIwNFxcdTFiMzQtXFx1MWI0NFxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiODAtXFx1MWI4MlxcdTFiYTEtXFx1MWJhZFxcdTFiYjAtXFx1MWJiOVxcdTFiZTYtXFx1MWJmM1xcdTFjMjQtXFx1MWMzN1xcdTFjNDAtXFx1MWM0OVxcdTFjNTAtXFx1MWM1OVxcdTFjZDAtXFx1MWNkMlxcdTFjZDQtXFx1MWNlOFxcdTFjZWRcXHUxY2YyLVxcdTFjZjRcXHUxY2Y3LVxcdTFjZjlcXHUxZGMwLVxcdTFkZjlcXHUxZGZiLVxcdTFkZmZcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MmNlZi1cXHUyY2YxXFx1MmQ3ZlxcdTJkZTAtXFx1MmRmZlxcdTMwMmEtXFx1MzAyZlxcdTMwOTlcXHUzMDlhXFx1YTYyMC1cXHVhNjI5XFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2OWVcXHVhNjlmXFx1YTZmMFxcdWE2ZjFcXHVhODAyXFx1YTgwNlxcdWE4MGJcXHVhODIzLVxcdWE4MjdcXHVhODgwXFx1YTg4MVxcdWE4YjQtXFx1YThjNVxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmMVxcdWE4ZmYtXFx1YTkwOVxcdWE5MjYtXFx1YTkyZFxcdWE5NDctXFx1YTk1M1xcdWE5ODAtXFx1YTk4M1xcdWE5YjMtXFx1YTljMFxcdWE5ZDAtXFx1YTlkOVxcdWE5ZTVcXHVhOWYwLVxcdWE5ZjlcXHVhYTI5LVxcdWFhMzZcXHVhYTQzXFx1YWE0Y1xcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTdiLVxcdWFhN2RcXHVhYWIwXFx1YWFiMi1cXHVhYWI0XFx1YWFiN1xcdWFhYjhcXHVhYWJlXFx1YWFiZlxcdWFhYzFcXHVhYWViLVxcdWFhZWZcXHVhYWY1XFx1YWFmNlxcdWFiZTMtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1ZmIxZVxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyZlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmYxMC1cXHVmZjE5XFx1ZmYzZmAsXG59O1xuXG4vLy8gQm9vdHN0cmFwXG5leHBvcnQgY29uc3QgcmVhZHkgPSAoZW50aXRpZXMucmVhZHkgPSBzdXBwb3J0ZWRcbiAgPyBQcm9taXNlLnJlc29sdmUoKVxuICA6IHJlcGxhY2VVbnN1cHBvcnRlZEV4cHJlc3Npb25zKCkpO1xuIiwiaW1wb3J0IHttYXRjaGVycywgbW9kZXN9IGZyb20gJy4vbWFya3VwLXBhcnNlci5qcyc7XG5pbXBvcnQge3BhdHRlcm5zLCBlbnRpdGllcywgaWRlbnRpZmllciwgc2VxdWVuY2UsIGFsbH0gZnJvbSAnLi9tYXJrdXAtcGF0dGVybnMuanMnO1xuXG4vLy8gSU5URVJGQUNFXG5cbmV4cG9ydCBjb25zdCBpbnN0YWxsID0gKGRlZmF1bHRzLCBuZXdTeW50YXhlcyA9IGRlZmF1bHRzLnN5bnRheGVzIHx8IHt9KSA9PiB7XG4gIE9iamVjdC5hc3NpZ24obmV3U3ludGF4ZXMsIHN5bnRheGVzKTtcbiAgZGVmYXVsdHMuc3ludGF4ZXMgPT09IG5ld1N5bnRheGVzIHx8IChkZWZhdWx0cy5zeW50YXhlcyA9IG5ld1N5bnRheGVzKTtcbn07XG5cbmV4cG9ydCBjb25zdCBzeW50YXhlcyA9IHt9O1xuXG4vLy8gREVGSU5JVElPTlNcblN5bnRheGVzOiB7XG4gIC8vLyBIZWxwZXJzXG4gIGNvbnN0IHJhdyA9IFN0cmluZy5yYXc7XG4gIGNvbnN0IGxpbmVzID0gc3RyaW5nID0+IHN0cmluZy5zcGxpdCgvXFxuKy8pO1xuICBjb25zdCBjbG9zdXJlcyA9IHN0cmluZyA9PiB7XG4gICAgY29uc3QgcGFpcnMgPSBzeW1ib2xzKHN0cmluZyk7XG4gICAgY29uc3QgYXJyYXkgPSBuZXcgQXJyYXkocGFpcnMubGVuZ3RoKTtcbiAgICBhcnJheS5wYWlycyA9IHBhaXJzO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICAgIGNvbnN0IFtvcGVuZXIsIGNsb3Nlcl0gPSBwYWlyLnNwbGl0KCfigKYnKTtcbiAgICAgIGFycmF5WyhhcnJheVtpKytdID0gb3BlbmVyKV0gPSB7b3BlbmVyLCBjbG9zZXJ9O1xuICAgIH1cbiAgICBhcnJheS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcbiAgICByZXR1cm4gYXJyYXk7XG4gIH07XG4gIGNvbnN0IHN5bWJvbHMgPSBzb3VyY2UgPT5cbiAgICAoc291cmNlICYmXG4gICAgICAoKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnICYmIHNvdXJjZS5zcGxpdCgvICsvKSkgfHxcbiAgICAgICAgKFN5bWJvbC5pdGVyYXRvciBpbiBzb3VyY2UgJiYgWy4uLnNvdXJjZV0pKSkgfHxcbiAgICBbXTtcbiAgc3ltYm9scy5mcm9tID0gKC4uLmFyZ3MpID0+IFsuLi5uZXcgU2V0KFtdLmNvbmNhdCguLi5hcmdzLm1hcChzeW1ib2xzKSkpXTtcblxuICAvLyBjb25zdCBMSU5FUyA9IC8oXFxuKS9nO1xuICBjb25zdCBMSU5FID0gLyQvZztcblxuICBDU1M6IHtcbiAgICBjb25zdCBjc3MgPSAoc3ludGF4ZXMuY3NzID0ge1xuICAgICAgLi4uKG1vZGVzLmNzcyA9IHtzeW50YXg6ICdjc3MnfSksXG4gICAgICBjb21tZW50czogY2xvc3VyZXMoJy8q4oCmKi8nKSxcbiAgICAgIGNsb3N1cmVzOiBjbG9zdXJlcygne+KApn0gKOKApikgW+KApl0nKSxcbiAgICAgIHF1b3Rlczogc3ltYm9scyhgJyBcImApLFxuICAgICAgYXNzaWduZXJzOiBzeW1ib2xzKGA6YCksXG4gICAgICBjb21iaW5hdG9yczogc3ltYm9scygnPiA6OiArIDonKSxcbiAgICAgIG5vbmJyZWFrZXJzOiBzeW1ib2xzKGAtYCksXG4gICAgICBicmVha2Vyczogc3ltYm9scygnLCA7JyksXG4gICAgICBwYXR0ZXJuczogey4uLnBhdHRlcm5zfSxcbiAgICAgIG1hdGNoZXI6IC8oW1xcc1xcbl0rKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXC9cXCp8XFwqXFwvfFxcKHxcXCl8XFxbfFxcXXxcInwnfFxce3xcXH18LHw7fFxcLnxcXGI6XFwvXFwvXFxifDo6XFxifDooPyFhY3RpdmV8YWZ0ZXJ8YW55fGFueS1saW5rfGJhY2tkcm9wfGJlZm9yZXxjaGVja2VkfGRlZmF1bHR8ZGVmaW5lZHxkaXJ8ZGlzYWJsZWR8ZW1wdHl8ZW5hYmxlZHxmaXJzdHxmaXJzdC1jaGlsZHxmaXJzdC1sZXR0ZXJ8Zmlyc3QtbGluZXxmaXJzdC1vZi10eXBlfGZvY3VzfGZvY3VzLXZpc2libGV8Zm9jdXMtd2l0aGlufGZ1bGxzY3JlZW58aG9zdHxob3Zlcnxpbi1yYW5nZXxpbmRldGVybWluYXRlfGludmFsaWR8bGFuZ3xsYXN0LWNoaWxkfGxhc3Qtb2YtdHlwZXxsZWZ0fGxpbmt8bWF0Y2hlc3xub3R8bnRoLWNoaWxkfG50aC1sYXN0LWNoaWxkfG50aC1sYXN0LW9mLXR5cGV8bnRoLW9mLXR5cGV8b25seS1jaGlsZHxvbmx5LW9mLXR5cGV8b3B0aW9uYWx8b3V0LW9mLXJhbmdlfHJlYWQtb25seXxyZXF1aXJlZHxyaWdodHxyb290fHNjb3BlfHRhcmdldHx2YWxpZHx2aXNpdGVkKSkvZyxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiBtYXRjaGVycy5lc2NhcGVzLFxuICAgICAgICBjb21tZW50OiBtYXRjaGVycy5jb21tZW50cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBIVE1MOiB7XG4gICAgY29uc3QgaHRtbCA9IChzeW50YXhlcy5odG1sID0ge1xuICAgICAgLi4uKG1vZGVzLmh0bWwgPSB7c3ludGF4OiAnaHRtbCd9KSxcbiAgICAgIGtleXdvcmRzOiBzeW1ib2xzKCdET0NUWVBFIGRvY3R5cGUnKSxcbiAgICAgIGNvbW1lbnRzOiBjbG9zdXJlcygnPCEtLeKApi0tPicpLFxuICAgICAgcXVvdGVzOiBbXSxcbiAgICAgIGNsb3N1cmVzOiBjbG9zdXJlcygnPCXigKYlPiA8IeKApj4gPOKApi8+IDwv4oCmPiA84oCmPicpLFxuICAgICAgcGF0dGVybnM6IHtcbiAgICAgICAgLi4ucGF0dGVybnMsXG4gICAgICAgIGNsb3NlVGFnOiAvPFxcL1xcd1tePD57fV0qPz4vZyxcbiAgICAgICAgbWF5YmVJZGVudGlmaWVyOiAvXig/Oig/OlthLXpdW1xcLWEtel0qKT9bYS16XStcXDopPyg/OlthLXpdW1xcLWEtel0qKT9bYS16XSskLyxcbiAgICAgIH0sXG4gICAgICBtYXRjaGVyOiBtYXRjaGVycy54bWwsXG4gICAgICBtYXRjaGVyczoge1xuICAgICAgICBxdW90ZTogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSl8XCJ8JykvZyxcbiAgICAgICAgY29tbWVudDogLyhcXG4pfCgtLT4pL2csXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAge1xuICAgICAgY29uc3QgRE9DVEFHUyA9IHN5bWJvbHMoJ1NDUklQVCBTVFlMRScpO1xuICAgICAgY29uc3QgVEFHID0gL15bYS16XSskL2k7XG4gICAgICAvLyBUT0RPOiBDaGVjayBpZiBjdXN0b20vbmFtZXNwYWNlIHRhZ3MgZXZlciBuZWVkIHNwZWNpYWwgY2xvc2UgbG9naWNcbiAgICAgIC8vIGNvbnN0IFRBR0xJS0UgPSAvXig/Oig/OlthLXpdW1xcLWEtel0qKT9bYS16XStcXDopPyg/OlthLXpdW1xcLWEtel0qKT9bYS16XSskL2k7XG5cblxuICAgICAgaHRtbC5jbG9zdXJlc1snPCddLmNsb3NlID0gKG5leHQsIHN0YXRlLCBjb250ZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IG5leHQgJiYgbmV4dC5wYXJlbnQ7XG4gICAgICAgIGNvbnN0IGZpcnN0ID0gcGFyZW50ICYmIHBhcmVudC5uZXh0O1xuICAgICAgICBjb25zdCB0YWcgPSBmaXJzdCAmJiBmaXJzdC50ZXh0ICYmIFRBRy50ZXN0KGZpcnN0LnRleHQpICYmIGZpcnN0LnRleHQudG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiAodGFnICYmIERPQ1RBR1MuaW5jbHVkZXModGFnKSkge1xuICAgICAgICAgIC8vIFRPRE86IFVuY29tbWVudCBvbmNlIHRva2VuIGJ1ZmZlcmluZyBpcyBpbXBsZW1lbnRlZFxuICAgICAgICAgIC8vIHRhZyAmJiAoZmlyc3QudHlwZSA9ICdrZXl3b3JkJyk7XG5cbiAgICAgICAgICBsZXQge3NvdXJjZSwgaW5kZXh9ID0gc3RhdGU7XG4gICAgICAgICAgY29uc3QgJCRtYXRjaGVyID0gc3ludGF4ZXMuaHRtbC5wYXR0ZXJucy5jbG9zZVRhZztcblxuICAgICAgICAgIGxldCBtYXRjaDsgLy8gID0gJCRtYXRjaGVyLmV4ZWMoc291cmNlKTtcbiAgICAgICAgICAkJG1hdGNoZXIubGFzdEluZGV4ID0gaW5kZXg7XG5cbiAgICAgICAgICAvLyBUT0RPOiBDaGVjayBpZiBgPHNjcmlwdD5g4oCmYDwvU0NSSVBUPmAgaXMgc3RpbGwgdmFsaWQhXG4gICAgICAgICAgY29uc3QgJCRjbG9zZXIgPSBuZXcgUmVnRXhwKHJhd2BePFxcLyg/OiR7Zmlyc3QudGV4dC50b0xvd2VyQ2FzZSgpfXwke3RhZ30pXFxiYCk7XG5cbiAgICAgICAgICBsZXQgc3ludGF4ID0gKHRhZyA9PT0gJ1NUWUxFJyAmJiAnY3NzJykgfHwgJyc7XG5cbiAgICAgICAgICBpZiAoIXN5bnRheCkge1xuICAgICAgICAgICAgY29uc3Qgb3BlblRhZyA9IHNvdXJjZS5zbGljZShwYXJlbnQub2Zmc2V0LCBpbmRleCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC9cXHN0eXBlPS4qP1xcYiguKz8pXFxiLy5leGVjKG9wZW5UYWcpO1xuICAgICAgICAgICAgc3ludGF4ID1cbiAgICAgICAgICAgICAgdGFnID09PSAnU0NSSVBUJyAmJiAoIW1hdGNoIHx8ICFtYXRjaFsxXSB8fCAvXm1vZHVsZSR8amF2YXNjcmlwdC9pLnRlc3QobWF0Y2hbMV0pKVxuICAgICAgICAgICAgICAgID8gJ2VzJ1xuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7c3ludGF4LCB0YWcsIG1hdGNoLCBvcGVuVGFnfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgd2hpbGUgKChtYXRjaCA9ICQkbWF0Y2hlci5leGVjKHNvdXJjZSkpKSB7XG4gICAgICAgICAgICBpZiAoJCRjbG9zZXIudGVzdChtYXRjaFswXSkpIHtcbiAgICAgICAgICAgICAgaWYgKHN5bnRheCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7b2Zmc2V0OiBpbmRleCwgaW5kZXg6IG1hdGNoLmluZGV4LCBzeW50YXh9O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBzb3VyY2Uuc2xpY2Uob2Zmc2V0LCBtYXRjaC5pbmRleCAtIDEpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmluZGV4ID0gbWF0Y2guaW5kZXg7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt7dGV4dCwgb2Zmc2V0LCBwcmV2aW91czogbmV4dCwgcGFyZW50fV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfTtcbiAgICAgIGh0bWwuY2xvc3VyZXNbJzwnXS5xdW90ZXMgPSBzeW1ib2xzKGAnIFwiYCk7XG4gICAgICBodG1sLmNsb3N1cmVzWyc8J10uY2xvc2VyID0gL1xcLz8+LztcblxuICAgICAgLy8gVE9ETzogQWxsb3cgZ3JvdXBpbmctbGV2ZWwgcGF0dGVybnMgZm9yIEhUTUwgYXR0cmlidXRlcyB2cyB0ZXh0XG4gICAgICAvLyBodG1sLmNsb3N1cmVzWyc8J10ucGF0dGVybnMgPSB7IG1heWJlSWRlbnRpZmllcjogVEFHTElLRSB9O1xuICAgIH1cbiAgfVxuXG4gIE1hcmtkb3duOiB7XG4gICAgY29uc3QgQkxPQ0sgPSAnYGBg4oCmYGBgIH5+fuKApn5+fic7XG4gICAgY29uc3QgSU5MSU5FID0gJ1vigKZdICjigKYpICrigKYqICoq4oCmKiogX+KApl8gX1/igKZfXyB+4oCmfiB+fuKApn5+JztcbiAgICAvKipcbiAgICAgKiBUT0RPOiBBZGRyZXNzIHVuZXhwZWN0ZWQgY2xvc3VyZXMgaW4gcGFyc2luZyBmcmFnbWVudGVyXG4gICAgICpcbiAgICAgKiBBcyBmYXIgYXMgdG9rZW5pemF0aW9uIGdvZXMsIHVuZXhwZWN0ZWQgY2xvc3VyZXMgYXJlIHN0aWxsXG4gICAgICogY2xvc3VyZXMgbm9uZXRoZWxlc3MuIFRoZXkgYXJlIG5vdCBzcGFucy5cbiAgICAgKi9cbiAgICBjb25zdCBTUEFOUyA9ICcnOyAvLyBJTkxJTkVcbiAgICBjb25zdCBDTE9TVVJFUyA9IFNQQU5TID8gQkxPQ0sgOiBgJHtCTE9DS30gJHtJTkxJTkV9YDtcblxuICAgIGNvbnN0IGh0bWwgPSBzeW50YXhlcy5odG1sO1xuICAgIGNvbnN0IG1kID0gKHN5bnRheGVzLm1kID0ge1xuICAgICAgLi4uKG1vZGVzLm1hcmtkb3duID0gbW9kZXMubWQgPSB7c3ludGF4OiAnbWQnfSksXG4gICAgICBjb21tZW50czogY2xvc3VyZXMoJzwhLS3igKYtLT4nKSxcbiAgICAgIHF1b3RlczogW10sXG4gICAgICBjbG9zdXJlczogY2xvc3VyZXMoYCR7aHRtbC5jbG9zdXJlc30gJHtDTE9TVVJFU31gKSxcbiAgICAgIHBhdHRlcm5zOiB7Li4uaHRtbC5wYXR0ZXJuc30sXG4gICAgICBtYXRjaGVyOiAvKF5cXHMrfFxcbil8KCYjeD9bYS1mMC05XSs7fCZbYS16XSs7fCg/OmBgYCt8XFx+XFx+XFx+K3wtLSt8PT0rfCg/OlxcI3sxLDZ9fFxcLXxcXGJcXGQrXFwufFxcYlthLXpdXFwufFxcYltpdnhdK1xcLikoPz1cXHMrXFxTKykpfFwifCd8PXxcXC8+fDwlfCU+fDwhLS18LS0+fDxbXFwvXFwhXT8oPz1bYS16XStcXDo/W2EtelxcLV0qW2Etel18W2Etel0rKXw8fD58XFwofFxcKXxcXFt8XFxdfF9fP3woWyp+YF0pXFwzP1xcYnxcXGIoWyp+YF0pXFw0Pyl8XFxiW15cXG5cXHNcXFtcXF1cXChcXClcXDxcXD4mXSpbXlxcblxcc1xcW1xcXVxcKFxcKVxcPFxcPiZfXVxcYnxbXlxcblxcc1xcW1xcXVxcKFxcKVxcPFxcPiZdKyg/PV9fP1xcYikvZ2ltLFxuICAgICAgc3BhbnM6IHVuZGVmaW5lZCxcbiAgICAgIG1hdGNoZXJzOiB7Y29tbWVudDogLyhcXG4pfCgtLT4pL2d9LFxuICAgIH0pO1xuXG4gICAgLy8gbWQucGF0dGVybnMubWF5YmVJZGVudGlmaWVyID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKFNQQU5TKSB7XG4gICAgICBtZC5zcGFucyA9IHttZDogY2xvc3VyZXMoU1BBTlMpfTtcbiAgICAgIGNvbnN0IHNwYW5zID0gU1BBTlMuc3BsaXQoJyAnKTtcbiAgICAgIGZvciAoY29uc3QgW29wZW5lcl0gb2YgbWQuc3BhbnMubWQpIHtcbiAgICAgICAgY29uc3Qgc3Vic3BhbnMgPSBzcGFucy5maWx0ZXIoc3BhbiA9PiAhc3Bhbi5zdGFydHNXaXRoKG9wZW5lcikpO1xuICAgICAgICBtZC5zcGFuc1tvcGVuZXJdID0gY2xvc3VyZXMoc3Vic3BhbnMuam9pbignICcpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWQuY2xvc3VyZXMpIHtcbiAgICAgIG1kLmNsb3N1cmVzWyc8J10gPSB7Li4uaHRtbC5jbG9zdXJlc1snPCddfTtcblxuICAgICAgY29uc3QgU1lOVEFYID0gL15cXHcrJC87XG5cbiAgICAgIGNvbnN0IHByZXZpb3VzVGV4dEZyb20gPSAodG9rZW4sIG1hdGNoZXIpID0+IHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFtdO1xuICAgICAgICBpZiAobWF0Y2hlciAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKG1hdGNoZXIudGVzdClcbiAgICAgICAgICAgIGRvIHRva2VuLnRleHQgJiYgdGV4dC5wdXNoKHRva2VuLnRleHQpLCAodG9rZW4gPSB0b2tlbi5wcmV2aW91cyk7XG4gICAgICAgICAgICB3aGlsZSAoIXRva2VuLnRleHQgfHwgIW1hdGNoZXIudGVzdCh0b2tlbi50ZXh0KSk7XG4gICAgICAgICAgZWxzZSBpZiAobWF0Y2hlci5pbmNsdWRlcylcbiAgICAgICAgICAgIGRvIHRva2VuLnRleHQgJiYgdGV4dC5wdXNoKHRva2VuLnRleHQpLCAodG9rZW4gPSB0b2tlbi5wcmV2aW91cyk7XG4gICAgICAgICAgICB3aGlsZSAoIXRva2VuLnRleHQgfHwgIW1hdGNoZXIuaW5jbHVkZXModG9rZW4udGV4dCkpO1xuICAgICAgICAgIHRleHQubGVuZ3RoICYmIHRleHQucmV2ZXJzZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0ZXh0LmpvaW4oJycpO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgaW5kZW50ZXIgPSAoaW5kZW50aW5nLCB0YWJzID0gMikgPT4ge1xuICAgICAgICBsZXQgc291cmNlID0gaW5kZW50aW5nO1xuICAgICAgICBjb25zdCBpbmRlbnQgPSBuZXcgUmVnRXhwKHJhd2AoPzpcXHR8JHsnICcucmVwZWF0KHRhYnMpfSlgLCAnZycpO1xuICAgICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgvXFxcXD8oPz1bXFwoXFwpXFw6XFw/XFxbXFxdXSkvZywgJ1xcXFwnKTtcbiAgICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoaW5kZW50LCBpbmRlbnQuc291cmNlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4ke3NvdXJjZX1gLCAnbScpO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgRU1CRURERUQgPSB0cnVlO1xuICAgICAgY29uc3Qgb3BlbiA9IChwYXJlbnQsIHN0YXRlLCBncm91cGVyKSA9PiB7XG4gICAgICAgIGNvbnN0IHtzb3VyY2UsIGluZGV4OiBzdGFydH0gPSBzdGF0ZTtcbiAgICAgICAgY29uc3QgZmVuY2UgPSBwYXJlbnQudGV4dDtcbiAgICAgICAgY29uc3QgZmVuY2luZyA9IHByZXZpb3VzVGV4dEZyb20ocGFyZW50LCAnXFxuJyk7XG4gICAgICAgIGNvbnN0IGluZGVudGluZyA9IGZlbmNpbmcuc2xpY2UoZmVuY2luZy5pbmRleE9mKCdcXG4nKSArIDEsIC1mZW5jZS5sZW5ndGgpIHx8ICcnO1xuICAgICAgICBsZXQgZW5kID0gc291cmNlLmluZGV4T2YoYFxcbiR7ZmVuY2luZ31gLCBzdGFydCk7XG4gICAgICAgIGNvbnN0IElOREVOVCA9IGluZGVudGVyKGluZGVudGluZyk7XG4gICAgICAgIGNvbnN0IENMT1NFUiA9IG5ldyBSZWdFeHAocmF3YFxcbiR7SU5ERU5ULnNvdXJjZS5zbGljZSgxKX0ke2ZlbmNlfWAsICdnJyk7XG5cbiAgICAgICAgQ0xPU0VSLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgICAgICBsZXQgY2xvc2VyTWF0Y2ggPSBDTE9TRVIuZXhlYyhzb3VyY2UpO1xuICAgICAgICBpZiAoY2xvc2VyTWF0Y2ggJiYgY2xvc2VyTWF0Y2guaW5kZXggPj0gc3RhcnQpIHtcbiAgICAgICAgICBlbmQgPSBjbG9zZXJNYXRjaC5pbmRleCArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgRkVOQ0UgPSBuZXcgUmVnRXhwKHJhd2BcXG4/W1xcPlxcfFxcc10qJHtmZW5jZX1gLCAnZycpO1xuICAgICAgICAgIEZFTkNFLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgICAgICAgIGNvbnN0IGZlbmNlTWF0Y2ggPSBGRU5DRS5leGVjKHNvdXJjZSk7XG4gICAgICAgICAgaWYgKGZlbmNlTWF0Y2ggJiYgZmVuY2VNYXRjaC5pbmRleCA+PSBzdGFydCkge1xuICAgICAgICAgICAgZW5kID0gZmVuY2VNYXRjaC5pbmRleCArIDE7XG4gICAgICAgICAgfSBlbHNlIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbmQgPiBzdGFydCkge1xuICAgICAgICAgIGxldCBvZmZzZXQgPSBzdGFydDtcbiAgICAgICAgICBsZXQgdGV4dDtcblxuICAgICAgICAgIGNvbnN0IGJvZHkgPSBzb3VyY2Uuc2xpY2Uoc3RhcnQsIGVuZCkgfHwgJyc7XG4gICAgICAgICAgY29uc3QgdG9rZW5zID0gW107XG4gICAgICAgICAgdG9rZW5zLmVuZCA9IGVuZDtcbiAgICAgICAgICBpZiAoIUVNQkVEREVEKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYm9keTtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0LCB0eXBlOiAnY29kZScsIG9mZnNldCwgcGFyZW50fSk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gYm9keS5sZW5ndGg7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFtoZWFkLCAuLi5saW5lc10gPSBib2R5LnNwbGl0KC8oXFxuKS9nKTtcbiAgICAgICAgICAgIGlmIChoZWFkKSB7XG4gICAgICAgICAgICAgIC8vIGNvbnN0IFssIHN5bnRheCwgYXR0cmlidXRlc10gPSAvXihcXHcuKlxcYik/XFxzKiguKilcXHMqJC8uZXhlYyhoZWFkKTtcbiAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQ6IGhlYWQsIHR5cGU6ICdjb21tZW50Jywgb2Zmc2V0LCBwYXJlbnR9KSwgKG9mZnNldCArPSBoZWFkLmxlbmd0aCk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHtoZWFkLCBsaW5lcywgaW5kZW50aW5nLCBJTkRFTlR9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICAgICAgICBjb25zdCBbaW5kZW50XSA9IElOREVOVC5leGVjKGxpbmUpIHx8ICcnO1xuICAgICAgICAgICAgICBjb25zdCBpbnNldCA9IChpbmRlbnQgJiYgaW5kZW50Lmxlbmd0aCkgfHwgMDtcbiAgICAgICAgICAgICAgaWYgKGluc2V0KSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0ZXh0IG9mIGluZGVudC5zcGxpdCgvKFxccyspL2cpKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gKHRleHQudHJpbSgpICYmICdzZXF1ZW5jZScpIHx8ICd3aGl0ZXNwYWNlJztcbiAgICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0LCB0eXBlLCBvZmZzZXQsIHBhcmVudH0pO1xuICAgICAgICAgICAgICAgICAgb2Zmc2V0ICs9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0ZXh0ID0gbGluZS5zbGljZShpbnNldCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IGxpbmU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQsIHR5cGU6ICdjb2RlJywgb2Zmc2V0LCBwYXJlbnR9KSwgKG9mZnNldCArPSB0ZXh0Lmxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHtmZW5jaW5nLCBib2R5LCBzdGFydCwgZW5kLCBvZmZzZXQsIGxpbmVzLCB0b2tlbnN9KTtcbiAgICAgICAgICBpZiAodG9rZW5zLmxlbmd0aCkgcmV0dXJuIHRva2VucztcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgbWQuY2xvc3VyZXNbJ2BgYCddLm9wZW4gPSBtZC5jbG9zdXJlc1snfn5+J10ub3BlbiA9IG9wZW47XG5cbiAgICAgIGlmIChtZC5jbG9zdXJlc1snYGBgJ10gJiYgIW1kLmNsb3N1cmVzWydgYGAnXS5vcGVuKSB7XG4gICAgICAgIG1kLmNsb3N1cmVzWydgYGAnXS5xdW90ZXMgPSBodG1sLmNsb3N1cmVzWyc8J10ucXVvdGVzO1xuICAgICAgICBtZC5jbG9zdXJlc1snYGBgJ10ubWF0Y2hlciA9IC8oXFxzKlxcbil8KGBgYCg/PWBgYFxcc3xgYGAkKXxeKD86W1xccz58XSpcXHMpP1xccyopfC4qJC9nbTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1kLmNsb3N1cmVzWyd+fn4nXSAmJiAhbWQuY2xvc3VyZXNbJ35+fiddLm9wZW4pIHtcbiAgICAgICAgbWQuY2xvc3VyZXNbJ35+fiddLnF1b3RlcyA9IGh0bWwuY2xvc3VyZXNbJzwnXS5xdW90ZXM7XG4gICAgICAgIG1kLmNsb3N1cmVzWyd+fn4nXS5tYXRjaGVyID0gLyhcXHMqXFxuKXwofn5+KD89fn5+XFxzfH5+fiQpfF4oPzpbXFxzPnxdKlxccyk/XFxzKil8LiokL2dtO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKG1kKTtcbiAgfVxuXG4gIEVDTUFTY3JpcHQ6IHtcbiAgICBjb25zdCBSRUdFWFBTID0gL1xcLyg/PVteXFwqXFwvXFxuXVteXFxuXSpcXC8pKD86W15cXFxcXFwvXFxuXFx0XFxbXSt8XFxcXFxcU3xcXFsoPzpcXFxcXFxTfFteXFxcXFxcblxcdFxcXV0rKSs/XFxdKSs/XFwvW2Etel0qL2c7XG4gICAgY29uc3QgQ09NTUVOVFMgPSAvXFwvXFwvfFxcL1xcKnxcXCpcXC98XFwvfF5cXCNcXCEuKlxcbi9nO1xuICAgIGNvbnN0IFFVT1RFUyA9IC9gfFwifCcvZztcbiAgICBjb25zdCBDTE9TVVJFUyA9IC9cXHt8XFx9fFxcKHxcXCl8XFxbfFxcXS9nO1xuXG4gICAgY29uc3QgZXMgPSAoc3ludGF4ZXMuZXMgPSB7XG4gICAgICAuLi4obW9kZXMuamF2YXNjcmlwdCA9IG1vZGVzLmVzID0gbW9kZXMuanMgPSB7c3ludGF4OiAnZXMnfSksXG4gICAgICBjb21tZW50czogY2xvc3VyZXMoJy8v4oCmXFxuIC8q4oCmKi8nKSxcbiAgICAgIHF1b3Rlczogc3ltYm9scyhgJyBcIiBcXGBgKSxcbiAgICAgIGNsb3N1cmVzOiBjbG9zdXJlcygne+KApn0gKOKApikgW+KApl0nKSxcbiAgICAgIHNwYW5zOiB7J2AnOiBjbG9zdXJlcygnJHvigKZ9Jyl9LFxuICAgICAga2V5d29yZHM6IHN5bWJvbHMoXG4gICAgICAgIC8vIGFic3RyYWN0IGVudW0gaW50ZXJmYWNlIHBhY2thZ2UgIG5hbWVzcGFjZSBkZWNsYXJlIHR5cGUgbW9kdWxlXG4gICAgICAgICdhcmd1bWVudHMgYXMgYXN5bmMgYXdhaXQgYnJlYWsgY2FzZSBjYXRjaCBjbGFzcyBjb25zdCBjb250aW51ZSBkZWJ1Z2dlciBkZWZhdWx0IGRlbGV0ZSBkbyBlbHNlIGV4cG9ydCBleHRlbmRzIGZpbmFsbHkgZm9yIGZyb20gZnVuY3Rpb24gZ2V0IGlmIGltcG9ydCBpbiBpbnN0YW5jZW9mIGxldCBuZXcgb2YgcmV0dXJuIHNldCBzdXBlciBzd2l0Y2ggdGhpcyB0aHJvdyB0cnkgdHlwZW9mIHZhciB2b2lkIHdoaWxlIHdpdGggeWllbGQnLFxuICAgICAgKSxcbiAgICAgIGFzc2lnbmVyczogc3ltYm9scygnPSArPSAtPSAqPSAvPSAqKj0gJT0gfD0gXj0gJj0gPDw9ID4+PSA+Pj49JyksXG4gICAgICBjb21iaW5hdG9yczogc3ltYm9scygnPj0gPD0gPT0gPT09ICE9ICE9PSB8fCAmJiAhICYgfCA+IDwgPT4gJSArIC0gKiogKiAvID4+IDw8ID4+PiA/IDonKSxcbiAgICAgIG5vbmJyZWFrZXJzOiBzeW1ib2xzKCcuJyksXG4gICAgICBvcGVyYXRvcnM6IHN5bWJvbHMoJysrIC0tICEhIF4gfiAhIC4uLicpLFxuICAgICAgYnJlYWtlcnM6IHN5bWJvbHMoJywgOycpLFxuICAgICAgcGF0dGVybnM6IHsuLi5wYXR0ZXJuc30sXG4gICAgICBtYXRjaGVyOiBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHthbGwoXG4gICAgICAgIFJFR0VYUFMsXG4gICAgICAgIHJhd2BcXC89YCxcbiAgICAgICAgQ09NTUVOVFMsXG4gICAgICAgIFFVT1RFUyxcbiAgICAgICAgQ0xPU1VSRVMsXG4gICAgICAgIC8sfDt8XFwuXFwuXFwufFxcLnxcXDp8XFw/fD0+LyxcbiAgICAgICAgLyE9PXw9PT18PT18PS8sXG4gICAgICAgIC4uLnN5bWJvbHMocmF3YFxcKyBcXC0gXFwqICYgXFx8YCkubWFwKHMgPT4gYCR7c30ke3N9fCR7c309fCR7c31gKSxcbiAgICAgICAgLi4uc3ltYm9scyhyYXdgISBcXCpcXCogJSA8PCA+PiA+Pj4gPCA+IFxcXiB+YCkubWFwKHMgPT4gYCR7c309fCR7c31gKSxcbiAgICAgICl9KWAsXG4gICAgICBtYXRjaGVyczoge1xuICAgICAgICBxdW90ZTogbWF0Y2hlcnMucXVvdGVzLFxuICAgICAgICBjb21tZW50OiBtYXRjaGVycy5jb21tZW50cyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBFQ01BU2NyaXB0RXh0ZW5zaW9uczoge1xuICAgICAgLy8gY29uc3QgSEFTSEJBTkcgPSAvXlxcI1xcIS4qXFxuL2c7IC8vIFteXSA9PT0gKD86LipcXG4pXG4gICAgICAvLyBUT0RPOiBVbmRvICQgbWF0Y2hpbmcgb25jZSBmaXhlZFxuICAgICAgY29uc3QgUVVPVEVTID0gL2B8XCIoPzpbXlxcXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnKD86W15cXFxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG4gICAgICBjb25zdCBDT01NRU5UUyA9IC9cXC9cXC8uKig/OlxcbnwkKXxcXC9cXCpbXl0qPyg/OlxcKlxcL3wkKXxeXFwjXFwhLipcXG4vZzsgLy8gW15dID09PSAoPzouKlxcbilcbiAgICAgIGNvbnN0IFNUQVRFTUVOVFMgPSBhbGwoUVVPVEVTLCBDTE9TVVJFUywgUkVHRVhQUywgQ09NTUVOVFMpO1xuICAgICAgY29uc3QgQkxPQ0tMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBUT1BMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBDTE9TVVJFID0gc2VxdWVuY2VgKFxcbispfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBFU00gPSBzZXF1ZW5jZWAke1RPUExFVkVMfXxcXGJleHBvcnRcXGJ8XFxiaW1wb3J0XFxiYDtcbiAgICAgIGNvbnN0IENKUyA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJtb2R1bGUuZXhwb3J0c1xcYnxcXGJyZXF1aXJlXFxiYDtcbiAgICAgIGNvbnN0IEVTWCA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJpbXBvcnRcXGJ8XFxibW9kdWxlLmV4cG9ydHNcXGJ8XFxicmVxdWlyZVxcYmA7XG5cbiAgICAgIGNvbnN0IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc30gPSBlcztcbiAgICAgIGNvbnN0IHN5bnRheCA9IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc307XG4gICAgICBjb25zdCBtYXRjaGVycyA9IHt9O1xuICAgICAgKHtxdW90ZTogbWF0Y2hlcnMucXVvdGV9ID0gZXMubWF0Y2hlcnMpO1xuXG4gICAgICBjb25zdCBlc20gPSAoc3ludGF4ZXMuZXNtID0ge1xuICAgICAgICAuLi4obW9kZXMuZXNtID0ge3N5bnRheDogJ2VzbSd9KSxcbiAgICAgICAga2V5d29yZHM6IHN5bWJvbHMoJ2ltcG9ydCBleHBvcnQgZGVmYXVsdCcpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IEVTTSxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogQ0xPU1VSRX0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGNqcyA9IChzeW50YXhlcy5janMgPSB7XG4gICAgICAgIC4uLihtb2Rlcy5janMgPSB7c3ludGF4OiAnY2pzJ30pLFxuICAgICAgICBrZXl3b3Jkczogc3ltYm9scygnaW1wb3J0IG1vZHVsZSBleHBvcnRzIHJlcXVpcmUnKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBDSlMsXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IENKU30sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGVzeCA9IChzeW50YXhlcy5lc3ggPSB7XG4gICAgICAgIC4uLihtb2Rlcy5lc3ggPSB7c3ludGF4OiAnZXN4J30pLFxuICAgICAgICBrZXl3b3Jkczogc3ltYm9scy5mcm9tKGVzbS5rZXl3b3JkcywgY2pzLmtleXdvcmRzKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBFU1gsXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IEVTWH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuLy8vIEJvb3RzdHJhcFxuZXhwb3J0IGNvbnN0IHJlYWR5ID0gKGFzeW5jICgpID0+IHtcbiAgYXdhaXQgZW50aXRpZXMucmVhZHk7XG4gIHN5bnRheGVzLmVzLnBhdHRlcm5zLm1heWJlSWRlbnRpZmllciA9IGlkZW50aWZpZXIoXG4gICAgZW50aXRpZXMuZXMuSWRlbnRpZmllclN0YXJ0LFxuICAgIGVudGl0aWVzLmVzLklkZW50aWZpZXJQYXJ0LFxuICApO1xuICAvLyBjb25zb2xlLmxvZyh7bWF5YmVJZGVudGlmaWVyOiBgJHtzeW50YXhlcy5lcy5wYXR0ZXJucy5tYXliZUlkZW50aWZpZXJ9YH0pO1xufSkoKTtcblxuLy8gY29uc3QgUVVPVEVTID0gL2B8XCJcXFwiXCJ8XCJcInxcIig/OlteXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnXFwnJ3wnJ3woPzpbXlxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG4vLyBjb25zdCBRVU9URVMgPSAvYHxcIlwifFwiKD86LipcXFxcLnwuKj8pKj8oPzpcInwkKXwnJ3wnKD86W15cXFxcXSp8XFxcXC4pKig/Oid8JCkvZztcbi8vIGNvbnN0IFFVT1RFUyA9IC9gfFwiKD86XFxcXFwifFteXFxcXFwiXSopKig/OlwifCQpfCcoPzpcXFxcLj98W15cXFxcJ10rKSooPzonfCQpfFwifCcvZztcbi8vIGNvbnN0IFFVT1RFUyA9IC9gfFwiKD86XFxcXC4/fFteXFxcXF0qPykqPyg/OlwifCQpfCcoPzpcXFxcLj98W15cXFxcJ10qPykqPyg/Oid8JCkvZztcbiIsImNvbnN0IHthc3NpZ24sIGRlZmluZVByb3BlcnR5fSA9IE9iamVjdDtcblxuZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gdm9pZCBudWxsO1xuXG5leHBvcnQgY2xhc3MgTm9kZSB7XG4gIGdldCBjaGlsZHJlbigpIHtcbiAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkodGhpcywgJ2NoaWxkcmVuJywge3ZhbHVlOiBuZXcgU2V0KCl9KS5jaGlsZHJlbjtcbiAgfVxuICBnZXQgY2hpbGRFbGVtZW50Q291bnQoKSB7XG4gICAgcmV0dXJuICh0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSkgfHwgMDtcbiAgfVxuICBnZXQgdGV4dENvbnRlbnQoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICh0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSAmJiBbLi4udGhpcy5jaGlsZHJlbl0uam9pbignJykpIHx8ICcnXG4gICAgKTtcbiAgfVxuICBzZXQgdGV4dENvbnRlbnQodGV4dCkge1xuICAgIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplICYmIHRoaXMuY2hpbGRyZW4uY2xlYXIoKTtcbiAgICB0ZXh0ICYmIHRoaXMuY2hpbGRyZW4uYWRkKG5ldyBTdHJpbmcodGV4dCkpO1xuICB9XG4gIGFwcGVuZENoaWxkKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmFkZChlbGVtZW50KSwgZWxlbWVudDtcbiAgfVxuICBhcHBlbmQoLi4uZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGVsZW1lbnQgJiYgdGhpcy5jaGlsZHJlbi5hZGQoZWxlbWVudCk7XG4gIH1cbiAgcmVtb3ZlQ2hpbGQoZWxlbWVudCkge1xuICAgIGVsZW1lbnQgJiZcbiAgICAgIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiZcbiAgICAgIHRoaXMuY2hpbGRyZW4uc2l6ZSAmJlxuICAgICAgdGhpcy5jaGlsZHJlbi5kZWxldGUoZWxlbWVudCk7XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cbiAgcmVtb3ZlKC4uLmVsZW1lbnRzKSB7XG4gICAgaWYgKGVsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSlcbiAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmRlbGV0ZShlbGVtZW50KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRWxlbWVudCBleHRlbmRzIE5vZGUge1xuICBnZXQgaW5uZXJIVE1MKCkge1xuICAgIHJldHVybiB0aGlzLnRleHRDb250ZW50O1xuICB9XG4gIHNldCBpbm5lckhUTUwodGV4dCkge1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB9XG4gIGdldCBvdXRlckhUTUwoKSB7XG4gICAgY29uc3Qge2NsYXNzTmFtZSwgdGFnLCBpbm5lckhUTUx9ID0gdGhpcztcbiAgICByZXR1cm4gYDwke3RhZ30keyhjbGFzc05hbWUgJiYgYCBjbGFzcz1cIiR7Y2xhc3NOYW1lfVwiYCkgfHwgJyd9PiR7aW5uZXJIVE1MIHx8ICcnfTwvJHt0YWd9PmA7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMub3V0ZXJIVE1MO1xuICB9XG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEb2N1bWVudEZyYWdtZW50IGV4dGVuZHMgTm9kZSB7XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnRleHRDb250ZW50O1xuICB9XG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gKHRoaXMuY2hpbGRFbGVtZW50Q291bnQgJiYgWy4uLnRoaXMuY2hpbGRyZW5dKSB8fCBbXTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICByZXR1cm4gKCh0aGlzLmNoaWxkRWxlbWVudENvdW50ICYmIHRoaXMuY2hpbGRyZW4pIHx8ICcnKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRleHQgZXh0ZW5kcyBTdHJpbmcge1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gZW5jb2RlRW50aXRpZXMoc3VwZXIudG9TdHJpbmcoKSk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUVsZW1lbnQgPSAodGFnLCBwcm9wZXJ0aWVzLCAuLi5jaGlsZHJlbikgPT4ge1xuICBjb25zdCBlbGVtZW50ID0gYXNzaWduKG5ldyBFbGVtZW50KCksIHtcbiAgICB0YWcsXG4gICAgY2xhc3NOYW1lOiAocHJvcGVydGllcyAmJiBwcm9wZXJ0aWVzLmNsYXNzTmFtZSkgfHwgJycsXG4gICAgcHJvcGVydGllcyxcbiAgfSk7XG4gIGNoaWxkcmVuLmxlbmd0aCAmJiBkZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnY2hpbGRyZW4nLCB7dmFsdWU6IG5ldyBTZXQoY2hpbGRyZW4pfSk7XG4gIHJldHVybiBlbGVtZW50O1xufTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVRleHQgPSAoY29udGVudCA9ICcnKSA9PiBuZXcgVGV4dChjb250ZW50KTtcbmV4cG9ydCBjb25zdCBlbmNvZGVFbnRpdHkgPSBlbnRpdHkgPT4gYCYjJHtlbnRpdHkuY2hhckNvZGVBdCgwKX07YDtcbmV4cG9ydCBjb25zdCBlbmNvZGVFbnRpdGllcyA9IHN0cmluZyA9PiBzdHJpbmcucmVwbGFjZSgvW1xcdTAwQTAtXFx1OTk5OTw+XFwmXS9naW0sIGVuY29kZUVudGl0eSk7XG5leHBvcnQgY29uc3QgY3JlYXRlRnJhZ21lbnQgPSAoKSA9PiBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuIiwiZXhwb3J0IGNvbnN0IHtkb2N1bWVudCwgRWxlbWVudCwgTm9kZSwgVGV4dCwgRG9jdW1lbnRGcmFnbWVudH0gPVxuICAnb2JqZWN0JyA9PT0gdHlwZW9mIHNlbGYgJiYgKHNlbGYgfHwgMCkud2luZG93ID09PSBzZWxmICYmIHNlbGY7XG5cbmV4cG9ydCBjb25zdCB7Y3JlYXRlRWxlbWVudCwgY3JlYXRlVGV4dCwgY3JlYXRlRnJhZ21lbnR9ID0ge1xuICBjcmVhdGVFbGVtZW50OiAodGFnLCBwcm9wZXJ0aWVzLCAuLi5jaGlsZHJlbikgPT4ge1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgcHJvcGVydGllcyAmJiBPYmplY3QuYXNzaWduKGVsZW1lbnQsIHByb3BlcnRpZXMpO1xuICAgIGlmICghY2hpbGRyZW4ubGVuZ3RoKSByZXR1cm4gZWxlbWVudDtcbiAgICBpZiAoZWxlbWVudC5hcHBlbmQpIHtcbiAgICAgIHdoaWxlIChjaGlsZHJlbi5sZW5ndGggPiA1MDApIGVsZW1lbnQuYXBwZW5kKC4uLmNoaWxkcmVuLnNwbGljZSgwLCA1MDApKTtcbiAgICAgIGNoaWxkcmVuLmxlbmd0aCAmJiBlbGVtZW50LmFwcGVuZCguLi5jaGlsZHJlbik7XG4gICAgfSBlbHNlIGlmIChlbGVtZW50LmFwcGVuZENoaWxkKSB7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cbiAgY3JlYXRlVGV4dDogKGNvbnRlbnQgPSAnJykgPT4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY29udGVudCksXG5cbiAgY3JlYXRlRnJhZ21lbnQ6ICgpID0+IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxcbn07XG4iLCJpbXBvcnQgKiBhcyBwc2V1ZG8gZnJvbSAnLi9saWIvcHNldWRvLmpzJztcbmltcG9ydCAqIGFzIGRvbSBmcm9tICcuL2xpYi9uYXRpdmUuanMnO1xuXG5leHBvcnQgY29uc3QgbmF0aXZlID0gZG9tLmRvY3VtZW50ICYmIGRvbTtcbmV4cG9ydCBjb25zdCB7Y3JlYXRlRWxlbWVudCwgY3JlYXRlVGV4dCwgY3JlYXRlRnJhZ21lbnR9ID0gbmF0aXZlIHx8IHBzZXVkbztcbmV4cG9ydCB7cHNldWRvfTtcbiIsImltcG9ydCAqIGFzIGRvbSBmcm9tICcuLi9wYWNrYWdlcy9wc2V1ZG9tL2luZGV4LmpzJztcblxuLy8vIE9QVElPTlNcbi8qKiBUaGUgdGFnIG5hbWUgb2YgdGhlIGVsZW1lbnQgdG8gdXNlIGZvciByZW5kZXJpbmcgYSB0b2tlbi4gKi9cbmNvbnN0IFNQQU4gPSAnc3Bhbic7XG5cbi8qKiBUaGUgY2xhc3MgbmFtZSBvZiB0aGUgZWxlbWVudCB0byB1c2UgZm9yIHJlbmRlcmluZyBhIHRva2VuLiAqL1xuY29uc3QgQ0xBU1MgPSAnbWFya3VwJztcblxuLyoqXG4gKiBJbnRlbmRlZCB0byBwcmV2ZW50IHVucHJlZGljdGFibGUgRE9NIHJlbGF0ZWQgb3ZlcmhlYWQgYnkgcmVuZGVyaW5nIGVsZW1lbnRzXG4gKiB1c2luZyBsaWdodHdlaWdodCBwcm94eSBvYmplY3RzIHRoYXQgY2FuIGJlIHNlcmlhbGl6ZWQgaW50byBIVE1MIHRleHQuXG4gKi9cbmNvbnN0IEhUTUxfTU9ERSA9IHRydWU7XG4vLy8gSU5URVJGQUNFXG5cbmV4cG9ydCBjb25zdCByZW5kZXJlcnMgPSB7fTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZW5kZXJlcih0b2tlbnMsIHRva2VuUmVuZGVyZXJzID0gcmVuZGVyZXJzKSB7XG4gIGZvciBhd2FpdCAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgY29uc3Qge3R5cGUgPSAndGV4dCcsIHRleHQsIHB1bmN0dWF0b3IsIGJyZWFrc30gPSB0b2tlbjtcbiAgICBjb25zdCB0b2tlblJlbmRlcmVyID1cbiAgICAgIChwdW5jdHVhdG9yICYmICh0b2tlblJlbmRlcmVyc1twdW5jdHVhdG9yXSB8fCB0b2tlblJlbmRlcmVycy5vcGVyYXRvcikpIHx8XG4gICAgICAodHlwZSAmJiB0b2tlblJlbmRlcmVyc1t0eXBlXSkgfHxcbiAgICAgICh0ZXh0ICYmIHRva2VuUmVuZGVyZXJzLnRleHQpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0b2tlblJlbmRlcmVyICYmIHRva2VuUmVuZGVyZXIodGV4dCwgdG9rZW4pO1xuICAgIGVsZW1lbnQgJiYgKHlpZWxkIGVsZW1lbnQpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBpbnN0YWxsID0gKGRlZmF1bHRzLCBuZXdSZW5kZXJlcnMgPSBkZWZhdWx0cy5yZW5kZXJlcnMgfHwge30pID0+IHtcbiAgT2JqZWN0LmFzc2lnbihuZXdSZW5kZXJlcnMsIHJlbmRlcmVycyk7XG4gIGRlZmF1bHRzLnJlbmRlcmVycyA9PT0gbmV3UmVuZGVyZXJzIHx8IChkZWZhdWx0cy5yZW5kZXJlcnMgPSBuZXdSZW5kZXJlcnMpO1xuICBkZWZhdWx0cy5yZW5kZXJlciA9IHJlbmRlcmVyO1xufTtcblxuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZCA9ICEhZG9tLm5hdGl2ZTtcbmV4cG9ydCBjb25zdCBuYXRpdmUgPSAhSFRNTF9NT0RFICYmIHN1cHBvcnRlZDtcbmNvbnN0IGltcGxlbWVudGF0aW9uID0gbmF0aXZlID8gZG9tLm5hdGl2ZSA6IGRvbS5wc2V1ZG87XG5leHBvcnQgY29uc3Qge2NyZWF0ZUVsZW1lbnQsIGNyZWF0ZVRleHQsIGNyZWF0ZUZyYWdtZW50fSA9IGltcGxlbWVudGF0aW9uO1xuXG4vLy8gSU1QTEVNRU5UQVRJT05cbmNvbnN0IGZhY3RvcnkgPSAodGFnLCBwcm9wZXJ0aWVzKSA9PiAoY29udGVudCwgdG9rZW4pID0+IHtcbiAgaWYgKCFjb250ZW50KSByZXR1cm47XG4gIHR5cGVvZiBjb250ZW50ICE9PSAnc3RyaW5nJyB8fCAoY29udGVudCA9IGNyZWF0ZVRleHQoY29udGVudCkpO1xuICBjb25zdCBlbGVtZW50ID0gY3JlYXRlRWxlbWVudCh0YWcsIHByb3BlcnRpZXMsIGNvbnRlbnQpO1xuXG4gIGVsZW1lbnQgJiYgdG9rZW4gJiYgKHRva2VuLmhpbnQgJiYgKGVsZW1lbnQuY2xhc3NOYW1lICs9IGAgJHt0b2tlbi5oaW50fWApKTtcbiAgLy8gdG9rZW4uYnJlYWtzICYmIChlbGVtZW50LmJyZWFrcyA9IHRva2VuLmJyZWFrcyksXG4gIC8vIHRva2VuICYmXG4gIC8vICh0b2tlbi5mb3JtICYmIChlbGVtZW50LmNsYXNzTmFtZSArPSBgIG1heWJlLSR7dG9rZW4uZm9ybX1gKSxcbiAgLy8gdG9rZW4uaGludCAmJiAoZWxlbWVudC5jbGFzc05hbWUgKz0gYCAke3Rva2VuLmhpbnR9YCksXG4gIC8vIGVsZW1lbnQgJiYgKGVsZW1lbnQudG9rZW4gPSB0b2tlbikpO1xuXG4gIHJldHVybiBlbGVtZW50O1xufTtcblxuT2JqZWN0LmFzc2lnbihyZW5kZXJlcnMsIHtcbiAgLy8gd2hpdGVzcGFjZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gd2hpdGVzcGFjZWB9KSxcbiAgd2hpdGVzcGFjZTogY3JlYXRlVGV4dCxcbiAgdGV4dDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBDTEFTU30pLFxuXG4gIHZhcmlhYmxlOiBmYWN0b3J5KCd2YXInLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gdmFyaWFibGVgfSksXG4gIGtleXdvcmQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGtleXdvcmRgfSksXG4gIGlkZW50aWZpZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGlkZW50aWZpZXJgfSksXG4gIG9wZXJhdG9yOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZXJhdG9yYH0pLFxuICBhc3NpZ25lcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvciBhc3NpZ25lcmB9KSxcbiAgY29tYmluYXRvcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvciBjb21iaW5hdG9yYH0pLFxuICBwdW5jdHVhdGlvbjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBwdW5jdHVhdGlvbmB9KSxcbiAgcXVvdGU6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgcXVvdGVgfSksXG4gIGJyZWFrZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgYnJlYWtlcmB9KSxcbiAgb3BlbmVyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZW5lcmB9KSxcbiAgY2xvc2VyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIGNsb3NlcmB9KSxcbiAgc3BhbjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBzcGFuYH0pLFxuICBzZXF1ZW5jZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gc2VxdWVuY2VgfSksXG4gIGxpdGVyYWw6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGxpdGVyYWxgfSksXG4gIGluZGVudDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gc2VxdWVuY2UgaW5kZW50YH0pLFxuICBjb21tZW50OiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBjb21tZW50YH0pLFxuICBjb2RlOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfWB9KSxcbn0pO1xuIiwiaW1wb3J0ICogYXMgbW9kZXMgZnJvbSAnLi9tYXJrdXAtbW9kZXMuanMnO1xuaW1wb3J0ICogYXMgZG9tIGZyb20gJy4vbWFya3VwLWRvbS5qcyc7XG5pbXBvcnQgKiBhcyBwYXJzZXIgZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcbi8vIGltcG9ydCAqIGFzIHBhdHRlcm5zIGZyb20gJy4vbWFya3VwLXBhdHRlcm5zLmpzJztcblxuZXhwb3J0IGxldCBpbml0aWFsaXplZDtcblxuZXhwb3J0IGNvbnN0IHJlYWR5ID0gKGFzeW5jICgpID0+IHZvaWQgKGF3YWl0IG1vZGVzLnJlYWR5KSkoKTtcblxuY29uc3QgaW5pdGlhbGl6ZSA9ICgpID0+XG4gIGluaXRpYWxpemVkIHx8XG4gIChpbml0aWFsaXplZCA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCB7Y3JlYXRlRnJhZ21lbnQsIHN1cHBvcnRlZH0gPSBkb207XG5cbiAgICAvKipcbiAgICAgKiBUZW1wb3JhcnkgdGVtcGxhdGUgZWxlbWVudCBmb3IgcmVuZGVyaW5nXG4gICAgICogQHR5cGUge0hUTUxUZW1wbGF0ZUVsZW1lbnQ/fVxuICAgICAqL1xuICAgIGNvbnN0IHRlbXBsYXRlID1cbiAgICAgIHN1cHBvcnRlZCAmJlxuICAgICAgKHRlbXBsYXRlID0+XG4gICAgICAgICdIVE1MVGVtcGxhdGVFbGVtZW50JyA9PT0gKHRlbXBsYXRlICYmIHRlbXBsYXRlLmNvbnN0cnVjdG9yICYmIHRlbXBsYXRlLmNvbnN0cnVjdG9yLm5hbWUpICYmXG4gICAgICAgIHRlbXBsYXRlKShkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpKTtcblxuICAgIC8vLyBBUElcbiAgICBjb25zdCBzeW50YXhlcyA9IHt9O1xuICAgIGNvbnN0IHJlbmRlcmVycyA9IHt9O1xuICAgIGNvbnN0IGRlZmF1bHRzID0gey4uLnBhcnNlci5kZWZhdWx0c307XG5cbiAgICBhd2FpdCByZWFkeTtcbiAgICAvLy8gRGVmYXVsdHNcbiAgICBtb2Rlcy5pbnN0YWxsKGRlZmF1bHRzLCBzeW50YXhlcyk7XG4gICAgZG9tLmluc3RhbGwoZGVmYXVsdHMsIHJlbmRlcmVycyk7XG5cbiAgICB0b2tlbml6ZSA9IChzb3VyY2UsIG9wdGlvbnMpID0+IHBhcnNlci50b2tlbml6ZShzb3VyY2UsIHtvcHRpb25zfSwgZGVmYXVsdHMpO1xuXG4gICAgcmVuZGVyID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBvcHRpb25zLmZyYWdtZW50IHx8IGNyZWF0ZUZyYWdtZW50KCk7XG5cbiAgICAgIGNvbnN0IGVsZW1lbnRzID0gcGFyc2VyLnJlbmRlcihzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzKTtcbiAgICAgIGxldCBmaXJzdCA9IGF3YWl0IGVsZW1lbnRzLm5leHQoKTtcblxuICAgICAgbGV0IGxvZ3MgPSAoZnJhZ21lbnQubG9ncyA9IFtdKTtcblxuICAgICAgaWYgKGZpcnN0ICYmICd2YWx1ZScgaW4gZmlyc3QpIHtcbiAgICAgICAgaWYgKCFkb20ubmF0aXZlICYmIHRlbXBsYXRlICYmICd0ZXh0Q29udGVudCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAndGV4dCcgaW4gdGVtcGxhdGVgKTtcbiAgICAgICAgICBjb25zdCBib2R5ID0gW2ZpcnN0LnZhbHVlXTtcbiAgICAgICAgICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgYm9keS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGJvZHkuam9pbignJyk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY29udGVudCk7XG5cbiAgICAgICAgICAvLyBpZiAoIWZpcnN0LmRvbmUpIHtcbiAgICAgICAgICAvLyAgIGlmICh0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gICAgIC8vICAmJiBmaXJzdC52YWx1ZS50b2tlblxuICAgICAgICAgIC8vICAgICBsZXQgbGluZXMgPSAwO1xuICAgICAgICAgIC8vICAgICBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICAgICAgICAvLyAgICAgICAvLyBlbGVtZW50LnRva2VuICYmXG4gICAgICAgICAgLy8gICAgICAgLy8gICBlbGVtZW50LnRva2VuLmJyZWFrcyA+IDAgJiZcbiAgICAgICAgICAvLyAgICAgICAvLyAgIChsaW5lcyArPSBlbGVtZW50LnRva2VuLmJyZWFrcykgJSAyID09PSAwICYmXG4gICAgICAgICAgLy8gICAgICAgbGluZXMrKyAlIDEwID09PSAwICYmXG4gICAgICAgICAgLy8gICAgICAgICAoKHRlbXBsYXRlLmlubmVySFRNTCA9IGJvZHkuc3BsaWNlKDAsIGJvZHkubGVuZ3RoKS5qb2luKCcnKSksXG4gICAgICAgICAgLy8gICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jb250ZW50KSk7XG4gICAgICAgICAgLy8gICAgICAgLy8gYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKVxuICAgICAgICAgIC8vICAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlcXVlc3RBbmltYXRpb25GcmFtZSlcbiAgICAgICAgICAvLyAgICAgICBib2R5LnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gICAgIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgYm9keS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgIC8vICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBib2R5LmpvaW4oJycpOyAvLyB0ZXh0XG4gICAgICAgICAgLy8gICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRlbXBsYXRlLmNvbnRlbnQpO1xuICAgICAgICAgIC8vICAgfVxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfSBlbHNlIGlmICgncHVzaCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAncHVzaCcgaW4gZnJhZ21lbnRgKTtcbiAgICAgICAgICBmcmFnbWVudC5wdXNoKGZpcnN0LnZhbHVlKTtcbiAgICAgICAgICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZnJhZ21lbnQucHVzaChlbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyBpbiBmcmFnbWVudCkge1xuICAgICAgICAgIC8vICAmJiBmaXJzdC52YWx1ZS5ub2RlVHlwZSA+PSAxXG4gICAgICAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ2FwcGVuZCcgaW4gZnJhZ21lbnRgKTtcbiAgICAgICAgICBmcmFnbWVudC5hcHBlbmQoZmlyc3QudmFsdWUpO1xuICAgICAgICAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBmcmFnbWVudC5hcHBlbmQoZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZWxzZSBpZiAoJ3RleHRDb250ZW50JyBpbiBmcmFnbWVudCkge1xuICAgICAgICAvLyAgIGxldCB0ZXh0ID0gYCR7Zmlyc3QudmFsdWV9YDtcbiAgICAgICAgLy8gICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgdGV4dCArPSBgJHtlbGVtZW50fWA7XG4gICAgICAgIC8vICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIC8vICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAndGV4dCcgaW4gdGVtcGxhdGVgKTtcbiAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAvLyAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3RleHQnIGluIGZyYWdtZW50YCk7XG4gICAgICAgIC8vICAgICAvLyBUT0RPOiBGaW5kIGEgd29ya2Fyb3VuZCBmb3IgRG9jdW1lbnRGcmFnbWVudC5pbm5lckhUTUxcbiAgICAgICAgLy8gICAgIGZyYWdtZW50LmlubmVySFRNTCA9IHRleHQ7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICB9O1xuXG4gICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIG1hcmt1cDtcbiAgfSkoKTtcblxuZXhwb3J0IGxldCByZW5kZXIgPSBhc3luYyAoc291cmNlLCBvcHRpb25zKSA9PiB7XG4gIGF3YWl0IGluaXRpYWxpemUoKTtcbiAgcmV0dXJuIGF3YWl0IHJlbmRlcihzb3VyY2UsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0IGxldCB0b2tlbml6ZSA9IChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgaWYgKCFpbml0aWFsaXplZClcbiAgICB0aHJvdyBFcnJvcihgTWFya3VwOiB0b2tlbml6ZSjigKYpIGNhbGxlZCBiZWZvcmUgaW5pdGlhbGl6YXRpb24uICR7TWVzc2FnZXMuSW5pdGlhbGl6ZUZpcnN0fWApO1xuICBlbHNlIGlmIChpbml0aWFsaXplZC50aGVuKVxuICAgIEVycm9yKGBNYXJrdXA6IHRva2VuaXplKOKApikgY2FsbGVkIGR1cmluZyBpbml0aWFsaXphdGlvbi4gJHtNZXNzYWdlcy5Jbml0aWFsaXplRmlyc3R9YCk7XG4gIHJldHVybiBtYXJrdXAudG9rZW5pemUoc291cmNlLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGtleUZyb20gPSBvcHRpb25zID0+IChvcHRpb25zICYmIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKSB8fCAnJztcbmNvbnN0IHNraW0gPSBpdGVyYWJsZSA9PiB7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBpdGVyYWJsZSk7XG59O1xuXG5leHBvcnQgY29uc3Qgd2FybXVwID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICBjb25zdCBrZXkgPSAob3B0aW9ucyAmJiBrZXlGcm9tKG9wdGlvbnMpKSB8fCAnJztcbiAgbGV0IGNhY2hlID0gKHdhcm11cC5jYWNoZSB8fCAod2FybXVwLmNhY2hlID0gbmV3IE1hcCgpKSkuZ2V0KGtleSk7XG4gIGNhY2hlIHx8IHdhcm11cC5jYWNoZS5zZXQoa2V5LCAoY2FjaGUgPSBuZXcgU2V0KCkpKTtcbiAgYXdhaXQgKGluaXRpYWxpemVkIHx8IGluaXRpYWxpemUoKSk7XG4gIC8vIGxldCB0b2tlbnM7XG4gIGNhY2hlLmhhcyhzb3VyY2UpIHx8IChza2ltKHRva2VuaXplKHNvdXJjZSwgb3B0aW9ucykpLCBjYWNoZS5hZGQoc291cmNlKSk7XG4gIC8vIGNhY2hlLmhhcyhzb3VyY2UpIHx8ICgodG9rZW5zID0+IHsgd2hpbGUgKCF0b2tlbnMubmV4dCgpLmRvbmUpOyB9KSh0b2tlbml6ZShzb3VyY2UsIG9wdGlvbnMpKSwgY2FjaGUuYWRkKHNvdXJjZSkpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBtYXJrdXAgPSBPYmplY3QuY3JlYXRlKHBhcnNlciwge1xuICBpbml0aWFsaXplOiB7Z2V0OiAoKSA9PiBpbml0aWFsaXplfSxcbiAgcmVuZGVyOiB7Z2V0OiAoKSA9PiByZW5kZXJ9LFxuICB0b2tlbml6ZToge2dldDogKCkgPT4gdG9rZW5pemV9LFxuICB3YXJtdXA6IHtnZXQ6ICgpID0+IHdhcm11cH0sXG4gIGRvbToge2dldDogKCkgPT4gZG9tfSxcbiAgbW9kZXM6IHtnZXQ6ICgpID0+IHBhcnNlci5tb2Rlc30sXG59KTtcblxuLy8vIENPTlNUQU5UU1xuXG5jb25zdCBNZXNzYWdlcyA9IHtcbiAgSW5pdGlhbGl6ZUZpcnN0OiBgVHJ5IGNhbGxpbmcgTWFya3VwLmluaXRpYWxpemUoKS50aGVuKOKApikgZmlyc3QuYCxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1hcmt1cDtcbiJdLCJuYW1lcyI6WyJkZWZhdWx0cyIsInN5bnRheGVzIiwibWF0Y2hlcnMiLCJyZWFkeSIsImRvY3VtZW50IiwiRWxlbWVudCIsIk5vZGUiLCJUZXh0IiwiRG9jdW1lbnRGcmFnbWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjcmVhdGVUZXh0IiwiY3JlYXRlRnJhZ21lbnQiLCJkb20uZG9jdW1lbnQiLCJyZW5kZXJlciIsImluc3RhbGwiLCJzdXBwb3J0ZWQiLCJkb20ubmF0aXZlIiwibmF0aXZlIiwiZG9tLnBzZXVkbyIsIm1vZGVzLnJlYWR5IiwiZG9tIiwicmVuZGVyZXJzIiwicGFyc2VyLmRlZmF1bHRzIiwibW9kZXMuaW5zdGFsbCIsImRvbS5pbnN0YWxsIiwidG9rZW5pemUiLCJwYXJzZXIudG9rZW5pemUiLCJyZW5kZXIiLCJwYXJzZXIucmVuZGVyIiwibWFya3VwIiwicGFyc2VyLm1vZGVzIl0sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7O0FBTUEsQUFBTyxTQUFTLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFO0VBQ2xFLE9BQU8sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7Q0FDL0M7Ozs7Ozs7Ozs7Ozs7O0FBY0QsQUFBTyxNQUFNLFFBQVEsR0FBRztFQUN0QixPQUFPLEVBQUUsb0RBQW9EO0VBQzdELFFBQVEsRUFBRSxrRUFBa0U7RUFDNUUsTUFBTSxFQUFFLCtDQUErQztFQUN2RCxHQUFHLEVBQUUsMkdBQTJHO0VBQ2hILFNBQVMsRUFBRSxrTUFBa007Q0FDOU0sQ0FBQzs7Ozs7Ozs7OztBQVVGLEFBQU8sTUFBTSxRQUFRLEdBQUc7O0VBRXRCLFlBQVksRUFBRSxlQUFlO0NBQzlCLENBQUM7Ozs7Ozs7Ozs7O0FBV0YsQUFBTyxNQUFNLFFBQVEsR0FBRyxDQUFDLE9BQU8s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
