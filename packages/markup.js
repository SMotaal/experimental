(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.markup = {})));
}(this, (function (exports) { 'use strict';

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

  const ready$2 = (async () => void (await ready$1))();

  const initialize = () =>
    exports.initialized ||
    (exports.initialized = async () => {
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

      exports.tokenize = (source, options) => tokenize(source, {options}, defaults$$1);

      exports.render = async (source, options) => {
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

      exports.initialized = true;

      return markup$1;
    })();

  exports.render = async (source, options) => {
    await initialize();
    return await exports.render(source, options);
  };

  exports.tokenize = (source, options) => {
    if (!exports.initialized)
      throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
    else if (exports.initialized.then)
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
    await (exports.initialized || initialize());
    // let tokens;
    cache.has(source) || (skim(exports.tokenize(source, options)), cache.add(source));
    // cache.has(source) || ((tokens => { while (!tokens.next().done); })(tokenize(source, options)), cache.add(source));
    return true;
  };

  const markup$1 = Object.create(parser, {
    initialize: {get: () => initialize},
    render: {get: () => exports.render},
    tokenize: {get: () => exports.tokenize},
    warmup: {get: () => warmup},
    dom: {get: () => dom$1},
    modes: {get: () => modes},
  });

  /// CONSTANTS

  const Messages = {
    InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
  };

  exports.ready = ready$2;
  exports.warmup = warmup;
  exports.markup = markup$1;
  exports.default = markup$1;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwLmpzIiwic291cmNlcyI6WyIuLi9tYXJrdXAvbGliL21hcmt1cC1wYXJzZXIuanMiLCIuLi9tYXJrdXAvbGliL21hcmt1cC1wYXR0ZXJucy5qcyIsIi4uL21hcmt1cC9saWIvbWFya3VwLW1vZGVzLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL3BzZXVkb20vbGliL3BzZXVkby5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9wc2V1ZG9tL2xpYi9uYXRpdmUuanMiLCIuLi9tYXJrdXAvcGFja2FnZXMvcHNldWRvbS9pbmRleC5qcyIsIi4uL21hcmt1cC9saWIvbWFya3VwLWRvbS5qcyIsIi4uL21hcmt1cC9saWIvbWFya3VwLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQmFzZWxpbmUgbWFya3VwIGZyYWdtZW50ZXIgQGF1dGhvciBTYWxlaCBBYmRlbCBNb3RhYWxcbiAqXG4gKiBAZGVzY3JpcHRpb24gRnJhZ21lbnRpbmcgaXMgdGhlIHByb2Nlc3Mgb2YgY29udmVydGluZyBtYXJrdXAgaW50b1xuICogY29tcG9zaXRpb25hbCBmcmFnbWVudHMgZGVyaXZlZCBmcm9tIHRva2Vucy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmt1cChzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzID0gbWFya3VwLmRlZmF1bHRzKSB7XG4gIHJldHVybiBbLi4ucmVuZGVyKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMpXTtcbn1cblxuLy8vIFJFR1VMQVIgRVhQUkVTU0lPTlNcblxuLyoqXG4gKiBOb24tYWxwaGFudW1lcmljIHN5bWJvbCBtYXRjaGluZyBleHByZXNzaW9ucyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZClcbiAqXG4gKiBAZGVzY3JpcHRpb24gTWF0Y2hlcnMgYXJlIHVzZWQgYnkgdGhlIHRva2VuIGdlbmVyYXRvciB0byBzY2FuIGZvciBzeW1ib2xzLFxuICogYWxsb3dpbmcgdGhlbSB0byBzZWxlY3QgYSBzcGVjaWZpYyBtYXRjaGVyIGZvciBlYWNoIGNvbnRleHQuIFRoZSBmb2xsb3dpbmdcbiAqIGV4cHJlc3Npb25zIGFyZSB0aGUgbW9zdCBiYXNpYyBvbmVzLCBpbnRlbmRlZCB0byBiZSB1c2VkIGZvciB1bml0IHRlc3RzIG9ubHlcbiAqIHdoZXJlYXMgbm9ybWFsbHkgdGhlc2UgbWF0Y2hlcnMgYXJlIHJlcGxhY2VkIGJ5IG9uZXMgZGVmaW5lZCBzZXBhcmF0ZWx5LlxuICpcbiAqIEBzZWUge21hcmt1cC1tb2Rlcy5qc31cbiAqL1xuZXhwb3J0IGNvbnN0IG1hdGNoZXJzID0ge1xuICBlc2NhcGVzOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98XFwqXFwvfGB8XCJ8J3xcXCRcXHspL2csXG4gIGNvbW1lbnRzOiAvKFxcbil8KFxcKlxcL3xcXGIoPzpbYS16XStcXDpcXC9cXC98XFx3W1xcd1xcK1xcLl0qXFx3QFthLXpdKylcXFMrfEBbYS16XSspL2dpLFxuICBxdW90ZXM6IC8oXFxuKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xgfFwifCd8XFwkXFx7KS9nLFxuICB4bWw6IC8oW1xcc1xcbl0rKXwoXCJ8J3w9fCYjeD9bYS1mMC05XSs7fCZbYS16XSs7fFxcLz8+fDwlfCU+fDwhLS18LS0+fDxbXFwvXFwhXT8oPz1bYS16XStcXDo/W2EtelxcLV0qW2Etel18W2Etel0rKSkvZ2ksXG4gIHNlcXVlbmNlczogLyhbXFxzXFxuXSspfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcL1xcL3xcXC9cXCp8XFwqXFwvfFxcKHxcXCl8XFxbfFxcXXwsfDt8XFwuXFwuXFwufFxcLnxcXGI6XFwvXFwvXFxifDo6fDp8XFw/fGB8XCJ8J3xcXCRcXHt8XFx7fFxcfXw9Pnw8XFwvfFxcLz58XFwrK3xcXC0rfFxcKit8Jit8XFx8K3w9K3whPXswLDN9fDx7MSwzfT0/fD57MSwyfT0/KXxbK1xcLSovJnxeJTw+fiFdPT8vZyxcbn07XG5cbi8qKlxuICogU3BlY2lhbCBhbHBoYS1udW1lcmljIHN5bWJvbCB0ZXN0IGV4cHJlc3Npb25zIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKVxuICpcbiAqIEBkZXNjcmlwdGlvbiBQYXR0ZXJucyBhcmUgdXNlZCB0byBmdXJ0aGVyIHF1YWxpZnkgc2VxdWVuY2VzIGNvbW1vbmx5IG5lZWRlZFxuICogYnkgdGhlIHRva2VuIGdlbmVyYXRvciBhcyB3ZWxsIGFzIHRoZSBob29rcyBkZWZpbmVkIGluIGN1c3RvbSBtb2Rlcy4gVGhpc1xuICogZ3VhcmVudGVlcyBhIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIHRoaW5ncyBsaWtlIGtleXdvcmQsIGlkZW50aWZpZXIsXG4gKiB0YWctbmFtZeKApiBldGMuXG4gKi9cbmV4cG9ydCBjb25zdCBwYXR0ZXJucyA9IHtcbiAgLyoqIEJhc2ljIGxhdGluIEtleXdvcmQgbGlrZSBzeW1ib2wgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG4gIG1heWJlS2V5d29yZDogL15bYS16XShcXHcqKSQvaSxcbn07XG5cbi8vLyBTWU5UQVhFU1xuLyoqXG4gKiBTeW50YXggZGVmaW5pdGlvbnMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpXG4gKlxuICogQGRlc2NyaXB0aW9uIFN5bnRheGVzIGFyZSBleHRlbnNpYmxlIGh1bWFuLWZyaWVuZGx5IGNvbmNpc2UgZGVmaW5pdGlvbnMgdXNlZFxuICogYnkgdGhlIHRva2VuIGdlbmVyYXRvciB0byBwcm9ncmVzc2l2ZWx5IHN5bnRoZXNpemUgdGhlIG1vcmUgdm9sYXRpbGUgYnV0XG4gKiBoaWdobHkgb3B0aW1pemVkIHN0cnVjdHVyZXMgbmVlZGVkIGZvciBzY2FubmluZyBhbmQgcGFyc2luZyBkaWZmZXJlbnRcbiAqIGdyYW1tYXJzIGFjcm9zcyBkaWZmZXJlbnQgc3ludGF4ZXMgYW5kIG1vZGVzLlxuICovXG5leHBvcnQgY29uc3Qgc3ludGF4ZXMgPSB7ZGVmYXVsdDoge3BhdHRlcm5zLCBtYXRjaGVyOiBtYXRjaGVycy5zZXF1ZW5jZXN9fTtcblxuLyoqXG4gKiBNb2RlIHN0YXRlcyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZClcbiAqXG4gKiBAZGVzY3JpcHRpb24gTW9kZXMgcHJvdmlkZSB0aGUgbmVjZXNzYXJ5IG1hcHBpbmcgYmV0d2VlbiB0aGUgbGFiZWwgb2YgYVxuICogcGFydGljdWxhciB0b3AtbGV2ZWwgc3ludGF4IChpZSBsYW5ndWFnZSkgYW5kIHRoZSBhY3R1YWwgc3ludGF4IGRlZmluaXRpb25zLlxuICovXG5leHBvcnQgY29uc3QgbW9kZXMgPSB7ZGVmYXVsdDoge3N5bnRheDogJ2RlZmF1bHQnfX07XG5cbi8vLyBERUZBVUxUU1xuLyoqXG4gKiBQYXJzaW5nIGRlZmF1bHRzIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKVxuICpcbiAqIEBkZXNjcmlwdGlvbiBEZWZhdWx0cyBwcm92aWRlIGEgY29uZmlndXJhYmxlIHNpZGUtY2hhbm5lbCB1c2VkIHRvIHNhZmVseVxuICogaW50ZWdyYXRlIGN1c3RvbSBtb2RlcyB3aXRob3V0IGRpcmVjdCBjb3VwbGluZyB0byB0aGUgcGFyc2VyLlxuICovXG5leHBvcnQgY29uc3QgZGVmYXVsdHMgPSAobWFya3VwLmRlZmF1bHRzID0ge1xuICBtYXRjaGVyOiBtYXRjaGVycy5zZXF1ZW5jZXMsXG4gIHN5bnRheDogJ2RlZmF1bHQnLFxuICBzb3VyY2VUeXBlOiAnZGVmYXVsdCcsXG4gIHJlbmRlcmVyczoge3RleHQ6IFN0cmluZ30sXG4gIHJlbmRlcmVyLFxuICBnZXQgc3ludGF4ZXMoKSB7XG4gICAgcmV0dXJuIHN5bnRheGVzO1xuICB9LFxuICBzZXQgc3ludGF4ZXModmFsdWUpIHtcbiAgICBpZiAodGhpcyAhPT0gZGVmYXVsdHMpXG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgYXNzaWdubWVudDogZGlyZWN0IGFzc2lnbm1lbnQgdG8gZGVmYXVsdHMgaXMgbm90IGFsbG93ZWQuIFVzZSBPYmplY3QuY3JlYXRlKGRlZmF1bHRzKSB0byBjcmVhdGUgYSBtdXRhYmxlIGluc3RhbmNlIG9mIGRlZmF1bHRzIGZpcnN0LicsXG4gICAgICApO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3ludGF4ZXMnLCB7dmFsdWV9KTtcbiAgfSxcbn0pO1xuXG5jb25zdCBOdWxsID0gT2JqZWN0LmZyZWV6ZShPYmplY3QuY3JlYXRlKG51bGwpKTtcblxuLy8vIFJFTkRFUklOR1xuLyoqXG4gKiBUb2tlbiBwcm90b3R5cGUgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpXG4gKlxuICogQGRlc2NyaXB0aW9uIFRva2VuIGlzIGEgcHJvdG90eXBlIHRoYXQgY2FuIGJlIGV4dGVuZGVkIHRvIGNyZWF0ZSBjb21wbGV4XG4gKiBjb25zdHJ1Y3RzIGxpa2UgdGhvc2UgdXNlZCBmb3Igc3ludGF4IHRyZWVzLCBvciBvdGhlciBkaXJlY3Rpb25zIG5vdCBiYWtlZFxuICogaW50byB0aGUgY3VycmVudCBkZXNpZ24uXG4gKi9cbmV4cG9ydCBjbGFzcyBUb2tlbiB7XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnRleHQ7XG4gIH1cbn1cblxuLyoqXG4gKiBBc3luY2hyb25vdXMgcmVuZGVyaW5nIGludGVyZmFjZVxuICpcbiAqIEBkZXNjcmlwdGlvbiBSZW5kZWluZyBpcyB0aGUgcG9pbnQgaW4gd2hpY2ggdGhlIHVzdWFsbHkgc3luY2hyb25vdXMgdG9rZW5cbiAqIGdlbmVyYXRpb24gcHJvY2VzcyBkb3duc3RyZWFtcyBpbnRvIGFuIHVzdWFsbHkgYXN5bmNocm9ub3VzIGZyYWdtZW50YXRpb25cbiAqIHBpcGVsaW5lLCBhIGRlc2lnbiBjaG9pY2UgdGhhdCBtYWtlcyBpdCBwb3NzaWJsZSB0byBiZW5lZml0IHN5bmNocm9ub3VzXG4gKiBleGVjdXRpb24gc3BlZWRzIGluIHRoZSB0b2tlbml6YXRpb24gYW5kIGJlIGFibGUgdG8gc3VzcGVuZCBpdCwgd2l0aG91dFxuICogaW5jdXJyaW5nIGFzeW5jaHJvbm91cyBvdmVyaGVhZCAoaWUgUHJvbWlzZXMpIG5lZWRsZXNzbHkgYnkgZGVmZXJpbmcgaXRcbiAqIGRvd25zdHJlYW0uIFN5bmNocm9ub3VzIHdvcmtmbG93cyBiZSBpbXBsZW1lbnRlZCBieSBob29raW5nIGRpcmVjdGx5IGludG9cbiAqIHRoZSB0b2tlbnMgaXRlcmF0b3Igd2hpY2ggaXMgbm90IGFzeW5jaHJvbm91cyBieSBkZWZhdWx0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMgPSBtYXJrdXAuZGVmYXVsdHMpIHtcbiAgY29uc3Qge3N5bnRheCwgcmVuZGVyZXIgPSBkZWZhdWx0cy5yZW5kZXJlciwgLi4udG9rZW5pemVyT3B0aW9uc30gPSBvcHRpb25zIHx8IGRlZmF1bHRzO1xuICBjb25zdCBzdGF0ZSA9IHtvcHRpb25zOiB0b2tlbml6ZXJPcHRpb25zfTtcbiAgcmV0dXJuIHJlbmRlcmVyKHRva2VuaXplKHNvdXJjZSwgc3RhdGUsIGRlZmF1bHRzKSk7XG59XG5cbi8qKiBBc3luY2hyb25vdXMgcmVuZGVyZXIgKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVuZGVyZXIodG9rZW5zKSB7XG4gIGxldCBpID0gMDtcbiAgZm9yIGF3YWl0IChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICBpZiAoIXRva2VuKSBjb250aW51ZTtcbiAgICAvLyBpKysgJSAxMDAgfHwgKGF3YWl0IDApO1xuICAgIGkrKyAlIDUwMCB8fCAoYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEpKSk7XG4gICAgeWllbGQgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRva2VuLCBUb2tlbi5wcm90b3R5cGUpO1xuICB9XG59XG5cbi8qKiBTeW5jaHJvbm91cyByZW5kZXJlciAqL1xucmVuZGVyZXIuc3luYyA9IGZ1bmN0aW9uKiByZW5kZXJlcih0b2tlbnMpIHtcbiAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICB0b2tlbiAmJiAoeWllbGQgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRva2VuLCBUb2tlbi5wcm90b3R5cGUpKTtcbiAgfVxufTtcblxuLy8vIEdST1VQSU5HXG5jb25zdCBHcm91cGVyID0gKHtcbiAgLyogZ3JvdXBlciBjb250ZXh0ICovXG4gIHN5bnRheCxcbiAgZ29hbCA9IHN5bnRheCxcbiAgcXVvdGUsXG4gIGNvbW1lbnQsXG4gIGNsb3N1cmUsXG4gIHNwYW4sXG4gIGdyb3VwaW5nID0gY29tbWVudCB8fCBjbG9zdXJlIHx8IHNwYW4gfHwgdW5kZWZpbmVkLFxuXG4gIHB1bmN0dWF0b3IsXG4gIHNwYW5zID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnNwYW5zKSB8fCB1bmRlZmluZWQsXG4gIG1hdGNoZXIgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcubWF0Y2hlcikgfHwgdW5kZWZpbmVkLFxuICBxdW90ZXMgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcucXVvdGVzKSB8fCB1bmRlZmluZWQsXG4gIHB1bmN0dWF0b3JzID0ge2FnZ3JlZ2F0b3JzOiB7fX0sXG4gIG9wZW5lciA9IHF1b3RlIHx8IChncm91cGluZyAmJiBncm91cGluZy5vcGVuZXIpIHx8IHVuZGVmaW5lZCxcbiAgY2xvc2VyID0gcXVvdGUgfHwgKGdyb3VwaW5nICYmIGdyb3VwaW5nLmNsb3NlcikgfHwgdW5kZWZpbmVkLFxuICBoaW50ZXIsXG4gIG9wZW4gPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcub3BlbikgfHwgdW5kZWZpbmVkLFxuICBjbG9zZSA9IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZSkgfHwgdW5kZWZpbmVkLFxufSkgPT4gKHtcbiAgc3ludGF4LFxuICBnb2FsLFxuICBwdW5jdHVhdG9yLFxuICBzcGFucyxcbiAgbWF0Y2hlcixcbiAgcXVvdGVzLFxuICBwdW5jdHVhdG9ycyxcbiAgb3BlbmVyLFxuICBjbG9zZXIsXG4gIGhpbnRlcixcbiAgb3BlbixcbiAgY2xvc2UsXG59KTtcblxuY29uc3QgY3JlYXRlR3JvdXBlciA9IEdyb3VwZXI7XG5cbi8vLyBUT0tFTklaQVRJT05cblxuZXhwb3J0IGZ1bmN0aW9uKiBjb250ZXh0dWFsaXplcigkLCBkZWZhdWx0cykge1xuICBsZXQgZG9uZSwgZ3JvdXBlcjtcblxuICAkICE9PSB1bmRlZmluZWQgfHxcbiAgICAoJCA9IChkZWZhdWx0cyAmJiBkZWZhdWx0cy5zeW50YXhlcyAmJiBkZWZhdWx0cy5zeW50YXhlcy5kZWZhdWx0KSB8fCBzeW50YXhlcy5kZWZhdWx0KTtcblxuICBjb25zdCBpbml0aWFsaXplID0gY29udGV4dCA9PiB7XG4gICAgY29udGV4dC50b2tlbiB8fFxuICAgICAgKGNvbnRleHQudG9rZW4gPSAodG9rZW5pemVyID0+ICh0b2tlbml6ZXIubmV4dCgpLCB0b2tlbiA9PiB0b2tlbml6ZXIubmV4dCh0b2tlbikudmFsdWUpKShcbiAgICAgICAgdG9rZW5pemVyKGNvbnRleHQpLFxuICAgICAgKSk7XG4gICAgY29udGV4dDtcbiAgfTtcblxuICBjb25zdCB7XG4gICAgc3ludGF4OiAkc3ludGF4LFxuICAgIG1hdGNoZXI6ICRtYXRjaGVyID0gKCQubWF0Y2hlciA9IGRlZmF1bHRzLm1hdGNoZXIpLFxuICAgIHF1b3RlczogJHF1b3RlcyxcblxuICAgIHB1bmN0dWF0b3JzOiAkcHVuY3R1YXRvcnMgPSAoJC5wdW5jdHVhdG9ycyA9IHthZ2dyZWdhdG9yczoge319KSxcbiAgICBwdW5jdHVhdG9yczoge2FnZ3JlZ2F0b3JzOiAkYWdncmVnYXRvcnMgPSAoJC5wdW5jdHVhdG9ycy5hZ2dyZWdhdG9ycyA9IHt9KX0sXG5cbiAgICBwYXR0ZXJuczogJHBhdHRlcm5zID0gKCQucGF0dGVybnMgPSB7bWF5YmVLZXl3b3JkOiBudWxsfSksXG4gICAgcGF0dGVybnM6IHtcbiAgICAgIG1heWJlS2V5d29yZCA9ICgkLnBhdHRlcm5zLm1heWJlS2V5d29yZCA9XG4gICAgICAgICgoZGVmYXVsdHMgJiYgZGVmYXVsdHMucGF0dGVybnMpIHx8IHBhdHRlcm5zKS5tYXliZUtleXdvcmQgfHwgdW5kZWZpbmVkKSxcbiAgICB9LFxuXG4gICAgc3BhbnM6ICRzcGFucyA9ICgkLnNwYW5zID0gTnVsbCksXG5cbiAgICBrZXl3b3JkczogJGtleXdvcmRzLFxuICAgIGFzc2lnbmVyczogJGFzc2lnbmVycyxcbiAgICBvcGVyYXRvcnM6ICRvcGVyYXRvcnMsXG4gICAgY29tYmluYXRvcnM6ICRjb21iaW5hdG9ycyxcbiAgICBub25icmVha2VyczogJG5vbmJyZWFrZXJzLFxuICAgIGNvbW1lbnRzOiAkY29tbWVudHMsXG4gICAgY2xvc3VyZXM6ICRjbG9zdXJlcyxcbiAgICBicmVha2VyczogJGJyZWFrZXJzLFxuXG4gICAgcm9vdDogJHJvb3QgPSAoJC5yb290ID0ge1xuICAgICAgc3ludGF4OiAkc3ludGF4LFxuICAgICAga2V5d29yZHM6ICRrZXl3b3JkcyxcbiAgICAgIGFzc2lnbmVyczogJGFzc2lnbmVycyxcbiAgICAgIG9wZXJhdG9yczogJG9wZXJhdG9ycyxcbiAgICAgIGNvbWJpbmF0b3JzOiAkY29tYmluYXRvcnMsXG4gICAgICBub25icmVha2VyczogJG5vbmJyZWFrZXJzLFxuICAgICAgY29tbWVudHM6ICRjb21tZW50cyxcbiAgICAgIGNsb3N1cmVzOiAkY2xvc3VyZXMsXG4gICAgICBicmVha2VyczogJGJyZWFrZXJzLFxuICAgICAgcGF0dGVybnM6ICRwYXR0ZXJucyxcbiAgICB9KSxcblxuICAgIGNvbnRleHQ6ICRjb250ZXh0ID0gaW5pdGlhbGl6ZShcbiAgICAgICgkLmNvbnRleHQgPSB7XG4gICAgICAgIC8vICQsXG4gICAgICAgIC4uLiRyb290LFxuICAgICAgICBwdW5jdHVhdG9yczogJHB1bmN0dWF0b3JzLFxuICAgICAgICBhZ2dyZWdhdG9yczogJGFnZ3JlZ2F0b3JzLFxuICAgICAgICBtYXRjaGVyOiAkbWF0Y2hlciwgLy8gbWF0Y2hlcjogbWF0Y2hlci5tYXRjaGVyLFxuICAgICAgICBxdW90ZXM6ICRxdW90ZXMsXG4gICAgICAgIHNwYW5zOiAkc3BhbnNbJHN5bnRheF0sXG4gICAgICB9KSxcbiAgICApLFxuICB9ID0gJDtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIGlmIChcbiAgICAgIGdyb3VwZXIgIT09IChncm91cGVyID0geWllbGQgKGdyb3VwZXIgJiYgZ3JvdXBlci5jb250ZXh0KSB8fCAkLmNvbnRleHQpICYmXG4gICAgICBncm91cGVyICYmXG4gICAgICAhZ3JvdXBlci5jb250ZXh0XG4gICAgKSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIGdvYWwgPSAkc3ludGF4LFxuICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICBwdW5jdHVhdG9ycyA9ICRwdW5jdHVhdG9ycyxcbiAgICAgICAgYWdncmVnYXRvcnMgPSAkYWdncmVnYXRvcnMsXG4gICAgICAgIGNsb3NlcixcbiAgICAgICAgc3BhbnMsXG4gICAgICAgIG1hdGNoZXIgPSAkbWF0Y2hlcixcbiAgICAgICAgcXVvdGVzID0gJHF1b3RlcyxcbiAgICAgICAgZm9ybWluZyA9IGdvYWwgPT09ICRzeW50YXgsXG4gICAgICB9ID0gZ3JvdXBlcjtcblxuICAgICAgLy8gIW1hdGNoZXIgfHwgbWF0Y2hlci5tYXRjaGVyIHx8IChtYXRjaGVyLm1hdGNoZXIgPSBuZXcgUmVnRXhwKG1hdGNoZXIuc291cmNlLCBtYXRjaGVyLmZsYWdzLnJlcGxhY2UoJ2cnLCAneScpKSk7XG5cbiAgICAgIGluaXRpYWxpemUoXG4gICAgICAgIChncm91cGVyLmNvbnRleHQgPSB7XG4gICAgICAgICAgLy8gJCxcbiAgICAgICAgICAuLi4kcm9vdCwgLy8gLi4uICQuY29udGV4dCxcbiAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgIHB1bmN0dWF0b3JzLFxuICAgICAgICAgIGFnZ3JlZ2F0b3JzLFxuICAgICAgICAgIGNsb3NlcixcbiAgICAgICAgICBzcGFucyxcbiAgICAgICAgICBtYXRjaGVyLCAvLyBtYXRjaGVyOiBtYXRjaGVyICYmIG1hdGNoZXIubWF0Y2hlcixcbiAgICAgICAgICBxdW90ZXMsXG4gICAgICAgICAgZm9ybWluZyxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHRva2VuaXplcihjb250ZXh0KSB7XG4gIGxldCBkb25lLCBuZXh0O1xuXG4gIGNvbnN0IHtcbiAgICAkID0gTnVsbCwgLy8gJDogeyBzeW50YXgsIGtleXdvcmRzLCBhc3NpZ25lcnMsIG9wZXJhdG9ycywgY29tYmluYXRvcnMsIG5vbmJyZWFrZXJzLCBjb21tZW50cywgY2xvc3VyZXMsIGJyZWFrZXJzLCBwYXR0ZXJucyB9LFxuXG4gICAgc3ludGF4ID0gJC5zeW50YXgsXG4gICAga2V5d29yZHMgPSAkLmtleXdvcmRzLFxuICAgIGFzc2lnbmVycyA9ICQuYXNzaWduZXJzLFxuICAgIG9wZXJhdG9ycyA9ICQub3BlcmF0b3JzLFxuICAgIGNvbWJpbmF0b3JzID0gJC5jb21iaW5hdG9ycyxcbiAgICBub25icmVha2VycyA9ICQubm9uYnJlYWtlcnMsXG4gICAgY29tbWVudHMgPSAkLmNvbW1lbnRzLFxuICAgIGNsb3N1cmVzID0gJC5jbG9zdXJlcyxcbiAgICBicmVha2VycyA9ICQuYnJlYWtlcnMsXG4gICAgcGF0dGVybnMgPSAkLnBhdHRlcm5zLFxuXG4gICAgcHVuY3R1YXRvcnMsXG4gICAgYWdncmVnYXRvcnMsXG4gICAgc3BhbnMsXG4gICAgcXVvdGVzLFxuICAgIGZvcm1pbmcgPSB0cnVlLFxuICB9ID0gY29udGV4dDtcblxuICBjb25zdCB7bWF5YmVJZGVudGlmaWVyLCBtYXliZUtleXdvcmR9ID0gcGF0dGVybnMgfHwgY29udGV4dDtcbiAgY29uc3Qgd29yZGluZyA9IGtleXdvcmRzIHx8IG1heWJlSWRlbnRpZmllciA/IHRydWUgOiBmYWxzZTtcblxuICBjb25zdCBMaW5lRW5kaW5ncyA9IC8kL2dtO1xuICBjb25zdCBwdW5jdHVhdGUgPSB0ZXh0ID0+XG4gICAgKG5vbmJyZWFrZXJzICYmIG5vbmJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdub25icmVha2VyJykgfHxcbiAgICAob3BlcmF0b3JzICYmIG9wZXJhdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnb3BlcmF0b3InKSB8fFxuICAgIChjb21tZW50cyAmJiBjb21tZW50cy5pbmNsdWRlcyh0ZXh0KSAmJiAnY29tbWVudCcpIHx8XG4gICAgKHNwYW5zICYmIHNwYW5zLmluY2x1ZGVzKHRleHQpICYmICdzcGFuJykgfHxcbiAgICAocXVvdGVzICYmIHF1b3Rlcy5pbmNsdWRlcyh0ZXh0KSAmJiAncXVvdGUnKSB8fFxuICAgIChjbG9zdXJlcyAmJiBjbG9zdXJlcy5pbmNsdWRlcyh0ZXh0KSAmJiAnY2xvc3VyZScpIHx8XG4gICAgKGJyZWFrZXJzICYmIGJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdicmVha2VyJykgfHxcbiAgICBmYWxzZTtcbiAgY29uc3QgYWdncmVnYXRlID1cbiAgICAoKGFzc2lnbmVycyAmJiBhc3NpZ25lcnMubGVuZ3RoKSB8fCAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMubGVuZ3RoKSkgJiZcbiAgICAodGV4dCA9PlxuICAgICAgKGFzc2lnbmVycyAmJiBhc3NpZ25lcnMuaW5jbHVkZXModGV4dCkgJiYgJ2Fzc2lnbmVyJykgfHxcbiAgICAgIChjb21iaW5hdG9ycyAmJiBjb21iaW5hdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnY29tYmluYXRvcicpIHx8XG4gICAgICBmYWxzZSk7XG5cbiAgd2hpbGUgKCFkb25lKSB7XG4gICAgbGV0IHRva2VuLCBwdW5jdHVhdG9yO1xuICAgIGlmIChuZXh0ICYmIG5leHQudGV4dCkge1xuICAgICAgY29uc3Qge1xuICAgICAgICB0ZXh0LCAvLyBUZXh0IGZvciBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgdHlwZSwgLy8gVHlwZSBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgLy8gb2Zmc2V0LCAvLyBJbmRleCBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgLy8gYnJlYWtzLCAvLyBMaW5lYnJlYWtzIGluIG5leHQgcHJvZHVjdGlvblxuICAgICAgICBoaW50LCAvLyBIaW50IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICBwcmV2aW91cywgLy8gUHJldmlvdXMgcHJvZHVjdGlvblxuICAgICAgICBwYXJlbnQgPSAobmV4dC5wYXJlbnQgPSAocHJldmlvdXMgJiYgcHJldmlvdXMucGFyZW50KSB8fCB1bmRlZmluZWQpLCAvLyBQYXJlbnQgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIGxhc3QsIC8vIExhc3Qgc2lnbmlmaWNhbnQgcHJvZHVjdGlvblxuICAgICAgfSA9IG5leHQ7XG5cbiAgICAgIGlmICh0eXBlID09PSAnc2VxdWVuY2UnKSB7XG4gICAgICAgIChuZXh0LnB1bmN0dWF0b3IgPVxuICAgICAgICAgIChhZ2dyZWdhdGUgJiZcbiAgICAgICAgICAgIHByZXZpb3VzICYmXG4gICAgICAgICAgICAoYWdncmVnYXRvcnNbdGV4dF0gfHxcbiAgICAgICAgICAgICAgKCEodGV4dCBpbiBhZ2dyZWdhdG9ycykgJiYgKGFnZ3JlZ2F0b3JzW3RleHRdID0gYWdncmVnYXRlKHRleHQpKSkpKSB8fFxuICAgICAgICAgIChwdW5jdHVhdG9yc1t0ZXh0XSB8fFxuICAgICAgICAgICAgKCEodGV4dCBpbiBwdW5jdHVhdG9ycykgJiYgKHB1bmN0dWF0b3JzW3RleHRdID0gcHVuY3R1YXRlKHRleHQpKSkpIHx8XG4gICAgICAgICAgdW5kZWZpbmVkKSAmJiAobmV4dC50eXBlID0gJ3B1bmN0dWF0b3InKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3doaXRlc3BhY2UnKSB7XG4gICAgICAgIG5leHQuYnJlYWtzID0gdGV4dC5tYXRjaChMaW5lRW5kaW5ncykubGVuZ3RoIC0gMTtcbiAgICAgIH0gZWxzZSBpZiAoZm9ybWluZyAmJiB3b3JkaW5nKSB7XG4gICAgICAgIC8vIHR5cGUgIT09ICdpbmRlbnQnICYmXG4gICAgICAgIGNvbnN0IHdvcmQgPSB0ZXh0LnRyaW0oKTtcbiAgICAgICAgd29yZCAmJlxuICAgICAgICAgICgoa2V5d29yZHMgJiZcbiAgICAgICAgICAgIGtleXdvcmRzLmluY2x1ZGVzKHdvcmQpICYmXG4gICAgICAgICAgICAoIWxhc3QgfHwgbGFzdC5wdW5jdHVhdG9yICE9PSAnbm9uYnJlYWtlcicgfHwgKHByZXZpb3VzICYmIHByZXZpb3VzLmJyZWFrcyA+IDApKSAmJlxuICAgICAgICAgICAgKG5leHQudHlwZSA9ICdrZXl3b3JkJykpIHx8XG4gICAgICAgICAgICAobWF5YmVJZGVudGlmaWVyICYmIG1heWJlSWRlbnRpZmllci50ZXN0KHdvcmQpICYmIChuZXh0LnR5cGUgPSAnaWRlbnRpZmllcicpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0LnR5cGUgPSAndGV4dCc7XG4gICAgICB9XG5cbiAgICAgIHByZXZpb3VzICYmIChwcmV2aW91cy5uZXh0ID0gbmV4dCk7XG5cbiAgICAgIHRva2VuID0gbmV4dDtcbiAgICB9XG5cbiAgICBuZXh0ID0geWllbGQgdG9rZW47XG4gIH1cbn1cblxuLy8gVE9ETzogPEBTTW90YWFsPiBSZWZhY3RvclxuZXhwb3J0IGZ1bmN0aW9uKiB0b2tlbml6ZShzb3VyY2UsIHN0YXRlID0ge30sIGRlZmF1bHRzID0gbWFya3VwLmRlZmF1bHRzKSB7XG4gIGNvbnN0IHN5bnRheGVzID0gZGVmYXVsdHMuc3ludGF4ZXM7XG5cbiAgbGV0IHtcbiAgICBtYXRjaCxcbiAgICBpbmRleCxcbiAgICBvcHRpb25zOiB7XG4gICAgICBzb3VyY2VUeXBlID0gKHN0YXRlLm9wdGlvbnMuc291cmNlVHlwZSA9IHN0YXRlLm9wdGlvbnMuc3ludGF4IHx8IGRlZmF1bHRzLnNvdXJjZVR5cGUpLFxuICAgIH0gPSAoc3RhdGUub3B0aW9ucyA9IHt9KSxcbiAgICBwcmV2aW91cyA9IG51bGwsXG4gICAgbW9kZSA9IChzdGF0ZS5tb2RlID0gbW9kZXNbc291cmNlVHlwZV0gfHwgbW9kZXNbZGVmYXVsdHMuc291cmNlVHlwZV0pLFxuICAgIG1vZGU6IHtzeW50YXh9LFxuICAgIGdyb3VwaW5nID0gKHN0YXRlLmdyb3VwaW5nID0ge1xuICAgICAgaGludHM6IG5ldyBTZXQoKSxcbiAgICAgIGdyb3VwaW5nczogW10sXG4gICAgICBncm91cGVyczogbW9kZS5ncm91cGVycyB8fCAobW9kZS5ncm91cGVycyA9IHt9KSxcbiAgICB9KSxcbiAgfSA9IHN0YXRlO1xuXG4gIChzdGF0ZS5zb3VyY2UgPT09IChzdGF0ZS5zb3VyY2UgPSBzb3VyY2UpICYmIGluZGV4ID49IDApIHx8XG4gICAgKGluZGV4ID0gc3RhdGUuaW5kZXggPSAoaW5kZXggPiAwICYmIGluZGV4ICUgc291cmNlLmxlbmd0aCkgfHwgMCk7XG5cbiAgY29uc3QgdG9wID0ge3R5cGU6ICd0b3AnLCB0ZXh0OiAnJywgb2Zmc2V0OiBpbmRleH07XG5cbiAgbGV0IGRvbmUsXG4gICAgcGFyZW50ID0gdG9wLFxuICAgIGxhc3Q7XG5cbiAgbGV0IGxhc3RDb250ZXh0O1xuXG4gIGNvbnN0IHtcbiAgICBbKHN0YXRlLnN5bnRheCA9IHN0YXRlLm1vZGUuc3ludGF4KV06ICQgPSBkZWZhdWx0cy5zeW50YXhlc1tkZWZhdWx0cy5zeW50YXhdLFxuICB9ID0gZGVmYXVsdHMuc3ludGF4ZXM7XG5cbiAgY29uc3QgJGNvbnRleHRpbmcgPSBjb250ZXh0dWFsaXplcigkLCBkZWZhdWx0cyk7XG4gIGxldCAkY29udGV4dCA9ICRjb250ZXh0aW5nLm5leHQoKS52YWx1ZTtcblxuICAvLyBJbml0aWFsIGNvbnRleHR1YWwgaGludCAoc3ludGF4KVxuICAhc3ludGF4IHx8XG4gICAgKGdyb3VwaW5nLmdvYWwgfHwgKGdyb3VwaW5nLmdvYWwgPSBzeW50YXgpLCBncm91cGluZy5oaW50ICYmIGdyb3VwaW5nLmxhc3RTeW50YXggPT09IHN5bnRheCkgfHxcbiAgICAoZ3JvdXBpbmcuaGludHMuYWRkKHN5bnRheCkuZGVsZXRlKGdyb3VwaW5nLmxhc3RTeW50YXgpLFxuICAgIChncm91cGluZy5oaW50ID0gWy4uLmdyb3VwaW5nLmhpbnRzXS5qb2luKCcgJykpLFxuICAgIChncm91cGluZy5jb250ZXh0ID0gc3RhdGUuY29udGV4dCB8fCAoc3RhdGUuY29udGV4dCA9IGdyb3VwaW5nLmxhc3RTeW50YXggPSBzeW50YXgpKSk7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB7XG4gICAgICAkID0gTnVsbCwgLy8gJDoge3N5bnRheCwgbWF0Y2hlcnMsIGNvbW1lbnRzLCBzcGFucywgY2xvc3VyZXN9LFxuXG4gICAgICBzeW50YXggPSAkLnN5bnRheCxcbiAgICAgIG1hdGNoZXJzID0gJC5tYXRjaGVycyxcbiAgICAgIGNvbW1lbnRzID0gJC5jb21tZW50cyxcbiAgICAgIHNwYW5zID0gJC5zcGFucyxcbiAgICAgIGNsb3N1cmVzID0gJC5jbG9zdXJlcyxcblxuICAgICAgcHVuY3R1YXRvcjogJCRwdW5jdHVhdG9yLFxuICAgICAgY2xvc2VyOiAkJGNsb3NlcixcbiAgICAgIHNwYW5zOiAkJHNwYW5zLFxuICAgICAgLy8gbWF0Y2hlcjogJCRtYXRjaGVyLFxuICAgICAgbWF0Y2hlcjoge1xuICAgICAgICBtYXRjaGVyOiAkJG1hdGNoZXIgPSAoJGNvbnRleHQubWF0Y2hlci5tYXRjaGVyID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAkY29udGV4dC5tYXRjaGVyLnNvdXJjZSxcbiAgICAgICAgICAkY29udGV4dC5tYXRjaGVyLmZsYWdzLCAvLyAucmVwbGFjZSgnZycsICd5JyksXG4gICAgICAgICkpLFxuICAgICAgfSxcbiAgICAgIHRva2VuLFxuICAgICAgLy8gdG9rZW4gPSAoJGNvbnRleHQudG9rZW4gPSAodG9rZW5pemVyID0+IChcbiAgICAgIC8vICAgdG9rZW5pemVyLm5leHQoKSwgdG9rZW4gPT4gdG9rZW5pemVyLm5leHQodG9rZW4pLnZhbHVlXG4gICAgICAvLyApKSh0b2tlbml6ZXIoJGNvbnRleHQpKSksXG4gICAgICBmb3JtaW5nID0gdHJ1ZSxcbiAgICB9ID0gJGNvbnRleHQ7XG5cbiAgICAvLyBQcmltZSBNYXRjaGVyXG4gICAgLy8gKChzdGF0ZS5tYXRjaGVyICE9PSAkJG1hdGNoZXIgJiYgKHN0YXRlLm1hdGNoZXIgPSAkJG1hdGNoZXIpKSB8fFxuICAgIC8vICAgc3RhdGUuaW5kZXggIT09ICQkbWF0Y2hlci5sYXN0SW5kZXgpICYmXG4gICAgLy8gICAkJG1hdGNoZXIuZXhlYyhzdGF0ZS5zb3VyY2UpO1xuXG4gICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGhpbnQgKHN5bnRheCBvciBoaW50KVxuICAgIGNvbnN0IGhpbnQgPSBncm91cGluZy5oaW50O1xuXG4gICAgd2hpbGUgKGxhc3RDb250ZXh0ID09PSAobGFzdENvbnRleHQgPSAkY29udGV4dCkpIHtcbiAgICAgIGxldCBuZXh0O1xuXG4gICAgICBzdGF0ZS5sYXN0ID0gbGFzdDtcblxuICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RhdGUuaW5kZXggfHwgMDtcblxuICAgICAgJCRtYXRjaGVyLmxhc3RJbmRleCA9PT0gbGFzdEluZGV4IHx8ICgkJG1hdGNoZXIubGFzdEluZGV4ID0gbGFzdEluZGV4KTtcbiAgICAgIG1hdGNoID0gc3RhdGUubWF0Y2ggPSAkJG1hdGNoZXIuZXhlYyhzb3VyY2UpO1xuICAgICAgZG9uZSA9IGluZGV4ID09PSAoaW5kZXggPSBzdGF0ZS5pbmRleCA9ICQkbWF0Y2hlci5sYXN0SW5kZXgpIHx8ICFtYXRjaDtcblxuICAgICAgaWYgKGRvbmUpIHJldHVybjtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIG1hdGNoXG4gICAgICBjb25zdCB7MDogdGV4dCwgMTogd2hpdGVzcGFjZSwgMjogc2VxdWVuY2UsIGluZGV4OiBvZmZzZXR9ID0gbWF0Y2g7XG5cbiAgICAgIC8vIEN1cnJlbnQgcXVhc2ktY29udGV4dHVhbCBmcmFnbWVudFxuICAgICAgY29uc3QgcHJlID0gc291cmNlLnNsaWNlKGxhc3RJbmRleCwgb2Zmc2V0KTtcbiAgICAgIHByZSAmJlxuICAgICAgICAoKG5leHQgPSB0b2tlbih7dHlwZTogJ3ByZScsIHRleHQ6IHByZSwgb2Zmc2V0OiBsYXN0SW5kZXgsIHByZXZpb3VzLCBwYXJlbnQsIGhpbnQsIGxhc3R9KSksXG4gICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpKTtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGZyYWdtZW50XG4gICAgICBjb25zdCB0eXBlID0gKHdoaXRlc3BhY2UgJiYgJ3doaXRlc3BhY2UnKSB8fCAoc2VxdWVuY2UgJiYgJ3NlcXVlbmNlJykgfHwgJ3RleHQnO1xuICAgICAgbmV4dCA9IHRva2VuKHt0eXBlLCB0ZXh0LCBvZmZzZXQsIHByZXZpb3VzLCBwYXJlbnQsIGhpbnQsIGxhc3R9KTtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIHB1bmN0dWF0b3IgKGZyb20gc2VxdWVuY2UpXG4gICAgICBjb25zdCBjbG9zaW5nID1cbiAgICAgICAgJCRjbG9zZXIgJiZcbiAgICAgICAgKCQkY2xvc2VyLnRlc3RcbiAgICAgICAgICA/ICQkY2xvc2VyLnRlc3QodGV4dClcbiAgICAgICAgICA6ICQkY2xvc2VyID09PSB0ZXh0IHx8ICh3aGl0ZXNwYWNlICYmIHdoaXRlc3BhY2UuaW5jbHVkZXMoJCRjbG9zZXIpKSk7XG5cbiAgICAgIGxldCBhZnRlcjtcbiAgICAgIGxldCBwdW5jdHVhdG9yID0gbmV4dC5wdW5jdHVhdG9yO1xuXG4gICAgICBpZiAocHVuY3R1YXRvciB8fCBjbG9zaW5nKSB7XG4gICAgICAgIC8vIHB1bmN0dWF0b3IgdGV4dCBjbG9zaW5nIG5leHQgcGFyZW50XG4gICAgICAgIC8vIHN5bnRheCBtYXRjaGVycyBjbG9zdXJlcyBzcGFucyAkJHNwYW5zXG5cbiAgICAgICAgbGV0IGhpbnRlciA9IHB1bmN0dWF0b3IgPyBgJHtzeW50YXh9LSR7cHVuY3R1YXRvcn1gIDogZ3JvdXBpbmcuaGludDtcbiAgICAgICAgbGV0IGNsb3NlZCwgb3BlbmVkLCBncm91cGVyO1xuXG4gICAgICAgIGlmIChjbG9zaW5nKSB7XG4gICAgICAgICAgY2xvc2VkID0gZ3JvdXBlciA9IGNsb3NpbmcgJiYgZ3JvdXBpbmcuZ3JvdXBpbmdzLnBvcCgpO1xuICAgICAgICAgIG5leHQuY2xvc2VkID0gY2xvc2VkO1xuICAgICAgICAgIGdyb3VwaW5nLmdyb3VwaW5ncy5pbmNsdWRlcyhncm91cGVyKSB8fCBncm91cGluZy5oaW50cy5kZWxldGUoZ3JvdXBlci5oaW50ZXIpO1xuICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciA9PT0gJ29wZW5lcicgJiYgKG5leHQucHVuY3R1YXRvciA9ICdjbG9zZXInKSkgfHxcbiAgICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciAmJiAobmV4dC5wdW5jdHVhdG9yID0gY2xvc2VkLnB1bmN0dWF0b3IpKTtcbiAgICAgICAgICBhZnRlciA9IGdyb3VwZXIuY2xvc2UgJiYgZ3JvdXBlci5jbG9zZShuZXh0LCBzdGF0ZSwgJGNvbnRleHQpO1xuXG4gICAgICAgICAgY29uc3QgcHJldmlvdXNHcm91cGVyID0gKGdyb3VwZXIgPSBncm91cGluZy5ncm91cGluZ3NbZ3JvdXBpbmcuZ3JvdXBpbmdzLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICBncm91cGluZy5nb2FsID0gKHByZXZpb3VzR3JvdXBlciAmJiBwcmV2aW91c0dyb3VwZXIuZ29hbCkgfHwgc3ludGF4O1xuICAgICAgICAgIHBhcmVudCA9IChwYXJlbnQgJiYgcGFyZW50LnBhcmVudCkgfHwgdG9wO1xuICAgICAgICB9IGVsc2UgaWYgKCQkcHVuY3R1YXRvciAhPT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgY29uc3QgZ3JvdXAgPSBgJHtoaW50ZXJ9LCR7dGV4dH1gO1xuICAgICAgICAgIGdyb3VwZXIgPSBncm91cGluZy5ncm91cGVyc1tncm91cF07XG5cbiAgICAgICAgICBpZiAoJCRzcGFucyAmJiBwdW5jdHVhdG9yID09PSAnc3BhbicpIHtcbiAgICAgICAgICAgIGNvbnN0IHNwYW4gPSAkJHNwYW5zW3RleHRdO1xuICAgICAgICAgICAgbmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9ICdzcGFuJztcbiAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgIGdvYWw6IHN5bnRheCxcbiAgICAgICAgICAgICAgICBzcGFuLFxuICAgICAgICAgICAgICAgIG1hdGNoZXI6IHNwYW4ubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuc3BhbikgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHNwYW5zOiAoc3BhbnMgJiYgc3BhbnNbdGV4dF0pIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkJHB1bmN0dWF0b3IgIT09ICdxdW90ZScpIHtcbiAgICAgICAgICAgIGlmIChwdW5jdHVhdG9yID09PSAncXVvdGUnKSB7XG4gICAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgZ29hbDogcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIHF1b3RlOiB0ZXh0LFxuICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogKG1hdGNoZXJzICYmIG1hdGNoZXJzLnF1b3RlKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBzcGFuczogKHNwYW5zICYmIHNwYW5zW3RleHRdKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgICAgY29uc3QgY29tbWVudCA9IGNvbW1lbnRzW3RleHRdO1xuICAgICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgIGdvYWw6IHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICBjb21tZW50LFxuICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogY29tbWVudC5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5jb21tZW50KSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY2xvc3VyZScpIHtcbiAgICAgICAgICAgICAgY29uc3QgY2xvc3VyZSA9IChncm91cGVyICYmIGdyb3VwZXIuY2xvc3VyZSkgfHwgY2xvc3VyZXNbdGV4dF07XG4gICAgICAgICAgICAgIHB1bmN0dWF0b3IgPSBuZXh0LnB1bmN0dWF0b3IgPSAnb3BlbmVyJztcbiAgICAgICAgICAgICAgLy8gJ29wZW5lcicgIT09XG4gICAgICAgICAgICAgIC8vICAgKHB1bmN0dWF0b3IgPVxuICAgICAgICAgICAgICAvLyAgICAgKGNsb3N1cmUub3BlbiAmJlxuICAgICAgICAgICAgICAvLyAgICAgICAobmV4dCA9IGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpIHx8IG5leHQpLnB1bmN0dWF0b3IpIHx8XG4gICAgICAgICAgICAgIC8vICAgICAobmV4dC5wdW5jdHVhdG9yID0gJ29wZW5lcicpKSB8fFxuICAgICAgICAgICAgICBjbG9zdXJlICYmXG4gICAgICAgICAgICAgICAgKG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgICBnb2FsOiBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgIGNsb3N1cmUsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IGNsb3N1cmUubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuY2xvc3VyZSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG9wZW5lZCkge1xuICAgICAgICAgICAgLy8gYWZ0ZXIgPSBvcGVuZWQub3BlbiAmJiBvcGVuZWQub3BlbihuZXh0LCBzdGF0ZSwgb3BlbmVkKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdyb3VwZXJzW2dyb3VwXSB8fCAoZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdID0gZ3JvdXBlciA9IG9wZW5lZCk7XG4gICAgICAgICAgICBncm91cGluZy5ncm91cGluZ3MucHVzaChncm91cGVyKSwgZ3JvdXBpbmcuaGludHMuYWRkKGhpbnRlcik7XG4gICAgICAgICAgICBncm91cGluZy5nb2FsID0gKGdyb3VwZXIgJiYgZ3JvdXBlci5nb2FsKSB8fCBzeW50YXg7XG4gICAgICAgICAgICBwYXJlbnQgPSBuZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmNvbnRleHQgPSBncm91cGluZy5jb250ZXh0ID0gZ3JvdXBpbmcuZ29hbCB8fCBzeW50YXg7XG5cbiAgICAgICAgaWYgKG9wZW5lZCB8fCBjbG9zZWQpIHtcbiAgICAgICAgICAkY29udGV4dCA9ICRjb250ZXh0aW5nLm5leHQoKHN0YXRlLmdyb3VwZXIgPSBncm91cGVyIHx8IHVuZGVmaW5lZCkpLnZhbHVlO1xuICAgICAgICAgIGdyb3VwaW5nLmhpbnQgPSBgJHtbLi4uZ3JvdXBpbmcuaGludHNdLmpvaW4oJyAnKX0gJHtcbiAgICAgICAgICAgIGdyb3VwaW5nLmNvbnRleHQgPyBgaW4tJHtncm91cGluZy5jb250ZXh0fWAgOiAnJ1xuICAgICAgICAgIH1gO1xuICAgICAgICAgIG9wZW5lZCAmJiAoYWZ0ZXIgPSBvcGVuZWQub3BlbiAmJiBvcGVuZWQub3BlbihuZXh0LCBzdGF0ZSwgJGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgdGFpbCB0b2tlbiAoeWllbGQgZnJvbSBzZXF1ZW5jZSlcbiAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpO1xuXG4gICAgICAvLyBOZXh0IHJlZmVyZW5jZSB0byBsYXN0IGNvbnRleHR1YWwgc2VxdWVuY2UgdG9rZW5cbiAgICAgIG5leHQgJiYgIXdoaXRlc3BhY2UgJiYgZm9ybWluZyAmJiAobGFzdCA9IG5leHQpO1xuXG4gICAgICBpZiAoYWZ0ZXIpIHtcbiAgICAgICAgbGV0IHRva2VucywgdG9rZW4sIG5leHRJbmRleDsgLy8gID0gYWZ0ZXIuZW5kIHx8IGFmdGVyLmluZGV4XG5cbiAgICAgICAgaWYgKGFmdGVyLnN5bnRheCkge1xuICAgICAgICAgIGNvbnN0IHtzeW50YXgsIG9mZnNldCwgaW5kZXh9ID0gYWZ0ZXI7XG4gICAgICAgICAgY29uc3QgYm9keSA9IGluZGV4ID4gb2Zmc2V0ICYmIHNvdXJjZS5zbGljZShvZmZzZXQsIGluZGV4IC0gMSk7XG4gICAgICAgICAgaWYgKGJvZHkpIHtcbiAgICAgICAgICAgIGJvZHkubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgICAoKHRva2VucyA9IHRva2VuaXplKGJvZHksIHtvcHRpb25zOiB7c3ludGF4fX0sIGRlZmF1bHRzKSksIChuZXh0SW5kZXggPSBpbmRleCkpO1xuICAgICAgICAgICAgY29uc3QgaGludCA9IGAke3N5bnRheH0taW4tJHskLnN5bnRheH1gO1xuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAgICh0b2tlbi5oaW50ID0gYCR7KHRva2VuLmhpbnQgJiYgYCR7dG9rZW4uaGludH0gYCkgfHwgJyd9JHtoaW50fWApLCB0b2tlblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYWZ0ZXIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgaGludCA9IGdyb3VwaW5nLmhpbnQ7XG4gICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAodG9rZW4uaGludCA9IGAke2hpbnR9ICR7dG9rZW4udHlwZSB8fCAnY29kZSd9YCksICRjb250ZXh0LnRva2VuKHRva2VuKVxuICAgICAgICAgICk7XG4gICAgICAgICAgKHRva2VucyA9IGFmdGVyKS5lbmQgJiYgKG5leHRJbmRleCA9IGFmdGVyLmVuZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW5zKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coe3Rva2VuLCB0b2tlbnMsIG5leHRJbmRleH0pO1xuICAgICAgICAgIGZvciAoY29uc3QgbmV4dCBvZiB0b2tlbnMpIHtcbiAgICAgICAgICAgIHByZXZpb3VzICYmICgobmV4dC5wcmV2aW91cyA9IHByZXZpb3VzKS5uZXh0ID0gbmV4dCk7XG4gICAgICAgICAgICB0b2tlbiAmJiB0b2tlbihuZXh0KTtcbiAgICAgICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBuZXh0SW5kZXggPiBpbmRleCAmJiAoc3RhdGUuaW5kZXggPSBuZXh0SW5kZXgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyAobmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9XG4vLyAgIChjbG9zdXJlLm9wZW4gJiZcbi8vICAgICBjbG9zdXJlLm9wZW4obmV4dCwgc3RhdGUsIHByZXZpb3VzKSAmJlxuLy8gICAgIChuZXh0LnB1bmN0dWF0b3IgfHwgcHVuY3R1YXRvcikpIHx8XG4vLyAgICdvcGVuZXInKSB8fFxuLy8gKG5leHQucHVuY3R1YXRvciA9IHB1bmN0dWF0b3IgPVxuLy8gICAoY2xvc3VyZS5vcGVuICYmIGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpKSB8fCAnb3BlbmVyJykgfHxcbi8vIGlmIChib2R5LnN5bnRheCAmJiBib2R5LnRleHQpIHtcbi8vICAgY29uc3Qge3N5bnRheCwgdGV4dH0gPSBib2R5O1xuLy8gICBjb25zdCBzdGF0ZSA9IHtvcHRpb25zOiB7c3ludGF4fX07XG4vLyAgIGNvbnN0IHRva2VucyA9IHRva2VuaXplKHRleHQsIHN0YXRlLCBkZWZhdWx0cyk7XG4vLyAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB5aWVsZCB0b2tlbjtcbi8vIH1cblxuLy8geG1sOiAvKFtcXHNcXG5dKyl8KFwifCd8PXwmI3g/W2EtZjAtOV0rO3wmW2Etel0rO3xcXC8/Pnw8JXwlPnw8IS0tfC0tPnw8W1xcL1xcIV0/KS9naSxcbiIsIi8qKiBAdHlwZWRlZiB7UmVnRXhwfHN0cmluZ30gUGF0dGVybiAtIFZhbGlkIC8o4oCmKS8gc3ViIGV4cHJlc3Npb24gKi9cbi8qKiBAdHlwZWRlZiB7c3RyaW5nfHtzb3VyY2U6IHN0cmluZ319IEVudGl0eSAtIFZhbGlkIC9b4oCmXS8gc3ViIGV4cHJlc3Npb24gKi9cblxuZXhwb3J0IHtwYXR0ZXJuc30gZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcblxuLy8vIEV4cHJlc3Npb25zXG5jb25zdCByYXcgPSBTdHJpbmcucmF3O1xuXG4vKipcbiAqIFRoZSBjb2xsZWN0aW9uIG9mIFJlZ3VsYXIgRXhwcmVzc2lvbnMgdXNlZCB0byBtYXRjaCBzcGVjaWZpY1xuICogbWFya3VwIHNlcXVlbmNlcyBpbiBhIGdpdmVuIGNvbnRleHQgb3IgdG8gdGVzdCBtYXRjaGVkIHNlcXVlbmNlcyB2ZXJib3NlbHlcbiAqIGluIG9yZGVyIHRvIGZ1cnRoZXIgY2F0ZWdvcml6ZSB0aGVtLiBGdWxsIHN1cHBvcnQgZm9yIFVuaWNvZGUgQ2xhc3NlcyBhbmRcbiAqIFByb3BlcnRpZXMgaGFzIGJlZW4gaW5jbHVkZWQgaW4gdGhlIEVDTUFTY3JpcHQgc3BlY2lmaWNhdGlvbiBidXQgY2VydGFpblxuICogZW5naW5lcyBhcmUgc3RpbGwgaW1wbGVtZW50aW5nIHRoZW0uXG4gKlxuICogQHR5cGUge3tbbmFtZTogc3RyaW5nXToge1tuYW1lOiBzdHJpbmddOiBFbnRpdHl9fX1cbiAqL1xuZXhwb3J0IGNvbnN0IGVudGl0aWVzID0ge1xuICBlczoge1xuICAgIC8qKiBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOS4wLyNwcm9kLUlkZW50aWZpZXJTdGFydCAqL1xuICAgIElkZW50aWZpZXJTdGFydDogcmF3YF8kXFxwe0lEX1N0YXJ0fWAsXG4gICAgLyoqIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi85LjAvI3Byb2QtSWRlbnRpZmllclBhcnQgKi9cbiAgICBJZGVudGlmaWVyUGFydDogcmF3YF8kXFx1MjAwY1xcdTIwMGRcXHB7SURfQ29udGludWV9YCxcbiAgfSxcbn07XG5cbi8vLyBIZWxwZXJzXG4vKipcbiAqIENyZWF0ZSBhIHNlcXVlbmNlIG1hdGNoIGV4cHJlc3Npb24gZnJvbSBwYXR0ZXJucy5cbiAqXG4gKiBAcGFyYW0gIHsuLi5QYXR0ZXJufSBwYXR0ZXJuc1xuICovXG5leHBvcnQgY29uc3Qgc2VxdWVuY2UgPSAoLi4ucGF0dGVybnMpID0+XG4gIG5ldyBSZWdFeHAoUmVmbGVjdC5hcHBseShyYXcsIG51bGwsIHBhdHRlcm5zLm1hcChwID0+IChwICYmIHAuc291cmNlKSB8fCBwIHx8ICcnKSksICdnJyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbWF5YmVJZGVudGlmaWVyIHRlc3QgKGllIFs8Zmlyc3Q+XVs8b3RoZXI+XSopIGV4cHJlc3Npb24uXG4gKlxuICogQHBhcmFtICB7RW50aXR5fSBmaXJzdCAtIFZhbGlkIF5bPOKApj5dIGVudGl0eVxuICogQHBhcmFtICB7RW50aXR5fSBvdGhlciAtIFZhbGlkIFs84oCmPl0qJCBlbnRpdHlcbiAqIEBwYXJhbSAge3N0cmluZ30gW2ZsYWdzXSAtIFJlZ0V4cCBmbGFncyAoZGVmYXVsdHMgdG8gJ3UnKVxuICogQHBhcmFtICB7dW5rbm93bn0gW2JvdW5kYXJ5XVxuICovXG5leHBvcnQgY29uc3QgaWRlbnRpZmllciA9IChmaXJzdCwgb3RoZXIsIGZsYWdzID0gJ3UnLCBib3VuZGFyeSA9IC95Zy8udGVzdChmbGFncykgJiYgJ1xcXFxiJykgPT5cbiAgbmV3IFJlZ0V4cChgJHtib3VuZGFyeSB8fCAnXid9WyR7Zmlyc3R9XVske290aGVyfV0qJHtib3VuZGFyeSB8fCAnJCd9YCwgZmxhZ3MpO1xuXG4vKipcbiAqIENyZWF0ZSBhIHNlcXVlbmNlIHBhdHRlcm4gZnJvbSBwYXR0ZXJucy5cbiAqXG4gKiBAcGFyYW0gIHsuLi5QYXR0ZXJufSBwYXR0ZXJuc1xuICovXG5leHBvcnQgY29uc3QgYWxsID0gKC4uLnBhdHRlcm5zKSA9PiBwYXR0ZXJucy5tYXAocCA9PiAocCAmJiBwLmV4ZWMgPyBwLnNvdXJjZSA6IHApKS5qb2luKCd8Jyk7XG5cbi8vLyBSZWd1bGFyIEV4cHJlc3Npb25zXG5leHBvcnQgY29uc3QgUmVnRXhwVW5pY29kZVByb3BlcnRpZXMgPSAvXFxcXHB7ICooXFx3KykgKn0vZztcblxuUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmVwbGFjZSA9IChtLCBwcm9wZXJ0eUtleSkgPT4ge1xuICAvLyBjb25zdCBwcm9wZXJ0eSA9IEFTQ0lJW3Byb3BlcnR5S2V5XSB8fCBVbmljb2RlW3Byb3BlcnR5S2V5XTtcbiAgY29uc3QgcHJvcGVydHkgPSBSYW5nZXNbcHJvcGVydHlLZXldO1xuICBpZiAocHJvcGVydHkpIHJldHVybiBwcm9wZXJ0eS50b1N0cmluZygpO1xuICB0aHJvdyBSYW5nZUVycm9yKGBDYW5ub3QgcmV3cml0ZSB1bmljb2RlIHByb3BlcnR5IFwiJHtwcm9wZXJ0eUtleX1cImApO1xufTtcblxuUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmV3cml0ZSA9IGV4cHJlc3Npb24gPT4ge1xuICBsZXQgZmxhZ3MgPSBleHByZXNzaW9uICYmIGV4cHJlc3Npb24uZmxhZ3M7XG4gIGxldCBzb3VyY2UgPSBleHByZXNzaW9uICYmIGAke2V4cHJlc3Npb24uc291cmNlIHx8IGV4cHJlc3Npb24gfHwgJyd9YDtcbiAgc291cmNlICYmXG4gICAgUmVnRXhwVW5pY29kZVByb3BlcnRpZXMudGVzdChzb3VyY2UpICYmXG4gICAgKHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLCBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXBsYWNlKSk7XG4gIHJldHVybiAoZmxhZ3MgJiYgbmV3IFJlZ0V4cChzb3VyY2UsIGZsYWdzKSkgfHwgc291cmNlO1xufTtcblxuLy8vIEludGVyb3BlcmFiaWxpdHlcbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWQgPVxuICAvLyBUT0RPOiBSZW1vdmUgd2hlbiBzc3VwcG9ydGluZyBub24tdW5pY29kZSBydW50aW1lcyBbbm90IGluIHNjb3BlXVxuICBuZXcgUmVnRXhwKHJhd2BcXHVGRkZGYCwgJ3UnKSAmJlxuICBzdXBwb3J0cyhcbiAgICBVbmljb2RlUHJvcGVydGllcyA9PiBuZXcgUmVnRXhwKHJhd2BcXHB7TH1gLCAndScpLFxuICAgIFVuaWNvZGVDbGFzc2VzID0+IG5ldyBSZWdFeHAocmF3YFxccHtJRF9TdGFydH1cXHB7SURfQ29udGludWV9YCwgJ3UnKSxcbiAgKTtcblxuYXN5bmMgZnVuY3Rpb24gcmVwbGFjZVVuc3VwcG9ydGVkRXhwcmVzc2lvbnMoKSB7XG4gIC8vIGF3YWl0IFVuaWNvZGUuaW5pdGlhbGl6ZSgpOyBjb25zb2xlLmxvZyhVbmljb2RlKTtcbiAgZm9yIChjb25zdCBrZXkgaW4gZW50aXRpZXMpIHtcbiAgICBjb25zdCBzb3VyY2VzID0gZW50aXRpZXNba2V5XTtcbiAgICBjb25zdCByZXBsYWNlbWVudHMgPSB7fTtcbiAgICBmb3IgKGNvbnN0IGlkIGluIHNvdXJjZXMpXG4gICAgICAhc291cmNlc1tpZF0gfHxcbiAgICAgICAgdHlwZW9mIChzb3VyY2VzW2lkXS5zb3VyY2UgfHwgc291cmNlc1tpZF0pICE9PSAnc3RyaW5nJyB8fFxuICAgICAgICAocmVwbGFjZW1lbnRzW2lkXSA9IFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJld3JpdGUoc291cmNlc1tpZF0pKTtcbiAgICBPYmplY3QuYXNzaWduKHNvdXJjZXMsIHJlcGxhY2VtZW50cyk7XG4gIH1cbiAgcmV0dXJuO1xufVxuXG5mdW5jdGlvbiBzdXBwb3J0cyhmZWF0dXJlLCAuLi5mZWF0dXJlcykge1xuICBpZiAoZmVhdHVyZSkge1xuICAgIHRyeSB7XG4gICAgICBmZWF0dXJlKCk7XG4gICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiAhZmVhdHVyZXMubGVuZ3RoIHx8IFJlZmxlY3QuYXBwbHkoc3VwcG9ydHMsIG51bGwsIGZlYXR1cmVzKTtcbn1cblxuLy8gVE9ETzogRml4IFVuaWNvZGVSYW5nZS5tZXJnZSBpZiBub3QgaW1wbGVtZW50ZWQgaW4gRmlyZWZveCBzb29uXG4vLyBpbXBvcnQge1VuaWNvZGV9IGZyb20gJy4vdW5pY29kZS91bmljb2RlLmpzJztcblxuLy8gVE9ETzogUmVtb3ZlIFJhbmdlcyBvbmNlIFVuaWNvZGVSYW5nZSBpcyB3b3JraW5nXG5jb25zdCBSYW5nZXMgPSB7XG4gIC8vIEw6ICdhLXpBLVonLFxuICAvLyBOOiAnMC05JyxcbiAgSURfU3RhcnQ6IHJhd2BhLXpBLVpcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY2AsXG4gIElEX0NvbnRpbnVlOiByYXdgYS16QS1aMC05XFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcXHUyMDBjXFx1MjAwZFxceGI3XFx1MDMwMC1cXHUwMzZmXFx1MDM4N1xcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2NGItXFx1MDY2OVxcdTA2NzBcXHUwNmQ2LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZTRcXHUwNmU3XFx1MDZlOFxcdTA2ZWEtXFx1MDZlZFxcdTA2ZjAtXFx1MDZmOVxcdTA3MTFcXHUwNzMwLVxcdTA3NGFcXHUwN2E2LVxcdTA3YjBcXHUwN2MwLVxcdTA3YzlcXHUwN2ViLVxcdTA3ZjNcXHUwN2ZkXFx1MDgxNi1cXHUwODE5XFx1MDgxYi1cXHUwODIzXFx1MDgyNS1cXHUwODI3XFx1MDgyOS1cXHUwODJkXFx1MDg1OS1cXHUwODViXFx1MDhkMy1cXHUwOGUxXFx1MDhlMy1cXHUwOTAzXFx1MDkzYS1cXHUwOTNjXFx1MDkzZS1cXHUwOTRmXFx1MDk1MS1cXHUwOTU3XFx1MDk2MlxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2RcXHUwOWQ3XFx1MDllMlxcdTA5ZTNcXHUwOWU2LVxcdTA5ZWZcXHUwOWZlXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMlxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYWZhLVxcdTBhZmZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNjJcXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI4MlxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAwLVxcdTBjMDRcXHUwYzNlLVxcdTBjNDRcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNjJcXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MS1cXHUwYzgzXFx1MGNiY1xcdTBjYmUtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNlMlxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwZDAwLVxcdTBkMDNcXHUwZDNiXFx1MGQzY1xcdTBkM2UtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZFxcdTBkNTdcXHUwZDYyXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODJcXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGU2LVxcdTBkZWZcXHUwZGYyXFx1MGRmM1xcdTBlMzFcXHUwZTM0LVxcdTBlM2FcXHUwZTQ3LVxcdTBlNGVcXHUwZTUwLVxcdTBlNTlcXHUwZWIxXFx1MGViNC1cXHUwZWI5XFx1MGViYlxcdTBlYmNcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2VcXHUwZjNmXFx1MGY3MS1cXHUwZjg0XFx1MGY4NlxcdTBmODdcXHUwZjhkLVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAyYi1cXHUxMDNlXFx1MTA0MC1cXHUxMDQ5XFx1MTA1Ni1cXHUxMDU5XFx1MTA1ZS1cXHUxMDYwXFx1MTA2Mi1cXHUxMDY0XFx1MTA2Ny1cXHUxMDZkXFx1MTA3MS1cXHUxMDc0XFx1MTA4Mi1cXHUxMDhkXFx1MTA4Zi1cXHUxMDlkXFx1MTM1ZC1cXHUxMzVmXFx1MTM2OS1cXHUxMzcxXFx1MTcxMi1cXHUxNzE0XFx1MTczMi1cXHUxNzM0XFx1MTc1MlxcdTE3NTNcXHUxNzcyXFx1MTc3M1xcdTE3YjQtXFx1MTdkM1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxOGE5XFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk0Ni1cXHUxOTRmXFx1MTlkMC1cXHUxOWRhXFx1MWExNy1cXHUxYTFiXFx1MWE1NS1cXHUxYTVlXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWFiMC1cXHUxYWJkXFx1MWIwMC1cXHUxYjA0XFx1MWIzNC1cXHUxYjQ0XFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYjgyXFx1MWJhMS1cXHUxYmFkXFx1MWJiMC1cXHUxYmI5XFx1MWJlNi1cXHUxYmYzXFx1MWMyNC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM1MC1cXHUxYzU5XFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2U4XFx1MWNlZFxcdTFjZjItXFx1MWNmNFxcdTFjZjctXFx1MWNmOVxcdTFkYzAtXFx1MWRmOVxcdTFkZmItXFx1MWRmZlxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyY2VmLVxcdTJjZjFcXHUyZDdmXFx1MmRlMC1cXHUyZGZmXFx1MzAyYS1cXHUzMDJmXFx1MzA5OVxcdTMwOWFcXHVhNjIwLVxcdWE2MjlcXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZVxcdWE2OWZcXHVhNmYwXFx1YTZmMVxcdWE4MDJcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4ODBcXHVhODgxXFx1YThiNC1cXHVhOGM1XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGYxXFx1YThmZi1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTk0Ny1cXHVhOTUzXFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YTlkMC1cXHVhOWQ5XFx1YTllNVxcdWE5ZjAtXFx1YTlmOVxcdWFhMjktXFx1YWEzNlxcdWFhNDNcXHVhYTRjXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2ItXFx1YWE3ZFxcdWFhYjBcXHVhYWIyLVxcdWFhYjRcXHVhYWI3XFx1YWFiOFxcdWFhYmVcXHVhYWJmXFx1YWFjMVxcdWFhZWItXFx1YWFlZlxcdWFhZjVcXHVhYWY2XFx1YWJlMy1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVmYjFlXFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTJmXFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmYCxcbn07XG5cbi8vLyBCb290c3RyYXBcbmV4cG9ydCBjb25zdCByZWFkeSA9IChlbnRpdGllcy5yZWFkeSA9IHN1cHBvcnRlZFxuICA/IFByb21pc2UucmVzb2x2ZSgpXG4gIDogcmVwbGFjZVVuc3VwcG9ydGVkRXhwcmVzc2lvbnMoKSk7XG4iLCJpbXBvcnQge21hdGNoZXJzLCBtb2Rlc30gZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcbmltcG9ydCB7cGF0dGVybnMsIGVudGl0aWVzLCBpZGVudGlmaWVyLCBzZXF1ZW5jZSwgYWxsfSBmcm9tICcuL21hcmt1cC1wYXR0ZXJucy5qcyc7XG5cbi8vLyBJTlRFUkZBQ0VcblxuZXhwb3J0IGNvbnN0IGluc3RhbGwgPSAoZGVmYXVsdHMsIG5ld1N5bnRheGVzID0gZGVmYXVsdHMuc3ludGF4ZXMgfHwge30pID0+IHtcbiAgT2JqZWN0LmFzc2lnbihuZXdTeW50YXhlcywgc3ludGF4ZXMpO1xuICBkZWZhdWx0cy5zeW50YXhlcyA9PT0gbmV3U3ludGF4ZXMgfHwgKGRlZmF1bHRzLnN5bnRheGVzID0gbmV3U3ludGF4ZXMpO1xufTtcblxuZXhwb3J0IGNvbnN0IHN5bnRheGVzID0ge307XG5cbi8vLyBERUZJTklUSU9OU1xuU3ludGF4ZXM6IHtcbiAgLy8vIEhlbHBlcnNcbiAgY29uc3QgcmF3ID0gU3RyaW5nLnJhdztcbiAgY29uc3QgbGluZXMgPSBzdHJpbmcgPT4gc3RyaW5nLnNwbGl0KC9cXG4rLyk7XG4gIGNvbnN0IGNsb3N1cmVzID0gc3RyaW5nID0+IHtcbiAgICBjb25zdCBwYWlycyA9IHN5bWJvbHMoc3RyaW5nKTtcbiAgICBjb25zdCBhcnJheSA9IG5ldyBBcnJheShwYWlycy5sZW5ndGgpO1xuICAgIGFycmF5LnBhaXJzID0gcGFpcnM7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgY29uc3QgW29wZW5lciwgY2xvc2VyXSA9IHBhaXIuc3BsaXQoJ+KApicpO1xuICAgICAgYXJyYXlbKGFycmF5W2krK10gPSBvcGVuZXIpXSA9IHtvcGVuZXIsIGNsb3Nlcn07XG4gICAgfVxuICAgIGFycmF5LnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuICAgIHJldHVybiBhcnJheTtcbiAgfTtcbiAgY29uc3Qgc3ltYm9scyA9IHNvdXJjZSA9PlxuICAgIChzb3VyY2UgJiZcbiAgICAgICgodHlwZW9mIHNvdXJjZSA9PT0gJ3N0cmluZycgJiYgc291cmNlLnNwbGl0KC8gKy8pKSB8fFxuICAgICAgICAoU3ltYm9sLml0ZXJhdG9yIGluIHNvdXJjZSAmJiBbLi4uc291cmNlXSkpKSB8fFxuICAgIFtdO1xuICBzeW1ib2xzLmZyb20gPSAoLi4uYXJncykgPT4gWy4uLm5ldyBTZXQoW10uY29uY2F0KC4uLmFyZ3MubWFwKHN5bWJvbHMpKSldO1xuXG4gIC8vIGNvbnN0IExJTkVTID0gLyhcXG4pL2c7XG4gIGNvbnN0IExJTkUgPSAvJC9nO1xuXG4gIENTUzoge1xuICAgIGNvbnN0IGNzcyA9IChzeW50YXhlcy5jc3MgPSB7XG4gICAgICAuLi4obW9kZXMuY3NzID0ge3N5bnRheDogJ2Nzcyd9KSxcbiAgICAgIGNvbW1lbnRzOiBjbG9zdXJlcygnLyrigKYqLycpLFxuICAgICAgY2xvc3VyZXM6IGNsb3N1cmVzKCd74oCmfSAo4oCmKSBb4oCmXScpLFxuICAgICAgcXVvdGVzOiBzeW1ib2xzKGAnIFwiYCksXG4gICAgICBhc3NpZ25lcnM6IHN5bWJvbHMoYDpgKSxcbiAgICAgIGNvbWJpbmF0b3JzOiBzeW1ib2xzKCc+IDo6ICsgOicpLFxuICAgICAgbm9uYnJlYWtlcnM6IHN5bWJvbHMoYC1gKSxcbiAgICAgIGJyZWFrZXJzOiBzeW1ib2xzKCcsIDsnKSxcbiAgICAgIHBhdHRlcm5zOiB7Li4ucGF0dGVybnN9LFxuICAgICAgbWF0Y2hlcjogLyhbXFxzXFxuXSspfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcL1xcKnxcXCpcXC98XFwofFxcKXxcXFt8XFxdfFwifCd8XFx7fFxcfXwsfDt8XFwufFxcYjpcXC9cXC9cXGJ8OjpcXGJ8Oig/IWFjdGl2ZXxhZnRlcnxhbnl8YW55LWxpbmt8YmFja2Ryb3B8YmVmb3JlfGNoZWNrZWR8ZGVmYXVsdHxkZWZpbmVkfGRpcnxkaXNhYmxlZHxlbXB0eXxlbmFibGVkfGZpcnN0fGZpcnN0LWNoaWxkfGZpcnN0LWxldHRlcnxmaXJzdC1saW5lfGZpcnN0LW9mLXR5cGV8Zm9jdXN8Zm9jdXMtdmlzaWJsZXxmb2N1cy13aXRoaW58ZnVsbHNjcmVlbnxob3N0fGhvdmVyfGluLXJhbmdlfGluZGV0ZXJtaW5hdGV8aW52YWxpZHxsYW5nfGxhc3QtY2hpbGR8bGFzdC1vZi10eXBlfGxlZnR8bGlua3xtYXRjaGVzfG5vdHxudGgtY2hpbGR8bnRoLWxhc3QtY2hpbGR8bnRoLWxhc3Qtb2YtdHlwZXxudGgtb2YtdHlwZXxvbmx5LWNoaWxkfG9ubHktb2YtdHlwZXxvcHRpb25hbHxvdXQtb2YtcmFuZ2V8cmVhZC1vbmx5fHJlcXVpcmVkfHJpZ2h0fHJvb3R8c2NvcGV8dGFyZ2V0fHZhbGlkfHZpc2l0ZWQpKS9nLFxuICAgICAgbWF0Y2hlcnM6IHtcbiAgICAgICAgcXVvdGU6IG1hdGNoZXJzLmVzY2FwZXMsXG4gICAgICAgIGNvbW1lbnQ6IG1hdGNoZXJzLmNvbW1lbnRzLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIEhUTUw6IHtcbiAgICBjb25zdCBodG1sID0gKHN5bnRheGVzLmh0bWwgPSB7XG4gICAgICAuLi4obW9kZXMuaHRtbCA9IHtzeW50YXg6ICdodG1sJ30pLFxuICAgICAga2V5d29yZHM6IHN5bWJvbHMoJ0RPQ1RZUEUgZG9jdHlwZScpLFxuICAgICAgY29tbWVudHM6IGNsb3N1cmVzKCc8IS0t4oCmLS0+JyksXG4gICAgICBxdW90ZXM6IFtdLFxuICAgICAgY2xvc3VyZXM6IGNsb3N1cmVzKCc8JeKApiU+IDwh4oCmPiA84oCmLz4gPC/igKY+IDzigKY+JyksXG4gICAgICBwYXR0ZXJuczoge1xuICAgICAgICAuLi5wYXR0ZXJucyxcbiAgICAgICAgY2xvc2VUYWc6IC88XFwvXFx3W148Pnt9XSo/Pi9nLFxuICAgICAgICBtYXliZUlkZW50aWZpZXI6IC9eKD86KD86W2Etel1bXFwtYS16XSopP1thLXpdK1xcOik/KD86W2Etel1bXFwtYS16XSopP1thLXpdKyQvLFxuICAgICAgfSxcbiAgICAgIG1hdGNoZXI6IG1hdGNoZXJzLnhtbCxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKXxcInwnKS9nLFxuICAgICAgICBjb21tZW50OiAvKFxcbil8KC0tPikvZyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB7XG4gICAgICBjb25zdCBET0NUQUdTID0gc3ltYm9scygnU0NSSVBUIFNUWUxFJyk7XG4gICAgICBjb25zdCBUQUcgPSAvXlthLXpdKyQvaTtcbiAgICAgIC8vIFRPRE86IENoZWNrIGlmIGN1c3RvbS9uYW1lc3BhY2UgdGFncyBldmVyIG5lZWQgc3BlY2lhbCBjbG9zZSBsb2dpY1xuICAgICAgLy8gY29uc3QgVEFHTElLRSA9IC9eKD86KD86W2Etel1bXFwtYS16XSopP1thLXpdK1xcOik/KD86W2Etel1bXFwtYS16XSopP1thLXpdKyQvaTtcblxuXG4gICAgICBodG1sLmNsb3N1cmVzWyc8J10uY2xvc2UgPSAobmV4dCwgc3RhdGUsIGNvbnRleHQpID0+IHtcbiAgICAgICAgY29uc3QgcGFyZW50ID0gbmV4dCAmJiBuZXh0LnBhcmVudDtcbiAgICAgICAgY29uc3QgZmlyc3QgPSBwYXJlbnQgJiYgcGFyZW50Lm5leHQ7XG4gICAgICAgIGNvbnN0IHRhZyA9IGZpcnN0ICYmIGZpcnN0LnRleHQgJiYgVEFHLnRlc3QoZmlyc3QudGV4dCkgJiYgZmlyc3QudGV4dC50b1VwcGVyQ2FzZSgpO1xuXG4gICAgICAgIGlmICh0YWcgJiYgRE9DVEFHUy5pbmNsdWRlcyh0YWcpKSB7XG4gICAgICAgICAgLy8gVE9ETzogVW5jb21tZW50IG9uY2UgdG9rZW4gYnVmZmVyaW5nIGlzIGltcGxlbWVudGVkXG4gICAgICAgICAgLy8gdGFnICYmIChmaXJzdC50eXBlID0gJ2tleXdvcmQnKTtcblxuICAgICAgICAgIGxldCB7c291cmNlLCBpbmRleH0gPSBzdGF0ZTtcbiAgICAgICAgICBjb25zdCAkJG1hdGNoZXIgPSBzeW50YXhlcy5odG1sLnBhdHRlcm5zLmNsb3NlVGFnO1xuXG4gICAgICAgICAgbGV0IG1hdGNoOyAvLyAgPSAkJG1hdGNoZXIuZXhlYyhzb3VyY2UpO1xuICAgICAgICAgICQkbWF0Y2hlci5sYXN0SW5kZXggPSBpbmRleDtcblxuICAgICAgICAgIC8vIFRPRE86IENoZWNrIGlmIGA8c2NyaXB0PmDigKZgPC9TQ1JJUFQ+YCBpcyBzdGlsbCB2YWxpZCFcbiAgICAgICAgICBjb25zdCAkJGNsb3NlciA9IG5ldyBSZWdFeHAocmF3YF48XFwvKD86JHtmaXJzdC50ZXh0LnRvTG93ZXJDYXNlKCl9fCR7dGFnfSlcXGJgKTtcblxuICAgICAgICAgIGxldCBzeW50YXggPSAodGFnID09PSAnU1RZTEUnICYmICdjc3MnKSB8fCAnJztcblxuICAgICAgICAgIGlmICghc3ludGF4KSB7XG4gICAgICAgICAgICBjb25zdCBvcGVuVGFnID0gc291cmNlLnNsaWNlKHBhcmVudC5vZmZzZXQsIGluZGV4KTtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gL1xcc3R5cGU9Lio/XFxiKC4rPylcXGIvLmV4ZWMob3BlblRhZyk7XG4gICAgICAgICAgICBzeW50YXggPVxuICAgICAgICAgICAgICB0YWcgPT09ICdTQ1JJUFQnICYmICghbWF0Y2ggfHwgIW1hdGNoWzFdIHx8IC9ebW9kdWxlJHxqYXZhc2NyaXB0L2kudGVzdChtYXRjaFsxXSkpXG4gICAgICAgICAgICAgICAgPyAnZXMnXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHtzeW50YXgsIHRhZywgbWF0Y2gsIG9wZW5UYWd9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB3aGlsZSAoKG1hdGNoID0gJCRtYXRjaGVyLmV4ZWMoc291cmNlKSkpIHtcbiAgICAgICAgICAgIGlmICgkJGNsb3Nlci50ZXN0KG1hdGNoWzBdKSkge1xuICAgICAgICAgICAgICBpZiAoc3ludGF4KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtvZmZzZXQ6IGluZGV4LCBpbmRleDogbWF0Y2guaW5kZXgsIHN5bnRheH07XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb2Zmc2V0ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9IHNvdXJjZS5zbGljZShvZmZzZXQsIG1hdGNoLmluZGV4IC0gMSk7XG4gICAgICAgICAgICAgICAgc3RhdGUuaW5kZXggPSBtYXRjaC5pbmRleDtcbiAgICAgICAgICAgICAgICByZXR1cm4gW3t0ZXh0LCBvZmZzZXQsIHByZXZpb3VzOiBuZXh0LCBwYXJlbnR9XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9O1xuICAgICAgaHRtbC5jbG9zdXJlc1snPCddLnF1b3RlcyA9IHN5bWJvbHMoYCcgXCJgKTtcbiAgICAgIGh0bWwuY2xvc3VyZXNbJzwnXS5jbG9zZXIgPSAvXFwvPz4vO1xuXG4gICAgICAvLyBUT0RPOiBBbGxvdyBncm91cGluZy1sZXZlbCBwYXR0ZXJucyBmb3IgSFRNTCBhdHRyaWJ1dGVzIHZzIHRleHRcbiAgICAgIC8vIGh0bWwuY2xvc3VyZXNbJzwnXS5wYXR0ZXJucyA9IHsgbWF5YmVJZGVudGlmaWVyOiBUQUdMSUtFIH07XG4gICAgfVxuICB9XG5cbiAgTWFya2Rvd246IHtcbiAgICBjb25zdCBCTE9DSyA9ICdgYGDigKZgYGAgfn5+4oCmfn5+JztcbiAgICBjb25zdCBJTkxJTkUgPSAnW+KApl0gKOKApikgKuKApiogKirigKYqKiBf4oCmXyBfX+KApl9fIH7igKZ+IH5+4oCmfn4nO1xuICAgIC8qKlxuICAgICAqIFRPRE86IEFkZHJlc3MgdW5leHBlY3RlZCBjbG9zdXJlcyBpbiBwYXJzaW5nIGZyYWdtZW50ZXJcbiAgICAgKlxuICAgICAqIEFzIGZhciBhcyB0b2tlbml6YXRpb24gZ29lcywgdW5leHBlY3RlZCBjbG9zdXJlcyBhcmUgc3RpbGxcbiAgICAgKiBjbG9zdXJlcyBub25ldGhlbGVzcy4gVGhleSBhcmUgbm90IHNwYW5zLlxuICAgICAqL1xuICAgIGNvbnN0IFNQQU5TID0gJyc7IC8vIElOTElORVxuICAgIGNvbnN0IENMT1NVUkVTID0gU1BBTlMgPyBCTE9DSyA6IGAke0JMT0NLfSAke0lOTElORX1gO1xuXG4gICAgY29uc3QgaHRtbCA9IHN5bnRheGVzLmh0bWw7XG4gICAgY29uc3QgbWQgPSAoc3ludGF4ZXMubWQgPSB7XG4gICAgICAuLi4obW9kZXMubWFya2Rvd24gPSBtb2Rlcy5tZCA9IHtzeW50YXg6ICdtZCd9KSxcbiAgICAgIGNvbW1lbnRzOiBjbG9zdXJlcygnPCEtLeKApi0tPicpLFxuICAgICAgcXVvdGVzOiBbXSxcbiAgICAgIGNsb3N1cmVzOiBjbG9zdXJlcyhgJHtodG1sLmNsb3N1cmVzfSAke0NMT1NVUkVTfWApLFxuICAgICAgcGF0dGVybnM6IHsuLi5odG1sLnBhdHRlcm5zfSxcbiAgICAgIG1hdGNoZXI6IC8oXlxccyt8XFxuKXwoJiN4P1thLWYwLTldKzt8JlthLXpdKzt8KD86YGBgK3xcXH5cXH5cXH4rfC0tK3w9PSt8KD86XFwjezEsNn18XFwtfFxcYlxcZCtcXC58XFxiW2Etel1cXC58XFxiW2l2eF0rXFwuKSg/PVxccytcXFMrKSl8XCJ8J3w9fFxcLz58PCV8JT58PCEtLXwtLT58PFtcXC9cXCFdPyg/PVthLXpdK1xcOj9bYS16XFwtXSpbYS16XXxbYS16XSspfDx8PnxcXCh8XFwpfFxcW3xcXF18X18/fChbKn5gXSlcXDM/XFxifFxcYihbKn5gXSlcXDQ/KXxcXGJbXlxcblxcc1xcW1xcXVxcKFxcKVxcPFxcPiZdKlteXFxuXFxzXFxbXFxdXFwoXFwpXFw8XFw+Jl9dXFxifFteXFxuXFxzXFxbXFxdXFwoXFwpXFw8XFw+Jl0rKD89X18/XFxiKS9naW0sXG4gICAgICBzcGFuczogdW5kZWZpbmVkLFxuICAgICAgbWF0Y2hlcnM6IHtjb21tZW50OiAvKFxcbil8KC0tPikvZ30sXG4gICAgfSk7XG5cbiAgICAvLyBtZC5wYXR0ZXJucy5tYXliZUlkZW50aWZpZXIgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAoU1BBTlMpIHtcbiAgICAgIG1kLnNwYW5zID0ge21kOiBjbG9zdXJlcyhTUEFOUyl9O1xuICAgICAgY29uc3Qgc3BhbnMgPSBTUEFOUy5zcGxpdCgnICcpO1xuICAgICAgZm9yIChjb25zdCBbb3BlbmVyXSBvZiBtZC5zcGFucy5tZCkge1xuICAgICAgICBjb25zdCBzdWJzcGFucyA9IHNwYW5zLmZpbHRlcihzcGFuID0+ICFzcGFuLnN0YXJ0c1dpdGgob3BlbmVyKSk7XG4gICAgICAgIG1kLnNwYW5zW29wZW5lcl0gPSBjbG9zdXJlcyhzdWJzcGFucy5qb2luKCcgJykpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtZC5jbG9zdXJlcykge1xuICAgICAgbWQuY2xvc3VyZXNbJzwnXSA9IHsuLi5odG1sLmNsb3N1cmVzWyc8J119O1xuXG4gICAgICBjb25zdCBTWU5UQVggPSAvXlxcdyskLztcblxuICAgICAgY29uc3QgcHJldmlvdXNUZXh0RnJvbSA9ICh0b2tlbiwgbWF0Y2hlcikgPT4ge1xuICAgICAgICBjb25zdCB0ZXh0ID0gW107XG4gICAgICAgIGlmIChtYXRjaGVyICE9IG51bGwpIHtcbiAgICAgICAgICBpZiAobWF0Y2hlci50ZXN0KVxuICAgICAgICAgICAgZG8gdG9rZW4udGV4dCAmJiB0ZXh0LnB1c2godG9rZW4udGV4dCksICh0b2tlbiA9IHRva2VuLnByZXZpb3VzKTtcbiAgICAgICAgICAgIHdoaWxlICghdG9rZW4udGV4dCB8fCAhbWF0Y2hlci50ZXN0KHRva2VuLnRleHQpKTtcbiAgICAgICAgICBlbHNlIGlmIChtYXRjaGVyLmluY2x1ZGVzKVxuICAgICAgICAgICAgZG8gdG9rZW4udGV4dCAmJiB0ZXh0LnB1c2godG9rZW4udGV4dCksICh0b2tlbiA9IHRva2VuLnByZXZpb3VzKTtcbiAgICAgICAgICAgIHdoaWxlICghdG9rZW4udGV4dCB8fCAhbWF0Y2hlci5pbmNsdWRlcyh0b2tlbi50ZXh0KSk7XG4gICAgICAgICAgdGV4dC5sZW5ndGggJiYgdGV4dC5yZXZlcnNlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRleHQuam9pbignJyk7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBpbmRlbnRlciA9IChpbmRlbnRpbmcsIHRhYnMgPSAyKSA9PiB7XG4gICAgICAgIGxldCBzb3VyY2UgPSBpbmRlbnRpbmc7XG4gICAgICAgIGNvbnN0IGluZGVudCA9IG5ldyBSZWdFeHAocmF3YCg/OlxcdHwkeycgJy5yZXBlYXQodGFicyl9KWAsICdnJyk7XG4gICAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKC9cXFxcPyg/PVtcXChcXClcXDpcXD9cXFtcXF1dKS9nLCAnXFxcXCcpO1xuICAgICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZShpbmRlbnQsIGluZGVudC5zb3VyY2UpO1xuICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cChgXiR7c291cmNlfWAsICdtJyk7XG4gICAgICB9O1xuXG4gICAgICBjb25zdCBFTUJFRERFRCA9IHRydWU7XG4gICAgICBjb25zdCBvcGVuID0gKHBhcmVudCwgc3RhdGUsIGdyb3VwZXIpID0+IHtcbiAgICAgICAgY29uc3Qge3NvdXJjZSwgaW5kZXg6IHN0YXJ0fSA9IHN0YXRlO1xuICAgICAgICBjb25zdCBmZW5jZSA9IHBhcmVudC50ZXh0O1xuICAgICAgICBjb25zdCBmZW5jaW5nID0gcHJldmlvdXNUZXh0RnJvbShwYXJlbnQsICdcXG4nKTtcbiAgICAgICAgY29uc3QgaW5kZW50aW5nID0gZmVuY2luZy5zbGljZShmZW5jaW5nLmluZGV4T2YoJ1xcbicpICsgMSwgLWZlbmNlLmxlbmd0aCkgfHwgJyc7XG4gICAgICAgIGxldCBlbmQgPSBzb3VyY2UuaW5kZXhPZihgXFxuJHtmZW5jaW5nfWAsIHN0YXJ0KTtcbiAgICAgICAgY29uc3QgSU5ERU5UID0gaW5kZW50ZXIoaW5kZW50aW5nKTtcbiAgICAgICAgY29uc3QgQ0xPU0VSID0gbmV3IFJlZ0V4cChyYXdgXFxuJHtJTkRFTlQuc291cmNlLnNsaWNlKDEpfSR7ZmVuY2V9YCwgJ2cnKTtcblxuICAgICAgICBDTE9TRVIubGFzdEluZGV4ID0gc3RhcnQ7XG4gICAgICAgIGxldCBjbG9zZXJNYXRjaCA9IENMT1NFUi5leGVjKHNvdXJjZSk7XG4gICAgICAgIGlmIChjbG9zZXJNYXRjaCAmJiBjbG9zZXJNYXRjaC5pbmRleCA+PSBzdGFydCkge1xuICAgICAgICAgIGVuZCA9IGNsb3Nlck1hdGNoLmluZGV4ICsgMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBGRU5DRSA9IG5ldyBSZWdFeHAocmF3YFxcbj9bXFw+XFx8XFxzXSoke2ZlbmNlfWAsICdnJyk7XG4gICAgICAgICAgRkVOQ0UubGFzdEluZGV4ID0gc3RhcnQ7XG4gICAgICAgICAgY29uc3QgZmVuY2VNYXRjaCA9IEZFTkNFLmV4ZWMoc291cmNlKTtcbiAgICAgICAgICBpZiAoZmVuY2VNYXRjaCAmJiBmZW5jZU1hdGNoLmluZGV4ID49IHN0YXJ0KSB7XG4gICAgICAgICAgICBlbmQgPSBmZW5jZU1hdGNoLmluZGV4ICsgMTtcbiAgICAgICAgICB9IGVsc2UgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGVuZCA+IHN0YXJ0KSB7XG4gICAgICAgICAgbGV0IG9mZnNldCA9IHN0YXJ0O1xuICAgICAgICAgIGxldCB0ZXh0O1xuXG4gICAgICAgICAgY29uc3QgYm9keSA9IHNvdXJjZS5zbGljZShzdGFydCwgZW5kKSB8fCAnJztcbiAgICAgICAgICBjb25zdCB0b2tlbnMgPSBbXTtcbiAgICAgICAgICB0b2tlbnMuZW5kID0gZW5kO1xuICAgICAgICAgIGlmICghRU1CRURERUQpIHtcbiAgICAgICAgICAgIHRleHQgPSBib2R5O1xuICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQsIHR5cGU6ICdjb2RlJywgb2Zmc2V0LCBwYXJlbnR9KTtcbiAgICAgICAgICAgIG9mZnNldCArPSBib2R5Lmxlbmd0aDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgW2hlYWQsIC4uLmxpbmVzXSA9IGJvZHkuc3BsaXQoLyhcXG4pL2cpO1xuICAgICAgICAgICAgaWYgKGhlYWQpIHtcbiAgICAgICAgICAgICAgLy8gY29uc3QgWywgc3ludGF4LCBhdHRyaWJ1dGVzXSA9IC9eKFxcdy4qXFxiKT9cXHMqKC4qKVxccyokLy5leGVjKGhlYWQpO1xuICAgICAgICAgICAgICB0b2tlbnMucHVzaCh7dGV4dDogaGVhZCwgdHlwZTogJ2NvbW1lbnQnLCBvZmZzZXQsIHBhcmVudH0pLCAob2Zmc2V0ICs9IGhlYWQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coe2hlYWQsIGxpbmVzLCBpbmRlbnRpbmcsIElOREVOVH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgICAgICAgIGNvbnN0IFtpbmRlbnRdID0gSU5ERU5ULmV4ZWMobGluZSkgfHwgJyc7XG4gICAgICAgICAgICAgIGNvbnN0IGluc2V0ID0gKGluZGVudCAmJiBpbmRlbnQubGVuZ3RoKSB8fCAwO1xuICAgICAgICAgICAgICBpZiAoaW5zZXQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRleHQgb2YgaW5kZW50LnNwbGl0KC8oXFxzKykvZykpIHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAodGV4dC50cmltKCkgJiYgJ3NlcXVlbmNlJykgfHwgJ3doaXRlc3BhY2UnO1xuICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQsIHR5cGUsIG9mZnNldCwgcGFyZW50fSk7XG4gICAgICAgICAgICAgICAgICBvZmZzZXQgKz0gdGV4dC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRleHQgPSBsaW5lLnNsaWNlKGluc2V0KTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0ZXh0ID0gbGluZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB0b2tlbnMucHVzaCh7dGV4dCwgdHlwZTogJ2NvZGUnLCBvZmZzZXQsIHBhcmVudH0pLCAob2Zmc2V0ICs9IHRleHQubGVuZ3RoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coe2ZlbmNpbmcsIGJvZHksIHN0YXJ0LCBlbmQsIG9mZnNldCwgbGluZXMsIHRva2Vuc30pO1xuICAgICAgICAgIGlmICh0b2tlbnMubGVuZ3RoKSByZXR1cm4gdG9rZW5zO1xuICAgICAgICB9XG4gICAgICB9O1xuXG4gICAgICBtZC5jbG9zdXJlc1snYGBgJ10ub3BlbiA9IG1kLmNsb3N1cmVzWyd+fn4nXS5vcGVuID0gb3BlbjtcblxuICAgICAgaWYgKG1kLmNsb3N1cmVzWydgYGAnXSAmJiAhbWQuY2xvc3VyZXNbJ2BgYCddLm9wZW4pIHtcbiAgICAgICAgbWQuY2xvc3VyZXNbJ2BgYCddLnF1b3RlcyA9IGh0bWwuY2xvc3VyZXNbJzwnXS5xdW90ZXM7XG4gICAgICAgIG1kLmNsb3N1cmVzWydgYGAnXS5tYXRjaGVyID0gLyhcXHMqXFxuKXwoYGBgKD89YGBgXFxzfGBgYCQpfF4oPzpbXFxzPnxdKlxccyk/XFxzKil8LiokL2dtO1xuICAgICAgfVxuXG4gICAgICBpZiAobWQuY2xvc3VyZXNbJ35+fiddICYmICFtZC5jbG9zdXJlc1snfn5+J10ub3Blbikge1xuICAgICAgICBtZC5jbG9zdXJlc1snfn5+J10ucXVvdGVzID0gaHRtbC5jbG9zdXJlc1snPCddLnF1b3RlcztcbiAgICAgICAgbWQuY2xvc3VyZXNbJ35+fiddLm1hdGNoZXIgPSAvKFxccypcXG4pfCh+fn4oPz1+fn5cXHN8fn5+JCl8Xig/OltcXHM+fF0qXFxzKT9cXHMqKXwuKiQvZ207XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gY29uc29sZS5sb2cobWQpO1xuICB9XG5cbiAgRUNNQVNjcmlwdDoge1xuICAgIGNvbnN0IFJFR0VYUFMgPSAvXFwvKD89W15cXCpcXC9cXG5dW15cXG5dKlxcLykoPzpbXlxcXFxcXC9cXG5cXHRcXFtdK3xcXFxcXFxTfFxcWyg/OlxcXFxcXFN8W15cXFxcXFxuXFx0XFxdXSspKz9cXF0pKz9cXC9bYS16XSovZztcbiAgICBjb25zdCBDT01NRU5UUyA9IC9cXC9cXC98XFwvXFwqfFxcKlxcL3xcXC98XlxcI1xcIS4qXFxuL2c7XG4gICAgY29uc3QgUVVPVEVTID0gL2B8XCJ8Jy9nO1xuICAgIGNvbnN0IENMT1NVUkVTID0gL1xce3xcXH18XFwofFxcKXxcXFt8XFxdL2c7XG5cbiAgICBjb25zdCBlcyA9IChzeW50YXhlcy5lcyA9IHtcbiAgICAgIC4uLihtb2Rlcy5qYXZhc2NyaXB0ID0gbW9kZXMuZXMgPSBtb2Rlcy5qcyA9IHtzeW50YXg6ICdlcyd9KSxcbiAgICAgIGNvbW1lbnRzOiBjbG9zdXJlcygnLy/igKZcXG4gLyrigKYqLycpLFxuICAgICAgcXVvdGVzOiBzeW1ib2xzKGAnIFwiIFxcYGApLFxuICAgICAgY2xvc3VyZXM6IGNsb3N1cmVzKCd74oCmfSAo4oCmKSBb4oCmXScpLFxuICAgICAgc3BhbnM6IHsnYCc6IGNsb3N1cmVzKCcke+KApn0nKX0sXG4gICAgICBrZXl3b3Jkczogc3ltYm9scyhcbiAgICAgICAgLy8gYWJzdHJhY3QgZW51bSBpbnRlcmZhY2UgcGFja2FnZSAgbmFtZXNwYWNlIGRlY2xhcmUgdHlwZSBtb2R1bGVcbiAgICAgICAgJ2FyZ3VtZW50cyBhcyBhc3luYyBhd2FpdCBicmVhayBjYXNlIGNhdGNoIGNsYXNzIGNvbnN0IGNvbnRpbnVlIGRlYnVnZ2VyIGRlZmF1bHQgZGVsZXRlIGRvIGVsc2UgZXhwb3J0IGV4dGVuZHMgZmluYWxseSBmb3IgZnJvbSBmdW5jdGlvbiBnZXQgaWYgaW1wb3J0IGluIGluc3RhbmNlb2YgbGV0IG5ldyBvZiByZXR1cm4gc2V0IHN1cGVyIHN3aXRjaCB0aGlzIHRocm93IHRyeSB0eXBlb2YgdmFyIHZvaWQgd2hpbGUgd2l0aCB5aWVsZCcsXG4gICAgICApLFxuICAgICAgYXNzaWduZXJzOiBzeW1ib2xzKCc9ICs9IC09ICo9IC89ICoqPSAlPSB8PSBePSAmPSA8PD0gPj49ID4+Pj0nKSxcbiAgICAgIGNvbWJpbmF0b3JzOiBzeW1ib2xzKCc+PSA8PSA9PSA9PT0gIT0gIT09IHx8ICYmICEgJiB8ID4gPCA9PiAlICsgLSAqKiAqIC8gPj4gPDwgPj4+ID8gOicpLFxuICAgICAgbm9uYnJlYWtlcnM6IHN5bWJvbHMoJy4nKSxcbiAgICAgIG9wZXJhdG9yczogc3ltYm9scygnKysgLS0gISEgXiB+ICEgLi4uJyksXG4gICAgICBicmVha2Vyczogc3ltYm9scygnLCA7JyksXG4gICAgICBwYXR0ZXJuczogey4uLnBhdHRlcm5zfSxcbiAgICAgIG1hdGNoZXI6IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke2FsbChcbiAgICAgICAgUkVHRVhQUyxcbiAgICAgICAgcmF3YFxcLz1gLFxuICAgICAgICBDT01NRU5UUyxcbiAgICAgICAgUVVPVEVTLFxuICAgICAgICBDTE9TVVJFUyxcbiAgICAgICAgLyx8O3xcXC5cXC5cXC58XFwufFxcOnxcXD98PT4vLFxuICAgICAgICAvIT09fD09PXw9PXw9LyxcbiAgICAgICAgLi4uc3ltYm9scyhyYXdgXFwrIFxcLSBcXCogJiBcXHxgKS5tYXAocyA9PiBgJHtzfSR7c318JHtzfT18JHtzfWApLFxuICAgICAgICAuLi5zeW1ib2xzKHJhd2AhIFxcKlxcKiAlIDw8ID4+ID4+PiA8ID4gXFxeIH5gKS5tYXAocyA9PiBgJHtzfT18JHtzfWApLFxuICAgICAgKX0pYCxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiBtYXRjaGVycy5xdW90ZXMsXG4gICAgICAgIGNvbW1lbnQ6IG1hdGNoZXJzLmNvbW1lbnRzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIEVDTUFTY3JpcHRFeHRlbnNpb25zOiB7XG4gICAgICAvLyBjb25zdCBIQVNIQkFORyA9IC9eXFwjXFwhLipcXG4vZzsgLy8gW15dID09PSAoPzouKlxcbilcbiAgICAgIC8vIFRPRE86IFVuZG8gJCBtYXRjaGluZyBvbmNlIGZpeGVkXG4gICAgICBjb25zdCBRVU9URVMgPSAvYHxcIig/OlteXFxcXFwiXSt8XFxcXC4pKig/OlwifCQpfCcoPzpbXlxcXFwnXSt8XFxcXC4pKig/Oid8JCkvZztcbiAgICAgIGNvbnN0IENPTU1FTlRTID0gL1xcL1xcLy4qKD86XFxufCQpfFxcL1xcKlteXSo/KD86XFwqXFwvfCQpfF5cXCNcXCEuKlxcbi9nOyAvLyBbXl0gPT09ICg/Oi4qXFxuKVxuICAgICAgY29uc3QgU1RBVEVNRU5UUyA9IGFsbChRVU9URVMsIENMT1NVUkVTLCBSRUdFWFBTLCBDT01NRU5UUyk7XG4gICAgICBjb25zdCBCTE9DS0xFVkVMID0gc2VxdWVuY2VgKFtcXHNcXG5dKyl8KCR7U1RBVEVNRU5UU30pYDtcbiAgICAgIGNvbnN0IFRPUExFVkVMID0gc2VxdWVuY2VgKFtcXHNcXG5dKyl8KCR7U1RBVEVNRU5UU30pYDtcbiAgICAgIGNvbnN0IENMT1NVUkUgPSBzZXF1ZW5jZWAoXFxuKyl8KCR7U1RBVEVNRU5UU30pYDtcbiAgICAgIGNvbnN0IEVTTSA9IHNlcXVlbmNlYCR7VE9QTEVWRUx9fFxcYmV4cG9ydFxcYnxcXGJpbXBvcnRcXGJgO1xuICAgICAgY29uc3QgQ0pTID0gc2VxdWVuY2VgJHtCTE9DS0xFVkVMfXxcXGJleHBvcnRzXFxifFxcYm1vZHVsZS5leHBvcnRzXFxifFxcYnJlcXVpcmVcXGJgO1xuICAgICAgY29uc3QgRVNYID0gc2VxdWVuY2VgJHtCTE9DS0xFVkVMfXxcXGJleHBvcnRzXFxifFxcYmltcG9ydFxcYnxcXGJtb2R1bGUuZXhwb3J0c1xcYnxcXGJyZXF1aXJlXFxiYDtcblxuICAgICAgY29uc3Qge3F1b3RlcywgY2xvc3VyZXMsIHNwYW5zfSA9IGVzO1xuICAgICAgY29uc3Qgc3ludGF4ID0ge3F1b3RlcywgY2xvc3VyZXMsIHNwYW5zfTtcbiAgICAgIGNvbnN0IG1hdGNoZXJzID0ge307XG4gICAgICAoe3F1b3RlOiBtYXRjaGVycy5xdW90ZX0gPSBlcy5tYXRjaGVycyk7XG5cbiAgICAgIGNvbnN0IGVzbSA9IChzeW50YXhlcy5lc20gPSB7XG4gICAgICAgIC4uLihtb2Rlcy5lc20gPSB7c3ludGF4OiAnZXNtJ30pLFxuICAgICAgICBrZXl3b3Jkczogc3ltYm9scygnaW1wb3J0IGV4cG9ydCBkZWZhdWx0JyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogRVNNLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBDTE9TVVJFfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgY2pzID0gKHN5bnRheGVzLmNqcyA9IHtcbiAgICAgICAgLi4uKG1vZGVzLmNqcyA9IHtzeW50YXg6ICdjanMnfSksXG4gICAgICAgIGtleXdvcmRzOiBzeW1ib2xzKCdpbXBvcnQgbW9kdWxlIGV4cG9ydHMgcmVxdWlyZScpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IENKUyxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogQ0pTfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZXN4ID0gKHN5bnRheGVzLmVzeCA9IHtcbiAgICAgICAgLi4uKG1vZGVzLmVzeCA9IHtzeW50YXg6ICdlc3gnfSksXG4gICAgICAgIGtleXdvcmRzOiBzeW1ib2xzLmZyb20oZXNtLmtleXdvcmRzLCBjanMua2V5d29yZHMpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IEVTWCxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogRVNYfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vLy8gQm9vdHN0cmFwXG5leHBvcnQgY29uc3QgcmVhZHkgPSAoYXN5bmMgKCkgPT4ge1xuICBhd2FpdCBlbnRpdGllcy5yZWFkeTtcbiAgc3ludGF4ZXMuZXMucGF0dGVybnMubWF5YmVJZGVudGlmaWVyID0gaWRlbnRpZmllcihcbiAgICBlbnRpdGllcy5lcy5JZGVudGlmaWVyU3RhcnQsXG4gICAgZW50aXRpZXMuZXMuSWRlbnRpZmllclBhcnQsXG4gICk7XG4gIC8vIGNvbnNvbGUubG9nKHttYXliZUlkZW50aWZpZXI6IGAke3N5bnRheGVzLmVzLnBhdHRlcm5zLm1heWJlSWRlbnRpZmllcn1gfSk7XG59KSgpO1xuXG4vLyBjb25zdCBRVU9URVMgPSAvYHxcIlxcXCJcInxcIlwifFwiKD86W15cXFwiXSt8XFxcXC4pKig/OlwifCQpfCdcXCcnfCcnfCg/OlteXFwnXSt8XFxcXC4pKig/Oid8JCkvZztcbi8vIGNvbnN0IFFVT1RFUyA9IC9gfFwiXCJ8XCIoPzouKlxcXFwufC4qPykqPyg/OlwifCQpfCcnfCcoPzpbXlxcXFxdKnxcXFxcLikqKD86J3wkKS9nO1xuLy8gY29uc3QgUVVPVEVTID0gL2B8XCIoPzpcXFxcXCJ8W15cXFxcXCJdKikqKD86XCJ8JCl8Jyg/OlxcXFwuP3xbXlxcXFwnXSspKig/Oid8JCl8XCJ8Jy9nO1xuLy8gY29uc3QgUVVPVEVTID0gL2B8XCIoPzpcXFxcLj98W15cXFxcXSo/KSo/KD86XCJ8JCl8Jyg/OlxcXFwuP3xbXlxcXFwnXSo/KSo/KD86J3wkKS9nO1xuIiwiY29uc3Qge2Fzc2lnbiwgZGVmaW5lUHJvcGVydHl9ID0gT2JqZWN0O1xuXG5leHBvcnQgY29uc3QgZG9jdW1lbnQgPSB2b2lkIG51bGw7XG5cbmV4cG9ydCBjbGFzcyBOb2RlIHtcbiAgZ2V0IGNoaWxkcmVuKCkge1xuICAgIHJldHVybiBkZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY2hpbGRyZW4nLCB7dmFsdWU6IG5ldyBTZXQoKX0pLmNoaWxkcmVuO1xuICB9XG4gIGdldCBjaGlsZEVsZW1lbnRDb3VudCgpIHtcbiAgICByZXR1cm4gKHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplKSB8fCAwO1xuICB9XG4gIGdldCB0ZXh0Q29udGVudCgpIHtcbiAgICByZXR1cm4gKFxuICAgICAgKHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplICYmIFsuLi50aGlzLmNoaWxkcmVuXS5qb2luKCcnKSkgfHwgJydcbiAgICApO1xuICB9XG4gIHNldCB0ZXh0Q29udGVudCh0ZXh0KSB7XG4gICAgdGhpcy5oYXNPd25Qcm9wZXJ0eSgnY2hpbGRyZW4nKSAmJiB0aGlzLmNoaWxkcmVuLnNpemUgJiYgdGhpcy5jaGlsZHJlbi5jbGVhcigpO1xuICAgIHRleHQgJiYgdGhpcy5jaGlsZHJlbi5hZGQobmV3IFN0cmluZyh0ZXh0KSk7XG4gIH1cbiAgYXBwZW5kQ2hpbGQoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50ICYmIHRoaXMuY2hpbGRyZW4uYWRkKGVsZW1lbnQpLCBlbGVtZW50O1xuICB9XG4gIGFwcGVuZCguLi5lbGVtZW50cykge1xuICAgIGlmIChlbGVtZW50cy5sZW5ndGgpIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmFkZChlbGVtZW50KTtcbiAgfVxuICByZW1vdmVDaGlsZChlbGVtZW50KSB7XG4gICAgZWxlbWVudCAmJlxuICAgICAgdGhpcy5oYXNPd25Qcm9wZXJ0eSgnY2hpbGRyZW4nKSAmJlxuICAgICAgdGhpcy5jaGlsZHJlbi5zaXplICYmXG4gICAgICB0aGlzLmNoaWxkcmVuLmRlbGV0ZShlbGVtZW50KTtcbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuICByZW1vdmUoLi4uZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplKVxuICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBlbGVtZW50ICYmIHRoaXMuY2hpbGRyZW4uZGVsZXRlKGVsZW1lbnQpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFbGVtZW50IGV4dGVuZHMgTm9kZSB7XG4gIGdldCBpbm5lckhUTUwoKSB7XG4gICAgcmV0dXJuIHRoaXMudGV4dENvbnRlbnQ7XG4gIH1cbiAgc2V0IGlubmVySFRNTCh0ZXh0KSB7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHRleHQ7XG4gIH1cbiAgZ2V0IG91dGVySFRNTCgpIHtcbiAgICBjb25zdCB7Y2xhc3NOYW1lLCB0YWcsIGlubmVySFRNTH0gPSB0aGlzO1xuICAgIHJldHVybiBgPCR7dGFnfSR7KGNsYXNzTmFtZSAmJiBgIGNsYXNzPVwiJHtjbGFzc05hbWV9XCJgKSB8fCAnJ30+JHtpbm5lckhUTUwgfHwgJyd9PC8ke3RhZ30+YDtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5vdXRlckhUTUw7XG4gIH1cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIERvY3VtZW50RnJhZ21lbnQgZXh0ZW5kcyBOb2RlIHtcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMudGV4dENvbnRlbnQ7XG4gIH1cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiAodGhpcy5jaGlsZEVsZW1lbnRDb3VudCAmJiBbLi4udGhpcy5jaGlsZHJlbl0pIHx8IFtdO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiAoKHRoaXMuY2hpbGRFbGVtZW50Q291bnQgJiYgdGhpcy5jaGlsZHJlbikgfHwgJycpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGV4dCBleHRlbmRzIFN0cmluZyB7XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBlbmNvZGVFbnRpdGllcyhzdXBlci50b1N0cmluZygpKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlRWxlbWVudCA9ICh0YWcsIHByb3BlcnRpZXMsIC4uLmNoaWxkcmVuKSA9PiB7XG4gIGNvbnN0IGVsZW1lbnQgPSBhc3NpZ24obmV3IEVsZW1lbnQoKSwge1xuICAgIHRhZyxcbiAgICBjbGFzc05hbWU6IChwcm9wZXJ0aWVzICYmIHByb3BlcnRpZXMuY2xhc3NOYW1lKSB8fCAnJyxcbiAgICBwcm9wZXJ0aWVzLFxuICB9KTtcbiAgY2hpbGRyZW4ubGVuZ3RoICYmIGRlZmluZVByb3BlcnR5KGVsZW1lbnQsICdjaGlsZHJlbicsIHt2YWx1ZTogbmV3IFNldChjaGlsZHJlbil9KTtcbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlVGV4dCA9IChjb250ZW50ID0gJycpID0+IG5ldyBUZXh0KGNvbnRlbnQpO1xuZXhwb3J0IGNvbnN0IGVuY29kZUVudGl0eSA9IGVudGl0eSA9PiBgJiMke2VudGl0eS5jaGFyQ29kZUF0KDApfTtgO1xuZXhwb3J0IGNvbnN0IGVuY29kZUVudGl0aWVzID0gc3RyaW5nID0+IHN0cmluZy5yZXBsYWNlKC9bXFx1MDBBMC1cXHU5OTk5PD5cXCZdL2dpbSwgZW5jb2RlRW50aXR5KTtcbmV4cG9ydCBjb25zdCBjcmVhdGVGcmFnbWVudCA9ICgpID0+IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4iLCJleHBvcnQgY29uc3Qge2RvY3VtZW50LCBFbGVtZW50LCBOb2RlLCBUZXh0LCBEb2N1bWVudEZyYWdtZW50fSA9XG4gICdvYmplY3QnID09PSB0eXBlb2Ygc2VsZiAmJiAoc2VsZiB8fCAwKS53aW5kb3cgPT09IHNlbGYgJiYgc2VsZjtcblxuZXhwb3J0IGNvbnN0IHtjcmVhdGVFbGVtZW50LCBjcmVhdGVUZXh0LCBjcmVhdGVGcmFnbWVudH0gPSB7XG4gIGNyZWF0ZUVsZW1lbnQ6ICh0YWcsIHByb3BlcnRpZXMsIC4uLmNoaWxkcmVuKSA9PiB7XG4gICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgICBwcm9wZXJ0aWVzICYmIE9iamVjdC5hc3NpZ24oZWxlbWVudCwgcHJvcGVydGllcyk7XG4gICAgaWYgKCFjaGlsZHJlbi5sZW5ndGgpIHJldHVybiBlbGVtZW50O1xuICAgIGlmIChlbGVtZW50LmFwcGVuZCkge1xuICAgICAgd2hpbGUgKGNoaWxkcmVuLmxlbmd0aCA+IDUwMCkgZWxlbWVudC5hcHBlbmQoLi4uY2hpbGRyZW4uc3BsaWNlKDAsIDUwMCkpO1xuICAgICAgY2hpbGRyZW4ubGVuZ3RoICYmIGVsZW1lbnQuYXBwZW5kKC4uLmNoaWxkcmVuKTtcbiAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYXBwZW5kQ2hpbGQpIHtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfSxcblxuICBjcmVhdGVUZXh0OiAoY29udGVudCA9ICcnKSA9PiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjb250ZW50KSxcblxuICBjcmVhdGVGcmFnbWVudDogKCkgPT4gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxufTtcbiIsImltcG9ydCAqIGFzIHBzZXVkbyBmcm9tICcuL2xpYi9wc2V1ZG8uanMnO1xuaW1wb3J0ICogYXMgZG9tIGZyb20gJy4vbGliL25hdGl2ZS5qcyc7XG5cbmV4cG9ydCBjb25zdCBuYXRpdmUgPSBkb20uZG9jdW1lbnQgJiYgZG9tO1xuZXhwb3J0IGNvbnN0IHtjcmVhdGVFbGVtZW50LCBjcmVhdGVUZXh0LCBjcmVhdGVGcmFnbWVudH0gPSBuYXRpdmUgfHwgcHNldWRvO1xuZXhwb3J0IHtwc2V1ZG99O1xuIiwiaW1wb3J0ICogYXMgZG9tIGZyb20gJy4uL3BhY2thZ2VzL3BzZXVkb20vaW5kZXguanMnO1xuXG4vLy8gT1BUSU9OU1xuLyoqIFRoZSB0YWcgbmFtZSBvZiB0aGUgZWxlbWVudCB0byB1c2UgZm9yIHJlbmRlcmluZyBhIHRva2VuLiAqL1xuY29uc3QgU1BBTiA9ICdzcGFuJztcblxuLyoqIFRoZSBjbGFzcyBuYW1lIG9mIHRoZSBlbGVtZW50IHRvIHVzZSBmb3IgcmVuZGVyaW5nIGEgdG9rZW4uICovXG5jb25zdCBDTEFTUyA9ICdtYXJrdXAnO1xuXG4vKipcbiAqIEludGVuZGVkIHRvIHByZXZlbnQgdW5wcmVkaWN0YWJsZSBET00gcmVsYXRlZCBvdmVyaGVhZCBieSByZW5kZXJpbmcgZWxlbWVudHNcbiAqIHVzaW5nIGxpZ2h0d2VpZ2h0IHByb3h5IG9iamVjdHMgdGhhdCBjYW4gYmUgc2VyaWFsaXplZCBpbnRvIEhUTUwgdGV4dC5cbiAqL1xuY29uc3QgSFRNTF9NT0RFID0gdHJ1ZTtcbi8vLyBJTlRFUkZBQ0VcblxuZXhwb3J0IGNvbnN0IHJlbmRlcmVycyA9IHt9O1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlbmRlcmVyKHRva2VucywgdG9rZW5SZW5kZXJlcnMgPSByZW5kZXJlcnMpIHtcbiAgZm9yIGF3YWl0IChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICBjb25zdCB7dHlwZSA9ICd0ZXh0JywgdGV4dCwgcHVuY3R1YXRvciwgYnJlYWtzfSA9IHRva2VuO1xuICAgIGNvbnN0IHRva2VuUmVuZGVyZXIgPVxuICAgICAgKHB1bmN0dWF0b3IgJiYgKHRva2VuUmVuZGVyZXJzW3B1bmN0dWF0b3JdIHx8IHRva2VuUmVuZGVyZXJzLm9wZXJhdG9yKSkgfHxcbiAgICAgICh0eXBlICYmIHRva2VuUmVuZGVyZXJzW3R5cGVdKSB8fFxuICAgICAgKHRleHQgJiYgdG9rZW5SZW5kZXJlcnMudGV4dCk7XG4gICAgY29uc3QgZWxlbWVudCA9IHRva2VuUmVuZGVyZXIgJiYgdG9rZW5SZW5kZXJlcih0ZXh0LCB0b2tlbik7XG4gICAgZWxlbWVudCAmJiAoeWllbGQgZWxlbWVudCk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGluc3RhbGwgPSAoZGVmYXVsdHMsIG5ld1JlbmRlcmVycyA9IGRlZmF1bHRzLnJlbmRlcmVycyB8fCB7fSkgPT4ge1xuICBPYmplY3QuYXNzaWduKG5ld1JlbmRlcmVycywgcmVuZGVyZXJzKTtcbiAgZGVmYXVsdHMucmVuZGVyZXJzID09PSBuZXdSZW5kZXJlcnMgfHwgKGRlZmF1bHRzLnJlbmRlcmVycyA9IG5ld1JlbmRlcmVycyk7XG4gIGRlZmF1bHRzLnJlbmRlcmVyID0gcmVuZGVyZXI7XG59O1xuXG5leHBvcnQgY29uc3Qgc3VwcG9ydGVkID0gISFkb20ubmF0aXZlO1xuZXhwb3J0IGNvbnN0IG5hdGl2ZSA9ICFIVE1MX01PREUgJiYgc3VwcG9ydGVkO1xuY29uc3QgaW1wbGVtZW50YXRpb24gPSBuYXRpdmUgPyBkb20ubmF0aXZlIDogZG9tLnBzZXVkbztcbmV4cG9ydCBjb25zdCB7Y3JlYXRlRWxlbWVudCwgY3JlYXRlVGV4dCwgY3JlYXRlRnJhZ21lbnR9ID0gaW1wbGVtZW50YXRpb247XG5cbi8vLyBJTVBMRU1FTlRBVElPTlxuY29uc3QgZmFjdG9yeSA9ICh0YWcsIHByb3BlcnRpZXMpID0+IChjb250ZW50LCB0b2tlbikgPT4ge1xuICBpZiAoIWNvbnRlbnQpIHJldHVybjtcbiAgdHlwZW9mIGNvbnRlbnQgIT09ICdzdHJpbmcnIHx8IChjb250ZW50ID0gY3JlYXRlVGV4dChjb250ZW50KSk7XG4gIGNvbnN0IGVsZW1lbnQgPSBjcmVhdGVFbGVtZW50KHRhZywgcHJvcGVydGllcywgY29udGVudCk7XG5cbiAgZWxlbWVudCAmJiB0b2tlbiAmJiAodG9rZW4uaGludCAmJiAoZWxlbWVudC5jbGFzc05hbWUgKz0gYCAke3Rva2VuLmhpbnR9YCkpO1xuICAvLyB0b2tlbi5icmVha3MgJiYgKGVsZW1lbnQuYnJlYWtzID0gdG9rZW4uYnJlYWtzKSxcbiAgLy8gdG9rZW4gJiZcbiAgLy8gKHRva2VuLmZvcm0gJiYgKGVsZW1lbnQuY2xhc3NOYW1lICs9IGAgbWF5YmUtJHt0b2tlbi5mb3JtfWApLFxuICAvLyB0b2tlbi5oaW50ICYmIChlbGVtZW50LmNsYXNzTmFtZSArPSBgICR7dG9rZW4uaGludH1gKSxcbiAgLy8gZWxlbWVudCAmJiAoZWxlbWVudC50b2tlbiA9IHRva2VuKSk7XG5cbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG5PYmplY3QuYXNzaWduKHJlbmRlcmVycywge1xuICAvLyB3aGl0ZXNwYWNlOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSB3aGl0ZXNwYWNlYH0pLFxuICB3aGl0ZXNwYWNlOiBjcmVhdGVUZXh0LFxuICB0ZXh0OiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IENMQVNTfSksXG5cbiAgdmFyaWFibGU6IGZhY3RvcnkoJ3ZhcicsIHtjbGFzc05hbWU6IGAke0NMQVNTfSB2YXJpYWJsZWB9KSxcbiAga2V5d29yZDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30ga2V5d29yZGB9KSxcbiAgaWRlbnRpZmllcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gaWRlbnRpZmllcmB9KSxcbiAgb3BlcmF0b3I6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igb3BlcmF0b3JgfSksXG4gIGFzc2lnbmVyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZXJhdG9yIGFzc2lnbmVyYH0pLFxuICBjb21iaW5hdG9yOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZXJhdG9yIGNvbWJpbmF0b3JgfSksXG4gIHB1bmN0dWF0aW9uOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIHB1bmN0dWF0aW9uYH0pLFxuICBxdW90ZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBxdW90ZWB9KSxcbiAgYnJlYWtlcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBicmVha2VyYH0pLFxuICBvcGVuZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igb3BlbmVyYH0pLFxuICBjbG9zZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgY2xvc2VyYH0pLFxuICBzcGFuOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIHNwYW5gfSksXG4gIHNlcXVlbmNlOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBzZXF1ZW5jZWB9KSxcbiAgbGl0ZXJhbDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gbGl0ZXJhbGB9KSxcbiAgaW5kZW50OiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBzZXF1ZW5jZSBpbmRlbnRgfSksXG4gIGNvbW1lbnQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGNvbW1lbnRgfSksXG4gIGNvZGU6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9YH0pLFxufSk7XG4iLCJpbXBvcnQgKiBhcyBtb2RlcyBmcm9tICcuL21hcmt1cC1tb2Rlcy5qcyc7XG5pbXBvcnQgKiBhcyBkb20gZnJvbSAnLi9tYXJrdXAtZG9tLmpzJztcbmltcG9ydCAqIGFzIHBhcnNlciBmcm9tICcuL21hcmt1cC1wYXJzZXIuanMnO1xuLy8gaW1wb3J0ICogYXMgcGF0dGVybnMgZnJvbSAnLi9tYXJrdXAtcGF0dGVybnMuanMnO1xuXG5leHBvcnQgbGV0IGluaXRpYWxpemVkO1xuXG5leHBvcnQgY29uc3QgcmVhZHkgPSAoYXN5bmMgKCkgPT4gdm9pZCAoYXdhaXQgbW9kZXMucmVhZHkpKSgpO1xuXG5jb25zdCBpbml0aWFsaXplID0gKCkgPT5cbiAgaW5pdGlhbGl6ZWQgfHxcbiAgKGluaXRpYWxpemVkID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHtjcmVhdGVGcmFnbWVudCwgc3VwcG9ydGVkfSA9IGRvbTtcblxuICAgIC8qKlxuICAgICAqIFRlbXBvcmFyeSB0ZW1wbGF0ZSBlbGVtZW50IGZvciByZW5kZXJpbmdcbiAgICAgKiBAdHlwZSB7SFRNTFRlbXBsYXRlRWxlbWVudD99XG4gICAgICovXG4gICAgY29uc3QgdGVtcGxhdGUgPVxuICAgICAgc3VwcG9ydGVkICYmXG4gICAgICAodGVtcGxhdGUgPT5cbiAgICAgICAgJ0hUTUxUZW1wbGF0ZUVsZW1lbnQnID09PSAodGVtcGxhdGUgJiYgdGVtcGxhdGUuY29uc3RydWN0b3IgJiYgdGVtcGxhdGUuY29uc3RydWN0b3IubmFtZSkgJiZcbiAgICAgICAgdGVtcGxhdGUpKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJykpO1xuXG4gICAgLy8vIEFQSVxuICAgIGNvbnN0IHN5bnRheGVzID0ge307XG4gICAgY29uc3QgcmVuZGVyZXJzID0ge307XG4gICAgY29uc3QgZGVmYXVsdHMgPSB7Li4ucGFyc2VyLmRlZmF1bHRzfTtcblxuICAgIGF3YWl0IHJlYWR5O1xuICAgIC8vLyBEZWZhdWx0c1xuICAgIG1vZGVzLmluc3RhbGwoZGVmYXVsdHMsIHN5bnRheGVzKTtcbiAgICBkb20uaW5zdGFsbChkZWZhdWx0cywgcmVuZGVyZXJzKTtcblxuICAgIHRva2VuaXplID0gKHNvdXJjZSwgb3B0aW9ucykgPT4gcGFyc2VyLnRva2VuaXplKHNvdXJjZSwge29wdGlvbnN9LCBkZWZhdWx0cyk7XG5cbiAgICByZW5kZXIgPSBhc3luYyAoc291cmNlLCBvcHRpb25zKSA9PiB7XG4gICAgICBjb25zdCBmcmFnbWVudCA9IG9wdGlvbnMuZnJhZ21lbnQgfHwgY3JlYXRlRnJhZ21lbnQoKTtcblxuICAgICAgY29uc3QgZWxlbWVudHMgPSBwYXJzZXIucmVuZGVyKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMpO1xuICAgICAgbGV0IGZpcnN0ID0gYXdhaXQgZWxlbWVudHMubmV4dCgpO1xuXG4gICAgICBsZXQgbG9ncyA9IChmcmFnbWVudC5sb2dzID0gW10pO1xuXG4gICAgICBpZiAoZmlyc3QgJiYgJ3ZhbHVlJyBpbiBmaXJzdCkge1xuICAgICAgICBpZiAoIWRvbS5uYXRpdmUgJiYgdGVtcGxhdGUgJiYgJ3RleHRDb250ZW50JyBpbiBmcmFnbWVudCkge1xuICAgICAgICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICd0ZXh0JyBpbiB0ZW1wbGF0ZWApO1xuICAgICAgICAgIGNvbnN0IGJvZHkgPSBbZmlyc3QudmFsdWVdO1xuICAgICAgICAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBib2R5LnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gYm9keS5qb2luKCcnKTtcbiAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jb250ZW50KTtcblxuICAgICAgICAgIC8vIGlmICghZmlyc3QuZG9uZSkge1xuICAgICAgICAgIC8vICAgaWYgKHR5cGVvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAvLyAgICAgLy8gICYmIGZpcnN0LnZhbHVlLnRva2VuXG4gICAgICAgICAgLy8gICAgIGxldCBsaW5lcyA9IDA7XG4gICAgICAgICAgLy8gICAgIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgICAgICAgIC8vICAgICAgIC8vIGVsZW1lbnQudG9rZW4gJiZcbiAgICAgICAgICAvLyAgICAgICAvLyAgIGVsZW1lbnQudG9rZW4uYnJlYWtzID4gMCAmJlxuICAgICAgICAgIC8vICAgICAgIC8vICAgKGxpbmVzICs9IGVsZW1lbnQudG9rZW4uYnJlYWtzKSAlIDIgPT09IDAgJiZcbiAgICAgICAgICAvLyAgICAgICBsaW5lcysrICUgMTAgPT09IDAgJiZcbiAgICAgICAgICAvLyAgICAgICAgICgodGVtcGxhdGUuaW5uZXJIVE1MID0gYm9keS5zcGxpY2UoMCwgYm9keS5sZW5ndGgpLmpvaW4oJycpKSxcbiAgICAgICAgICAvLyAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRlbXBsYXRlLmNvbnRlbnQpKTtcbiAgICAgICAgICAvLyAgICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTAwMCkpXG4gICAgICAgICAgLy8gICAgICAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICAgIC8vICAgICAgIGJvZHkucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgIC8vICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyAgICAgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBib2R5LnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgLy8gICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGJvZHkuam9pbignJyk7IC8vIHRleHRcbiAgICAgICAgICAvLyAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY29udGVudCk7XG4gICAgICAgICAgLy8gICB9XG4gICAgICAgICAgLy8gfVxuICAgICAgICB9IGVsc2UgaWYgKCdwdXNoJyBpbiBmcmFnbWVudCkge1xuICAgICAgICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICdwdXNoJyBpbiBmcmFnbWVudGApO1xuICAgICAgICAgIGZyYWdtZW50LnB1c2goZmlyc3QudmFsdWUpO1xuICAgICAgICAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBmcmFnbWVudC5wdXNoKGVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKCdhcHBlbmQnIGluIGZyYWdtZW50KSB7XG4gICAgICAgICAgLy8gICYmIGZpcnN0LnZhbHVlLm5vZGVUeXBlID49IDFcbiAgICAgICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAnYXBwZW5kJyBpbiBmcmFnbWVudGApO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZChmaXJzdC52YWx1ZSk7XG4gICAgICAgICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGZyYWdtZW50LmFwcGVuZChlbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBlbHNlIGlmICgndGV4dENvbnRlbnQnIGluIGZyYWdtZW50KSB7XG4gICAgICAgIC8vICAgbGV0IHRleHQgPSBgJHtmaXJzdC52YWx1ZX1gO1xuICAgICAgICAvLyAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB0ZXh0ICs9IGAke2VsZW1lbnR9YDtcbiAgICAgICAgLy8gICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgLy8gICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICd0ZXh0JyBpbiB0ZW1wbGF0ZWApO1xuICAgICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAndGV4dCcgaW4gZnJhZ21lbnRgKTtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IEZpbmQgYSB3b3JrYXJvdW5kIGZvciBEb2N1bWVudEZyYWdtZW50LmlubmVySFRNTFxuICAgICAgICAvLyAgICAgZnJhZ21lbnQuaW5uZXJIVE1MID0gdGV4dDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH07XG5cbiAgICBpbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICByZXR1cm4gbWFya3VwO1xuICB9KSgpO1xuXG5leHBvcnQgbGV0IHJlbmRlciA9IGFzeW5jIChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgYXdhaXQgaW5pdGlhbGl6ZSgpO1xuICByZXR1cm4gYXdhaXQgcmVuZGVyKHNvdXJjZSwgb3B0aW9ucyk7XG59O1xuXG5leHBvcnQgbGV0IHRva2VuaXplID0gKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICBpZiAoIWluaXRpYWxpemVkKVxuICAgIHRocm93IEVycm9yKGBNYXJrdXA6IHRva2VuaXplKOKApikgY2FsbGVkIGJlZm9yZSBpbml0aWFsaXphdGlvbi4gJHtNZXNzYWdlcy5Jbml0aWFsaXplRmlyc3R9YCk7XG4gIGVsc2UgaWYgKGluaXRpYWxpemVkLnRoZW4pXG4gICAgRXJyb3IoYE1hcmt1cDogdG9rZW5pemUo4oCmKSBjYWxsZWQgZHVyaW5nIGluaXRpYWxpemF0aW9uLiAke01lc3NhZ2VzLkluaXRpYWxpemVGaXJzdH1gKTtcbiAgcmV0dXJuIG1hcmt1cC50b2tlbml6ZShzb3VyY2UsIG9wdGlvbnMpO1xufTtcblxuY29uc3Qga2V5RnJvbSA9IG9wdGlvbnMgPT4gKG9wdGlvbnMgJiYgSlNPTi5zdHJpbmdpZnkob3B0aW9ucykpIHx8ICcnO1xuY29uc3Qgc2tpbSA9IGl0ZXJhYmxlID0+IHtcbiAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZXJhYmxlKTtcbn07XG5cbmV4cG9ydCBjb25zdCB3YXJtdXAgPSBhc3luYyAoc291cmNlLCBvcHRpb25zKSA9PiB7XG4gIGNvbnN0IGtleSA9IChvcHRpb25zICYmIGtleUZyb20ob3B0aW9ucykpIHx8ICcnO1xuICBsZXQgY2FjaGUgPSAod2FybXVwLmNhY2hlIHx8ICh3YXJtdXAuY2FjaGUgPSBuZXcgTWFwKCkpKS5nZXQoa2V5KTtcbiAgY2FjaGUgfHwgd2FybXVwLmNhY2hlLnNldChrZXksIChjYWNoZSA9IG5ldyBTZXQoKSkpO1xuICBhd2FpdCAoaW5pdGlhbGl6ZWQgfHwgaW5pdGlhbGl6ZSgpKTtcbiAgLy8gbGV0IHRva2VucztcbiAgY2FjaGUuaGFzKHNvdXJjZSkgfHwgKHNraW0odG9rZW5pemUoc291cmNlLCBvcHRpb25zKSksIGNhY2hlLmFkZChzb3VyY2UpKTtcbiAgLy8gY2FjaGUuaGFzKHNvdXJjZSkgfHwgKCh0b2tlbnMgPT4geyB3aGlsZSAoIXRva2Vucy5uZXh0KCkuZG9uZSk7IH0pKHRva2VuaXplKHNvdXJjZSwgb3B0aW9ucykpLCBjYWNoZS5hZGQoc291cmNlKSk7XG4gIHJldHVybiB0cnVlO1xufTtcblxuZXhwb3J0IGNvbnN0IG1hcmt1cCA9IE9iamVjdC5jcmVhdGUocGFyc2VyLCB7XG4gIGluaXRpYWxpemU6IHtnZXQ6ICgpID0+IGluaXRpYWxpemV9LFxuICByZW5kZXI6IHtnZXQ6ICgpID0+IHJlbmRlcn0sXG4gIHRva2VuaXplOiB7Z2V0OiAoKSA9PiB0b2tlbml6ZX0sXG4gIHdhcm11cDoge2dldDogKCkgPT4gd2FybXVwfSxcbiAgZG9tOiB7Z2V0OiAoKSA9PiBkb219LFxuICBtb2Rlczoge2dldDogKCkgPT4gcGFyc2VyLm1vZGVzfSxcbn0pO1xuXG4vLy8gQ09OU1RBTlRTXG5cbmNvbnN0IE1lc3NhZ2VzID0ge1xuICBJbml0aWFsaXplRmlyc3Q6IGBUcnkgY2FsbGluZyBNYXJrdXAuaW5pdGlhbGl6ZSgpLnRoZW4o4oCmKSBmaXJzdC5gLFxufTtcblxuZXhwb3J0IGRlZmF1bHQgbWFya3VwO1xuIl0sIm5hbWVzIjpbImRlZmF1bHRzIiwic3ludGF4ZXMiLCJtYXRjaGVycyIsInJlYWR5IiwiZG9jdW1lbnQiLCJFbGVtZW50IiwiTm9kZSIsIlRleHQiLCJEb2N1bWVudEZyYWdtZW50IiwiY3JlYXRlRWxlbWVudCIsImNyZWF0ZVRleHQiLCJjcmVhdGVGcmFnbWVudCIsImRvbS5kb2N1bWVudCIsInJlbmRlcmVyIiwiaW5zdGFsbCIsInN1cHBvcnRlZCIsImRvbS5uYXRpdmUiLCJuYXRpdmUiLCJkb20ucHNldWRvIiwibW9kZXMucmVhZHkiLCJpbml0aWFsaXplZCIsImRvbSIsInJlbmRlcmVycyIsInBhcnNlci5kZWZhdWx0cyIsIm1vZGVzLmluc3RhbGwiLCJkb20uaW5zdGFsbCIsInRva2VuaXplIiwicGFyc2VyLnRva2VuaXplIiwicmVuZGVyIiwicGFyc2VyLnJlbmRlciIsIm1hcmt1cCIsInBhcnNlci5tb2RlcyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0VBQUE7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0EsRUFBTyxTQUFTLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFO0VBQ3BFLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztFQUNoRCxDQUFDOztFQUVEOztFQUVBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0VBQ0E7RUFDQTtFQUNBO0FBQ0EsRUFBTyxNQUFNLFFBQVEsR0FBRztFQUN4QixFQUFFLE9BQU8sRUFBRSxvREFBb0Q7RUFDL0QsRUFBRSxRQUFRLEVBQUUsa0VBQWtFO0VBQzlFLEVBQUUsTUFBTSxFQUFFLCtDQUErQztFQUN6RCxFQUFFLEdBQUcsRUFBRSwyR0FBMkc7RUFDbEgsRUFBRSxTQUFTLEVBQUUsa01BQWtNO0VBQy9N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
