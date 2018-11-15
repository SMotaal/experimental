(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.markup = {})));
}(this, (function (exports) { 'use strict';

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

  const ready$2 = (async () => void (await ready$1))();

  const versions = [
    parser,
    esparser
  ];

  const initialize = () =>
    exports.initialized ||
    (exports.initialized = async () => {
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
      exports.tokenize = (source, options = {}) => {
        const version = versions[options.version - 1];
        options.tokenize = version.tokenize;
        // const sourceType = options.sourceType;
        return version.tokenize(source, {options}, defaults);
      };

      exports.render = async (source, options) => {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwLmpzIiwic291cmNlcyI6WyIuLi9tYXJrdXAvbGliL21hcmt1cC1wYXJzZXIuanMiLCIuLi9tYXJrdXAvbGliL21hcmt1cC1wYXR0ZXJucy5qcyIsIi4uL21hcmt1cC9saWIvbWFya3VwLW1vZGVzLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL3BzZXVkb20vbGliL3BzZXVkby5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9wc2V1ZG9tL2xpYi9uYXRpdmUuanMiLCIuLi9tYXJrdXAvcGFja2FnZXMvcHNldWRvbS9pbmRleC5qcyIsIi4uL21hcmt1cC9saWIvbWFya3VwLWRvbS5qcyIsIi4uL21hcmt1cC9wYWNrYWdlcy9lc3ByZXNzaW9ucy9saWIvcGFyc2VyL3BhdHRlcm5zLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL2VzcHJlc3Npb25zL2xpYi9wYXJzZXIvbW9kZXMuanMiLCIuLi9tYXJrdXAvcGFja2FnZXMvZXNwcmVzc2lvbnMvbGliL3BhcnNlci9ncm91cGVyLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL2VzcHJlc3Npb25zL2xpYi9wYXJzZXIvdG9rZW5pemVyLmpzIiwiLi4vbWFya3VwL3BhY2thZ2VzL2VzcHJlc3Npb25zL2xpYi9wYXJzZXIvcGFyc2VyLmpzIiwiLi4vbWFya3VwL2xpYi9tYXJrdXAuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqIE1hcmt1cCAocmVuZGVyKSBAYXV0aG9yIFNhbGVoIEFiZGVsIE1vdGFhbCAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmt1cChzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzID0gbWFya3VwLmRlZmF1bHRzKSB7XG4gIHJldHVybiBbLi4ucmVuZGVyKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMpXTtcbn1cblxuLy8vIFJFR1VMQVIgRVhQUkVTU0lPTlNcblxuLyoqIE5vbi1hbHBoYW51bWVyaWMgc3ltYm9sIG1hdGNoaW5nIGV4cHJlc3Npb25zIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuZXhwb3J0IGNvbnN0IG1hdGNoZXJzID0ge1xuICBlc2NhcGVzOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98XFwqXFwvfGB8XCJ8J3xcXCRcXHspL2csXG4gIGNvbW1lbnRzOiAvKFxcbil8KFxcKlxcL3xcXGIoPzpbYS16XStcXDpcXC9cXC98XFx3W1xcd1xcK1xcLl0qXFx3QFthLXpdKylcXFMrfEBbYS16XSspL2dpLFxuICBxdW90ZXM6IC8oXFxuKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xgfFwifCd8XFwkXFx7KS9nLFxuICB4bWw6IC8oW1xcc1xcbl0rKXwoXCJ8J3w9fCYjeD9bYS1mMC05XSs7fCZbYS16XSs7fFxcLz8+fDwlfCU+fDwhLS18LS0+fDxbXFwvXFwhXT8oPz1bYS16XStcXDo/W2EtelxcLV0qW2Etel18W2Etel0rKSkvZ2ksXG4gIC8vIHhtbDogLyhbXFxzXFxuXSspfChcInwnfD18JiN4P1thLWYwLTldKzt8JlthLXpdKzt8XFwvPz58PCV8JT58PCEtLXwtLT58PFtcXC9cXCFdPykvZ2ksXG4gIHNlcXVlbmNlczogLyhbXFxzXFxuXSspfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcL1xcL3xcXC9cXCp8XFwqXFwvfFxcKHxcXCl8XFxbfFxcXXwsfDt8XFwuXFwuXFwufFxcLnxcXGI6XFwvXFwvXFxifDo6fDp8XFw/fGB8XCJ8J3xcXCRcXHt8XFx7fFxcfXw9Pnw8XFwvfFxcLz58XFwrK3xcXC0rfFxcKit8Jit8XFx8K3w9K3whPXswLDN9fDx7MSwzfT0/fD57MSwyfT0/KXxbK1xcLSovJnxeJTw+fiFdPT8vZyxcbn07XG5cbi8qKiBTcGVjaWFsIGFscGhhLW51bWVyaWMgc3ltYm9sIHRlc3QgZXhwcmVzc2lvbnMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG5leHBvcnQgY29uc3QgcGF0dGVybnMgPSB7XG4gIC8qKiBCYXNpYyBsYXRpbiBLZXl3b3JkIGxpa2Ugc3ltYm9sIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuICBtYXliZUtleXdvcmQ6IC9eW2Etel0oXFx3KikkL2ksXG59O1xuXG4vLy8gU1lOVEFYRVNcbi8qKiBTeW50YXggZGVmaW5pdGlvbnMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG5leHBvcnQgY29uc3Qgc3ludGF4ZXMgPSB7ZGVmYXVsdDoge3BhdHRlcm5zLCBtYXRjaGVyOiBtYXRjaGVycy5zZXF1ZW5jZXN9fTtcblxuLyoqIE1vZGUgc3RhdGVzIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuZXhwb3J0IGNvbnN0IG1vZGVzID0ge2RlZmF1bHQ6IHtzeW50YXg6ICdkZWZhdWx0J319O1xuXG4vLy8gREVGQVVMVFNcbi8qKiBQYXJzaW5nIGRlZmF1bHRzIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuZXhwb3J0IGNvbnN0IGRlZmF1bHRzID0gKG1hcmt1cC5kZWZhdWx0cyA9IHtcbiAgbWF0Y2hlcjogbWF0Y2hlcnMuc2VxdWVuY2VzLFxuICBzeW50YXg6ICdkZWZhdWx0JyxcbiAgc291cmNlVHlwZTogJ2RlZmF1bHQnLFxuICByZW5kZXJlcnM6IHt0ZXh0OiBTdHJpbmd9LFxuICByZW5kZXJlcixcbiAgZ2V0IHN5bnRheGVzKCkge1xuICAgIHJldHVybiBzeW50YXhlcztcbiAgfSxcbiAgc2V0IHN5bnRheGVzKHZhbHVlKSB7XG4gICAgaWYgKHRoaXMgIT09IGRlZmF1bHRzKVxuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICdJbnZhbGlkIGFzc2lnbm1lbnQ6IGRpcmVjdCBhc3NpZ25tZW50IHRvIGRlZmF1bHRzIGlzIG5vdCBhbGxvd2VkLiBVc2UgT2JqZWN0LmNyZWF0ZShkZWZhdWx0cykgdG8gY3JlYXRlIGEgbXV0YWJsZSBpbnN0YW5jZSBvZiBkZWZhdWx0cyBmaXJzdC4nLFxuICAgICAgKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywgJ3N5bnRheGVzJywge3ZhbHVlfSk7XG4gIH0sXG59KTtcblxuY29uc3QgTnVsbCA9IE9iamVjdC5mcmVlemUoT2JqZWN0LmNyZWF0ZShudWxsKSk7XG5cbi8vLyBSRU5ERVJJTkdcbi8qKiBUb2tlbiBwcm90b3R5cGUgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG5jbGFzcyBUb2tlbiB7XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnRleHQ7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZW5kZXJlcih0b2tlbnMpIHtcbiAgbGV0IGkgPSAwO1xuICBmb3IgYXdhaXQgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgIGlmICghdG9rZW4pIGNvbnRpbnVlO1xuICAgIC8vIGkrKyAlIDEwMCB8fCAoYXdhaXQgMCk7XG4gICAgaSsrICUgMTAgfHwgKGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxKSkpO1xuICAgIHlpZWxkIE9iamVjdC5zZXRQcm90b3R5cGVPZih0b2tlbiwgVG9rZW4ucHJvdG90eXBlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMgPSBtYXJrdXAuZGVmYXVsdHMpIHtcbiAgY29uc3Qge3N5bnRheCwgcmVuZGVyZXIgPSBkZWZhdWx0cy5yZW5kZXJlciwgLi4udG9rZW5pemVyT3B0aW9uc30gPSBvcHRpb25zIHx8IGRlZmF1bHRzO1xuICBjb25zdCBzdGF0ZSA9IHtvcHRpb25zOiB0b2tlbml6ZXJPcHRpb25zfTtcbiAgcmV0dXJuIHJlbmRlcmVyKChvcHRpb25zLnRva2VuaXplIHx8IHRva2VuaXplKShzb3VyY2UsIHN0YXRlLCBkZWZhdWx0cykpO1xufVxuXG4vLy8gR1JPVVBJTkdcbmNvbnN0IEdyb3VwZXIgPSAoe1xuICAvKiBncm91cGVyIGNvbnRleHQgKi9cbiAgc3ludGF4LFxuICBnb2FsID0gc3ludGF4LFxuICBxdW90ZSxcbiAgY29tbWVudCxcbiAgY2xvc3VyZSxcbiAgc3BhbixcbiAgZ3JvdXBpbmcgPSBjb21tZW50IHx8IGNsb3N1cmUgfHwgc3BhbiB8fCB1bmRlZmluZWQsXG5cbiAgcHVuY3R1YXRvcixcbiAgLy8gdGVybWluYXRvciA9IChjb21tZW50ICYmIGNvbW1lbnQuY2xvc2VyKSB8fCB1bmRlZmluZWQsXG4gIHNwYW5zID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnNwYW5zKSB8fCB1bmRlZmluZWQsXG4gIG1hdGNoZXIgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcubWF0Y2hlcikgfHwgdW5kZWZpbmVkLFxuICBxdW90ZXMgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcucXVvdGVzKSB8fCB1bmRlZmluZWQsXG4gIHB1bmN0dWF0b3JzID0ge2FnZ3JlZ2F0b3JzOiB7fX0sXG4gIG9wZW5lciA9IHF1b3RlIHx8IChncm91cGluZyAmJiBncm91cGluZy5vcGVuZXIpIHx8IHVuZGVmaW5lZCxcbiAgY2xvc2VyID0gcXVvdGUgfHwgKGdyb3VwaW5nICYmIGdyb3VwaW5nLmNsb3NlcikgfHwgdW5kZWZpbmVkLFxuICBoaW50ZXIsXG4gIG9wZW4gPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcub3BlbikgfHwgdW5kZWZpbmVkLFxuICBjbG9zZSA9IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZSkgfHwgdW5kZWZpbmVkLFxufSkgPT4gKHtcbiAgc3ludGF4LFxuICBnb2FsLFxuICBwdW5jdHVhdG9yLFxuICAvLyB0ZXJtaW5hdG9yLFxuICBzcGFucyxcbiAgbWF0Y2hlcixcbiAgcXVvdGVzLFxuICBwdW5jdHVhdG9ycyxcbiAgb3BlbmVyLFxuICBjbG9zZXIsXG4gIGhpbnRlcixcbiAgb3BlbixcbiAgY2xvc2UsXG59KTtcblxuY29uc3QgY3JlYXRlR3JvdXBlciA9IEdyb3VwZXI7XG5cbi8vLyBUT0tFTklaQVRJT05cblxuZXhwb3J0IGZ1bmN0aW9uKiBjb250ZXh0dWFsaXplcigkLCBkZWZhdWx0cykge1xuICBsZXQgZG9uZSwgZ3JvdXBlcjtcblxuICAkICE9PSB1bmRlZmluZWQgfHxcbiAgICAoJCA9IChkZWZhdWx0cyAmJiBkZWZhdWx0cy5zeW50YXhlcyAmJiBkZWZhdWx0cy5zeW50YXhlcy5kZWZhdWx0KSB8fCBzeW50YXhlcy5kZWZhdWx0KTtcblxuICBjb25zdCBpbml0aWFsaXplID0gY29udGV4dCA9PiB7XG4gICAgY29udGV4dC50b2tlbiB8fFxuICAgICAgKGNvbnRleHQudG9rZW4gPSAodG9rZW5pemVyID0+ICh0b2tlbml6ZXIubmV4dCgpLCB0b2tlbiA9PiB0b2tlbml6ZXIubmV4dCh0b2tlbikudmFsdWUpKShcbiAgICAgICAgdG9rZW5pemVyKGNvbnRleHQpLFxuICAgICAgKSk7XG4gICAgY29udGV4dDtcbiAgfTtcblxuICBpZiAoISQuY29udGV4dCkge1xuICAgIGNvbnN0IHtcbiAgICAgIHN5bnRheCxcbiAgICAgIG1hdGNoZXIgPSAoJC5tYXRjaGVyID0gZGVmYXVsdHMubWF0Y2hlciksXG4gICAgICBxdW90ZXMsXG4gICAgICBwdW5jdHVhdG9ycyA9ICgkLnB1bmN0dWF0b3JzID0ge2FnZ3JlZ2F0b3JzOiB7fX0pLFxuICAgICAgcHVuY3R1YXRvcnM6IHthZ2dyZWdhdG9ycyA9ICgkcHVuY3R1YXRvcnMuYWdncmVnYXRvcnMgPSB7fSl9LFxuICAgICAgcGF0dGVybnM6IHtcbiAgICAgICAgbWF5YmVLZXl3b3JkID0gKCQucGF0dGVybnMubWF5YmVLZXl3b3JkID1cbiAgICAgICAgICAoKGRlZmF1bHRzICYmIGRlZmF1bHRzLnBhdHRlcm5zKSB8fCBwYXR0ZXJucykubWF5YmVLZXl3b3JkIHx8IHVuZGVmaW5lZCksXG4gICAgICB9ID0gKCQucGF0dGVybnMgPSB7bWF5YmVLZXl3b3JkOiBudWxsfSksXG4gICAgICBzcGFuczoge1tzeW50YXhdOiBzcGFuc30gPSBOdWxsLFxuICAgIH0gPSAkO1xuXG4gICAgLy8gbWF0Y2hlci5tYXRjaGVyIHx8XG4gICAgLy8gICAobWF0Y2hlci5tYXRjaGVyID0gbmV3IFJlZ0V4cChtYXRjaGVyLnNvdXJjZSwgbWF0Y2hlci5mbGFncy5yZXBsYWNlKCdnJywgJ3knKSkpO1xuXG4gICAgaW5pdGlhbGl6ZShcbiAgICAgICgkLmNvbnRleHQgPSB7XG4gICAgICAgIC8vIC4uLiAkLFxuICAgICAgICAkLFxuICAgICAgICBwdW5jdHVhdG9ycyxcbiAgICAgICAgYWdncmVnYXRvcnMsXG4gICAgICAgIC8vIG1hdGNoZXI6IG1hdGNoZXIubWF0Y2hlcixcbiAgICAgICAgbWF0Y2hlcixcbiAgICAgICAgcXVvdGVzLFxuICAgICAgICBzcGFucyxcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBjb25zdCB7XG4gICAgc3ludGF4OiAkc3ludGF4LFxuICAgIG1hdGNoZXI6ICRtYXRjaGVyLFxuICAgIHF1b3RlczogJHF1b3RlcyxcbiAgICBwdW5jdHVhdG9yczogJHB1bmN0dWF0b3JzLFxuICAgIHB1bmN0dWF0b3JzOiB7YWdncmVnYXRvcnM6ICRhZ2dyZWdhdG9yc30sXG4gIH0gPSAkO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgaWYgKFxuICAgICAgZ3JvdXBlciAhPT0gKGdyb3VwZXIgPSB5aWVsZCAoZ3JvdXBlciAmJiBncm91cGVyLmNvbnRleHQpIHx8ICQuY29udGV4dCkgJiZcbiAgICAgIGdyb3VwZXIgJiZcbiAgICAgICFncm91cGVyLmNvbnRleHRcbiAgICApIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZ29hbCA9ICRzeW50YXgsXG4gICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgIHB1bmN0dWF0b3JzID0gJHB1bmN0dWF0b3JzLFxuICAgICAgICBhZ2dyZWdhdG9ycyA9ICRhZ2dyZWdhdG9ycyxcbiAgICAgICAgY2xvc2VyLFxuICAgICAgICBzcGFucyxcbiAgICAgICAgbWF0Y2hlciA9ICRtYXRjaGVyLFxuICAgICAgICBxdW90ZXMgPSAkcXVvdGVzLFxuICAgICAgICBmb3JtaW5nID0gZ29hbCA9PT0gJHN5bnRheCxcbiAgICAgIH0gPSBncm91cGVyO1xuXG4gICAgICAvLyAhbWF0Y2hlciB8fFxuICAgICAgLy8gICBtYXRjaGVyLm1hdGNoZXIgfHxcbiAgICAgIC8vICAgKG1hdGNoZXIubWF0Y2hlciA9IG5ldyBSZWdFeHAobWF0Y2hlci5zb3VyY2UsIG1hdGNoZXIuZmxhZ3MucmVwbGFjZSgnZycsICd5JykpKTtcblxuICAgICAgaW5pdGlhbGl6ZShcbiAgICAgICAgKGdyb3VwZXIuY29udGV4dCA9IHtcbiAgICAgICAgICAvLyAuLi4gJC5jb250ZXh0LFxuICAgICAgICAgICQsXG4gICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICBwdW5jdHVhdG9ycyxcbiAgICAgICAgICBhZ2dyZWdhdG9ycyxcbiAgICAgICAgICBjbG9zZXIsXG4gICAgICAgICAgc3BhbnMsXG4gICAgICAgICAgLy8gbWF0Y2hlcjogbWF0Y2hlciAmJiBtYXRjaGVyLm1hdGNoZXIsXG4gICAgICAgICAgbWF0Y2hlcixcbiAgICAgICAgICBxdW90ZXMsXG4gICAgICAgICAgZm9ybWluZyxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHRva2VuaXplcihjb250ZXh0KSB7XG4gIGxldCBkb25lLCBuZXh0O1xuXG4gIGNvbnN0IHtcbiAgICAkOiB7XG4gICAgICBzeW50YXgsXG4gICAgICBrZXl3b3JkcyxcbiAgICAgIGFzc2lnbmVycyxcbiAgICAgIG9wZXJhdG9ycyxcbiAgICAgIGNvbWJpbmF0b3JzLFxuICAgICAgbm9uYnJlYWtlcnMsXG4gICAgICBjb21tZW50cyxcbiAgICAgIGNsb3N1cmVzLFxuICAgICAgYnJlYWtlcnMsXG4gICAgICBwYXR0ZXJucyxcbiAgICB9LFxuICAgIHB1bmN0dWF0b3JzLFxuICAgIGFnZ3JlZ2F0b3JzLFxuICAgIHNwYW5zLFxuICAgIHF1b3RlcyxcbiAgICBmb3JtaW5nID0gdHJ1ZSxcblxuICAgIC8vIHN5bnRheCxcbiAgICAvLyBrZXl3b3JkcyxcbiAgICAvLyBhc3NpZ25lcnMsXG4gICAgLy8gb3BlcmF0b3JzLFxuICAgIC8vIGNvbWJpbmF0b3JzLFxuICAgIC8vIG5vbmJyZWFrZXJzLFxuICAgIC8vIGNvbW1lbnRzLFxuICAgIC8vIGNsb3N1cmVzLFxuICAgIC8vIGJyZWFrZXJzLFxuICAgIC8vIHBhdHRlcm5zLFxuICB9ID0gY29udGV4dDtcblxuICBjb25zdCB7bWF5YmVJZGVudGlmaWVyLCBtYXliZUtleXdvcmR9ID0gcGF0dGVybnMgfHwgY29udGV4dDtcbiAgY29uc3Qgd29yZGluZyA9IGtleXdvcmRzIHx8IG1heWJlSWRlbnRpZmllciA/IHRydWUgOiBmYWxzZTtcblxuICBjb25zdCBMaW5lRW5kaW5ncyA9IC8kL2dtO1xuICBjb25zdCBwdW5jdHVhdGUgPSB0ZXh0ID0+XG4gICAgKG5vbmJyZWFrZXJzICYmIG5vbmJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdub25icmVha2VyJykgfHxcbiAgICAob3BlcmF0b3JzICYmIG9wZXJhdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnb3BlcmF0b3InKSB8fFxuICAgIChjb21tZW50cyAmJiBjb21tZW50cy5pbmNsdWRlcyh0ZXh0KSAmJiAnY29tbWVudCcpIHx8XG4gICAgKHNwYW5zICYmIHNwYW5zLmluY2x1ZGVzKHRleHQpICYmICdzcGFuJykgfHxcbiAgICAocXVvdGVzICYmIHF1b3Rlcy5pbmNsdWRlcyh0ZXh0KSAmJiAncXVvdGUnKSB8fFxuICAgIChjbG9zdXJlcyAmJiBjbG9zdXJlcy5pbmNsdWRlcyh0ZXh0KSAmJiAnY2xvc3VyZScpIHx8XG4gICAgKGJyZWFrZXJzICYmIGJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdicmVha2VyJykgfHxcbiAgICBmYWxzZTtcbiAgY29uc3QgYWdncmVnYXRlID1cbiAgICAoKGFzc2lnbmVycyAmJiBhc3NpZ25lcnMubGVuZ3RoKSB8fCAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMubGVuZ3RoKSkgJiZcbiAgICAodGV4dCA9PlxuICAgICAgKGFzc2lnbmVycyAmJiBhc3NpZ25lcnMuaW5jbHVkZXModGV4dCkgJiYgJ2Fzc2lnbmVyJykgfHxcbiAgICAgIChjb21iaW5hdG9ycyAmJiBjb21iaW5hdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnY29tYmluYXRvcicpIHx8XG4gICAgICBmYWxzZSk7XG5cbiAgd2hpbGUgKCFkb25lKSB7XG4gICAgbGV0IHRva2VuLCBwdW5jdHVhdG9yO1xuICAgIGlmIChuZXh0ICYmIG5leHQudGV4dCkge1xuICAgICAgY29uc3Qge1xuICAgICAgICB0ZXh0LCAvLyBUZXh0IGZvciBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgdHlwZSwgLy8gVHlwZSBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgLy8gb2Zmc2V0LCAvLyBJbmRleCBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgLy8gYnJlYWtzLCAvLyBMaW5lYnJlYWtzIGluIG5leHQgcHJvZHVjdGlvblxuICAgICAgICBoaW50LCAvLyBIaW50IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICBwcmV2aW91cywgLy8gUHJldmlvdXMgcHJvZHVjdGlvblxuICAgICAgICBwYXJlbnQgPSAobmV4dC5wYXJlbnQgPSAocHJldmlvdXMgJiYgcHJldmlvdXMucGFyZW50KSB8fCB1bmRlZmluZWQpLCAvLyBQYXJlbnQgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIGxhc3QsIC8vIExhc3Qgc2lnbmlmaWNhbnQgcHJvZHVjdGlvblxuICAgICAgfSA9IG5leHQ7XG5cbiAgICAgIGlmICh0eXBlID09PSAnc2VxdWVuY2UnKSB7XG4gICAgICAgIChuZXh0LnB1bmN0dWF0b3IgPVxuICAgICAgICAgIChhZ2dyZWdhdGUgJiZcbiAgICAgICAgICAgIHByZXZpb3VzICYmXG4gICAgICAgICAgICAoYWdncmVnYXRvcnNbdGV4dF0gfHxcbiAgICAgICAgICAgICAgKCEodGV4dCBpbiBhZ2dyZWdhdG9ycykgJiYgKGFnZ3JlZ2F0b3JzW3RleHRdID0gYWdncmVnYXRlKHRleHQpKSkpKSB8fFxuICAgICAgICAgIChwdW5jdHVhdG9yc1t0ZXh0XSB8fFxuICAgICAgICAgICAgKCEodGV4dCBpbiBwdW5jdHVhdG9ycykgJiYgKHB1bmN0dWF0b3JzW3RleHRdID0gcHVuY3R1YXRlKHRleHQpKSkpIHx8XG4gICAgICAgICAgdW5kZWZpbmVkKSAmJiAobmV4dC50eXBlID0gJ3B1bmN0dWF0b3InKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3doaXRlc3BhY2UnKSB7XG4gICAgICAgIG5leHQuYnJlYWtzID0gdGV4dC5tYXRjaChMaW5lRW5kaW5ncykubGVuZ3RoIC0gMTtcbiAgICAgIH0gZWxzZSBpZiAoZm9ybWluZyAmJiB3b3JkaW5nKSB7XG4gICAgICAgIC8vIHR5cGUgIT09ICdpbmRlbnQnICYmXG4gICAgICAgIGNvbnN0IHdvcmQgPSB0ZXh0LnRyaW0oKTtcbiAgICAgICAgd29yZCAmJlxuICAgICAgICAgICgoa2V5d29yZHMgJiZcbiAgICAgICAgICAgIGtleXdvcmRzLmluY2x1ZGVzKHdvcmQpICYmXG4gICAgICAgICAgICAoIWxhc3QgfHwgbGFzdC5wdW5jdHVhdG9yICE9PSAnbm9uYnJlYWtlcicgfHwgKHByZXZpb3VzICYmIHByZXZpb3VzLmJyZWFrcyA+IDApKSAmJlxuICAgICAgICAgICAgKG5leHQudHlwZSA9ICdrZXl3b3JkJykpIHx8XG4gICAgICAgICAgICAobWF5YmVJZGVudGlmaWVyICYmIG1heWJlSWRlbnRpZmllci50ZXN0KHdvcmQpICYmIChuZXh0LnR5cGUgPSAnaWRlbnRpZmllcicpKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuZXh0LnR5cGUgPSAndGV4dCc7XG4gICAgICB9XG5cbiAgICAgIHByZXZpb3VzICYmIChwcmV2aW91cy5uZXh0ID0gbmV4dCk7XG5cbiAgICAgIHRva2VuID0gbmV4dDtcbiAgICB9XG5cbiAgICBuZXh0ID0geWllbGQgdG9rZW47XG4gIH1cbn1cblxuLy8gVE9ETzogPEBTTW90YWFsPiBSZWZhY3RvclxuZXhwb3J0IGZ1bmN0aW9uKiB0b2tlbml6ZShzb3VyY2UsIHN0YXRlID0ge30sIGRlZmF1bHRzID0gbWFya3VwLmRlZmF1bHRzKSB7XG4gIGNvbnN0IHN5bnRheGVzID0gZGVmYXVsdHMuc3ludGF4ZXM7XG5cbiAgbGV0IHtcbiAgICBtYXRjaCxcbiAgICBpbmRleCxcbiAgICBvcHRpb25zOiB7XG4gICAgICBzb3VyY2VUeXBlID0gKHN0YXRlLm9wdGlvbnMuc291cmNlVHlwZSA9IHN0YXRlLm9wdGlvbnMuc3ludGF4IHx8IGRlZmF1bHRzLnNvdXJjZVR5cGUpLFxuICAgIH0gPSAoc3RhdGUub3B0aW9ucyA9IHt9KSxcbiAgICBwcmV2aW91cyA9IG51bGwsXG4gICAgbW9kZSA9IChzdGF0ZS5tb2RlID0gbW9kZXNbc291cmNlVHlwZV0gfHwgbW9kZXNbZGVmYXVsdHMuc291cmNlVHlwZV0pLFxuICAgIG1vZGU6IHtzeW50YXh9LFxuICAgIGdyb3VwaW5nID0gKHN0YXRlLmdyb3VwaW5nID0ge1xuICAgICAgaGludHM6IG5ldyBTZXQoKSxcbiAgICAgIGdyb3VwaW5nczogW10sXG4gICAgICBncm91cGVyczogbW9kZS5ncm91cGVycyB8fCAobW9kZS5ncm91cGVycyA9IHt9KSxcbiAgICB9KSxcbiAgfSA9IHN0YXRlO1xuXG4gIChzdGF0ZS5zb3VyY2UgPT09IChzdGF0ZS5zb3VyY2UgPSBzb3VyY2UpICYmIGluZGV4ID49IDApIHx8XG4gICAgKGluZGV4ID0gc3RhdGUuaW5kZXggPSAoaW5kZXggPiAwICYmIGluZGV4ICUgc291cmNlLmxlbmd0aCkgfHwgMCk7XG5cbiAgY29uc3QgdG9wID0ge3R5cGU6ICd0b3AnLCB0ZXh0OiAnJywgb2Zmc2V0OiBpbmRleH07XG5cbiAgbGV0IGRvbmUsXG4gICAgcGFyZW50ID0gdG9wLFxuICAgIGxhc3Q7XG5cbiAgbGV0IGxhc3RDb250ZXh0O1xuXG4gIGNvbnN0IHtcbiAgICBbKHN0YXRlLnN5bnRheCA9IHN0YXRlLm1vZGUuc3ludGF4KV06ICQgPSBkZWZhdWx0cy5zeW50YXhlc1tkZWZhdWx0cy5zeW50YXhdLFxuICB9ID0gZGVmYXVsdHMuc3ludGF4ZXM7XG5cbiAgY29uc3QgJGNvbnRleHRpbmcgPSBjb250ZXh0dWFsaXplcigkLCBkZWZhdWx0cyk7XG4gIGxldCAkY29udGV4dCA9ICRjb250ZXh0aW5nLm5leHQoKS52YWx1ZTtcblxuICAvLyBJbml0aWFsIGNvbnRleHR1YWwgaGludCAoc3ludGF4KVxuICAhc3ludGF4IHx8XG4gICAgKGdyb3VwaW5nLmdvYWwgfHwgKGdyb3VwaW5nLmdvYWwgPSBzeW50YXgpLCBncm91cGluZy5oaW50ICYmIGdyb3VwaW5nLmxhc3RTeW50YXggPT09IHN5bnRheCkgfHxcbiAgICAoZ3JvdXBpbmcuaGludHMuYWRkKHN5bnRheCkuZGVsZXRlKGdyb3VwaW5nLmxhc3RTeW50YXgpLFxuICAgIChncm91cGluZy5oaW50ID0gWy4uLmdyb3VwaW5nLmhpbnRzXS5qb2luKCcgJykpLFxuICAgIChncm91cGluZy5jb250ZXh0ID0gc3RhdGUuY29udGV4dCB8fCAoc3RhdGUuY29udGV4dCA9IGdyb3VwaW5nLmxhc3RTeW50YXggPSBzeW50YXgpKSk7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB7XG4gICAgICAkOiB7c3ludGF4LCBtYXRjaGVycywgY29tbWVudHMsIHNwYW5zLCBjbG9zdXJlc30sXG4gICAgICAvLyBzeW50YXgsIG1hdGNoZXJzLCBjb21tZW50cywgc3BhbnMsIGNsb3N1cmVzLFxuXG4gICAgICBwdW5jdHVhdG9yOiAkJHB1bmN0dWF0b3IsXG4gICAgICBjbG9zZXI6ICQkY2xvc2VyLFxuICAgICAgc3BhbnM6ICQkc3BhbnMsXG4gICAgICAvLyBtYXRjaGVyOiAkJG1hdGNoZXIsXG4gICAgICBtYXRjaGVyOiB7XG4gICAgICAgIG1hdGNoZXI6ICQkbWF0Y2hlciA9ICgkY29udGV4dC5tYXRjaGVyLm1hdGNoZXIgPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICRjb250ZXh0Lm1hdGNoZXIuc291cmNlLFxuICAgICAgICAgICRjb250ZXh0Lm1hdGNoZXIuZmxhZ3MsIC8vIC5yZXBsYWNlKCdnJywgJ3knKSxcbiAgICAgICAgKSksXG4gICAgICB9LFxuICAgICAgdG9rZW4sXG4gICAgICAvLyB0b2tlbiA9ICgkY29udGV4dC50b2tlbiA9ICh0b2tlbml6ZXIgPT4gKFxuICAgICAgLy8gICB0b2tlbml6ZXIubmV4dCgpLCB0b2tlbiA9PiB0b2tlbml6ZXIubmV4dCh0b2tlbikudmFsdWVcbiAgICAgIC8vICkpKHRva2VuaXplcigkY29udGV4dCkpKSxcbiAgICAgIGZvcm1pbmcgPSB0cnVlLFxuICAgIH0gPSAkY29udGV4dDtcblxuICAgIC8vIFByaW1lIE1hdGNoZXJcbiAgICAvLyAoKHN0YXRlLm1hdGNoZXIgIT09ICQkbWF0Y2hlciAmJiAoc3RhdGUubWF0Y2hlciA9ICQkbWF0Y2hlcikpIHx8XG4gICAgLy8gICBzdGF0ZS5pbmRleCAhPT0gJCRtYXRjaGVyLmxhc3RJbmRleCkgJiZcbiAgICAvLyAgICQkbWF0Y2hlci5leGVjKHN0YXRlLnNvdXJjZSk7XG5cbiAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgaGludCAoc3ludGF4IG9yIGhpbnQpXG4gICAgY29uc3QgaGludCA9IGdyb3VwaW5nLmhpbnQ7XG5cbiAgICB3aGlsZSAobGFzdENvbnRleHQgPT09IChsYXN0Q29udGV4dCA9ICRjb250ZXh0KSkge1xuICAgICAgbGV0IG5leHQ7XG5cbiAgICAgIHN0YXRlLmxhc3QgPSBsYXN0O1xuXG4gICAgICBjb25zdCBsYXN0SW5kZXggPSBzdGF0ZS5pbmRleCB8fCAwO1xuXG4gICAgICAkJG1hdGNoZXIubGFzdEluZGV4ID09PSBsYXN0SW5kZXggfHwgKCQkbWF0Y2hlci5sYXN0SW5kZXggPSBsYXN0SW5kZXgpO1xuICAgICAgbWF0Y2ggPSBzdGF0ZS5tYXRjaCA9ICQkbWF0Y2hlci5leGVjKHNvdXJjZSk7XG4gICAgICBkb25lID0gaW5kZXggPT09IChpbmRleCA9IHN0YXRlLmluZGV4ID0gJCRtYXRjaGVyLmxhc3RJbmRleCkgfHwgIW1hdGNoO1xuXG4gICAgICBpZiAoZG9uZSkgcmV0dXJuO1xuXG4gICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgbWF0Y2hcbiAgICAgIGNvbnN0IHswOiB0ZXh0LCAxOiB3aGl0ZXNwYWNlLCAyOiBzZXF1ZW5jZSwgaW5kZXg6IG9mZnNldH0gPSBtYXRjaDtcblxuICAgICAgLy8gQ3VycmVudCBxdWFzaS1jb250ZXh0dWFsIGZyYWdtZW50XG4gICAgICBjb25zdCBwcmUgPSBzb3VyY2Uuc2xpY2UobGFzdEluZGV4LCBvZmZzZXQpO1xuICAgICAgcHJlICYmXG4gICAgICAgICgobmV4dCA9IHRva2VuKHt0eXBlOiAncHJlJywgdGV4dDogcHJlLCBvZmZzZXQ6IGxhc3RJbmRleCwgcHJldmlvdXMsIHBhcmVudCwgaGludCwgbGFzdH0pKSxcbiAgICAgICAgeWllbGQgKHByZXZpb3VzID0gbmV4dCkpO1xuXG4gICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgZnJhZ21lbnRcbiAgICAgIGNvbnN0IHR5cGUgPSAod2hpdGVzcGFjZSAmJiAnd2hpdGVzcGFjZScpIHx8IChzZXF1ZW5jZSAmJiAnc2VxdWVuY2UnKSB8fCAndGV4dCc7XG4gICAgICBuZXh0ID0gdG9rZW4oe3R5cGUsIHRleHQsIG9mZnNldCwgcHJldmlvdXMsIHBhcmVudCwgaGludCwgbGFzdH0pO1xuXG4gICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgcHVuY3R1YXRvciAoZnJvbSBzZXF1ZW5jZSlcbiAgICAgIGNvbnN0IGNsb3NpbmcgPVxuICAgICAgICAkJGNsb3NlciAmJlxuICAgICAgICAoJCRjbG9zZXIudGVzdFxuICAgICAgICAgID8gJCRjbG9zZXIudGVzdCh0ZXh0KVxuICAgICAgICAgIDogJCRjbG9zZXIgPT09IHRleHQgfHwgKHdoaXRlc3BhY2UgJiYgd2hpdGVzcGFjZS5pbmNsdWRlcygkJGNsb3NlcikpKTtcblxuICAgICAgbGV0IGFmdGVyO1xuICAgICAgbGV0IHB1bmN0dWF0b3IgPSBuZXh0LnB1bmN0dWF0b3I7XG5cbiAgICAgIGlmIChwdW5jdHVhdG9yIHx8IGNsb3NpbmcpIHtcbiAgICAgICAgLy8gcHVuY3R1YXRvciB0ZXh0IGNsb3NpbmcgbmV4dCBwYXJlbnRcbiAgICAgICAgLy8gc3ludGF4IG1hdGNoZXJzIGNsb3N1cmVzIHNwYW5zICQkc3BhbnNcblxuICAgICAgICBsZXQgaGludGVyID0gcHVuY3R1YXRvciA/IGAke3N5bnRheH0tJHtwdW5jdHVhdG9yfWAgOiBncm91cGluZy5oaW50O1xuICAgICAgICBsZXQgY2xvc2VkLCBvcGVuZWQsIGdyb3VwZXI7XG5cbiAgICAgICAgaWYgKGNsb3NpbmcpIHtcbiAgICAgICAgICBjbG9zZWQgPSBncm91cGVyID0gY2xvc2luZyAmJiBncm91cGluZy5ncm91cGluZ3MucG9wKCk7XG4gICAgICAgICAgbmV4dC5jbG9zZWQgPSBjbG9zZWQ7XG4gICAgICAgICAgZ3JvdXBpbmcuZ3JvdXBpbmdzLmluY2x1ZGVzKGdyb3VwZXIpIHx8IGdyb3VwaW5nLmhpbnRzLmRlbGV0ZShncm91cGVyLmhpbnRlcik7XG4gICAgICAgICAgKGNsb3NlZC5wdW5jdHVhdG9yID09PSAnb3BlbmVyJyAmJiAobmV4dC5wdW5jdHVhdG9yID0gJ2Nsb3NlcicpKSB8fFxuICAgICAgICAgICAgKGNsb3NlZC5wdW5jdHVhdG9yICYmIChuZXh0LnB1bmN0dWF0b3IgPSBjbG9zZWQucHVuY3R1YXRvcikpO1xuICAgICAgICAgIGFmdGVyID0gZ3JvdXBlci5jbG9zZSAmJiBncm91cGVyLmNsb3NlKG5leHQsIHN0YXRlLCAkY29udGV4dCk7XG5cbiAgICAgICAgICBjb25zdCBwcmV2aW91c0dyb3VwZXIgPSAoZ3JvdXBlciA9IGdyb3VwaW5nLmdyb3VwaW5nc1tncm91cGluZy5ncm91cGluZ3MubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgIGdyb3VwaW5nLmdvYWwgPSAocHJldmlvdXNHcm91cGVyICYmIHByZXZpb3VzR3JvdXBlci5nb2FsKSB8fCBzeW50YXg7XG4gICAgICAgICAgcGFyZW50ID0gKHBhcmVudCAmJiBwYXJlbnQucGFyZW50KSB8fCB0b3A7XG4gICAgICAgIH0gZWxzZSBpZiAoJCRwdW5jdHVhdG9yICE9PSAnY29tbWVudCcpIHtcbiAgICAgICAgICBjb25zdCBncm91cCA9IGAke2hpbnRlcn0sJHt0ZXh0fWA7XG4gICAgICAgICAgZ3JvdXBlciA9IGdyb3VwaW5nLmdyb3VwZXJzW2dyb3VwXTtcblxuICAgICAgICAgIGlmICgkJHNwYW5zICYmIHB1bmN0dWF0b3IgPT09ICdzcGFuJykge1xuICAgICAgICAgICAgY29uc3Qgc3BhbiA9ICQkc3BhbnNbdGV4dF07XG4gICAgICAgICAgICBuZXh0LnB1bmN0dWF0b3IgPSBwdW5jdHVhdG9yID0gJ3NwYW4nO1xuICAgICAgICAgICAgb3BlbmVkID1cbiAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgZ29hbDogc3ludGF4LFxuICAgICAgICAgICAgICAgIHNwYW4sXG4gICAgICAgICAgICAgICAgbWF0Y2hlcjogc3Bhbi5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5zcGFuKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgc3BhbnM6IChzcGFucyAmJiBzcGFuc1t0ZXh0XSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKCQkcHVuY3R1YXRvciAhPT0gJ3F1b3RlJykge1xuICAgICAgICAgICAgaWYgKHB1bmN0dWF0b3IgPT09ICdxdW90ZScpIHtcbiAgICAgICAgICAgICAgb3BlbmVkID1cbiAgICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICBnb2FsOiBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgcXVvdGU6IHRleHQsXG4gICAgICAgICAgICAgICAgICBtYXRjaGVyOiAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMucXVvdGUpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIHNwYW5zOiAoc3BhbnMgJiYgc3BhbnNbdGV4dF0pIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHB1bmN0dWF0b3IgPT09ICdjb21tZW50Jykge1xuICAgICAgICAgICAgICBjb25zdCBjb21tZW50ID0gY29tbWVudHNbdGV4dF07XG4gICAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgZ29hbDogcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIGNvbW1lbnQsXG4gICAgICAgICAgICAgICAgICBtYXRjaGVyOiBjb21tZW50Lm1hdGNoZXIgfHwgKG1hdGNoZXJzICYmIG1hdGNoZXJzLmNvbW1lbnQpIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHB1bmN0dWF0b3IgPT09ICdjbG9zdXJlJykge1xuICAgICAgICAgICAgICBjb25zdCBjbG9zdXJlID0gKGdyb3VwZXIgJiYgZ3JvdXBlci5jbG9zdXJlKSB8fCBjbG9zdXJlc1t0ZXh0XTtcbiAgICAgICAgICAgICAgcHVuY3R1YXRvciA9IG5leHQucHVuY3R1YXRvciA9ICdvcGVuZXInO1xuICAgICAgICAgICAgICAvLyAnb3BlbmVyJyAhPT1cbiAgICAgICAgICAgICAgLy8gICAocHVuY3R1YXRvciA9XG4gICAgICAgICAgICAgIC8vICAgICAoY2xvc3VyZS5vcGVuICYmXG4gICAgICAgICAgICAgIC8vICAgICAgIChuZXh0ID0gY2xvc3VyZS5vcGVuKG5leHQsIHN0YXRlLCBwcmV2aW91cykgfHwgbmV4dCkucHVuY3R1YXRvcikgfHxcbiAgICAgICAgICAgICAgLy8gICAgIChuZXh0LnB1bmN0dWF0b3IgPSAnb3BlbmVyJykpIHx8XG4gICAgICAgICAgICAgIGNsb3N1cmUgJiZcbiAgICAgICAgICAgICAgICAob3BlbmVkID1cbiAgICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgIGdvYWw6IHN5bnRheCxcbiAgICAgICAgICAgICAgICAgICAgY2xvc3VyZSxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogY2xvc3VyZS5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5jbG9zdXJlKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAob3BlbmVkKSB7XG4gICAgICAgICAgICAvLyBhZnRlciA9IG9wZW5lZC5vcGVuICYmIG9wZW5lZC5vcGVuKG5leHQsIHN0YXRlLCBvcGVuZWQpO1xuICAgICAgICAgICAgZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdIHx8IChncm91cGluZy5ncm91cGVyc1tncm91cF0gPSBncm91cGVyID0gb3BlbmVkKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdyb3VwaW5ncy5wdXNoKGdyb3VwZXIpLCBncm91cGluZy5oaW50cy5hZGQoaGludGVyKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdvYWwgPSAoZ3JvdXBlciAmJiBncm91cGVyLmdvYWwpIHx8IHN5bnRheDtcbiAgICAgICAgICAgIHBhcmVudCA9IG5leHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuY29udGV4dCA9IGdyb3VwaW5nLmNvbnRleHQgPSBncm91cGluZy5nb2FsIHx8IHN5bnRheDtcblxuICAgICAgICBpZiAob3BlbmVkIHx8IGNsb3NlZCkge1xuICAgICAgICAgICRjb250ZXh0ID0gJGNvbnRleHRpbmcubmV4dCgoc3RhdGUuZ3JvdXBlciA9IGdyb3VwZXIgfHwgdW5kZWZpbmVkKSkudmFsdWU7XG4gICAgICAgICAgZ3JvdXBpbmcuaGludCA9IGAke1suLi5ncm91cGluZy5oaW50c10uam9pbignICcpfSAke1xuICAgICAgICAgICAgZ3JvdXBpbmcuY29udGV4dCA/IGBpbi0ke2dyb3VwaW5nLmNvbnRleHR9YCA6ICcnXG4gICAgICAgICAgfWA7XG4gICAgICAgICAgb3BlbmVkICYmIChhZnRlciA9IG9wZW5lZC5vcGVuICYmIG9wZW5lZC5vcGVuKG5leHQsIHN0YXRlLCAkY29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCB0YWlsIHRva2VuICh5aWVsZCBmcm9tIHNlcXVlbmNlKVxuICAgICAgeWllbGQgKHByZXZpb3VzID0gbmV4dCk7XG5cbiAgICAgIC8vIE5leHQgcmVmZXJlbmNlIHRvIGxhc3QgY29udGV4dHVhbCBzZXF1ZW5jZSB0b2tlblxuICAgICAgbmV4dCAmJiAhd2hpdGVzcGFjZSAmJiBmb3JtaW5nICYmIChsYXN0ID0gbmV4dCk7XG5cbiAgICAgIGlmIChhZnRlcikge1xuICAgICAgICBsZXQgdG9rZW5zLCB0b2tlbiwgbmV4dEluZGV4OyAvLyAgPSBhZnRlci5lbmQgfHwgYWZ0ZXIuaW5kZXhcblxuICAgICAgICBpZiAoYWZ0ZXIuc3ludGF4KSB7XG4gICAgICAgICAgY29uc3Qge3N5bnRheCwgb2Zmc2V0LCBpbmRleH0gPSBhZnRlcjtcbiAgICAgICAgICBjb25zdCBib2R5ID0gaW5kZXggPiBvZmZzZXQgJiYgc291cmNlLnNsaWNlKG9mZnNldCwgaW5kZXggLSAxKTtcbiAgICAgICAgICBpZiAoYm9keSkge1xuICAgICAgICAgICAgYm9keS5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICgodG9rZW5zID0gdG9rZW5pemUoYm9keSwge29wdGlvbnM6IHtzeW50YXh9fSwgZGVmYXVsdHMpKSwgKG5leHRJbmRleCA9IGluZGV4KSk7XG4gICAgICAgICAgICBjb25zdCBoaW50ID0gYCR7c3ludGF4fS1pbi0keyQuc3ludGF4fWA7XG4gICAgICAgICAgICB0b2tlbiA9IHRva2VuID0+IChcbiAgICAgICAgICAgICAgKHRva2VuLmhpbnQgPSBgJHsodG9rZW4uaGludCAmJiBgJHt0b2tlbi5oaW50fSBgKSB8fCAnJ30ke2hpbnR9YCksIHRva2VuXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhZnRlci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBoaW50ID0gZ3JvdXBpbmcuaGludDtcbiAgICAgICAgICB0b2tlbiA9IHRva2VuID0+IChcbiAgICAgICAgICAgICh0b2tlbi5oaW50ID0gYCR7aGludH0gJHt0b2tlbi50eXBlIHx8ICdjb2RlJ31gKSwgJGNvbnRleHQudG9rZW4odG9rZW4pXG4gICAgICAgICAgKTtcbiAgICAgICAgICAodG9rZW5zID0gYWZ0ZXIpLmVuZCAmJiAobmV4dEluZGV4ID0gYWZ0ZXIuZW5kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbnMpIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7dG9rZW4sIHRva2VucywgbmV4dEluZGV4fSk7XG4gICAgICAgICAgZm9yIChjb25zdCBuZXh0IG9mIHRva2Vucykge1xuICAgICAgICAgICAgcHJldmlvdXMgJiYgKChuZXh0LnByZXZpb3VzID0gcHJldmlvdXMpLm5leHQgPSBuZXh0KTtcbiAgICAgICAgICAgIHRva2VuICYmIHRva2VuKG5leHQpO1xuICAgICAgICAgICAgeWllbGQgKHByZXZpb3VzID0gbmV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG5leHRJbmRleCA+IGluZGV4ICYmIChzdGF0ZS5pbmRleCA9IG5leHRJbmRleCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIChuZXh0LnB1bmN0dWF0b3IgPSBwdW5jdHVhdG9yID1cbi8vICAgKGNsb3N1cmUub3BlbiAmJlxuLy8gICAgIGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpICYmXG4vLyAgICAgKG5leHQucHVuY3R1YXRvciB8fCBwdW5jdHVhdG9yKSkgfHxcbi8vICAgJ29wZW5lcicpIHx8XG4vLyAobmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9XG4vLyAgIChjbG9zdXJlLm9wZW4gJiYgY2xvc3VyZS5vcGVuKG5leHQsIHN0YXRlLCBwcmV2aW91cykpIHx8ICdvcGVuZXInKSB8fFxuLy8gaWYgKGJvZHkuc3ludGF4ICYmIGJvZHkudGV4dCkge1xuLy8gICBjb25zdCB7c3ludGF4LCB0ZXh0fSA9IGJvZHk7XG4vLyAgIGNvbnN0IHN0YXRlID0ge29wdGlvbnM6IHtzeW50YXh9fTtcbi8vICAgY29uc3QgdG9rZW5zID0gdG9rZW5pemUodGV4dCwgc3RhdGUsIGRlZmF1bHRzKTtcbi8vICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHlpZWxkIHRva2VuO1xuLy8gfVxuIiwiLyoqIEB0eXBlZGVmIHtSZWdFeHB8c3RyaW5nfSBQYXR0ZXJuIC0gVmFsaWQgLyjigKYpLyBzdWIgZXhwcmVzc2lvbiAqL1xuLyoqIEB0eXBlZGVmIHtzdHJpbmd8e3NvdXJjZTogc3RyaW5nfX0gRW50aXR5IC0gVmFsaWQgL1vigKZdLyBzdWIgZXhwcmVzc2lvbiAqL1xuXG5leHBvcnQge3BhdHRlcm5zfSBmcm9tICcuL21hcmt1cC1wYXJzZXIuanMnO1xuXG4vLy8gSGVscGVyc1xuZXhwb3J0IGNvbnN0IHJhdyA9IFN0cmluZy5yYXc7XG5cbi8qKlxuICogQ3JlYXRlIGEgc2VxdWVuY2UgbWF0Y2ggZXhwcmVzc2lvbiBmcm9tIHBhdHRlcm5zLlxuICpcbiAqIEBwYXJhbSAgey4uLlBhdHRlcm59IHBhdHRlcm5zXG4gKi9cbmV4cG9ydCBjb25zdCBzZXF1ZW5jZSA9ICguLi5wYXR0ZXJucykgPT5cbiAgbmV3IFJlZ0V4cChSZWZsZWN0LmFwcGx5KHJhdywgbnVsbCwgcGF0dGVybnMubWFwKHAgPT4gKHAgJiYgcC5zb3VyY2UpIHx8IHAgfHwgJycpKSwgJ2cnKTtcblxuLyoqXG4gKiBDcmVhdGUgYSBtYXliZUlkZW50aWZpZXIgdGVzdCAoaWUgWzxmaXJzdD5dWzxvdGhlcj5dKikgZXhwcmVzc2lvbi5cbiAqXG4gKiBAcGFyYW0gIHtFbnRpdHl9IGZpcnN0IC0gVmFsaWQgXls84oCmPl0gZW50aXR5XG4gKiBAcGFyYW0gIHtFbnRpdHl9IG90aGVyIC0gVmFsaWQgWzzigKY+XSokIGVudGl0eVxuICogQHBhcmFtICB7c3RyaW5nfSBbZmxhZ3NdIC0gUmVnRXhwIGZsYWdzIChkZWZhdWx0cyB0byAndScpXG4gKiBAcGFyYW0gIHt1bmtub3dufSBbYm91bmRhcnldXG4gKi9cbmV4cG9ydCBjb25zdCBpZGVudGlmaWVyID0gKGZpcnN0LCBvdGhlciwgZmxhZ3MgPSAndScsIGJvdW5kYXJ5ID0gL3lnLy50ZXN0KGZsYWdzKSAmJiAnXFxcXGInKSA9PlxuICBuZXcgUmVnRXhwKGAke2JvdW5kYXJ5IHx8ICdeJ31bJHtmaXJzdH1dWyR7b3RoZXJ9XSoke2JvdW5kYXJ5IHx8ICckJ31gLCBmbGFncyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgc2VxdWVuY2UgcGF0dGVybiBmcm9tIHBhdHRlcm5zLlxuICpcbiAqIEBwYXJhbSAgey4uLlBhdHRlcm59IHBhdHRlcm5zXG4gKi9cbmV4cG9ydCBjb25zdCBhbGwgPSAoLi4ucGF0dGVybnMpID0+IHBhdHRlcm5zLm1hcChwID0+IChwICYmIHAuZXhlYyA/IHAuc291cmNlIDogcCkpLmpvaW4oJ3wnKTtcblxuLy8vIEVudGl0aWVzXG5cbi8qKlxuICogVGhlIGNvbGxlY3Rpb24gb2YgUmVndWxhciBFeHByZXNzaW9ucyB1c2VkIHRvIG1hdGNoIHNwZWNpZmljXG4gKiBtYXJrdXAgc2VxdWVuY2VzIGluIGEgZ2l2ZW4gY29udGV4dCBvciB0byB0ZXN0IG1hdGNoZWQgc2VxdWVuY2VzIHZlcmJvc2VseVxuICogaW4gb3JkZXIgdG8gZnVydGhlciBjYXRlZ29yaXplIHRoZW0uIEZ1bGwgc3VwcG9ydCBmb3IgVW5pY29kZSBDbGFzc2VzIGFuZFxuICogUHJvcGVydGllcyBoYXMgYmVlbiBpbmNsdWRlZCBpbiB0aGUgRUNNQVNjcmlwdCBzcGVjaWZpY2F0aW9uIGJ1dCBjZXJ0YWluXG4gKiBlbmdpbmVzIGFyZSBzdGlsbCBpbXBsZW1lbnRpbmcgdGhlbS5cbiAqXG4gKiBAdHlwZSB7e1tuYW1lOiBzdHJpbmddOiB7W25hbWU6IHN0cmluZ106IEVudGl0eX19fVxuICovXG5leHBvcnQgY29uc3QgZW50aXRpZXMgPSB7XG4gIGVzOiB7XG4gICAgLyoqIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi85LjAvI3Byb2QtSWRlbnRpZmllclN0YXJ0ICovXG4gICAgSWRlbnRpZmllclN0YXJ0OiByYXdgXyRcXHB7SURfU3RhcnR9YCxcbiAgICAvKiogaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzkuMC8jcHJvZC1JZGVudGlmaWVyUGFydCAqL1xuICAgIElkZW50aWZpZXJQYXJ0OiByYXdgXyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1gLFxuICB9LFxufTtcblxuLyoqIEludGVyb3BlcmFiaWxpdHkgKGZvciBzb21lIGJyb3dzZXJzKSAqL1xuKFJhbmdlcyA9PiB7XG4gIGNvbnN0IHRyYW5zZm9ybXMgPSBbXTtcblxuICBpZiAoIXN1cHBvcnRzKHJhd2BcXHB7SURfU3RhcnR9YCwgJ3UnKSkge1xuICAgIGNvbnN0IFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMgPSAvXFxcXHB7ICooXFx3KykgKn0vZztcbiAgICBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnJlcGxhY2UgPSAobSwgcHJvcGVydHlLZXkpID0+IHtcbiAgICAgIGlmIChwcm9wZXJ0eUtleSBpbiBSYW5nZXMpIHJldHVybiBSYW5nZXNbcHJvcGVydHlLZXldLnRvU3RyaW5nKCk7XG4gICAgICB0aHJvdyBSYW5nZUVycm9yKGBDYW5ub3QgcmV3cml0ZSB1bmljb2RlIHByb3BlcnR5IFwiJHtwcm9wZXJ0eUtleX1cImApO1xuICAgIH07XG4gICAgdHJhbnNmb3Jtcy5wdXNoKGV4cHJlc3Npb24gPT4ge1xuICAgICAgbGV0IGZsYWdzID0gZXhwcmVzc2lvbiAmJiBleHByZXNzaW9uLmZsYWdzO1xuICAgICAgbGV0IHNvdXJjZSA9IGV4cHJlc3Npb24gJiYgYCR7ZXhwcmVzc2lvbi5zb3VyY2UgfHwgZXhwcmVzc2lvbiB8fCAnJ31gO1xuICAgICAgc291cmNlICYmXG4gICAgICAgIFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMudGVzdChzb3VyY2UpICYmXG4gICAgICAgIChzb3VyY2UgPSBzb3VyY2UucmVwbGFjZShVbmljb2RlUHJvcGVydHlFc2NhcGVzLCBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnJlcGxhY2UpKTtcbiAgICAgIHJldHVybiAoZmxhZ3MgJiYgbmV3IFJlZ0V4cChzb3VyY2UsIGZsYWdzKSkgfHwgc291cmNlO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKCF0cmFuc2Zvcm1zLmxlbmd0aCkgcmV0dXJuO1xuXG4gIGZvciAoY29uc3Qga2V5IGluIGVudGl0aWVzKSB7XG4gICAgY29uc3Qgc291cmNlcyA9IGVudGl0aWVzW2tleV07XG4gICAgY29uc3QgY2hhbmdlcyA9IHt9O1xuICAgIGZvciAoY29uc3QgaWQgaW4gc291cmNlcykge1xuICAgICAgbGV0IHNvdXJjZSA9IHNvdXJjZXNbaWRdO1xuICAgICAgaWYgKCFzb3VyY2UgfHwgdHlwZW9mIHNvdXJjZSAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykgc291cmNlID0gdHJhbnNmb3JtKHNvdXJjZSk7XG4gICAgICAhc291cmNlIHx8IHNvdXJjZSA9PT0gc291cmNlc1tpZF0gfHwgKGNoYW5nZXNbaWRdID0gc291cmNlKTtcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihzb3VyY2VzLCBjaGFuZ2VzKTtcbiAgfVxuXG4gIC8vIHByZXR0aWVyLWlnbm9yZVxuICBmdW5jdGlvbiBzdXBwb3J0cygpIHt0cnkge3JldHVybiAhIVJlZ0V4cCguLi4gYXJndW1lbnRzKX0gY2F0Y2ggKGUpIHsgfX1cbn0pKHtcbiAgSURfU3RhcnQ6IHJhd2BhLXpBLVpcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY2AsXG4gIElEX0NvbnRpbnVlOiByYXdgYS16QS1aMC05XFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcXHUyMDBjXFx1MjAwZFxceGI3XFx1MDMwMC1cXHUwMzZmXFx1MDM4N1xcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2NGItXFx1MDY2OVxcdTA2NzBcXHUwNmQ2LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZTRcXHUwNmU3XFx1MDZlOFxcdTA2ZWEtXFx1MDZlZFxcdTA2ZjAtXFx1MDZmOVxcdTA3MTFcXHUwNzMwLVxcdTA3NGFcXHUwN2E2LVxcdTA3YjBcXHUwN2MwLVxcdTA3YzlcXHUwN2ViLVxcdTA3ZjNcXHUwN2ZkXFx1MDgxNi1cXHUwODE5XFx1MDgxYi1cXHUwODIzXFx1MDgyNS1cXHUwODI3XFx1MDgyOS1cXHUwODJkXFx1MDg1OS1cXHUwODViXFx1MDhkMy1cXHUwOGUxXFx1MDhlMy1cXHUwOTAzXFx1MDkzYS1cXHUwOTNjXFx1MDkzZS1cXHUwOTRmXFx1MDk1MS1cXHUwOTU3XFx1MDk2MlxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2RcXHUwOWQ3XFx1MDllMlxcdTA5ZTNcXHUwOWU2LVxcdTA5ZWZcXHUwOWZlXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMlxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYWZhLVxcdTBhZmZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNjJcXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI4MlxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAwLVxcdTBjMDRcXHUwYzNlLVxcdTBjNDRcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNjJcXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MS1cXHUwYzgzXFx1MGNiY1xcdTBjYmUtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNlMlxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwZDAwLVxcdTBkMDNcXHUwZDNiXFx1MGQzY1xcdTBkM2UtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZFxcdTBkNTdcXHUwZDYyXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODJcXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGU2LVxcdTBkZWZcXHUwZGYyXFx1MGRmM1xcdTBlMzFcXHUwZTM0LVxcdTBlM2FcXHUwZTQ3LVxcdTBlNGVcXHUwZTUwLVxcdTBlNTlcXHUwZWIxXFx1MGViNC1cXHUwZWI5XFx1MGViYlxcdTBlYmNcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2VcXHUwZjNmXFx1MGY3MS1cXHUwZjg0XFx1MGY4NlxcdTBmODdcXHUwZjhkLVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAyYi1cXHUxMDNlXFx1MTA0MC1cXHUxMDQ5XFx1MTA1Ni1cXHUxMDU5XFx1MTA1ZS1cXHUxMDYwXFx1MTA2Mi1cXHUxMDY0XFx1MTA2Ny1cXHUxMDZkXFx1MTA3MS1cXHUxMDc0XFx1MTA4Mi1cXHUxMDhkXFx1MTA4Zi1cXHUxMDlkXFx1MTM1ZC1cXHUxMzVmXFx1MTM2OS1cXHUxMzcxXFx1MTcxMi1cXHUxNzE0XFx1MTczMi1cXHUxNzM0XFx1MTc1MlxcdTE3NTNcXHUxNzcyXFx1MTc3M1xcdTE3YjQtXFx1MTdkM1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxOGE5XFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk0Ni1cXHUxOTRmXFx1MTlkMC1cXHUxOWRhXFx1MWExNy1cXHUxYTFiXFx1MWE1NS1cXHUxYTVlXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWFiMC1cXHUxYWJkXFx1MWIwMC1cXHUxYjA0XFx1MWIzNC1cXHUxYjQ0XFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYjgyXFx1MWJhMS1cXHUxYmFkXFx1MWJiMC1cXHUxYmI5XFx1MWJlNi1cXHUxYmYzXFx1MWMyNC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM1MC1cXHUxYzU5XFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2U4XFx1MWNlZFxcdTFjZjItXFx1MWNmNFxcdTFjZjctXFx1MWNmOVxcdTFkYzAtXFx1MWRmOVxcdTFkZmItXFx1MWRmZlxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyY2VmLVxcdTJjZjFcXHUyZDdmXFx1MmRlMC1cXHUyZGZmXFx1MzAyYS1cXHUzMDJmXFx1MzA5OVxcdTMwOWFcXHVhNjIwLVxcdWE2MjlcXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZVxcdWE2OWZcXHVhNmYwXFx1YTZmMVxcdWE4MDJcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4ODBcXHVhODgxXFx1YThiNC1cXHVhOGM1XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGYxXFx1YThmZi1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTk0Ny1cXHVhOTUzXFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YTlkMC1cXHVhOWQ5XFx1YTllNVxcdWE5ZjAtXFx1YTlmOVxcdWFhMjktXFx1YWEzNlxcdWFhNDNcXHVhYTRjXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2ItXFx1YWE3ZFxcdWFhYjBcXHVhYWIyLVxcdWFhYjRcXHVhYWI3XFx1YWFiOFxcdWFhYmVcXHVhYWJmXFx1YWFjMVxcdWFhZWItXFx1YWFlZlxcdWFhZjVcXHVhYWY2XFx1YWJlMy1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVmYjFlXFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTJmXFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmYCxcbn0pO1xuXG5leHBvcnQgY29uc3QgcmVhZHkgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuLy8gLy8vIFJlZ3VsYXIgRXhwcmVzc2lvbnNcbi8vIGV4cG9ydCBjb25zdCBSZWdFeHBVbmljb2RlUHJvcGVydGllcyA9IC9cXFxccHsgKihcXHcrKSAqfS9nO1xuXG4vLyBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXBsYWNlID0gKG0sIHByb3BlcnR5S2V5KSA9PiB7XG4vLyAgIC8vIGNvbnN0IHByb3BlcnR5ID0gQVNDSUlbcHJvcGVydHlLZXldIHx8IFVuaWNvZGVbcHJvcGVydHlLZXldO1xuLy8gICBjb25zdCBwcm9wZXJ0eSA9IFJhbmdlc1twcm9wZXJ0eUtleV07XG4vLyAgIGlmIChwcm9wZXJ0eSkgcmV0dXJuIHByb3BlcnR5LnRvU3RyaW5nKCk7XG4vLyAgIHRocm93IFJhbmdlRXJyb3IoYENhbm5vdCByZXdyaXRlIHVuaWNvZGUgcHJvcGVydHkgXCIke3Byb3BlcnR5S2V5fVwiYCk7XG4vLyB9O1xuXG4vLyBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXdyaXRlID0gZXhwcmVzc2lvbiA9PiB7XG4vLyAgIGxldCBmbGFncyA9IGV4cHJlc3Npb24gJiYgZXhwcmVzc2lvbi5mbGFncztcbi8vICAgbGV0IHNvdXJjZSA9IGV4cHJlc3Npb24gJiYgYCR7ZXhwcmVzc2lvbi5zb3VyY2UgfHwgZXhwcmVzc2lvbiB8fCAnJ31gO1xuLy8gICBzb3VyY2UgJiZcbi8vICAgICBSZWdFeHBVbmljb2RlUHJvcGVydGllcy50ZXN0KHNvdXJjZSkgJiZcbi8vICAgICAoc291cmNlID0gc291cmNlLnJlcGxhY2UoUmVnRXhwVW5pY29kZVByb3BlcnRpZXMsIFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJlcGxhY2UpKTtcbi8vICAgcmV0dXJuIChmbGFncyAmJiBuZXcgUmVnRXhwKHNvdXJjZSwgZmxhZ3MpKSB8fCBzb3VyY2U7XG4vLyB9O1xuXG4vLyAvLy8gSW50ZXJvcGVyYWJpbGl0eVxuLy8gZXhwb3J0IGNvbnN0IHN1cHBvcnRlZCA9XG4vLyAgIC8vIFRPRE86IFJlbW92ZSB3aGVuIHNzdXBwb3J0aW5nIG5vbi11bmljb2RlIHJ1bnRpbWVzIFtub3QgaW4gc2NvcGVdXG4vLyAgIG5ldyBSZWdFeHAocmF3YFxcdUZGRkZgLCAndScpICYmXG4vLyAgIHN1cHBvcnRzKFxuLy8gICAgIFVuaWNvZGVQcm9wZXJ0aWVzID0+IG5ldyBSZWdFeHAocmF3YFxccHtMfWAsICd1JyksXG4vLyAgICAgVW5pY29kZUNsYXNzZXMgPT4gbmV3IFJlZ0V4cChyYXdgXFxwe0lEX1N0YXJ0fVxccHtJRF9Db250aW51ZX1gLCAndScpLFxuLy8gICApO1xuXG4vLyBhc3luYyBmdW5jdGlvbiByZXBsYWNlVW5zdXBwb3J0ZWRFeHByZXNzaW9ucygpIHtcbi8vICAgLy8gYXdhaXQgVW5pY29kZS5pbml0aWFsaXplKCk7IGNvbnNvbGUubG9nKFVuaWNvZGUpO1xuLy8gICBmb3IgKGNvbnN0IGtleSBpbiBlbnRpdGllcykge1xuLy8gICAgIGNvbnN0IHNvdXJjZXMgPSBlbnRpdGllc1trZXldO1xuLy8gICAgIGNvbnN0IHJlcGxhY2VtZW50cyA9IHt9O1xuLy8gICAgIGZvciAoY29uc3QgaWQgaW4gc291cmNlcylcbi8vICAgICAgICFzb3VyY2VzW2lkXSB8fFxuLy8gICAgICAgICB0eXBlb2YgKHNvdXJjZXNbaWRdLnNvdXJjZSB8fCBzb3VyY2VzW2lkXSkgIT09ICdzdHJpbmcnIHx8XG4vLyAgICAgICAgIChyZXBsYWNlbWVudHNbaWRdID0gUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmV3cml0ZShzb3VyY2VzW2lkXSkpO1xuLy8gICAgIE9iamVjdC5hc3NpZ24oc291cmNlcywgcmVwbGFjZW1lbnRzKTtcbi8vICAgfVxuLy8gICByZXR1cm47XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIHN1cHBvcnRzKGZlYXR1cmUsIC4uLmZlYXR1cmVzKSB7XG4vLyAgIGlmIChmZWF0dXJlKSB7XG4vLyAgICAgdHJ5IHtcbi8vICAgICAgIGZlYXR1cmUoKTtcbi8vICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbi8vICAgICAgIHJldHVybiBmYWxzZTtcbi8vICAgICB9XG4vLyAgIH1cbi8vICAgcmV0dXJuICFmZWF0dXJlcy5sZW5ndGggfHwgUmVmbGVjdC5hcHBseShzdXBwb3J0cywgbnVsbCwgZmVhdHVyZXMpO1xuLy8gfVxuXG4vLyAvLyBUT0RPOiBGaXggVW5pY29kZVJhbmdlLm1lcmdlIGlmIG5vdCBpbXBsZW1lbnRlZCBpbiBGaXJlZm94IHNvb25cbi8vIC8vIGltcG9ydCB7VW5pY29kZX0gZnJvbSAnLi91bmljb2RlL3VuaWNvZGUuanMnO1xuXG4vLyAvLyBUT0RPOiBSZW1vdmUgUmFuZ2VzIG9uY2UgVW5pY29kZVJhbmdlIGlzIHdvcmtpbmdcbi8vIGNvbnN0IFJhbmdlcyA9IHtcbi8vICAgLy8gTDogJ2EtekEtWicsXG4vLyAgIC8vIE46ICcwLTknLFxuLy8gICBJRF9TdGFydDogcmF3YGEtekEtWlxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDhhMC1cXHUwOGI0XFx1MDhiNi1cXHUwOGJkXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4OFxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmVmXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3YjlcXHVhN2Y3LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY1XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjYCxcbi8vICAgSURfQ29udGludWU6IHJhd2BhLXpBLVowLTlcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY1xcdTIwMGNcXHUyMDBkXFx4YjdcXHUwMzAwLVxcdTAzNmZcXHUwMzg3XFx1MDQ4My1cXHUwNDg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDYxMC1cXHUwNjFhXFx1MDY0Yi1cXHUwNjY5XFx1MDY3MFxcdTA2ZDYtXFx1MDZkY1xcdTA2ZGYtXFx1MDZlNFxcdTA2ZTdcXHUwNmU4XFx1MDZlYS1cXHUwNmVkXFx1MDZmMC1cXHUwNmY5XFx1MDcxMVxcdTA3MzAtXFx1MDc0YVxcdTA3YTYtXFx1MDdiMFxcdTA3YzAtXFx1MDdjOVxcdTA3ZWItXFx1MDdmM1xcdTA3ZmRcXHUwODE2LVxcdTA4MTlcXHUwODFiLVxcdTA4MjNcXHUwODI1LVxcdTA4MjdcXHUwODI5LVxcdTA4MmRcXHUwODU5LVxcdTA4NWJcXHUwOGQzLVxcdTA4ZTFcXHUwOGUzLVxcdTA5MDNcXHUwOTNhLVxcdTA5M2NcXHUwOTNlLVxcdTA5NGZcXHUwOTUxLVxcdTA5NTdcXHUwOTYyXFx1MDk2M1xcdTA5NjYtXFx1MDk2ZlxcdTA5ODEtXFx1MDk4M1xcdTA5YmNcXHUwOWJlLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5Y2ItXFx1MDljZFxcdTA5ZDdcXHUwOWUyXFx1MDllM1xcdTA5ZTYtXFx1MDllZlxcdTA5ZmVcXHUwYTAxLVxcdTBhMDNcXHUwYTNjXFx1MGEzZS1cXHUwYTQyXFx1MGE0N1xcdTBhNDhcXHUwYTRiLVxcdTBhNGRcXHUwYTUxXFx1MGE2Ni1cXHUwYTcxXFx1MGE3NVxcdTBhODEtXFx1MGE4M1xcdTBhYmNcXHUwYWJlLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWUyXFx1MGFlM1xcdTBhZTYtXFx1MGFlZlxcdTBhZmEtXFx1MGFmZlxcdTBiMDEtXFx1MGIwM1xcdTBiM2NcXHUwYjNlLVxcdTBiNDRcXHUwYjQ3XFx1MGI0OFxcdTBiNGItXFx1MGI0ZFxcdTBiNTZcXHUwYjU3XFx1MGI2MlxcdTBiNjNcXHUwYjY2LVxcdTBiNmZcXHUwYjgyXFx1MGJiZS1cXHUwYmMyXFx1MGJjNi1cXHUwYmM4XFx1MGJjYS1cXHUwYmNkXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDAtXFx1MGMwNFxcdTBjM2UtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM2MlxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgxLVxcdTBjODNcXHUwY2JjXFx1MGNiZS1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2UyXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBkMDAtXFx1MGQwM1xcdTBkM2JcXHUwZDNjXFx1MGQzZS1cXHUwZDQ0XFx1MGQ0Ni1cXHUwZDQ4XFx1MGQ0YS1cXHUwZDRkXFx1MGQ1N1xcdTBkNjJcXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ4MlxcdTBkODNcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZTYtXFx1MGRlZlxcdTBkZjJcXHUwZGYzXFx1MGUzMVxcdTBlMzQtXFx1MGUzYVxcdTBlNDctXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlYjFcXHUwZWI0LVxcdTBlYjlcXHUwZWJiXFx1MGViY1xcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGYzZVxcdTBmM2ZcXHUwZjcxLVxcdTBmODRcXHUwZjg2XFx1MGY4N1xcdTBmOGQtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDJiLVxcdTEwM2VcXHUxMDQwLVxcdTEwNDlcXHUxMDU2LVxcdTEwNTlcXHUxMDVlLVxcdTEwNjBcXHUxMDYyLVxcdTEwNjRcXHUxMDY3LVxcdTEwNmRcXHUxMDcxLVxcdTEwNzRcXHUxMDgyLVxcdTEwOGRcXHUxMDhmLVxcdTEwOWRcXHUxMzVkLVxcdTEzNWZcXHUxMzY5LVxcdTEzNzFcXHUxNzEyLVxcdTE3MTRcXHUxNzMyLVxcdTE3MzRcXHUxNzUyXFx1MTc1M1xcdTE3NzJcXHUxNzczXFx1MTdiNC1cXHUxN2QzXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE4YTlcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NGZcXHUxOWQwLVxcdTE5ZGFcXHUxYTE3LVxcdTFhMWJcXHUxYTU1LVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWIwLVxcdTFhYmRcXHUxYjAwLVxcdTFiMDRcXHUxYjM0LVxcdTFiNDRcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYjgwLVxcdTFiODJcXHUxYmExLVxcdTFiYWRcXHUxYmIwLVxcdTFiYjlcXHUxYmU2LVxcdTFiZjNcXHUxYzI0LVxcdTFjMzdcXHUxYzQwLVxcdTFjNDlcXHUxYzUwLVxcdTFjNTlcXHUxY2QwLVxcdTFjZDJcXHUxY2Q0LVxcdTFjZThcXHUxY2VkXFx1MWNmMi1cXHUxY2Y0XFx1MWNmNy1cXHUxY2Y5XFx1MWRjMC1cXHUxZGY5XFx1MWRmYi1cXHUxZGZmXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjBkMC1cXHUyMGRjXFx1MjBlMVxcdTIwZTUtXFx1MjBmMFxcdTJjZWYtXFx1MmNmMVxcdTJkN2ZcXHUyZGUwLVxcdTJkZmZcXHUzMDJhLVxcdTMwMmZcXHUzMDk5XFx1MzA5YVxcdWE2MjAtXFx1YTYyOVxcdWE2NmZcXHVhNjc0LVxcdWE2N2RcXHVhNjllXFx1YTY5ZlxcdWE2ZjBcXHVhNmYxXFx1YTgwMlxcdWE4MDZcXHVhODBiXFx1YTgyMy1cXHVhODI3XFx1YTg4MFxcdWE4ODFcXHVhOGI0LVxcdWE4YzVcXHVhOGQwLVxcdWE4ZDlcXHVhOGUwLVxcdWE4ZjFcXHVhOGZmLVxcdWE5MDlcXHVhOTI2LVxcdWE5MmRcXHVhOTQ3LVxcdWE5NTNcXHVhOTgwLVxcdWE5ODNcXHVhOWIzLVxcdWE5YzBcXHVhOWQwLVxcdWE5ZDlcXHVhOWU1XFx1YTlmMC1cXHVhOWY5XFx1YWEyOS1cXHVhYTM2XFx1YWE0M1xcdWFhNGNcXHVhYTRkXFx1YWE1MC1cXHVhYTU5XFx1YWE3Yi1cXHVhYTdkXFx1YWFiMFxcdWFhYjItXFx1YWFiNFxcdWFhYjdcXHVhYWI4XFx1YWFiZVxcdWFhYmZcXHVhYWMxXFx1YWFlYi1cXHVhYWVmXFx1YWFmNVxcdWFhZjZcXHVhYmUzLVxcdWFiZWFcXHVhYmVjXFx1YWJlZFxcdWFiZjAtXFx1YWJmOVxcdWZiMWVcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMmZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZmMTAtXFx1ZmYxOVxcdWZmM2ZgLFxuLy8gfTtcblxuLy8gLy8vIEJvb3RzdHJhcFxuLy8gZXhwb3J0IGNvbnN0IHJlYWR5ID0gKGVudGl0aWVzLnJlYWR5ID0gc3VwcG9ydGVkXG4vLyAgID8gUHJvbWlzZS5yZXNvbHZlKClcbi8vICAgOiByZXBsYWNlVW5zdXBwb3J0ZWRFeHByZXNzaW9ucygpKTtcbiIsImltcG9ydCB7bWF0Y2hlcnMsIG1vZGVzfSBmcm9tICcuL21hcmt1cC1wYXJzZXIuanMnO1xuaW1wb3J0IHtwYXR0ZXJucywgZW50aXRpZXMsIGlkZW50aWZpZXIsIHNlcXVlbmNlLCBhbGwsIHJhd30gZnJvbSAnLi9tYXJrdXAtcGF0dGVybnMuanMnO1xuXG4vLy8gSU5URVJGQUNFXG5cbmV4cG9ydCBjb25zdCBpbnN0YWxsID0gKGRlZmF1bHRzLCBuZXdTeW50YXhlcyA9IGRlZmF1bHRzLnN5bnRheGVzIHx8IHt9KSA9PiB7XG4gIE9iamVjdC5hc3NpZ24obmV3U3ludGF4ZXMsIHN5bnRheGVzKTtcbiAgZGVmYXVsdHMuc3ludGF4ZXMgPT09IG5ld1N5bnRheGVzIHx8IChkZWZhdWx0cy5zeW50YXhlcyA9IG5ld1N5bnRheGVzKTtcbn07XG5cbmV4cG9ydCBjb25zdCBzeW50YXhlcyA9IHt9O1xuXG4vLy8gREVGSU5JVElPTlNcblN5bnRheGVzOiB7XG4gIC8vLyBIZWxwZXJzXG4gIC8vIGNvbnN0IHJhdyA9IFN0cmluZy5yYXc7XG4gIGNvbnN0IGxpbmVzID0gc3RyaW5nID0+IHN0cmluZy5zcGxpdCgvXFxuKy8pO1xuICBjb25zdCBjbG9zdXJlcyA9IHN0cmluZyA9PiB7XG4gICAgY29uc3QgcGFpcnMgPSBzeW1ib2xzKHN0cmluZyk7XG4gICAgY29uc3QgYXJyYXkgPSBuZXcgQXJyYXkocGFpcnMubGVuZ3RoKTtcbiAgICBhcnJheS5wYWlycyA9IHBhaXJzO1xuICAgIGxldCBpID0gMDtcbiAgICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICAgIGNvbnN0IFtvcGVuZXIsIGNsb3Nlcl0gPSBwYWlyLnNwbGl0KCfigKYnKTtcbiAgICAgIGFycmF5WyhhcnJheVtpKytdID0gb3BlbmVyKV0gPSB7b3BlbmVyLCBjbG9zZXJ9O1xuICAgIH1cbiAgICBhcnJheS50b1N0cmluZyA9ICgpID0+IHN0cmluZztcbiAgICByZXR1cm4gYXJyYXk7XG4gIH07XG4gIGNvbnN0IHN5bWJvbHMgPSBzb3VyY2UgPT5cbiAgICAoc291cmNlICYmXG4gICAgICAoKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnICYmIHNvdXJjZS5zcGxpdCgvICsvKSkgfHxcbiAgICAgICAgKFN5bWJvbC5pdGVyYXRvciBpbiBzb3VyY2UgJiYgWy4uLnNvdXJjZV0pKSkgfHxcbiAgICBbXTtcbiAgc3ltYm9scy5mcm9tID0gKC4uLmFyZ3MpID0+IFsuLi5uZXcgU2V0KFtdLmNvbmNhdCguLi5hcmdzLm1hcChzeW1ib2xzKSkpXTtcblxuICAvLyBjb25zdCBMSU5FUyA9IC8oXFxuKS9nO1xuICBjb25zdCBMSU5FID0gLyQvZztcblxuICBDU1M6IHtcbiAgICBjb25zdCBjc3MgPSAoc3ludGF4ZXMuY3NzID0ge1xuICAgICAgLi4uKG1vZGVzLmNzcyA9IHtzeW50YXg6ICdjc3MnfSksXG4gICAgICBjb21tZW50czogY2xvc3VyZXMoJy8q4oCmKi8nKSxcbiAgICAgIGNsb3N1cmVzOiBjbG9zdXJlcygne+KApn0gKOKApikgW+KApl0nKSxcbiAgICAgIHF1b3Rlczogc3ltYm9scyhgJyBcImApLFxuICAgICAgYXNzaWduZXJzOiBzeW1ib2xzKGA6YCksXG4gICAgICBjb21iaW5hdG9yczogc3ltYm9scygnPiA6OiArIDonKSxcbiAgICAgIG5vbmJyZWFrZXJzOiBzeW1ib2xzKGAtYCksXG4gICAgICBicmVha2Vyczogc3ltYm9scygnLCA7JyksXG4gICAgICBwYXR0ZXJuczogey4uLnBhdHRlcm5zfSxcbiAgICAgIG1hdGNoZXI6IC8oW1xcc1xcbl0rKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXC9cXCp8XFwqXFwvfFxcKHxcXCl8XFxbfFxcXXxcInwnfFxce3xcXH18LHw7fFxcLnxcXGI6XFwvXFwvXFxifDo6XFxifDooPyFhY3RpdmV8YWZ0ZXJ8YW55fGFueS1saW5rfGJhY2tkcm9wfGJlZm9yZXxjaGVja2VkfGRlZmF1bHR8ZGVmaW5lZHxkaXJ8ZGlzYWJsZWR8ZW1wdHl8ZW5hYmxlZHxmaXJzdHxmaXJzdC1jaGlsZHxmaXJzdC1sZXR0ZXJ8Zmlyc3QtbGluZXxmaXJzdC1vZi10eXBlfGZvY3VzfGZvY3VzLXZpc2libGV8Zm9jdXMtd2l0aGlufGZ1bGxzY3JlZW58aG9zdHxob3Zlcnxpbi1yYW5nZXxpbmRldGVybWluYXRlfGludmFsaWR8bGFuZ3xsYXN0LWNoaWxkfGxhc3Qtb2YtdHlwZXxsZWZ0fGxpbmt8bWF0Y2hlc3xub3R8bnRoLWNoaWxkfG50aC1sYXN0LWNoaWxkfG50aC1sYXN0LW9mLXR5cGV8bnRoLW9mLXR5cGV8b25seS1jaGlsZHxvbmx5LW9mLXR5cGV8b3B0aW9uYWx8b3V0LW9mLXJhbmdlfHJlYWQtb25seXxyZXF1aXJlZHxyaWdodHxyb290fHNjb3BlfHRhcmdldHx2YWxpZHx2aXNpdGVkKSkvZyxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiBtYXRjaGVycy5lc2NhcGVzLFxuICAgICAgICBjb21tZW50OiBtYXRjaGVycy5jb21tZW50cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBIVE1MOiB7XG4gICAgY29uc3QgaHRtbCA9IChzeW50YXhlcy5odG1sID0ge1xuICAgICAgLi4uKG1vZGVzLmh0bWwgPSB7c3ludGF4OiAnaHRtbCd9KSxcbiAgICAgIGtleXdvcmRzOiBzeW1ib2xzKCdET0NUWVBFIGRvY3R5cGUnKSxcbiAgICAgIGNvbW1lbnRzOiBjbG9zdXJlcygnPCEtLeKApi0tPicpLFxuICAgICAgcXVvdGVzOiBbXSxcbiAgICAgIGNsb3N1cmVzOiBjbG9zdXJlcygnPCXigKYlPiA8IeKApj4gPOKApi8+IDwv4oCmPiA84oCmPicpLFxuICAgICAgcGF0dGVybnM6IHtcbiAgICAgICAgLi4ucGF0dGVybnMsXG4gICAgICAgIGNsb3NlVGFnOiAvPFxcL1xcd1tePD57fV0qPz4vZyxcbiAgICAgICAgbWF5YmVJZGVudGlmaWVyOiAvXig/Oig/OlthLXpdW1xcLWEtel0qKT9bYS16XStcXDopPyg/OlthLXpdW1xcLWEtel0qKT9bYS16XSskLyxcbiAgICAgIH0sXG4gICAgICBtYXRjaGVyOiBtYXRjaGVycy54bWwsXG4gICAgICBtYXRjaGVyczoge1xuICAgICAgICBxdW90ZTogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSl8XCJ8JykvZyxcbiAgICAgICAgY29tbWVudDogLyhcXG4pfCgtLT4pL2csXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAge1xuICAgICAgY29uc3QgRE9DVEFHUyA9IHN5bWJvbHMoJ1NDUklQVCBTVFlMRScpO1xuICAgICAgY29uc3QgVEFHID0gL15bYS16XSskL2k7XG4gICAgICAvLyBUT0RPOiBDaGVjayBpZiBjdXN0b20vbmFtZXNwYWNlIHRhZ3MgZXZlciBuZWVkIHNwZWNpYWwgY2xvc2UgbG9naWNcbiAgICAgIC8vIGNvbnN0IFRBR0xJS0UgPSAvXig/Oig/OlthLXpdW1xcLWEtel0qKT9bYS16XStcXDopPyg/OlthLXpdW1xcLWEtel0qKT9bYS16XSskL2k7XG5cblxuICAgICAgaHRtbC5jbG9zdXJlc1snPCddLmNsb3NlID0gKG5leHQsIHN0YXRlLCBjb250ZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IG5leHQgJiYgbmV4dC5wYXJlbnQ7XG4gICAgICAgIGNvbnN0IGZpcnN0ID0gcGFyZW50ICYmIHBhcmVudC5uZXh0O1xuICAgICAgICBjb25zdCB0YWcgPSBmaXJzdCAmJiBmaXJzdC50ZXh0ICYmIFRBRy50ZXN0KGZpcnN0LnRleHQpICYmIGZpcnN0LnRleHQudG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiAodGFnICYmIERPQ1RBR1MuaW5jbHVkZXModGFnKSkge1xuICAgICAgICAgIC8vIFRPRE86IFVuY29tbWVudCBvbmNlIHRva2VuIGJ1ZmZlcmluZyBpcyBpbXBsZW1lbnRlZFxuICAgICAgICAgIC8vIHRhZyAmJiAoZmlyc3QudHlwZSA9ICdrZXl3b3JkJyk7XG5cbiAgICAgICAgICBsZXQge3NvdXJjZSwgaW5kZXh9ID0gc3RhdGU7XG4gICAgICAgICAgY29uc3QgJCRtYXRjaGVyID0gc3ludGF4ZXMuaHRtbC5wYXR0ZXJucy5jbG9zZVRhZztcblxuICAgICAgICAgIGxldCBtYXRjaDsgLy8gID0gJCRtYXRjaGVyLmV4ZWMoc291cmNlKTtcbiAgICAgICAgICAkJG1hdGNoZXIubGFzdEluZGV4ID0gaW5kZXg7XG5cbiAgICAgICAgICAvLyBUT0RPOiBDaGVjayBpZiBgPHNjcmlwdD5g4oCmYDwvU0NSSVBUPmAgaXMgc3RpbGwgdmFsaWQhXG4gICAgICAgICAgY29uc3QgJCRjbG9zZXIgPSBuZXcgUmVnRXhwKHJhd2BePFxcLyg/OiR7Zmlyc3QudGV4dC50b0xvd2VyQ2FzZSgpfXwke3RhZ30pXFxiYCk7XG5cbiAgICAgICAgICBsZXQgc3ludGF4ID0gKHRhZyA9PT0gJ1NUWUxFJyAmJiAnY3NzJykgfHwgJyc7XG5cbiAgICAgICAgICBpZiAoIXN5bnRheCkge1xuICAgICAgICAgICAgY29uc3Qgb3BlblRhZyA9IHNvdXJjZS5zbGljZShwYXJlbnQub2Zmc2V0LCBpbmRleCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC9cXHN0eXBlPS4qP1xcYiguKz8pXFxiLy5leGVjKG9wZW5UYWcpO1xuICAgICAgICAgICAgc3ludGF4ID1cbiAgICAgICAgICAgICAgdGFnID09PSAnU0NSSVBUJyAmJiAoIW1hdGNoIHx8ICFtYXRjaFsxXSB8fCAvXm1vZHVsZSR8amF2YXNjcmlwdC9pLnRlc3QobWF0Y2hbMV0pKVxuICAgICAgICAgICAgICAgID8gJ2VzJ1xuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7c3ludGF4LCB0YWcsIG1hdGNoLCBvcGVuVGFnfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgd2hpbGUgKChtYXRjaCA9ICQkbWF0Y2hlci5leGVjKHNvdXJjZSkpKSB7XG4gICAgICAgICAgICBpZiAoJCRjbG9zZXIudGVzdChtYXRjaFswXSkpIHtcbiAgICAgICAgICAgICAgaWYgKHN5bnRheCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7b2Zmc2V0OiBpbmRleCwgaW5kZXg6IG1hdGNoLmluZGV4LCBzeW50YXh9O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBzb3VyY2Uuc2xpY2Uob2Zmc2V0LCBtYXRjaC5pbmRleCAtIDEpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmluZGV4ID0gbWF0Y2guaW5kZXg7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt7dGV4dCwgb2Zmc2V0LCBwcmV2aW91czogbmV4dCwgcGFyZW50fV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfTtcbiAgICAgIGh0bWwuY2xvc3VyZXNbJzwnXS5xdW90ZXMgPSBzeW1ib2xzKGAnIFwiYCk7XG4gICAgICBodG1sLmNsb3N1cmVzWyc8J10uY2xvc2VyID0gL1xcLz8+LztcblxuICAgICAgLy8gVE9ETzogQWxsb3cgZ3JvdXBpbmctbGV2ZWwgcGF0dGVybnMgZm9yIEhUTUwgYXR0cmlidXRlcyB2cyB0ZXh0XG4gICAgICAvLyBodG1sLmNsb3N1cmVzWyc8J10ucGF0dGVybnMgPSB7IG1heWJlSWRlbnRpZmllcjogVEFHTElLRSB9O1xuICAgIH1cbiAgfVxuXG4gIE1hcmtkb3duOiB7XG4gICAgY29uc3QgQkxPQ0sgPSAnYGBg4oCmYGBgIH5+fuKApn5+fic7XG4gICAgY29uc3QgSU5MSU5FID0gJ1vigKZdICjigKYpICrigKYqICoq4oCmKiogX+KApl8gX1/igKZfXyB+4oCmfiB+fuKApn5+JztcbiAgICAvKipcbiAgICAgKiBUT0RPOiBBZGRyZXNzIHVuZXhwZWN0ZWQgY2xvc3VyZXMgaW4gcGFyc2luZyBmcmFnbWVudGVyXG4gICAgICpcbiAgICAgKiBBcyBmYXIgYXMgdG9rZW5pemF0aW9uIGdvZXMsIHVuZXhwZWN0ZWQgY2xvc3VyZXMgYXJlIHN0aWxsXG4gICAgICogY2xvc3VyZXMgbm9uZXRoZWxlc3MuIFRoZXkgYXJlIG5vdCBzcGFucy5cbiAgICAgKi9cbiAgICBjb25zdCBTUEFOUyA9ICcnOyAvLyBJTkxJTkVcbiAgICBjb25zdCBDTE9TVVJFUyA9IFNQQU5TID8gQkxPQ0sgOiBgJHtCTE9DS30gJHtJTkxJTkV9YDtcblxuICAgIGNvbnN0IGh0bWwgPSBzeW50YXhlcy5odG1sO1xuICAgIGNvbnN0IG1kID0gKHN5bnRheGVzLm1kID0ge1xuICAgICAgLi4uKG1vZGVzLm1hcmtkb3duID0gbW9kZXMubWQgPSB7c3ludGF4OiAnbWQnfSksXG4gICAgICBjb21tZW50czogY2xvc3VyZXMoJzwhLS3igKYtLT4nKSxcbiAgICAgIHF1b3RlczogW10sXG4gICAgICBjbG9zdXJlczogY2xvc3VyZXMoYCR7aHRtbC5jbG9zdXJlc30gJHtDTE9TVVJFU31gKSxcbiAgICAgIHBhdHRlcm5zOiB7Li4uaHRtbC5wYXR0ZXJuc30sXG4gICAgICBtYXRjaGVyOiAvKF5cXHMrfFxcbil8KCYjeD9bYS1mMC05XSs7fCZbYS16XSs7fCg/OmBgYCt8XFx+XFx+XFx+K3wtLSt8PT0rfCg/OlxcI3sxLDZ9fFxcLXxcXGJcXGQrXFwufFxcYlthLXpdXFwufFxcYltpdnhdK1xcLikoPz1cXHMrXFxTKykpfFwifCd8PXxcXC8+fDwlfCU+fDwhLS18LS0+fDxbXFwvXFwhXT8oPz1bYS16XStcXDo/W2EtelxcLV0qW2Etel18W2Etel0rKXw8fD58XFwofFxcKXxcXFt8XFxdfF9fP3woWyp+YF0pXFwzP1xcYnxcXGIoWyp+YF0pXFw0Pyl8XFxiW15cXG5cXHNcXFtcXF1cXChcXClcXDxcXD4mXSpbXlxcblxcc1xcW1xcXVxcKFxcKVxcPFxcPiZfXVxcYnxbXlxcblxcc1xcW1xcXVxcKFxcKVxcPFxcPiZdKyg/PV9fP1xcYikvZ2ltLFxuICAgICAgc3BhbnM6IHVuZGVmaW5lZCxcbiAgICAgIG1hdGNoZXJzOiB7Y29tbWVudDogLyhcXG4pfCgtLT4pL2d9LFxuICAgIH0pO1xuXG4gICAgLy8gbWQucGF0dGVybnMubWF5YmVJZGVudGlmaWVyID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKFNQQU5TKSB7XG4gICAgICBtZC5zcGFucyA9IHttZDogY2xvc3VyZXMoU1BBTlMpfTtcbiAgICAgIGNvbnN0IHNwYW5zID0gU1BBTlMuc3BsaXQoJyAnKTtcbiAgICAgIGZvciAoY29uc3QgW29wZW5lcl0gb2YgbWQuc3BhbnMubWQpIHtcbiAgICAgICAgY29uc3Qgc3Vic3BhbnMgPSBzcGFucy5maWx0ZXIoc3BhbiA9PiAhc3Bhbi5zdGFydHNXaXRoKG9wZW5lcikpO1xuICAgICAgICBtZC5zcGFuc1tvcGVuZXJdID0gY2xvc3VyZXMoc3Vic3BhbnMuam9pbignICcpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobWQuY2xvc3VyZXMpIHtcbiAgICAgIG1kLmNsb3N1cmVzWyc8J10gPSB7Li4uaHRtbC5jbG9zdXJlc1snPCddfTtcblxuICAgICAgY29uc3QgU1lOVEFYID0gL15cXHcrJC87XG5cbiAgICAgIGNvbnN0IHByZXZpb3VzVGV4dEZyb20gPSAodG9rZW4sIG1hdGNoZXIpID0+IHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFtdO1xuICAgICAgICBpZiAobWF0Y2hlciAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKG1hdGNoZXIudGVzdClcbiAgICAgICAgICAgIGRvIHRva2VuLnRleHQgJiYgdGV4dC5wdXNoKHRva2VuLnRleHQpLCAodG9rZW4gPSB0b2tlbi5wcmV2aW91cyk7XG4gICAgICAgICAgICB3aGlsZSAoIXRva2VuLnRleHQgfHwgIW1hdGNoZXIudGVzdCh0b2tlbi50ZXh0KSk7XG4gICAgICAgICAgZWxzZSBpZiAobWF0Y2hlci5pbmNsdWRlcylcbiAgICAgICAgICAgIGRvIHRva2VuLnRleHQgJiYgdGV4dC5wdXNoKHRva2VuLnRleHQpLCAodG9rZW4gPSB0b2tlbi5wcmV2aW91cyk7XG4gICAgICAgICAgICB3aGlsZSAoIXRva2VuLnRleHQgfHwgIW1hdGNoZXIuaW5jbHVkZXModG9rZW4udGV4dCkpO1xuICAgICAgICAgIHRleHQubGVuZ3RoICYmIHRleHQucmV2ZXJzZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0ZXh0LmpvaW4oJycpO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgaW5kZW50ZXIgPSAoaW5kZW50aW5nLCB0YWJzID0gMikgPT4ge1xuICAgICAgICBsZXQgc291cmNlID0gaW5kZW50aW5nO1xuICAgICAgICBjb25zdCBpbmRlbnQgPSBuZXcgUmVnRXhwKHJhd2AoPzpcXHR8JHsnICcucmVwZWF0KHRhYnMpfSlgLCAnZycpO1xuICAgICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgvXFxcXD8oPz1bXFwoXFwpXFw6XFw/XFxbXFxdXSkvZywgJ1xcXFwnKTtcbiAgICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoaW5kZW50LCBpbmRlbnQuc291cmNlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4ke3NvdXJjZX1gLCAnbScpO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgRU1CRURERUQgPSB0cnVlO1xuICAgICAgY29uc3Qgb3BlbiA9IChwYXJlbnQsIHN0YXRlLCBncm91cGVyKSA9PiB7XG4gICAgICAgIGNvbnN0IHtzb3VyY2UsIGluZGV4OiBzdGFydH0gPSBzdGF0ZTtcbiAgICAgICAgY29uc3QgZmVuY2UgPSBwYXJlbnQudGV4dDtcbiAgICAgICAgY29uc3QgZmVuY2luZyA9IHByZXZpb3VzVGV4dEZyb20ocGFyZW50LCAnXFxuJyk7XG4gICAgICAgIGNvbnN0IGluZGVudGluZyA9IGZlbmNpbmcuc2xpY2UoZmVuY2luZy5pbmRleE9mKCdcXG4nKSArIDEsIC1mZW5jZS5sZW5ndGgpIHx8ICcnO1xuICAgICAgICBsZXQgZW5kID0gc291cmNlLmluZGV4T2YoYFxcbiR7ZmVuY2luZ31gLCBzdGFydCk7XG4gICAgICAgIGNvbnN0IElOREVOVCA9IGluZGVudGVyKGluZGVudGluZyk7XG4gICAgICAgIGNvbnN0IENMT1NFUiA9IG5ldyBSZWdFeHAocmF3YFxcbiR7SU5ERU5ULnNvdXJjZS5zbGljZSgxKX0ke2ZlbmNlfWAsICdnJyk7XG5cbiAgICAgICAgQ0xPU0VSLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgICAgICBsZXQgY2xvc2VyTWF0Y2ggPSBDTE9TRVIuZXhlYyhzb3VyY2UpO1xuICAgICAgICBpZiAoY2xvc2VyTWF0Y2ggJiYgY2xvc2VyTWF0Y2guaW5kZXggPj0gc3RhcnQpIHtcbiAgICAgICAgICBlbmQgPSBjbG9zZXJNYXRjaC5pbmRleCArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgRkVOQ0UgPSBuZXcgUmVnRXhwKHJhd2BcXG4/W1xcPlxcfFxcc10qJHtmZW5jZX1gLCAnZycpO1xuICAgICAgICAgIEZFTkNFLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgICAgICAgIGNvbnN0IGZlbmNlTWF0Y2ggPSBGRU5DRS5leGVjKHNvdXJjZSk7XG4gICAgICAgICAgaWYgKGZlbmNlTWF0Y2ggJiYgZmVuY2VNYXRjaC5pbmRleCA+PSBzdGFydCkge1xuICAgICAgICAgICAgZW5kID0gZmVuY2VNYXRjaC5pbmRleCArIDE7XG4gICAgICAgICAgfSBlbHNlIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbmQgPiBzdGFydCkge1xuICAgICAgICAgIGxldCBvZmZzZXQgPSBzdGFydDtcbiAgICAgICAgICBsZXQgdGV4dDtcblxuICAgICAgICAgIGNvbnN0IGJvZHkgPSBzb3VyY2Uuc2xpY2Uoc3RhcnQsIGVuZCkgfHwgJyc7XG4gICAgICAgICAgY29uc3QgdG9rZW5zID0gW107XG4gICAgICAgICAgdG9rZW5zLmVuZCA9IGVuZDtcbiAgICAgICAgICBpZiAoIUVNQkVEREVEKSB7XG4gICAgICAgICAgICB0ZXh0ID0gYm9keTtcbiAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0LCB0eXBlOiAnY29kZScsIG9mZnNldCwgcGFyZW50fSk7XG4gICAgICAgICAgICBvZmZzZXQgKz0gYm9keS5sZW5ndGg7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IFtoZWFkLCAuLi5saW5lc10gPSBib2R5LnNwbGl0KC8oXFxuKS9nKTtcbiAgICAgICAgICAgIGlmIChoZWFkKSB7XG4gICAgICAgICAgICAgIC8vIGNvbnN0IFssIHN5bnRheCwgYXR0cmlidXRlc10gPSAvXihcXHcuKlxcYik/XFxzKiguKilcXHMqJC8uZXhlYyhoZWFkKTtcbiAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQ6IGhlYWQsIHR5cGU6ICdjb21tZW50Jywgb2Zmc2V0LCBwYXJlbnR9KSwgKG9mZnNldCArPSBoZWFkLmxlbmd0aCk7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHtoZWFkLCBsaW5lcywgaW5kZW50aW5nLCBJTkRFTlR9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICAgICAgICBjb25zdCBbaW5kZW50XSA9IElOREVOVC5leGVjKGxpbmUpIHx8ICcnO1xuICAgICAgICAgICAgICBjb25zdCBpbnNldCA9IChpbmRlbnQgJiYgaW5kZW50Lmxlbmd0aCkgfHwgMDtcbiAgICAgICAgICAgICAgaWYgKGluc2V0KSB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0ZXh0IG9mIGluZGVudC5zcGxpdCgvKFxccyspL2cpKSB7XG4gICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gKHRleHQudHJpbSgpICYmICdzZXF1ZW5jZScpIHx8ICd3aGl0ZXNwYWNlJztcbiAgICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0LCB0eXBlLCBvZmZzZXQsIHBhcmVudH0pO1xuICAgICAgICAgICAgICAgICAgb2Zmc2V0ICs9IHRleHQubGVuZ3RoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0ZXh0ID0gbGluZS5zbGljZShpbnNldCk7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGV4dCA9IGxpbmU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQsIHR5cGU6ICdjb2RlJywgb2Zmc2V0LCBwYXJlbnR9KSwgKG9mZnNldCArPSB0ZXh0Lmxlbmd0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHtmZW5jaW5nLCBib2R5LCBzdGFydCwgZW5kLCBvZmZzZXQsIGxpbmVzLCB0b2tlbnN9KTtcbiAgICAgICAgICBpZiAodG9rZW5zLmxlbmd0aCkgcmV0dXJuIHRva2VucztcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgbWQuY2xvc3VyZXNbJ2BgYCddLm9wZW4gPSBtZC5jbG9zdXJlc1snfn5+J10ub3BlbiA9IG9wZW47XG5cbiAgICAgIGlmIChtZC5jbG9zdXJlc1snYGBgJ10gJiYgIW1kLmNsb3N1cmVzWydgYGAnXS5vcGVuKSB7XG4gICAgICAgIG1kLmNsb3N1cmVzWydgYGAnXS5xdW90ZXMgPSBodG1sLmNsb3N1cmVzWyc8J10ucXVvdGVzO1xuICAgICAgICBtZC5jbG9zdXJlc1snYGBgJ10ubWF0Y2hlciA9IC8oXFxzKlxcbil8KGBgYCg/PWBgYFxcc3xgYGAkKXxeKD86W1xccz58XSpcXHMpP1xccyopfC4qJC9nbTtcbiAgICAgIH1cblxuICAgICAgaWYgKG1kLmNsb3N1cmVzWyd+fn4nXSAmJiAhbWQuY2xvc3VyZXNbJ35+fiddLm9wZW4pIHtcbiAgICAgICAgbWQuY2xvc3VyZXNbJ35+fiddLnF1b3RlcyA9IGh0bWwuY2xvc3VyZXNbJzwnXS5xdW90ZXM7XG4gICAgICAgIG1kLmNsb3N1cmVzWyd+fn4nXS5tYXRjaGVyID0gLyhcXHMqXFxuKXwofn5+KD89fn5+XFxzfH5+fiQpfF4oPzpbXFxzPnxdKlxccyk/XFxzKil8LiokL2dtO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGNvbnNvbGUubG9nKG1kKTtcbiAgfVxuXG4gIEVDTUFTY3JpcHQ6IHtcbiAgICBjb25zdCBSRUdFWFBTID0gL1xcLyg/PVteXFwqXFwvXFxuXVteXFxuXSpcXC8pKD86W15cXFxcXFwvXFxuXFx0XFxbXSt8XFxcXFxcU3xcXFsoPzpcXFxcXFxTfFteXFxcXFxcblxcdFxcXV0rKSs/XFxdKSs/XFwvW2Etel0qL2c7XG4gICAgY29uc3QgQ09NTUVOVFMgPSAvXFwvXFwvfFxcL1xcKnxcXCpcXC98XFwvfF5cXCNcXCEuKlxcbi9nO1xuICAgIGNvbnN0IFFVT1RFUyA9IC9gfFwifCcvZztcbiAgICBjb25zdCBDTE9TVVJFUyA9IC9cXHt8XFx9fFxcKHxcXCl8XFxbfFxcXS9nO1xuXG4gICAgY29uc3QgZXMgPSAoc3ludGF4ZXMuZXMgPSB7XG4gICAgICAuLi4obW9kZXMuamF2YXNjcmlwdCA9IG1vZGVzLmVzID0gbW9kZXMuanMgPSBtb2Rlcy5lY21hc2NyaXB0ID0ge3N5bnRheDogJ2VzJ30pLFxuICAgICAgY29tbWVudHM6IGNsb3N1cmVzKCcvL+KAplxcbiAvKuKApiovJyksXG4gICAgICBxdW90ZXM6IHN5bWJvbHMoYCcgXCIgXFxgYCksXG4gICAgICBjbG9zdXJlczogY2xvc3VyZXMoJ3vigKZ9ICjigKYpIFvigKZdJyksXG4gICAgICBzcGFuczogeydgJzogY2xvc3VyZXMoJyR74oCmfScpfSxcbiAgICAgIGtleXdvcmRzOiBzeW1ib2xzKFxuICAgICAgICAvLyBhYnN0cmFjdCBlbnVtIGludGVyZmFjZSBwYWNrYWdlICBuYW1lc3BhY2UgZGVjbGFyZSB0eXBlIG1vZHVsZVxuICAgICAgICAnYXJndW1lbnRzIGFzIGFzeW5jIGF3YWl0IGJyZWFrIGNhc2UgY2F0Y2ggY2xhc3MgY29uc3QgY29udGludWUgZGVidWdnZXIgZGVmYXVsdCBkZWxldGUgZG8gZWxzZSBleHBvcnQgZXh0ZW5kcyBmaW5hbGx5IGZvciBmcm9tIGZ1bmN0aW9uIGdldCBpZiBpbXBvcnQgaW4gaW5zdGFuY2VvZiBsZXQgbmV3IG9mIHJldHVybiBzZXQgc3VwZXIgc3dpdGNoIHRoaXMgdGhyb3cgdHJ5IHR5cGVvZiB2YXIgdm9pZCB3aGlsZSB3aXRoIHlpZWxkJyxcbiAgICAgICksXG4gICAgICBhc3NpZ25lcnM6IHN5bWJvbHMoJz0gKz0gLT0gKj0gLz0gKio9ICU9IHw9IF49ICY9IDw8PSA+Pj0gPj4+PScpLFxuICAgICAgY29tYmluYXRvcnM6IHN5bWJvbHMoJz49IDw9ID09ID09PSAhPSAhPT0gfHwgJiYgISAmIHwgPiA8ID0+ICUgKyAtICoqICogLyA+PiA8PCA+Pj4gPyA6JyksXG4gICAgICBub25icmVha2Vyczogc3ltYm9scygnLicpLFxuICAgICAgb3BlcmF0b3JzOiBzeW1ib2xzKCcrKyAtLSAhISBeIH4gISAuLi4nKSxcbiAgICAgIGJyZWFrZXJzOiBzeW1ib2xzKCcsIDsnKSxcbiAgICAgIHBhdHRlcm5zOiB7Li4ucGF0dGVybnN9LFxuICAgICAgbWF0Y2hlcjogc2VxdWVuY2VgKFtcXHNcXG5dKyl8KCR7YWxsKFxuICAgICAgICBSRUdFWFBTLFxuICAgICAgICByYXdgXFwvPWAsXG4gICAgICAgIENPTU1FTlRTLFxuICAgICAgICBRVU9URVMsXG4gICAgICAgIENMT1NVUkVTLFxuICAgICAgICAvLHw7fFxcLlxcLlxcLnxcXC58XFw6fFxcP3w9Pi8sXG4gICAgICAgIC8hPT18PT09fD09fD0vLFxuICAgICAgICAuLi5zeW1ib2xzKHJhd2BcXCsgXFwtIFxcKiAmIFxcfGApLm1hcChzID0+IGAke3N9JHtzfXwke3N9PXwke3N9YCksXG4gICAgICAgIC4uLnN5bWJvbHMocmF3YCEgXFwqXFwqICUgPDwgPj4gPj4+IDwgPiBcXF4gfmApLm1hcChzID0+IGAke3N9PXwke3N9YCksXG4gICAgICApfSlgLFxuICAgICAgbWF0Y2hlcnM6IHtcbiAgICAgICAgcXVvdGU6IC8oXFxuKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xgfFwifCd8XFwkXFx7KS9nLFxuICAgICAgICAvLyBxdW90ZTogLyhcXG4pfChgfFwifCd8XFwkXFx7KXwoXFxcXC4pL2csXG4gICAgICAgIC8vIHF1b3RlOiAvKFxcbil8KGB8XCJ8J3xcXCRcXHspfChcXFxcLikvZyxcbiAgICAgICAgLy8gXCInXCI6IC8oXFxuKXwoJyl8KFxcXFwuKS9nLFxuICAgICAgICAvLyAnXCInOiAvKFxcbil8KFwiKXwoXFxcXC4pL2csXG4gICAgICAgIC8vICdgJzogLyhcXG4pfChgfFxcJFxceyl8KFxcXFwuKS9nLFxuICAgICAgICBjb21tZW50OiBtYXRjaGVycy5jb21tZW50cyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBFQ01BU2NyaXB0RXh0ZW5zaW9uczoge1xuICAgICAgLy8gY29uc3QgSEFTSEJBTkcgPSAvXlxcI1xcIS4qXFxuL2c7IC8vIFteXSA9PT0gKD86LipcXG4pXG4gICAgICAvLyBUT0RPOiBVbmRvICQgbWF0Y2hpbmcgb25jZSBmaXhlZFxuICAgICAgY29uc3QgUVVPVEVTID0gL2B8XCIoPzpbXlxcXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnKD86W15cXFxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG4gICAgICBjb25zdCBDT01NRU5UUyA9IC9cXC9cXC8uKig/OlxcbnwkKXxcXC9cXCpbXl0qPyg/OlxcKlxcL3wkKXxeXFwjXFwhLipcXG4vZzsgLy8gW15dID09PSAoPzouKlxcbilcbiAgICAgIGNvbnN0IFNUQVRFTUVOVFMgPSBhbGwoUVVPVEVTLCBDTE9TVVJFUywgUkVHRVhQUywgQ09NTUVOVFMpO1xuICAgICAgY29uc3QgQkxPQ0tMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBUT1BMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBDTE9TVVJFID0gc2VxdWVuY2VgKFxcbispfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBFU00gPSBzZXF1ZW5jZWAke1RPUExFVkVMfXxcXGJleHBvcnRcXGJ8XFxiaW1wb3J0XFxiYDtcbiAgICAgIGNvbnN0IENKUyA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJtb2R1bGUuZXhwb3J0c1xcYnxcXGJyZXF1aXJlXFxiYDtcbiAgICAgIGNvbnN0IEVTWCA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJpbXBvcnRcXGJ8XFxibW9kdWxlLmV4cG9ydHNcXGJ8XFxicmVxdWlyZVxcYmA7XG5cbiAgICAgIGNvbnN0IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc30gPSBlcztcbiAgICAgIGNvbnN0IHN5bnRheCA9IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc307XG4gICAgICBjb25zdCBtYXRjaGVycyA9IHt9O1xuICAgICAgKHtxdW90ZTogbWF0Y2hlcnMucXVvdGV9ID0gZXMubWF0Y2hlcnMpO1xuXG4gICAgICBjb25zdCBlc20gPSAoc3ludGF4ZXMuZXNtID0ge1xuICAgICAgICAuLi4obW9kZXMuZXNtID0ge3N5bnRheDogJ2VzbSd9KSxcbiAgICAgICAga2V5d29yZHM6IHN5bWJvbHMoJ2ltcG9ydCBleHBvcnQgZGVmYXVsdCcpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IEVTTSxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogQ0xPU1VSRX0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGNqcyA9IChzeW50YXhlcy5janMgPSB7XG4gICAgICAgIC4uLihtb2Rlcy5janMgPSB7c3ludGF4OiAnY2pzJ30pLFxuICAgICAgICBrZXl3b3Jkczogc3ltYm9scygnaW1wb3J0IG1vZHVsZSBleHBvcnRzIHJlcXVpcmUnKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBDSlMsXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IENKU30sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGVzeCA9IChzeW50YXhlcy5lc3ggPSB7XG4gICAgICAgIC4uLihtb2Rlcy5lc3ggPSB7c3ludGF4OiAnZXN4J30pLFxuICAgICAgICBrZXl3b3Jkczogc3ltYm9scy5mcm9tKGVzbS5rZXl3b3JkcywgY2pzLmtleXdvcmRzKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBFU1gsXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IEVTWH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuLy8vIEJvb3RzdHJhcFxuZXhwb3J0IGNvbnN0IHJlYWR5ID0gKGFzeW5jICgpID0+IHtcbiAgYXdhaXQgZW50aXRpZXMucmVhZHk7XG4gIHN5bnRheGVzLmVzLnBhdHRlcm5zLm1heWJlSWRlbnRpZmllciA9IGlkZW50aWZpZXIoXG4gICAgZW50aXRpZXMuZXMuSWRlbnRpZmllclN0YXJ0LFxuICAgIGVudGl0aWVzLmVzLklkZW50aWZpZXJQYXJ0LFxuICApO1xuICAvLyBjb25zb2xlLmxvZyh7bWF5YmVJZGVudGlmaWVyOiBgJHtzeW50YXhlcy5lcy5wYXR0ZXJucy5tYXliZUlkZW50aWZpZXJ9YH0pO1xufSkoKTtcblxuLy8gY29uc3QgUVVPVEVTID0gL2B8XCJcXFwiXCJ8XCJcInxcIig/OlteXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnXFwnJ3wnJ3woPzpbXlxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG4vLyBjb25zdCBRVU9URVMgPSAvYHxcIlwifFwiKD86LipcXFxcLnwuKj8pKj8oPzpcInwkKXwnJ3wnKD86W15cXFxcXSp8XFxcXC4pKig/Oid8JCkvZztcbi8vIGNvbnN0IFFVT1RFUyA9IC9gfFwiKD86XFxcXFwifFteXFxcXFwiXSopKig/OlwifCQpfCcoPzpcXFxcLj98W15cXFxcJ10rKSooPzonfCQpfFwifCcvZztcbi8vIGNvbnN0IFFVT1RFUyA9IC9gfFwiKD86XFxcXC4/fFteXFxcXF0qPykqPyg/OlwifCQpfCcoPzpcXFxcLj98W15cXFxcJ10qPykqPyg/Oid8JCkvZztcbiIsImNvbnN0IHthc3NpZ24sIGRlZmluZVByb3BlcnR5fSA9IE9iamVjdDtcblxuZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gdm9pZCBudWxsO1xuXG5leHBvcnQgY2xhc3MgTm9kZSB7XG4gIGdldCBjaGlsZHJlbigpIHtcbiAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkodGhpcywgJ2NoaWxkcmVuJywge3ZhbHVlOiBuZXcgU2V0KCl9KS5jaGlsZHJlbjtcbiAgfVxuICBnZXQgY2hpbGRFbGVtZW50Q291bnQoKSB7XG4gICAgcmV0dXJuICh0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSkgfHwgMDtcbiAgfVxuICBnZXQgdGV4dENvbnRlbnQoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICh0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSAmJiBbLi4udGhpcy5jaGlsZHJlbl0uam9pbignJykpIHx8ICcnXG4gICAgKTtcbiAgfVxuICBzZXQgdGV4dENvbnRlbnQodGV4dCkge1xuICAgIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplICYmIHRoaXMuY2hpbGRyZW4uY2xlYXIoKTtcbiAgICB0ZXh0ICYmIHRoaXMuY2hpbGRyZW4uYWRkKG5ldyBTdHJpbmcodGV4dCkpO1xuICB9XG4gIGFwcGVuZENoaWxkKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmFkZChlbGVtZW50KSwgZWxlbWVudDtcbiAgfVxuICBhcHBlbmQoLi4uZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGVsZW1lbnQgJiYgdGhpcy5jaGlsZHJlbi5hZGQoZWxlbWVudCk7XG4gIH1cbiAgcmVtb3ZlQ2hpbGQoZWxlbWVudCkge1xuICAgIGVsZW1lbnQgJiZcbiAgICAgIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiZcbiAgICAgIHRoaXMuY2hpbGRyZW4uc2l6ZSAmJlxuICAgICAgdGhpcy5jaGlsZHJlbi5kZWxldGUoZWxlbWVudCk7XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cbiAgcmVtb3ZlKC4uLmVsZW1lbnRzKSB7XG4gICAgaWYgKGVsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSlcbiAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmRlbGV0ZShlbGVtZW50KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRWxlbWVudCBleHRlbmRzIE5vZGUge1xuICBnZXQgaW5uZXJIVE1MKCkge1xuICAgIHJldHVybiB0aGlzLnRleHRDb250ZW50O1xuICB9XG4gIHNldCBpbm5lckhUTUwodGV4dCkge1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB9XG4gIGdldCBvdXRlckhUTUwoKSB7XG4gICAgY29uc3Qge2NsYXNzTmFtZSwgdGFnLCBpbm5lckhUTUx9ID0gdGhpcztcbiAgICByZXR1cm4gYDwke3RhZ30keyhjbGFzc05hbWUgJiYgYCBjbGFzcz1cIiR7Y2xhc3NOYW1lfVwiYCkgfHwgJyd9PiR7aW5uZXJIVE1MIHx8ICcnfTwvJHt0YWd9PmA7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMub3V0ZXJIVE1MO1xuICB9XG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEb2N1bWVudEZyYWdtZW50IGV4dGVuZHMgTm9kZSB7XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnRleHRDb250ZW50O1xuICB9XG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gKHRoaXMuY2hpbGRFbGVtZW50Q291bnQgJiYgWy4uLnRoaXMuY2hpbGRyZW5dKSB8fCBbXTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICByZXR1cm4gKCh0aGlzLmNoaWxkRWxlbWVudENvdW50ICYmIHRoaXMuY2hpbGRyZW4pIHx8ICcnKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRleHQgZXh0ZW5kcyBTdHJpbmcge1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gZW5jb2RlRW50aXRpZXMoc3VwZXIudG9TdHJpbmcoKSk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUVsZW1lbnQgPSAodGFnLCBwcm9wZXJ0aWVzLCAuLi5jaGlsZHJlbikgPT4ge1xuICBjb25zdCBlbGVtZW50ID0gYXNzaWduKG5ldyBFbGVtZW50KCksIHtcbiAgICB0YWcsXG4gICAgY2xhc3NOYW1lOiAocHJvcGVydGllcyAmJiBwcm9wZXJ0aWVzLmNsYXNzTmFtZSkgfHwgJycsXG4gICAgcHJvcGVydGllcyxcbiAgfSk7XG4gIGNoaWxkcmVuLmxlbmd0aCAmJiBkZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnY2hpbGRyZW4nLCB7dmFsdWU6IG5ldyBTZXQoY2hpbGRyZW4pfSk7XG4gIHJldHVybiBlbGVtZW50O1xufTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVRleHQgPSAoY29udGVudCA9ICcnKSA9PiBuZXcgVGV4dChjb250ZW50KTtcbmV4cG9ydCBjb25zdCBlbmNvZGVFbnRpdHkgPSBlbnRpdHkgPT4gYCYjJHtlbnRpdHkuY2hhckNvZGVBdCgwKX07YDtcbmV4cG9ydCBjb25zdCBlbmNvZGVFbnRpdGllcyA9IHN0cmluZyA9PiBzdHJpbmcucmVwbGFjZSgvW1xcdTAwQTAtXFx1OTk5OTw+XFwmXS9naW0sIGVuY29kZUVudGl0eSk7XG5leHBvcnQgY29uc3QgY3JlYXRlRnJhZ21lbnQgPSAoKSA9PiBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuIiwiZXhwb3J0IGNvbnN0IHtkb2N1bWVudCwgRWxlbWVudCwgTm9kZSwgVGV4dCwgRG9jdW1lbnRGcmFnbWVudH0gPVxuICAnb2JqZWN0JyA9PT0gdHlwZW9mIHNlbGYgJiYgKHNlbGYgfHwgMCkud2luZG93ID09PSBzZWxmICYmIHNlbGY7XG5cbmV4cG9ydCBjb25zdCB7Y3JlYXRlRWxlbWVudCwgY3JlYXRlVGV4dCwgY3JlYXRlRnJhZ21lbnR9ID0ge1xuICBjcmVhdGVFbGVtZW50OiAodGFnLCBwcm9wZXJ0aWVzLCAuLi5jaGlsZHJlbikgPT4ge1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgcHJvcGVydGllcyAmJiBPYmplY3QuYXNzaWduKGVsZW1lbnQsIHByb3BlcnRpZXMpO1xuICAgIGlmICghY2hpbGRyZW4ubGVuZ3RoKSByZXR1cm4gZWxlbWVudDtcbiAgICBpZiAoZWxlbWVudC5hcHBlbmQpIHtcbiAgICAgIHdoaWxlIChjaGlsZHJlbi5sZW5ndGggPiA1MDApIGVsZW1lbnQuYXBwZW5kKC4uLmNoaWxkcmVuLnNwbGljZSgwLCA1MDApKTtcbiAgICAgIGNoaWxkcmVuLmxlbmd0aCAmJiBlbGVtZW50LmFwcGVuZCguLi5jaGlsZHJlbik7XG4gICAgfSBlbHNlIGlmIChlbGVtZW50LmFwcGVuZENoaWxkKSB7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cbiAgY3JlYXRlVGV4dDogKGNvbnRlbnQgPSAnJykgPT4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY29udGVudCksXG5cbiAgY3JlYXRlRnJhZ21lbnQ6ICgpID0+IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxcbn07XG4iLCJpbXBvcnQgKiBhcyBwc2V1ZG8gZnJvbSAnLi9saWIvcHNldWRvLmpzJztcbmltcG9ydCAqIGFzIGRvbSBmcm9tICcuL2xpYi9uYXRpdmUuanMnO1xuXG5leHBvcnQgY29uc3QgbmF0aXZlID0gZG9tLmRvY3VtZW50ICYmIGRvbTtcbmV4cG9ydCBjb25zdCB7Y3JlYXRlRWxlbWVudCwgY3JlYXRlVGV4dCwgY3JlYXRlRnJhZ21lbnR9ID0gbmF0aXZlIHx8IHBzZXVkbztcbmV4cG9ydCB7cHNldWRvfTtcbiIsImltcG9ydCAqIGFzIGRvbSBmcm9tICcuLi9wYWNrYWdlcy9wc2V1ZG9tL2luZGV4LmpzJztcblxuLy8vIE9QVElPTlNcbi8qKiBUaGUgdGFnIG5hbWUgb2YgdGhlIGVsZW1lbnQgdG8gdXNlIGZvciByZW5kZXJpbmcgYSB0b2tlbi4gKi9cbmNvbnN0IFNQQU4gPSAnc3Bhbic7XG5cbi8qKiBUaGUgY2xhc3MgbmFtZSBvZiB0aGUgZWxlbWVudCB0byB1c2UgZm9yIHJlbmRlcmluZyBhIHRva2VuLiAqL1xuY29uc3QgQ0xBU1MgPSAnbWFya3VwJztcblxuLyoqXG4gKiBJbnRlbmRlZCB0byBwcmV2ZW50IHVucHJlZGljdGFibGUgRE9NIHJlbGF0ZWQgb3ZlcmhlYWQgYnkgcmVuZGVyaW5nIGVsZW1lbnRzXG4gKiB1c2luZyBsaWdodHdlaWdodCBwcm94eSBvYmplY3RzIHRoYXQgY2FuIGJlIHNlcmlhbGl6ZWQgaW50byBIVE1MIHRleHQuXG4gKi9cbmNvbnN0IEhUTUxfTU9ERSA9IHRydWU7XG4vLy8gSU5URVJGQUNFXG5cbmV4cG9ydCBjb25zdCByZW5kZXJlcnMgPSB7fTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZW5kZXJlcih0b2tlbnMsIHRva2VuUmVuZGVyZXJzID0gcmVuZGVyZXJzKSB7XG4gIGZvciBhd2FpdCAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgY29uc3Qge3R5cGUgPSAndGV4dCcsIHRleHQsIHB1bmN0dWF0b3IsIGJyZWFrc30gPSB0b2tlbjtcbiAgICBjb25zdCB0b2tlblJlbmRlcmVyID1cbiAgICAgIChwdW5jdHVhdG9yICYmICh0b2tlblJlbmRlcmVyc1twdW5jdHVhdG9yXSB8fCB0b2tlblJlbmRlcmVycy5vcGVyYXRvcikpIHx8XG4gICAgICAodHlwZSAmJiB0b2tlblJlbmRlcmVyc1t0eXBlXSkgfHxcbiAgICAgICh0ZXh0ICYmIHRva2VuUmVuZGVyZXJzLnRleHQpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0b2tlblJlbmRlcmVyICYmIHRva2VuUmVuZGVyZXIodGV4dCwgdG9rZW4pO1xuICAgIGVsZW1lbnQgJiYgKHlpZWxkIGVsZW1lbnQpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBpbnN0YWxsID0gKGRlZmF1bHRzLCBuZXdSZW5kZXJlcnMgPSBkZWZhdWx0cy5yZW5kZXJlcnMgfHwge30pID0+IHtcbiAgT2JqZWN0LmFzc2lnbihuZXdSZW5kZXJlcnMsIHJlbmRlcmVycyk7XG4gIGRlZmF1bHRzLnJlbmRlcmVycyA9PT0gbmV3UmVuZGVyZXJzIHx8IChkZWZhdWx0cy5yZW5kZXJlcnMgPSBuZXdSZW5kZXJlcnMpO1xuICBkZWZhdWx0cy5yZW5kZXJlciA9IHJlbmRlcmVyO1xufTtcblxuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZCA9ICEhZG9tLm5hdGl2ZTtcbmV4cG9ydCBjb25zdCBuYXRpdmUgPSAhSFRNTF9NT0RFICYmIHN1cHBvcnRlZDtcbmNvbnN0IGltcGxlbWVudGF0aW9uID0gbmF0aXZlID8gZG9tLm5hdGl2ZSA6IGRvbS5wc2V1ZG87XG5leHBvcnQgY29uc3Qge2NyZWF0ZUVsZW1lbnQsIGNyZWF0ZVRleHQsIGNyZWF0ZUZyYWdtZW50fSA9IGltcGxlbWVudGF0aW9uO1xuXG4vLy8gSU1QTEVNRU5UQVRJT05cbmNvbnN0IGZhY3RvcnkgPSAodGFnLCBwcm9wZXJ0aWVzKSA9PiAoY29udGVudCwgdG9rZW4pID0+IHtcbiAgaWYgKCFjb250ZW50KSByZXR1cm47XG4gIHR5cGVvZiBjb250ZW50ICE9PSAnc3RyaW5nJyB8fCAoY29udGVudCA9IGNyZWF0ZVRleHQoY29udGVudCkpO1xuICBjb25zdCBlbGVtZW50ID0gY3JlYXRlRWxlbWVudCh0YWcsIHByb3BlcnRpZXMsIGNvbnRlbnQpO1xuXG4gIGVsZW1lbnQgJiYgdG9rZW4gJiYgKHRva2VuLmhpbnQgJiYgKGVsZW1lbnQuY2xhc3NOYW1lICs9IGAgJHt0b2tlbi5oaW50fWApKTtcbiAgLy8gdG9rZW4uYnJlYWtzICYmIChlbGVtZW50LmJyZWFrcyA9IHRva2VuLmJyZWFrcyksXG4gIC8vIHRva2VuICYmXG4gIC8vICh0b2tlbi5mb3JtICYmIChlbGVtZW50LmNsYXNzTmFtZSArPSBgIG1heWJlLSR7dG9rZW4uZm9ybX1gKSxcbiAgLy8gdG9rZW4uaGludCAmJiAoZWxlbWVudC5jbGFzc05hbWUgKz0gYCAke3Rva2VuLmhpbnR9YCksXG4gIC8vIGVsZW1lbnQgJiYgKGVsZW1lbnQudG9rZW4gPSB0b2tlbikpO1xuXG4gIHJldHVybiBlbGVtZW50O1xufTtcblxuT2JqZWN0LmFzc2lnbihyZW5kZXJlcnMsIHtcbiAgLy8gd2hpdGVzcGFjZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gd2hpdGVzcGFjZWB9KSxcbiAgd2hpdGVzcGFjZTogY3JlYXRlVGV4dCxcbiAgdGV4dDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBDTEFTU30pLFxuXG4gIHZhcmlhYmxlOiBmYWN0b3J5KCd2YXInLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gdmFyaWFibGVgfSksXG4gIGtleXdvcmQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGtleXdvcmRgfSksXG4gIGlkZW50aWZpZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGlkZW50aWZpZXJgfSksXG4gIG9wZXJhdG9yOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZXJhdG9yYH0pLFxuICBhc3NpZ25lcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvciBhc3NpZ25lcmB9KSxcbiAgY29tYmluYXRvcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvciBjb21iaW5hdG9yYH0pLFxuICBwdW5jdHVhdGlvbjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBwdW5jdHVhdGlvbmB9KSxcbiAgcXVvdGU6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgcXVvdGVgfSksXG4gIGJyZWFrZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgYnJlYWtlcmB9KSxcbiAgb3BlbmVyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZW5lcmB9KSxcbiAgY2xvc2VyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIGNsb3NlcmB9KSxcbiAgc3BhbjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBzcGFuYH0pLFxuICBzZXF1ZW5jZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gc2VxdWVuY2VgfSksXG4gIGxpdGVyYWw6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGxpdGVyYWxgfSksXG4gIGluZGVudDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gc2VxdWVuY2UgaW5kZW50YH0pLFxuICBjb21tZW50OiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBjb21tZW50YH0pLFxuICBjb2RlOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfWB9KSxcbn0pO1xuIiwiZXhwb3J0IGNvbnN0IHJhdyA9IFN0cmluZy5yYXc7XG5cbi8qKiBDcmVhdGUgYSBzZXF1ZW5jZSBtYXRjaCBleHByZXNzaW9uIGZyb20gcGF0dGVybnMuICovXG5leHBvcnQgY29uc3Qgc2VxdWVuY2UgPSAoLi4ucGF0dGVybnMpID0+XG4gIG5ldyBSZWdFeHAoUmVmbGVjdC5hcHBseShyYXcsIG51bGwsIHBhdHRlcm5zLm1hcChwID0+IChwICYmIHAuc291cmNlKSB8fCBwIHx8ICcnKSksICdnJyk7XG5cbi8qKiBDcmVhdGUgYSBtYXliZUlkZW50aWZpZXIgdGVzdCAoaWUgWzxmaXJzdD5dWzxvdGhlcj5dKikgZXhwcmVzc2lvbi4gKi9cbmV4cG9ydCBjb25zdCBpZGVudGlmaWVyID0gKGZpcnN0LCBvdGhlciwgZmxhZ3MgPSAndScsIGJvdW5kYXJ5ID0gL3lnLy50ZXN0KGZsYWdzKSAmJiAnXFxcXGInKSA9PlxuICBuZXcgUmVnRXhwKGAke2JvdW5kYXJ5IHx8ICdeJ31bJHtmaXJzdH1dWyR7b3RoZXJ9XSoke2JvdW5kYXJ5IHx8ICckJ31gLCBmbGFncyk7XG5cbi8qKiBDcmVhdGUgYSBzZXF1ZW5jZSBwYXR0ZXJuIGZyb20gcGF0dGVybnMuICovXG5leHBvcnQgY29uc3QgYWxsID0gKC4uLnBhdHRlcm5zKSA9PiBwYXR0ZXJucy5tYXAocCA9PiAocCAmJiBwLmV4ZWMgPyBwLnNvdXJjZSA6IHApKS5qb2luKCd8Jyk7XG5cbmV4cG9ydCBjb25zdCBwYXR0ZXJucyA9IHtcbiAgLyoqIEJhc2ljIGxhdGluIEtleXdvcmQgbGlrZSBzeW1ib2wgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG4gIC8vIG1heWJlS2V5d29yZDogL15bYS16XShcXHcqKSQvaSwgLy8gVE9ETzogQ29uc2lkZXIgY2hhbmdpbmcgdG8gL15bYS16XSskL2lcbn07XG5cbi8qKiBFbnRpdGllcyB1c2VkIHRvIGNvbnN0cnVjdCBwYXR0ZXJucy4gKi9cbmV4cG9ydCBjb25zdCBlbnRpdGllcyA9IHtcbiAgZXM6IHtcbiAgICBJZGVudGlmaWVyU3RhcnQ6IHJhd2BfJFxccHtJRF9TdGFydH1gLFxuICAgIElkZW50aWZpZXJQYXJ0OiByYXdgXyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1gLFxuICB9LFxufTtcblxuLyoqIEludGVyb3BlcmFiaWxpdHkgKGZvciBzb21lIGJyb3dzZXJzKSAqL1xuKFJhbmdlcyA9PiB7XG4gIGNvbnN0IHRyYW5zZm9ybXMgPSBbXTtcblxuICBpZiAoIXN1cHBvcnRzKHJhd2BcXHB7SURfU3RhcnR9YCwgJ3UnKSkge1xuICAgIGNvbnN0IFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMgPSAvXFxcXHB7ICooXFx3KykgKn0vZztcbiAgICBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnJlcGxhY2UgPSAobSwgcHJvcGVydHlLZXkpID0+IHtcbiAgICAgIGlmIChwcm9wZXJ0eUtleSBpbiBSYW5nZXMpIHJldHVybiBSYW5nZXNbcHJvcGVydHlLZXldLnRvU3RyaW5nKCk7XG4gICAgICB0aHJvdyBSYW5nZUVycm9yKGBDYW5ub3QgcmV3cml0ZSB1bmljb2RlIHByb3BlcnR5IFwiJHtwcm9wZXJ0eUtleX1cImApO1xuICAgIH07XG4gICAgdHJhbnNmb3Jtcy5wdXNoKGV4cHJlc3Npb24gPT4ge1xuICAgICAgbGV0IGZsYWdzID0gZXhwcmVzc2lvbiAmJiBleHByZXNzaW9uLmZsYWdzO1xuICAgICAgbGV0IHNvdXJjZSA9IGV4cHJlc3Npb24gJiYgYCR7ZXhwcmVzc2lvbi5zb3VyY2UgfHwgZXhwcmVzc2lvbiB8fCAnJ31gO1xuICAgICAgc291cmNlICYmXG4gICAgICAgIFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMudGVzdChzb3VyY2UpICYmXG4gICAgICAgIChzb3VyY2UgPSBzb3VyY2UucmVwbGFjZShVbmljb2RlUHJvcGVydHlFc2NhcGVzLCBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnJlcGxhY2UpKTtcbiAgICAgIHJldHVybiAoZmxhZ3MgJiYgbmV3IFJlZ0V4cChzb3VyY2UsIGZsYWdzKSkgfHwgc291cmNlO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKCF0cmFuc2Zvcm1zLmxlbmd0aCkgcmV0dXJuO1xuXG4gIGZvciAoY29uc3Qga2V5IGluIGVudGl0aWVzKSB7XG4gICAgY29uc3Qgc291cmNlcyA9IGVudGl0aWVzW2tleV07XG4gICAgY29uc3QgY2hhbmdlcyA9IHt9O1xuICAgIGZvciAoY29uc3QgaWQgaW4gc291cmNlcykge1xuICAgICAgbGV0IHNvdXJjZSA9IHNvdXJjZXNbaWRdO1xuICAgICAgaWYgKCFzb3VyY2UgfHwgdHlwZW9mIHNvdXJjZSAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykgc291cmNlID0gdHJhbnNmb3JtKHNvdXJjZSk7XG4gICAgICAhc291cmNlIHx8IHNvdXJjZSA9PT0gc291cmNlc1tpZF0gfHwgKGNoYW5nZXNbaWRdID0gc291cmNlKTtcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihzb3VyY2VzLCBjaGFuZ2VzKTtcbiAgfVxuXG4gIC8vIHByZXR0aWVyLWlnbm9yZVxuICBmdW5jdGlvbiBzdXBwb3J0cygpIHt0cnkge3JldHVybiAhIVJlZ0V4cCguLi4gYXJndW1lbnRzKX0gY2F0Y2ggKGUpIHsgfX1cbn0pKHtcbiAgSURfU3RhcnQ6IHJhd2BhLXpBLVpcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY2AsXG4gIElEX0NvbnRpbnVlOiByYXdgYS16QS1aMC05XFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcXHUyMDBjXFx1MjAwZFxceGI3XFx1MDMwMC1cXHUwMzZmXFx1MDM4N1xcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2NGItXFx1MDY2OVxcdTA2NzBcXHUwNmQ2LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZTRcXHUwNmU3XFx1MDZlOFxcdTA2ZWEtXFx1MDZlZFxcdTA2ZjAtXFx1MDZmOVxcdTA3MTFcXHUwNzMwLVxcdTA3NGFcXHUwN2E2LVxcdTA3YjBcXHUwN2MwLVxcdTA3YzlcXHUwN2ViLVxcdTA3ZjNcXHUwN2ZkXFx1MDgxNi1cXHUwODE5XFx1MDgxYi1cXHUwODIzXFx1MDgyNS1cXHUwODI3XFx1MDgyOS1cXHUwODJkXFx1MDg1OS1cXHUwODViXFx1MDhkMy1cXHUwOGUxXFx1MDhlMy1cXHUwOTAzXFx1MDkzYS1cXHUwOTNjXFx1MDkzZS1cXHUwOTRmXFx1MDk1MS1cXHUwOTU3XFx1MDk2MlxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2RcXHUwOWQ3XFx1MDllMlxcdTA5ZTNcXHUwOWU2LVxcdTA5ZWZcXHUwOWZlXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMlxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYWZhLVxcdTBhZmZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNjJcXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI4MlxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAwLVxcdTBjMDRcXHUwYzNlLVxcdTBjNDRcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNjJcXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MS1cXHUwYzgzXFx1MGNiY1xcdTBjYmUtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNlMlxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwZDAwLVxcdTBkMDNcXHUwZDNiXFx1MGQzY1xcdTBkM2UtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZFxcdTBkNTdcXHUwZDYyXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODJcXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGU2LVxcdTBkZWZcXHUwZGYyXFx1MGRmM1xcdTBlMzFcXHUwZTM0LVxcdTBlM2FcXHUwZTQ3LVxcdTBlNGVcXHUwZTUwLVxcdTBlNTlcXHUwZWIxXFx1MGViNC1cXHUwZWI5XFx1MGViYlxcdTBlYmNcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2VcXHUwZjNmXFx1MGY3MS1cXHUwZjg0XFx1MGY4NlxcdTBmODdcXHUwZjhkLVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAyYi1cXHUxMDNlXFx1MTA0MC1cXHUxMDQ5XFx1MTA1Ni1cXHUxMDU5XFx1MTA1ZS1cXHUxMDYwXFx1MTA2Mi1cXHUxMDY0XFx1MTA2Ny1cXHUxMDZkXFx1MTA3MS1cXHUxMDc0XFx1MTA4Mi1cXHUxMDhkXFx1MTA4Zi1cXHUxMDlkXFx1MTM1ZC1cXHUxMzVmXFx1MTM2OS1cXHUxMzcxXFx1MTcxMi1cXHUxNzE0XFx1MTczMi1cXHUxNzM0XFx1MTc1MlxcdTE3NTNcXHUxNzcyXFx1MTc3M1xcdTE3YjQtXFx1MTdkM1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxOGE5XFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk0Ni1cXHUxOTRmXFx1MTlkMC1cXHUxOWRhXFx1MWExNy1cXHUxYTFiXFx1MWE1NS1cXHUxYTVlXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWFiMC1cXHUxYWJkXFx1MWIwMC1cXHUxYjA0XFx1MWIzNC1cXHUxYjQ0XFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYjgyXFx1MWJhMS1cXHUxYmFkXFx1MWJiMC1cXHUxYmI5XFx1MWJlNi1cXHUxYmYzXFx1MWMyNC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM1MC1cXHUxYzU5XFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2U4XFx1MWNlZFxcdTFjZjItXFx1MWNmNFxcdTFjZjctXFx1MWNmOVxcdTFkYzAtXFx1MWRmOVxcdTFkZmItXFx1MWRmZlxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyY2VmLVxcdTJjZjFcXHUyZDdmXFx1MmRlMC1cXHUyZGZmXFx1MzAyYS1cXHUzMDJmXFx1MzA5OVxcdTMwOWFcXHVhNjIwLVxcdWE2MjlcXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZVxcdWE2OWZcXHVhNmYwXFx1YTZmMVxcdWE4MDJcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4ODBcXHVhODgxXFx1YThiNC1cXHVhOGM1XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGYxXFx1YThmZi1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTk0Ny1cXHVhOTUzXFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YTlkMC1cXHVhOWQ5XFx1YTllNVxcdWE5ZjAtXFx1YTlmOVxcdWFhMjktXFx1YWEzNlxcdWFhNDNcXHVhYTRjXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2ItXFx1YWE3ZFxcdWFhYjBcXHVhYWIyLVxcdWFhYjRcXHVhYWI3XFx1YWFiOFxcdWFhYmVcXHVhYWJmXFx1YWFjMVxcdWFhZWItXFx1YWFlZlxcdWFhZjVcXHVhYWY2XFx1YWJlMy1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVmYjFlXFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTJmXFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmYCxcbn0pO1xuIiwiaW1wb3J0IHtwYXR0ZXJucywgZW50aXRpZXMsIGlkZW50aWZpZXIsIHNlcXVlbmNlLCBhbGwsIHJhd30gZnJvbSAnLi9wYXR0ZXJucy5qcyc7XG5cbmV4cG9ydCBjb25zdCBtYXBwaW5ncyA9IHt9O1xuXG5leHBvcnQgY29uc3QgbW9kZXMgPSB7XG4gIC8vIEZhbGxiYWNrIG1vZGVcbiAgZGVmYXVsdDoge1xuICAgIC4uLihtYXBwaW5ncy5kZWZhdWx0ID0ge3N5bnRheDogJ2RlZmF1bHQnfSksXG4gICAgbWF0Y2hlcjogLyhbXFxzXFxuXSspfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcL1xcL3xcXC9cXCp8XFwqXFwvfFxcKHxcXCl8XFxbfFxcXXwsfDt8XFwuXFwuXFwufFxcLnxcXGI6XFwvXFwvXFxifDo6fDp8XFw/fGB8XCJ8J3xcXCRcXHt8XFx7fFxcfXw9Pnw8XFwvfFxcLz58XFwrK3xcXC0rfFxcKit8Jit8XFx8K3w9K3whPXswLDN9fDx7MSwzfT0/fD57MSwyfT0/KXxbK1xcLSovJnxeJTw+fiFdPT8vZyxcbiAgfSxcbn07XG5cbi8vLyBERUZJTklUSU9OU1xuU3ludGF4ZXM6IHtcbiAgLy8vIEhlbHBlcnNcbiAgY29uc3QgbGluZXMgPSBzdHJpbmcgPT4gc3RyaW5nLnNwbGl0KC9cXG4rLyk7XG4gIGNvbnN0IGNsb3N1cmVzID0gc3RyaW5nID0+IHtcbiAgICBjb25zdCBwYWlycyA9IHN5bWJvbHMoc3RyaW5nKTtcbiAgICBjb25zdCBhcnJheSA9IG5ldyBBcnJheShwYWlycy5sZW5ndGgpO1xuICAgIGFycmF5LnBhaXJzID0gcGFpcnM7XG4gICAgbGV0IGkgPSAwO1xuICAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgICAgY29uc3QgW29wZW5lciwgY2xvc2VyXSA9IHBhaXIuc3BsaXQoJ+KApicpO1xuICAgICAgYXJyYXlbKGFycmF5W2krK10gPSBvcGVuZXIpXSA9IHtvcGVuZXIsIGNsb3Nlcn07XG4gICAgfVxuICAgIGFycmF5LnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuICAgIHJldHVybiBhcnJheTtcbiAgfTtcbiAgY29uc3Qgc3ltYm9scyA9IHNvdXJjZSA9PlxuICAgIChzb3VyY2UgJiZcbiAgICAgICgodHlwZW9mIHNvdXJjZSA9PT0gJ3N0cmluZycgJiYgc291cmNlLnNwbGl0KC8gKy8pKSB8fFxuICAgICAgICAoU3ltYm9sLml0ZXJhdG9yIGluIHNvdXJjZSAmJiBbLi4uc291cmNlXSkpKSB8fFxuICAgIFtdO1xuICBzeW1ib2xzLmZyb20gPSAoLi4uYXJncykgPT4gWy4uLm5ldyBTZXQoW10uY29uY2F0KC4uLmFyZ3MubWFwKHN5bWJvbHMpKSldO1xuXG4gIEVDTUFTY3JpcHQ6IHtcbiAgICBjb25zdCBSRUdFWFBTID0gL1xcLyg/PVteXFwqXFwvXFxuXVteXFxuXSpcXC8pKD86W15cXFxcXFwvXFxuXFx0XFxbXSt8XFxcXFxcU3xcXFsoPzpcXFxcXFxTfFteXFxcXFxcblxcdFxcXV0rKSs/XFxdKSs/XFwvW2Etel0qL2c7XG4gICAgY29uc3QgQ09NTUVOVFMgPSAvXFwvXFwvfFxcL1xcKnxcXCpcXC98XFwvfF5cXCNcXCEuKlxcbi9nO1xuICAgIGNvbnN0IFFVT1RFUyA9IC9gfFwifCcvZztcbiAgICBjb25zdCBDTE9TVVJFUyA9IC9cXHt8XFx9fFxcKHxcXCl8XFxbfFxcXS9nO1xuXG4gICAgY29uc3QgZXMgPSAobW9kZXMuZXMgPSB7XG4gICAgICAuLi4obWFwcGluZ3MuamF2YXNjcmlwdCA9IG1hcHBpbmdzLmVzID0gbWFwcGluZ3MuanMgPSBtYXBwaW5ncy5lY21hc2NyaXB0ID0ge3N5bnRheDogJ2VzJ30pLFxuICAgICAgY29tbWVudHM6IGNsb3N1cmVzKCcvL+KAplxcbiAvKuKApiovJyksXG4gICAgICBxdW90ZXM6IHN5bWJvbHMoYCcgXCIgXFxgYCksXG4gICAgICBjbG9zdXJlczogY2xvc3VyZXMoJ3vigKZ9ICjigKYpIFvigKZdJyksXG4gICAgICBzcGFuczogeydgJzogY2xvc3VyZXMoJyR74oCmfScpfSxcbiAgICAgIGtleXdvcmRzOiBzeW1ib2xzKFxuICAgICAgICAvLyBhYnN0cmFjdCBlbnVtIGludGVyZmFjZSBwYWNrYWdlICBuYW1lc3BhY2UgZGVjbGFyZSB0eXBlIG1vZHVsZVxuICAgICAgICAnYXJndW1lbnRzIGFzIGFzeW5jIGF3YWl0IGJyZWFrIGNhc2UgY2F0Y2ggY2xhc3MgY29uc3QgY29udGludWUgZGVidWdnZXIgZGVmYXVsdCBkZWxldGUgZG8gZWxzZSBleHBvcnQgZXh0ZW5kcyBmaW5hbGx5IGZvciBmcm9tIGZ1bmN0aW9uIGdldCBpZiBpbXBvcnQgaW4gaW5zdGFuY2VvZiBsZXQgbmV3IG9mIHJldHVybiBzZXQgc3VwZXIgc3dpdGNoIHRoaXMgdGhyb3cgdHJ5IHR5cGVvZiB2YXIgdm9pZCB3aGlsZSB3aXRoIHlpZWxkJyxcbiAgICAgICksXG4gICAgICBhc3NpZ25lcnM6IHN5bWJvbHMoJz0gKz0gLT0gKj0gLz0gKio9ICU9IHw9IF49ICY9IDw8PSA+Pj0gPj4+PScpLFxuICAgICAgY29tYmluYXRvcnM6IHN5bWJvbHMoJz49IDw9ID09ID09PSAhPSAhPT0gfHwgJiYgISAmIHwgPiA8ID0+ICUgKyAtICoqICogLyA+PiA8PCA+Pj4gPyA6JyksXG4gICAgICBub25icmVha2Vyczogc3ltYm9scygnLicpLFxuICAgICAgb3BlcmF0b3JzOiBzeW1ib2xzKCcrKyAtLSAhISBeIH4gISAuLi4nKSxcbiAgICAgIGJyZWFrZXJzOiBzeW1ib2xzKCcsIDsnKSxcbiAgICAgIHBhdHRlcm5zOiB7XG4gICAgICAgIC4uLnBhdHRlcm5zLFxuICAgICAgICBtYXliZUlkZW50aWZpZXI6IGlkZW50aWZpZXIoZW50aXRpZXMuZXMuSWRlbnRpZmllclN0YXJ0LCBlbnRpdGllcy5lcy5JZGVudGlmaWVyUGFydCksXG4gICAgICB9LFxuICAgICAgbWF0Y2hlcjogc2VxdWVuY2VgKFtcXHNcXG5dKyl8KCR7YWxsKFxuICAgICAgICBSRUdFWFBTLFxuICAgICAgICByYXdgXFwvPWAsXG4gICAgICAgIENPTU1FTlRTLFxuICAgICAgICBRVU9URVMsXG4gICAgICAgIENMT1NVUkVTLFxuICAgICAgICAvLHw7fFxcLlxcLlxcLnxcXC58XFw6fFxcP3w9Pi8sXG4gICAgICAgIC8hPT18PT09fD09fD0vLFxuICAgICAgICAuLi5zeW1ib2xzKHJhd2BcXCsgXFwtIFxcKiAmIFxcfGApLm1hcChzID0+IGAke3N9JHtzfXwke3N9PXwke3N9YCksXG4gICAgICAgIC4uLnN5bWJvbHMocmF3YCEgXFwqXFwqICUgPDwgPj4gPj4+IDwgPiBcXF4gfmApLm1hcChzID0+IGAke3N9PXwke3N9YCksXG4gICAgICApfSlgLFxuICAgICAgbWF0Y2hlcnM6IHtcbiAgICAgICAgcXVvdGU6IC8oXFxuKXwoYHxcInwnfFxcJFxceyl8KFxcXFwuKS9nLFxuICAgICAgICBcIidcIjogLyhcXG4pfCgnKXwoXFxcXC4pL2csXG4gICAgICAgICdcIic6IC8oXFxuKXwoXCIpfChcXFxcLikvZyxcbiAgICAgICAgJ2AnOiAvKFxcbil8KGB8XFwkXFx7KXwoXFxcXC4pL2csXG4gICAgICAgIGNvbW1lbnRzOiAvKFxcbil8KFxcKlxcL3xcXGIoPzpbYS16XStcXDpcXC9cXC98XFx3W1xcd1xcK1xcLl0qXFx3QFthLXpdKylcXFMrfEBbYS16XSspL2dpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIEVDTUFTY3JpcHRFeHRlbnNpb25zOiB7XG4gICAgICAvLyBUT0RPOiBVbmRvICQgbWF0Y2hpbmcgb25jZSBmaXhlZFxuICAgICAgY29uc3QgUVVPVEVTID0gL2B8XCIoPzpbXlxcXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnKD86W15cXFxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG4gICAgICBjb25zdCBDT01NRU5UUyA9IC9cXC9cXC8uKig/OlxcbnwkKXxcXC9cXCpbXl0qPyg/OlxcKlxcL3wkKXxeXFwjXFwhLipcXG4vZztcbiAgICAgIGNvbnN0IFNUQVRFTUVOVFMgPSBhbGwoUVVPVEVTLCBDTE9TVVJFUywgUkVHRVhQUywgQ09NTUVOVFMpO1xuICAgICAgY29uc3QgQkxPQ0tMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBUT1BMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBDTE9TVVJFID0gc2VxdWVuY2VgKFxcbispfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBFU00gPSBzZXF1ZW5jZWAke1RPUExFVkVMfXxcXGJleHBvcnRcXGJ8XFxiaW1wb3J0XFxiYDtcbiAgICAgIGNvbnN0IENKUyA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJtb2R1bGUuZXhwb3J0c1xcYnxcXGJyZXF1aXJlXFxiYDtcbiAgICAgIGNvbnN0IEVTWCA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJpbXBvcnRcXGJ8XFxibW9kdWxlLmV4cG9ydHNcXGJ8XFxicmVxdWlyZVxcYmA7XG5cbiAgICAgIGNvbnN0IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc30gPSBlcztcbiAgICAgIGNvbnN0IHN5bnRheCA9IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc307XG4gICAgICBjb25zdCBtYXRjaGVycyA9IHt9O1xuICAgICAgKHtxdW90ZTogbWF0Y2hlcnMucXVvdGV9ID0gZXMubWF0Y2hlcnMpO1xuXG4gICAgICBjb25zdCBtanMgPSAobW9kZXMubWpzID0ge1xuICAgICAgICAuLi4obWFwcGluZ3MubWpzID0gbWFwcGluZ3MuZXNtID0ge3N5bnRheDogJ21qcyd9KSxcbiAgICAgICAga2V5d29yZHM6IHN5bWJvbHMoJ2ltcG9ydCBleHBvcnQgZGVmYXVsdCcpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IEVTTSxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogQ0xPU1VSRX0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGNqcyA9IChtb2Rlcy5janMgPSB7XG4gICAgICAgIC4uLihtYXBwaW5ncy5janMgPSB7c3ludGF4OiAnY2pzJ30pLFxuICAgICAgICBrZXl3b3Jkczogc3ltYm9scygnaW1wb3J0IG1vZHVsZSBleHBvcnRzIHJlcXVpcmUnKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBDSlMsXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IENKU30sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGVzeCA9IChtb2Rlcy5lc3ggPSB7XG4gICAgICAgIC4uLihtYXBwaW5ncy5lc3ggPSB7c3ludGF4OiAnZXN4J30pLFxuICAgICAgICBrZXl3b3Jkczogc3ltYm9scy5mcm9tKG1qcy5rZXl3b3JkcywgY2pzLmtleXdvcmRzKSxcbiAgICAgICAgLi4uc3ludGF4LFxuICAgICAgICBtYXRjaGVyOiBFU1gsXG4gICAgICAgIG1hdGNoZXJzOiB7Li4ubWF0Y2hlcnMsIGNsb3N1cmU6IEVTWH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cbiIsImV4cG9ydCBjbGFzcyBHcm91cGVyIHtcbiAgY29uc3RydWN0b3IoY29udGV4dCA9ICdtYXJrdXAnLCBncm91cGVycyA9IHt9KSB7XG4gICAgT2JqZWN0LmFzc2lnbih0aGlzLCB7XG4gICAgICBncm91cGVycyxcbiAgICAgIGhpbnRzOiBuZXcgU2V0KFtjb250ZXh0XSksXG4gICAgICBnb2FsOiBjb250ZXh0LFxuICAgICAgZ3JvdXBpbmdzOiBbY29udGV4dF0sXG4gICAgICBjb250ZXh0LFxuICAgIH0pO1xuICAgIC8vIHRoaXMuZ3JvdXBlcnMgPSBncm91cGVycztcbiAgICAvLyB0aGlzLmhpbnRzID0gbmV3IFNldChbc3ludGF4XSk7XG4gICAgLy8gdGhpcy5nb2FsID0gc3ludGF4O1xuICAgIC8vIHRoaXMuZ3JvdXBpbmdzID0gW3N5bnRheF07XG4gICAgLy8gdGhpcy5jb250ZXh0ID0gc3ludGF4O1xuICB9XG5cbiAgLy8gY3JlYXRlKHtcbiAgLy8gICAvKiBncm91cGVyIGNvbnRleHQgKi9cbiAgLy8gICBzeW50YXgsXG4gIC8vICAgZ29hbCA9IHN5bnRheCxcbiAgLy8gICBxdW90ZSxcbiAgLy8gICBjb21tZW50LFxuICAvLyAgIGNsb3N1cmUsXG4gIC8vICAgc3BhbixcbiAgLy8gICBncm91cGluZyA9IGNvbW1lbnQgfHwgY2xvc3VyZSB8fCBzcGFuIHx8IHVuZGVmaW5lZCxcblxuICAvLyAgIHB1bmN0dWF0b3IsXG4gIC8vICAgc3BhbnMgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuc3BhbnMpIHx8IHVuZGVmaW5lZCxcbiAgLy8gICBtYXRjaGVyID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm1hdGNoZXIpIHx8IHVuZGVmaW5lZCxcbiAgLy8gICBxdW90ZXMgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcucXVvdGVzKSB8fCB1bmRlZmluZWQsXG4gIC8vICAgcHVuY3R1YXRvcnMgPSB7YWdncmVnYXRvcnM6IHt9fSxcbiAgLy8gICBvcGVuZXIgPSBxdW90ZSB8fCAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcub3BlbmVyKSB8fCB1bmRlZmluZWQsXG4gIC8vICAgY2xvc2VyID0gcXVvdGUgfHwgKGdyb3VwaW5nICYmIGdyb3VwaW5nLmNsb3NlcikgfHwgdW5kZWZpbmVkLFxuICAvLyAgIGhpbnRlcixcbiAgLy8gICBvcGVuID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm9wZW4pIHx8IHVuZGVmaW5lZCxcbiAgLy8gICBjbG9zZSA9IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZSkgfHwgdW5kZWZpbmVkLFxuICAvLyB9KSB7XG4gIC8vICAgcmV0dXJuIHtcbiAgLy8gICAgIHN5bnRheCxcbiAgLy8gICAgIGdvYWwsXG4gIC8vICAgICBwdW5jdHVhdG9yLFxuICAvLyAgICAgc3BhbnMsXG4gIC8vICAgICBtYXRjaGVyLFxuICAvLyAgICAgcXVvdGVzLFxuICAvLyAgICAgcHVuY3R1YXRvcnMsXG4gIC8vICAgICBvcGVuZXIsXG4gIC8vICAgICBjbG9zZXIsXG4gIC8vICAgICBoaW50ZXIsXG4gIC8vICAgICBvcGVuLFxuICAvLyAgICAgY2xvc2UsXG4gIC8vICAgfTtcbiAgLy8gfVxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlR3JvdXBlciA9IChHcm91cGVyLmNyZWF0ZSA9ICh7XG4gIC8qIGdyb3VwZXIgY29udGV4dCAqL1xuICBzeW50YXgsXG4gIGdvYWwgPSBzeW50YXgsXG4gIHF1b3RlLFxuICBjb21tZW50LFxuICBjbG9zdXJlLFxuICBzcGFuLFxuICBncm91cGluZyA9IGNvbW1lbnQgfHwgY2xvc3VyZSB8fCBzcGFuIHx8IHVuZGVmaW5lZCxcblxuICBwdW5jdHVhdG9yLFxuICBzcGFucyA9IChncm91cGluZyAmJiBncm91cGluZy5zcGFucykgfHwgdW5kZWZpbmVkLFxuICBtYXRjaGVyID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm1hdGNoZXIpIHx8IHVuZGVmaW5lZCxcbiAgcXVvdGVzID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnF1b3RlcykgfHwgdW5kZWZpbmVkLFxuICBwdW5jdHVhdG9ycyA9IHthZ2dyZWdhdG9yczoge319LFxuICBvcGVuZXIgPSBxdW90ZSB8fCAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcub3BlbmVyKSB8fCB1bmRlZmluZWQsXG4gIGNsb3NlciA9IHF1b3RlIHx8IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZXIpIHx8IHVuZGVmaW5lZCxcbiAgaGludGVyLFxuICBvcGVuID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLm9wZW4pIHx8IHVuZGVmaW5lZCxcbiAgY2xvc2UgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuY2xvc2UpIHx8IHVuZGVmaW5lZCxcbn0pID0+ICh7XG4gIHN5bnRheCxcbiAgZ29hbCxcbiAgcHVuY3R1YXRvcixcbiAgc3BhbnMsXG4gIG1hdGNoZXIsXG4gIHF1b3RlcyxcbiAgcHVuY3R1YXRvcnMsXG4gIG9wZW5lcixcbiAgY2xvc2VyLFxuICBoaW50ZXIsXG4gIG9wZW4sXG4gIGNsb3NlLFxufSkpO1xuIiwiaW1wb3J0IHtwYXR0ZXJuc30gZnJvbSAnLi9wYXR0ZXJucy5qcyc7XG5pbXBvcnQge2NyZWF0ZUdyb3VwZXIsIEdyb3VwZXJ9IGZyb20gJy4vZ3JvdXBlci5qcyc7XG5cbmNvbnN0IE51bGwgPSBPYmplY3QuZnJlZXplKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuXG4vLy8gVG9rZW5pemVyXG4vKiogVG9rZW5pemVyIGZvciBhIHNpbmdsZSBtb2RlIChsYW5ndWFnZSkgKi9cbmV4cG9ydCBjbGFzcyBUb2tlbml6ZXIge1xuICBjb25zdHJ1Y3Rvcihtb2RlLCBkZWZhdWx0cykge1xuICAgIHRoaXMubW9kZSA9IG1vZGU7XG4gICAgdGhpcy5kZWZhdWx0cyA9IGRlZmF1bHRzIHx8IHRoaXMuY29uc3RydWN0b3IuZGVmYXVsdHMgfHwgdW5kZWZpbmVkO1xuICB9XG5cbiAgLyoqIFRva2VuIGdlbmVyYXRvciBmcm9tIHNvdXJjZSB1c2luZyB0b2tlbml6ZXIubW9kZSAob3IgZGVmYXVsdHMubW9kZSkgKi9cbiAgKnRva2VuaXplKHNvdXJjZSwgc3RhdGUgPSB7fSkge1xuICAgIGxldCBkb25lO1xuXG4gICAgLy8gTG9jYWwgY29udGV4dFxuICAgIGNvbnN0IGNvbnRleHR1YWxpemVyID1cbiAgICAgIHRoaXMuY29udGV4dHVhbGl6ZXIgfHwgKHRoaXMuY29udGV4dHVhbGl6ZXIgPSB0aGlzLmNvbnN0cnVjdG9yLmNvbnRleHR1YWxpemVyKHRoaXMpKTtcbiAgICBsZXQgY29udGV4dCA9IGNvbnRleHR1YWxpemVyLm5leHQoKS52YWx1ZTtcbiAgICAvLyBpZiAoIWNvbnRleHQpIGNvbnRleHR1YWxpemVyLm5leHQoKS52YWx1ZTtcbiAgICBjb25zdCB7bW9kZSwgc3ludGF4fSA9IGNvbnRleHQ7XG5cbiAgICAvLyBMb2NhbCBncm91cGluZ1xuICAgIGNvbnN0IGdyb3VwZXJzID0gbW9kZS5ncm91cGVycyB8fCAobW9kZS5ncm91cGVycyA9IHt9KTtcblxuICAgIGNvbnN0IGdyb3VwaW5nID1cbiAgICAgIHN0YXRlLmdyb3VwaW5nIHx8XG4gICAgICAoc3RhdGUuZ3JvdXBpbmcgPSB7XG4gICAgICAgIGdyb3VwZXJzLFxuICAgICAgICBoaW50czogbmV3IFNldChbc3ludGF4XSksXG4gICAgICAgIGdvYWw6IHN5bnRheCxcbiAgICAgICAgZ3JvdXBpbmdzOiBbc3ludGF4XSxcbiAgICAgICAgY29udGV4dDogc3ludGF4LFxuICAgICAgfSk7XG5cbiAgICAvLyBjb25zdCBncm91cGluZyA9IHN0YXRlLmdyb3VwaW5nIHx8IChzdGF0ZS5ncm91cGluZyA9IG5ldyBHcm91cGVyKHN5bnRheCwgZ3JvdXBlcnMpKTtcblxuICAgIC8vIExvY2FsIG1hdGNoaW5nXG4gICAgbGV0IHttYXRjaCwgaW5kZXggPSAwfSA9IHN0YXRlO1xuXG4gICAgLy8gTG9jYWwgdG9rZW5zXG4gICAgbGV0IHByZXZpb3VzLCBsYXN0LCBwYXJlbnQ7XG4gICAgY29uc3QgdG9wID0ge3R5cGU6ICd0b3AnLCB0ZXh0OiAnJywgb2Zmc2V0OiBpbmRleH07XG5cbiAgICBsZXQgbGFzdENvbnRleHQgPSBjb250ZXh0O1xuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgbW9kZToge3N5bnRheCwgbWF0Y2hlcnMsIGNvbW1lbnRzLCBzcGFucywgY2xvc3VyZXN9LFxuICAgICAgICBwdW5jdHVhdG9yOiAkJHB1bmN0dWF0b3IsXG4gICAgICAgIGNsb3NlcjogJCRjbG9zZXIsXG4gICAgICAgIHNwYW5zOiAkJHNwYW5zLFxuICAgICAgICBtYXRjaGVyOiAkJG1hdGNoZXIsXG4gICAgICAgIHRva2VuLFxuICAgICAgICBmb3JtaW5nID0gdHJ1ZSxcbiAgICAgIH0gPSBjb250ZXh0O1xuXG4gICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgaGludCAoc3ludGF4IG9yIGhpbnQpXG4gICAgICBjb25zdCBoaW50ID0gZ3JvdXBpbmcuaGludDtcblxuICAgICAgLy8gY29uc29sZS5sb2coe2NvbnRleHQsIGdyb3VwaW5nLCB0b2tlbml6ZXI6IHRoaXN9KTtcblxuICAgICAgd2hpbGUgKGxhc3RDb250ZXh0ID09PSAobGFzdENvbnRleHQgPSBjb250ZXh0KSkge1xuICAgICAgICBsZXQgbmV4dDtcblxuICAgICAgICBzdGF0ZS5sYXN0ID0gbGFzdDtcblxuICAgICAgICBjb25zdCBsYXN0SW5kZXggPSBzdGF0ZS5pbmRleCB8fCAwO1xuXG4gICAgICAgICQkbWF0Y2hlci5sYXN0SW5kZXggPT09IGxhc3RJbmRleCB8fCAoJCRtYXRjaGVyLmxhc3RJbmRleCA9IGxhc3RJbmRleCk7XG4gICAgICAgIG1hdGNoID0gc3RhdGUubWF0Y2ggPSAkJG1hdGNoZXIuZXhlYyhzb3VyY2UpO1xuICAgICAgICBkb25lID0gaW5kZXggPT09IChpbmRleCA9IHN0YXRlLmluZGV4ID0gJCRtYXRjaGVyLmxhc3RJbmRleCkgfHwgIW1hdGNoO1xuXG4gICAgICAgIGlmIChkb25lKSByZXR1cm47XG5cbiAgICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIG1hdGNoXG4gICAgICAgIGNvbnN0IHswOiB0ZXh0LCAxOiB3aGl0ZXNwYWNlLCAyOiBzZXF1ZW5jZSwgaW5kZXg6IG9mZnNldH0gPSBtYXRjaDtcblxuICAgICAgICAvLyBDdXJyZW50IHF1YXNpLWNvbnRleHR1YWwgZnJhZ21lbnRcbiAgICAgICAgY29uc3QgcHJlID0gc291cmNlLnNsaWNlKGxhc3RJbmRleCwgb2Zmc2V0KTtcbiAgICAgICAgcHJlICYmXG4gICAgICAgICAgKChuZXh0ID0gdG9rZW4oe1xuICAgICAgICAgICAgdHlwZTogJ3ByZScsXG4gICAgICAgICAgICB0ZXh0OiBwcmUsXG4gICAgICAgICAgICBvZmZzZXQ6IGxhc3RJbmRleCxcbiAgICAgICAgICAgIHByZXZpb3VzLFxuICAgICAgICAgICAgcGFyZW50LFxuICAgICAgICAgICAgaGludCxcbiAgICAgICAgICAgIGxhc3QsXG4gICAgICAgICAgfSkpLFxuICAgICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpKTtcblxuICAgICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgZnJhZ21lbnRcbiAgICAgICAgY29uc3QgdHlwZSA9ICh3aGl0ZXNwYWNlICYmICd3aGl0ZXNwYWNlJykgfHwgKHNlcXVlbmNlICYmICdzZXF1ZW5jZScpIHx8ICd0ZXh0JztcbiAgICAgICAgbmV4dCA9IHRva2VuKHt0eXBlLCB0ZXh0LCBvZmZzZXQsIHByZXZpb3VzLCBwYXJlbnQsIGhpbnQsIGxhc3R9KTtcblxuICAgICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgcHVuY3R1YXRvciAoZnJvbSBzZXF1ZW5jZSlcbiAgICAgICAgY29uc3QgY2xvc2luZyA9XG4gICAgICAgICAgJCRjbG9zZXIgJiZcbiAgICAgICAgICAoJCRjbG9zZXIudGVzdFxuICAgICAgICAgICAgPyAkJGNsb3Nlci50ZXN0KHRleHQpXG4gICAgICAgICAgICA6ICQkY2xvc2VyID09PSB0ZXh0IHx8ICh3aGl0ZXNwYWNlICYmIHdoaXRlc3BhY2UuaW5jbHVkZXMoJCRjbG9zZXIpKSk7XG5cbiAgICAgICAgbGV0IGFmdGVyO1xuICAgICAgICBsZXQgcHVuY3R1YXRvciA9IG5leHQucHVuY3R1YXRvcjtcblxuICAgICAgICBpZiAocHVuY3R1YXRvciB8fCBjbG9zaW5nKSB7XG4gICAgICAgICAgbGV0IGhpbnRlciA9IHB1bmN0dWF0b3IgPyBgJHtzeW50YXh9LSR7cHVuY3R1YXRvcn1gIDogZ3JvdXBpbmcuaGludDtcbiAgICAgICAgICBsZXQgY2xvc2VkLCBvcGVuZWQsIGdyb3VwZXI7XG5cbiAgICAgICAgICBpZiAoY2xvc2luZykge1xuICAgICAgICAgICAgY2xvc2VkID0gZ3JvdXBlciA9IGNsb3NpbmcgJiYgZ3JvdXBpbmcuZ3JvdXBpbmdzLnBvcCgpO1xuICAgICAgICAgICAgbmV4dC5jbG9zZWQgPSBjbG9zZWQ7XG4gICAgICAgICAgICBncm91cGluZy5ncm91cGluZ3MuaW5jbHVkZXMoZ3JvdXBlcikgfHwgZ3JvdXBpbmcuaGludHMuZGVsZXRlKGdyb3VwZXIuaGludGVyKTtcbiAgICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciA9PT0gJ29wZW5lcicgJiYgKG5leHQucHVuY3R1YXRvciA9ICdjbG9zZXInKSkgfHxcbiAgICAgICAgICAgICAgKGNsb3NlZC5wdW5jdHVhdG9yICYmIChuZXh0LnB1bmN0dWF0b3IgPSBjbG9zZWQucHVuY3R1YXRvcikpO1xuICAgICAgICAgICAgYWZ0ZXIgPSBncm91cGVyLmNsb3NlICYmIGdyb3VwZXIuY2xvc2UobmV4dCwgc3RhdGUsIGNvbnRleHQpO1xuXG4gICAgICAgICAgICBjb25zdCBwcmV2aW91c0dyb3VwZXIgPSAoZ3JvdXBlciA9IGdyb3VwaW5nLmdyb3VwaW5nc1tncm91cGluZy5ncm91cGluZ3MubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgZ3JvdXBpbmcuZ29hbCA9IChwcmV2aW91c0dyb3VwZXIgJiYgcHJldmlvdXNHcm91cGVyLmdvYWwpIHx8IHN5bnRheDtcbiAgICAgICAgICAgIHBhcmVudCA9IChwYXJlbnQgJiYgcGFyZW50LnBhcmVudCkgfHwgdG9wO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJCRwdW5jdHVhdG9yICE9PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgIGNvbnN0IGdyb3VwID0gYCR7aGludGVyfSwke3RleHR9YDtcbiAgICAgICAgICAgIGdyb3VwZXIgPSBncm91cGluZy5ncm91cGVyc1tncm91cF07XG5cbiAgICAgICAgICAgIGlmICgkJHNwYW5zICYmIHB1bmN0dWF0b3IgPT09ICdzcGFuJykge1xuICAgICAgICAgICAgICBjb25zdCBzcGFuID0gJCRzcGFuc1t0ZXh0XTtcbiAgICAgICAgICAgICAgbmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9ICdzcGFuJztcbiAgICAgICAgICAgICAgb3BlbmVkID1cbiAgICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICBnb2FsOiBzeW50YXgsXG4gICAgICAgICAgICAgICAgICBzcGFuLFxuICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogc3Bhbi5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5zcGFuKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBzcGFuczogKHNwYW5zICYmIHNwYW5zW3RleHRdKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmICgkJHB1bmN0dWF0b3IgIT09ICdxdW90ZScpIHtcbiAgICAgICAgICAgICAgaWYgKHB1bmN0dWF0b3IgPT09ICdxdW90ZScpIHtcbiAgICAgICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgICAgZ29hbDogcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgcXVvdGU6IHRleHQsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IChtYXRjaGVycyAmJiBtYXRjaGVycy5xdW90ZSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBzcGFuczogKHNwYW5zICYmIHNwYW5zW3RleHRdKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHB1bmN0dWF0b3IgPT09ICdjb21tZW50Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1lbnQgPSBjb21tZW50c1t0ZXh0XTtcbiAgICAgICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgICAgZ29hbDogcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgY29tbWVudCxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogY29tbWVudC5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5jb21tZW50KSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHB1bmN0dWF0b3IgPT09ICdjbG9zdXJlJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsb3N1cmUgPSAoZ3JvdXBlciAmJiBncm91cGVyLmNsb3N1cmUpIHx8IGNsb3N1cmVzW3RleHRdO1xuICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IgPSBuZXh0LnB1bmN0dWF0b3IgPSAnb3BlbmVyJztcbiAgICAgICAgICAgICAgICBjbG9zdXJlICYmXG4gICAgICAgICAgICAgICAgICAob3BlbmVkID1cbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgICAgZ29hbDogc3ludGF4LFxuICAgICAgICAgICAgICAgICAgICAgIGNsb3N1cmUsXG4gICAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogY2xvc3VyZS5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5jbG9zdXJlKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAob3BlbmVkKSB7XG4gICAgICAgICAgICAgIC8vIGFmdGVyID0gb3BlbmVkLm9wZW4gJiYgb3BlbmVkLm9wZW4obmV4dCwgc3RhdGUsIG9wZW5lZCk7XG4gICAgICAgICAgICAgIGdyb3VwaW5nLmdyb3VwZXJzW2dyb3VwXSB8fCAoZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdID0gZ3JvdXBlciA9IG9wZW5lZCk7XG4gICAgICAgICAgICAgIGdyb3VwaW5nLmdyb3VwaW5ncy5wdXNoKGdyb3VwZXIpLCBncm91cGluZy5oaW50cy5hZGQoaGludGVyKTtcbiAgICAgICAgICAgICAgZ3JvdXBpbmcuZ29hbCA9IChncm91cGVyICYmIGdyb3VwZXIuZ29hbCkgfHwgc3ludGF4O1xuICAgICAgICAgICAgICBwYXJlbnQgPSBuZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHN0YXRlLmNvbnRleHQgPSBncm91cGluZy5jb250ZXh0ID0gZ3JvdXBpbmcuZ29hbCB8fCBzeW50YXg7XG5cbiAgICAgICAgICBpZiAob3BlbmVkIHx8IGNsb3NlZCkge1xuICAgICAgICAgICAgY29udGV4dCA9IGNvbnRleHR1YWxpemVyLm5leHQoKHN0YXRlLmdyb3VwZXIgPSBncm91cGVyIHx8IHVuZGVmaW5lZCkpLnZhbHVlO1xuICAgICAgICAgICAgZ3JvdXBpbmcuaGludCA9IGAke1suLi5ncm91cGluZy5oaW50c10uam9pbignICcpfSAke1xuICAgICAgICAgICAgICBncm91cGluZy5jb250ZXh0ID8gYGluLSR7Z3JvdXBpbmcuY29udGV4dH1gIDogJydcbiAgICAgICAgICAgIH1gO1xuICAgICAgICAgICAgb3BlbmVkICYmIChhZnRlciA9IG9wZW5lZC5vcGVuICYmIG9wZW5lZC5vcGVuKG5leHQsIHN0YXRlLCBjb250ZXh0KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIHRhaWwgdG9rZW4gKHlpZWxkIGZyb20gc2VxdWVuY2UpXG4gICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpO1xuXG4gICAgICAgIC8vIE5leHQgcmVmZXJlbmNlIHRvIGxhc3QgY29udGV4dHVhbCBzZXF1ZW5jZSB0b2tlblxuICAgICAgICBuZXh0ICYmICF3aGl0ZXNwYWNlICYmIGZvcm1pbmcgJiYgKGxhc3QgPSBuZXh0KTtcblxuICAgICAgICBpZiAoYWZ0ZXIpIHtcbiAgICAgICAgICBsZXQgdG9rZW5zLCB0b2tlbiwgbmV4dEluZGV4OyAvLyAgPSBhZnRlci5lbmQgfHwgYWZ0ZXIuaW5kZXhcblxuICAgICAgICAgIGlmIChhZnRlci5zeW50YXgpIHtcbiAgICAgICAgICAgIGNvbnN0IHtzeW50YXgsIG9mZnNldCwgaW5kZXh9ID0gYWZ0ZXI7XG4gICAgICAgICAgICBjb25zdCBib2R5ID0gaW5kZXggPiBvZmZzZXQgJiYgc291cmNlLnNsaWNlKG9mZnNldCwgaW5kZXggLSAxKTtcbiAgICAgICAgICAgIGlmIChib2R5KSB7XG4gICAgICAgICAgICAgIGJvZHkubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgICAgICgodG9rZW5zID0gdG9rZW5pemUoYm9keSwge29wdGlvbnM6IHtzeW50YXh9fSwgZGVmYXVsdHMpKSwgKG5leHRJbmRleCA9IGluZGV4KSk7XG4gICAgICAgICAgICAgIGNvbnN0IGhpbnQgPSBgJHtzeW50YXh9LWluLSR7JC5zeW50YXh9YDtcbiAgICAgICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAgICAgKHRva2VuLmhpbnQgPSBgJHsodG9rZW4uaGludCAmJiBgJHt0b2tlbi5oaW50fSBgKSB8fCAnJ30ke2hpbnR9YCksIHRva2VuXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChhZnRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IGhpbnQgPSBncm91cGluZy5oaW50O1xuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAgICh0b2tlbi5oaW50ID0gYCR7aGludH0gJHt0b2tlbi50eXBlIHx8ICdjb2RlJ31gKSwgY29udGV4dC50b2tlbih0b2tlbilcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAodG9rZW5zID0gYWZ0ZXIpLmVuZCAmJiAobmV4dEluZGV4ID0gYWZ0ZXIuZW5kKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodG9rZW5zKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7dG9rZW4sIHRva2VucywgbmV4dEluZGV4fSk7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IG5leHQgb2YgdG9rZW5zKSB7XG4gICAgICAgICAgICAgIHByZXZpb3VzICYmICgobmV4dC5wcmV2aW91cyA9IHByZXZpb3VzKS5uZXh0ID0gbmV4dCk7XG4gICAgICAgICAgICAgIHRva2VuICYmIHRva2VuKG5leHQpO1xuICAgICAgICAgICAgICB5aWVsZCAocHJldmlvdXMgPSBuZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dEluZGV4ID4gaW5kZXggJiYgKHN0YXRlLmluZGV4ID0gbmV4dEluZGV4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb250ZXh0IGdlbmVyYXRvciB1c2luZyB0b2tlbml6ZXIubW9kZSAob3IgZGVmYXVsdHMubW9kZSlcbiAgICovXG4gIGdldCBjb250ZXh0dWFsaXplcigpIHtcbiAgICBjb25zdCB2YWx1ZSA9IHRoaXMuY29uc3RydWN0b3IuY29udGV4dHVhbGl6ZXIodGhpcyk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdjb250ZXh0dWFsaXplcicsIHt2YWx1ZX0pO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2tlbml6ZXIgY29udGV4dCBnZW5lcmF0b3JcbiAgICovXG4gIHN0YXRpYyAqY29udGV4dHVhbGl6ZXIodG9rZW5pemVyKSB7XG4gICAgLy8gTG9jYWwgY29udGV4dHVhbGl6ZXIgc3RhdGVcbiAgICBsZXQgZ3JvdXBlciwgZG9uZTtcblxuICAgIC8vIFRva2VuaXplciBtb2RlXG4gICAgY29uc3QgbW9kZSA9IHRva2VuaXplci5tb2RlO1xuICAgIGNvbnN0IGRlZmF1bHRzID0gdG9rZW5pemVyLmRlZmF1bHRzO1xuICAgIG1vZGUgIT09IHVuZGVmaW5lZCB8fCAobW9kZSA9IChkZWZhdWx0cyAmJiBkZWZhdWx0cy5tb2RlKSB8fCB1bmRlZmluZWQpO1xuICAgIC8vIChtb2RlID0gKGRlZmF1bHRzICYmIGRlZmF1bHRzLnN5bnRheGVzICYmIGRlZmF1bHRzLnN5bnRheGVzLmRlZmF1bHQpIHx8IHN5bnRheGVzLmRlZmF1bHQpO1xuICAgIGlmICghbW9kZSkgdGhyb3cgUmVmZXJlbmNlRXJyb3IoYFRva2VuaXplci5jb250ZXh0dWFsaXplciBpbnZva2VkIHdpdGhvdXQgYSBtb2RlYCk7XG5cbiAgICAvLyBUT0RPOiBSZWZhY3RvcmluZ1xuICAgIGNvbnN0IGluaXRpYWxpemUgPSBjb250ZXh0ID0+IHtcbiAgICAgIGNvbnRleHQudG9rZW4gfHxcbiAgICAgICAgKGNvbnRleHQudG9rZW4gPSAodG9rZW5pemVyID0+ICh0b2tlbml6ZXIubmV4dCgpLCB0b2tlbiA9PiB0b2tlbml6ZXIubmV4dCh0b2tlbikudmFsdWUpKShcbiAgICAgICAgICB0aGlzLnRva2VuaXplcihjb250ZXh0KSxcbiAgICAgICAgKSk7XG4gICAgICByZXR1cm4gY29udGV4dDtcbiAgICB9O1xuXG4gICAgaWYgKCFtb2RlLmNvbnRleHQpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgc3ludGF4LFxuICAgICAgICBtYXRjaGVyID0gKG1vZGUubWF0Y2hlciA9IChkZWZhdWx0cyAmJiBkZWZhdWx0cy5tYXRjaGVyKSB8fCB1bmRlZmluZWQpLFxuICAgICAgICBxdW90ZXMsXG4gICAgICAgIHB1bmN0dWF0b3JzID0gKG1vZGUucHVuY3R1YXRvcnMgPSB7YWdncmVnYXRvcnM6IHt9fSksXG4gICAgICAgIHB1bmN0dWF0b3JzOiB7YWdncmVnYXRvcnMgPSAoJHB1bmN0dWF0b3JzLmFnZ3JlZ2F0b3JzID0ge30pfSxcbiAgICAgICAgcGF0dGVybnM6IHtcbiAgICAgICAgICBtYXliZUtleXdvcmQgPSAobW9kZS5wYXR0ZXJucy5tYXliZUtleXdvcmQgPVxuICAgICAgICAgICAgKChkZWZhdWx0cyAmJiBkZWZhdWx0cy5wYXR0ZXJucykgfHwgcGF0dGVybnMpLm1heWJlS2V5d29yZCB8fCB1bmRlZmluZWQpLFxuICAgICAgICB9ID0gKG1vZGUucGF0dGVybnMgPSB7bWF5YmVLZXl3b3JkOiBudWxsfSksXG4gICAgICAgIHNwYW5zOiB7W3N5bnRheF06IHNwYW5zfSA9IE51bGwsXG4gICAgICB9ID0gbW9kZTtcblxuICAgICAgaW5pdGlhbGl6ZShcbiAgICAgICAgKG1vZGUuY29udGV4dCA9IHtcbiAgICAgICAgICBtb2RlLFxuICAgICAgICAgIHB1bmN0dWF0b3JzLFxuICAgICAgICAgIGFnZ3JlZ2F0b3JzLFxuICAgICAgICAgIG1hdGNoZXIsXG4gICAgICAgICAgcXVvdGVzLFxuICAgICAgICAgIHNwYW5zLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgY29uc3Qge1xuICAgICAgc3ludGF4OiAkc3ludGF4LFxuICAgICAgbWF0Y2hlcjogJG1hdGNoZXIsXG4gICAgICBxdW90ZXM6ICRxdW90ZXMsXG4gICAgICBwdW5jdHVhdG9yczogJHB1bmN0dWF0b3JzLFxuICAgICAgcHVuY3R1YXRvcnM6IHthZ2dyZWdhdG9yczogJGFnZ3JlZ2F0b3JzfSxcbiAgICB9ID0gbW9kZTtcblxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIGdyb3VwZXIgIT09IChncm91cGVyID0geWllbGQgKGdyb3VwZXIgJiYgZ3JvdXBlci5jb250ZXh0KSB8fCBtb2RlLmNvbnRleHQpICYmXG4gICAgICAgIGdyb3VwZXIgJiZcbiAgICAgICAgIWdyb3VwZXIuY29udGV4dFxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBnb2FsID0gJHN5bnRheCxcbiAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgIHB1bmN0dWF0b3JzID0gJHB1bmN0dWF0b3JzLFxuICAgICAgICAgIGFnZ3JlZ2F0b3JzID0gJGFnZ3JlZ2F0b3JzLFxuICAgICAgICAgIGNsb3NlcixcbiAgICAgICAgICBzcGFucyxcbiAgICAgICAgICBtYXRjaGVyID0gJG1hdGNoZXIsXG4gICAgICAgICAgcXVvdGVzID0gJHF1b3RlcyxcbiAgICAgICAgICBmb3JtaW5nID0gZ29hbCA9PT0gJHN5bnRheCxcbiAgICAgICAgfSA9IGdyb3VwZXI7XG5cbiAgICAgICAgaW5pdGlhbGl6ZShcbiAgICAgICAgICAoZ3JvdXBlci5jb250ZXh0ID0ge1xuICAgICAgICAgICAgbW9kZSxcbiAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICBwdW5jdHVhdG9ycyxcbiAgICAgICAgICAgIGFnZ3JlZ2F0b3JzLFxuICAgICAgICAgICAgY2xvc2VyLFxuICAgICAgICAgICAgc3BhbnMsXG4gICAgICAgICAgICBtYXRjaGVyLFxuICAgICAgICAgICAgcXVvdGVzLFxuICAgICAgICAgICAgZm9ybWluZyxcbiAgICAgICAgICB9KSxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0aWMgKnRva2VuaXplcihjb250ZXh0KSB7XG4gICAgbGV0IGRvbmUsIG5leHQ7XG5cbiAgICBjb25zdCB7XG4gICAgICBtb2RlOiB7XG4gICAgICAgIHN5bnRheCxcbiAgICAgICAga2V5d29yZHMsXG4gICAgICAgIGFzc2lnbmVycyxcbiAgICAgICAgb3BlcmF0b3JzLFxuICAgICAgICBjb21iaW5hdG9ycyxcbiAgICAgICAgbm9uYnJlYWtlcnMsXG4gICAgICAgIGNvbW1lbnRzLFxuICAgICAgICBjbG9zdXJlcyxcbiAgICAgICAgYnJlYWtlcnMsXG4gICAgICAgIHBhdHRlcm5zLFxuICAgICAgfSxcbiAgICAgIHB1bmN0dWF0b3JzLFxuICAgICAgYWdncmVnYXRvcnMsXG4gICAgICBzcGFucyxcbiAgICAgIHF1b3RlcyxcbiAgICAgIGZvcm1pbmcgPSB0cnVlLFxuICAgIH0gPSBjb250ZXh0O1xuXG4gICAgY29uc3Qge21heWJlSWRlbnRpZmllciwgbWF5YmVLZXl3b3JkfSA9IHBhdHRlcm5zIHx8IGNvbnRleHQ7XG4gICAgY29uc3Qgd29yZGluZyA9IGtleXdvcmRzIHx8IG1heWJlSWRlbnRpZmllciA/IHRydWUgOiBmYWxzZTtcblxuICAgIGNvbnN0IExpbmVFbmRpbmdzID0gLyQvZ207XG4gICAgY29uc3QgcHVuY3R1YXRlID0gdGV4dCA9PlxuICAgICAgKG5vbmJyZWFrZXJzICYmIG5vbmJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdub25icmVha2VyJykgfHxcbiAgICAgIChvcGVyYXRvcnMgJiYgb3BlcmF0b3JzLmluY2x1ZGVzKHRleHQpICYmICdvcGVyYXRvcicpIHx8XG4gICAgICAoY29tbWVudHMgJiYgY29tbWVudHMuaW5jbHVkZXModGV4dCkgJiYgJ2NvbW1lbnQnKSB8fFxuICAgICAgKHNwYW5zICYmIHNwYW5zLmluY2x1ZGVzKHRleHQpICYmICdzcGFuJykgfHxcbiAgICAgIChxdW90ZXMgJiYgcXVvdGVzLmluY2x1ZGVzKHRleHQpICYmICdxdW90ZScpIHx8XG4gICAgICAoY2xvc3VyZXMgJiYgY2xvc3VyZXMuaW5jbHVkZXModGV4dCkgJiYgJ2Nsb3N1cmUnKSB8fFxuICAgICAgKGJyZWFrZXJzICYmIGJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdicmVha2VyJykgfHxcbiAgICAgIGZhbHNlO1xuICAgIGNvbnN0IGFnZ3JlZ2F0ZSA9XG4gICAgICAoKGFzc2lnbmVycyAmJiBhc3NpZ25lcnMubGVuZ3RoKSB8fCAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMubGVuZ3RoKSkgJiZcbiAgICAgICh0ZXh0ID0+XG4gICAgICAgIChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLmluY2x1ZGVzKHRleHQpICYmICdhc3NpZ25lcicpIHx8XG4gICAgICAgIChjb21iaW5hdG9ycyAmJiBjb21iaW5hdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnY29tYmluYXRvcicpIHx8XG4gICAgICAgIGZhbHNlKTtcblxuICAgIHdoaWxlICghZG9uZSkge1xuICAgICAgbGV0IHRva2VuLCBwdW5jdHVhdG9yO1xuICAgICAgaWYgKG5leHQgJiYgbmV4dC50ZXh0KSB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICB0ZXh0LCAvLyBUZXh0IGZvciBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgICB0eXBlLCAvLyBUeXBlIG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICAgIC8vIG9mZnNldCwgLy8gSW5kZXggb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgICAgLy8gYnJlYWtzLCAvLyBMaW5lYnJlYWtzIGluIG5leHQgcHJvZHVjdGlvblxuICAgICAgICAgIGhpbnQsIC8vIEhpbnQgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgICAgcHJldmlvdXMsIC8vIFByZXZpb3VzIHByb2R1Y3Rpb25cbiAgICAgICAgICBwYXJlbnQgPSAobmV4dC5wYXJlbnQgPSAocHJldmlvdXMgJiYgcHJldmlvdXMucGFyZW50KSB8fCB1bmRlZmluZWQpLCAvLyBQYXJlbnQgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgICAgbGFzdCwgLy8gTGFzdCBzaWduaWZpY2FudCBwcm9kdWN0aW9uXG4gICAgICAgIH0gPSBuZXh0O1xuXG4gICAgICAgIGlmICh0eXBlID09PSAnc2VxdWVuY2UnKSB7XG4gICAgICAgICAgKG5leHQucHVuY3R1YXRvciA9XG4gICAgICAgICAgICAoYWdncmVnYXRlICYmXG4gICAgICAgICAgICAgIHByZXZpb3VzICYmXG4gICAgICAgICAgICAgIChhZ2dyZWdhdG9yc1t0ZXh0XSB8fFxuICAgICAgICAgICAgICAgICghKHRleHQgaW4gYWdncmVnYXRvcnMpICYmIChhZ2dyZWdhdG9yc1t0ZXh0XSA9IGFnZ3JlZ2F0ZSh0ZXh0KSkpKSkgfHxcbiAgICAgICAgICAgIChwdW5jdHVhdG9yc1t0ZXh0XSB8fFxuICAgICAgICAgICAgICAoISh0ZXh0IGluIHB1bmN0dWF0b3JzKSAmJiAocHVuY3R1YXRvcnNbdGV4dF0gPSBwdW5jdHVhdGUodGV4dCkpKSkgfHxcbiAgICAgICAgICAgIHVuZGVmaW5lZCkgJiYgKG5leHQudHlwZSA9ICdwdW5jdHVhdG9yJyk7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3doaXRlc3BhY2UnKSB7XG4gICAgICAgICAgbmV4dC5icmVha3MgPSB0ZXh0Lm1hdGNoKExpbmVFbmRpbmdzKS5sZW5ndGggLSAxO1xuICAgICAgICB9IGVsc2UgaWYgKGZvcm1pbmcgJiYgd29yZGluZykge1xuICAgICAgICAgIC8vIHR5cGUgIT09ICdpbmRlbnQnICYmXG4gICAgICAgICAgY29uc3Qgd29yZCA9IHRleHQudHJpbSgpO1xuICAgICAgICAgIHdvcmQgJiZcbiAgICAgICAgICAgICgoa2V5d29yZHMgJiZcbiAgICAgICAgICAgICAga2V5d29yZHMuaW5jbHVkZXMod29yZCkgJiZcbiAgICAgICAgICAgICAgKCFsYXN0IHx8IGxhc3QucHVuY3R1YXRvciAhPT0gJ25vbmJyZWFrZXInIHx8IChwcmV2aW91cyAmJiBwcmV2aW91cy5icmVha3MgPiAwKSkgJiZcbiAgICAgICAgICAgICAgKG5leHQudHlwZSA9ICdrZXl3b3JkJykpIHx8XG4gICAgICAgICAgICAgIChtYXliZUlkZW50aWZpZXIgJiYgbWF5YmVJZGVudGlmaWVyLnRlc3Qod29yZCkgJiYgKG5leHQudHlwZSA9ICdpZGVudGlmaWVyJykpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBuZXh0LnR5cGUgPSAndGV4dCc7XG4gICAgICAgIH1cblxuICAgICAgICBwcmV2aW91cyAmJiAocHJldmlvdXMubmV4dCA9IG5leHQpO1xuXG4gICAgICAgIHRva2VuID0gbmV4dDtcbiAgICAgIH1cblxuICAgICAgbmV4dCA9IHlpZWxkIHRva2VuO1xuICAgIH1cbiAgfVxufVxuIiwiaW1wb3J0IHttYXBwaW5ncywgbW9kZXN9IGZyb20gJy4vbW9kZXMuanMnO1xuaW1wb3J0IHtUb2tlbml6ZXJ9IGZyb20gJy4vdG9rZW5pemVyLmpzJztcblxuZXhwb3J0IGNvbnN0IGRlZmF1bHRzID0ge1xuICBtYXRjaGVyOiBtb2Rlcy5kZWZhdWx0Lm1hdGNoZXIsXG4gIHN5bnRheDogJ2RlZmF1bHQnLFxuICBzb3VyY2VUeXBlOiAnZGVmYXVsdCcsXG4gIG1hcHBpbmdzLFxuICBtb2Rlcyxcbn07XG5cbmNvbnN0IHRva2VuaXplcnMgPSBuZXcgV2Vha01hcCgpO1xuXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemUoc291cmNlLCBzdGF0ZSA9IHt9KSB7XG4gIGxldCB7XG4gICAgb3B0aW9uczoge3NvdXJjZVR5cGV9ID0gKHN0YXRlLm9wdGlvbnMgPSB7fSksXG4gIH0gPSBzdGF0ZTtcbiAgY29uc3Qge3N5bnRheCA9ICdkZWZhdWx0J30gPSBtYXBwaW5nc1tzb3VyY2VUeXBlXSB8fCBOdWxsO1xuICBjb25zdCBtb2RlID0gbW9kZXNbc3ludGF4XTtcbiAgaWYgKCFtb2RlKSB0aHJvdyBSZWZlcmVuY2VFcnJvcigndG9rZW5pemUgaW52b2tlZCB3aXRob3V0IGEgbW9kZScpO1xuICBzdGF0ZS5vcHRpb25zLm1vZGUgPSBtb2RlO1xuICBsZXQgdG9rZW5pemVyID0gdG9rZW5pemVycy5nZXQobW9kZSk7XG4gIHRva2VuaXplciB8fCB0b2tlbml6ZXJzLnNldChtb2RlLCAodG9rZW5pemVyID0gbmV3IFRva2VuaXplcihtb2RlKSkpO1xuICAvLyBjb25zb2xlLmxvZyh7dG9rZW5pemVyLCBtb2RlLCBzdGF0ZX0pO1xuICByZXR1cm4gdG9rZW5pemVyLnRva2VuaXplKHNvdXJjZSk7XG59XG5cbiIsImltcG9ydCAqIGFzIG1vZGVzIGZyb20gJy4vbWFya3VwLW1vZGVzLmpzJztcbmltcG9ydCAqIGFzIGRvbSBmcm9tICcuL21hcmt1cC1kb20uanMnO1xuaW1wb3J0ICogYXMgcGFyc2VyIGZyb20gJy4vbWFya3VwLXBhcnNlci5qcyc7XG5pbXBvcnQgKiBhcyBlc3BhcnNlciBmcm9tICcuLi9wYWNrYWdlcy9lc3ByZXNzaW9ucy9saWIvcGFyc2VyL3BhcnNlci5qcyc7XG4vLyBpbXBvcnQgKiBhcyBwYXR0ZXJucyBmcm9tICcuL21hcmt1cC1wYXR0ZXJucy5qcyc7XG5cbmV4cG9ydCBsZXQgaW5pdGlhbGl6ZWQ7XG5cbmV4cG9ydCBjb25zdCByZWFkeSA9IChhc3luYyAoKSA9PiB2b2lkIChhd2FpdCBtb2Rlcy5yZWFkeSkpKCk7XG5cbmNvbnN0IHZlcnNpb25zID0gW1xuICBwYXJzZXIsXG4gIGVzcGFyc2VyXG5dO1xuXG5jb25zdCBpbml0aWFsaXplID0gKCkgPT5cbiAgaW5pdGlhbGl6ZWQgfHxcbiAgKGluaXRpYWxpemVkID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHtjcmVhdGVGcmFnbWVudCwgc3VwcG9ydGVkfSA9IGRvbTtcblxuICAgIC8qKlxuICAgICAqIFRlbXBvcmFyeSB0ZW1wbGF0ZSBlbGVtZW50IGZvciByZW5kZXJpbmdcbiAgICAgKiBAdHlwZSB7SFRNTFRlbXBsYXRlRWxlbWVudD99XG4gICAgICovXG4gICAgY29uc3QgdGVtcGxhdGUgPVxuICAgICAgc3VwcG9ydGVkICYmXG4gICAgICAodGVtcGxhdGUgPT5cbiAgICAgICAgJ0hUTUxUZW1wbGF0ZUVsZW1lbnQnID09PSAodGVtcGxhdGUgJiYgdGVtcGxhdGUuY29uc3RydWN0b3IgJiYgdGVtcGxhdGUuY29uc3RydWN0b3IubmFtZSkgJiZcbiAgICAgICAgdGVtcGxhdGUpKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJykpO1xuXG4gICAgLy8vIEFQSVxuICAgIGNvbnN0IHN5bnRheGVzID0ge307XG4gICAgY29uc3QgcmVuZGVyZXJzID0ge307XG4gICAgY29uc3QgZGVmYXVsdHMgPSB7Li4ucGFyc2VyLmRlZmF1bHRzfTtcblxuICAgIGF3YWl0IHJlYWR5O1xuICAgIC8vLyBEZWZhdWx0c1xuICAgIG1vZGVzLmluc3RhbGwoZGVmYXVsdHMsIHN5bnRheGVzKTtcbiAgICBkb20uaW5zdGFsbChkZWZhdWx0cywgcmVuZGVyZXJzKTtcblxuXG4gICAgLy8gdG9rZW5pemUgPSAoc291cmNlLCBvcHRpb25zKSA9PiBwYXJzZXIudG9rZW5pemUoc291cmNlLCB7b3B0aW9uc30sIGRlZmF1bHRzKTtcbiAgICB0b2tlbml6ZSA9IChzb3VyY2UsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgY29uc3QgdmVyc2lvbiA9IHZlcnNpb25zW29wdGlvbnMudmVyc2lvbiAtIDFdO1xuICAgICAgb3B0aW9ucy50b2tlbml6ZSA9IHZlcnNpb24udG9rZW5pemU7XG4gICAgICAvLyBjb25zdCBzb3VyY2VUeXBlID0gb3B0aW9ucy5zb3VyY2VUeXBlO1xuICAgICAgcmV0dXJuIHZlcnNpb24udG9rZW5pemUoc291cmNlLCB7b3B0aW9uc30sIGRlZmF1bHRzKTtcbiAgICB9O1xuXG4gICAgcmVuZGVyID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICAgICAgY29uc3QgZnJhZ21lbnQgPSBvcHRpb25zLmZyYWdtZW50IHx8IGNyZWF0ZUZyYWdtZW50KCk7XG5cbiAgICAgIGNvbnN0IGVsZW1lbnRzID0gcGFyc2VyLnJlbmRlcihzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzKTtcbiAgICAgIGxldCBmaXJzdCA9IGF3YWl0IGVsZW1lbnRzLm5leHQoKTtcblxuICAgICAgbGV0IGxvZ3MgPSAoZnJhZ21lbnQubG9ncyA9IFtdKTtcblxuICAgICAgaWYgKGZpcnN0ICYmICd2YWx1ZScgaW4gZmlyc3QpIHtcbiAgICAgICAgaWYgKCFkb20ubmF0aXZlICYmIHRlbXBsYXRlICYmICd0ZXh0Q29udGVudCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAndGV4dCcgaW4gdGVtcGxhdGVgKTtcbiAgICAgICAgICBjb25zdCBib2R5ID0gW2ZpcnN0LnZhbHVlXTtcbiAgICAgICAgICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgYm9keS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGJvZHkuam9pbignJyk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY29udGVudCk7XG5cbiAgICAgICAgICAvLyBpZiAoIWZpcnN0LmRvbmUpIHtcbiAgICAgICAgICAvLyAgIGlmICh0eXBlb2YgcmVxdWVzdEFuaW1hdGlvbkZyYW1lID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgLy8gICAgIC8vICAmJiBmaXJzdC52YWx1ZS50b2tlblxuICAgICAgICAgIC8vICAgICBsZXQgbGluZXMgPSAwO1xuICAgICAgICAgIC8vICAgICBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHtcbiAgICAgICAgICAvLyAgICAgICAvLyBlbGVtZW50LnRva2VuICYmXG4gICAgICAgICAgLy8gICAgICAgLy8gICBlbGVtZW50LnRva2VuLmJyZWFrcyA+IDAgJiZcbiAgICAgICAgICAvLyAgICAgICAvLyAgIChsaW5lcyArPSBlbGVtZW50LnRva2VuLmJyZWFrcykgJSAyID09PSAwICYmXG4gICAgICAgICAgLy8gICAgICAgbGluZXMrKyAlIDEwID09PSAwICYmXG4gICAgICAgICAgLy8gICAgICAgICAoKHRlbXBsYXRlLmlubmVySFRNTCA9IGJvZHkuc3BsaWNlKDAsIGJvZHkubGVuZ3RoKS5qb2luKCcnKSksXG4gICAgICAgICAgLy8gICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jb250ZW50KSk7XG4gICAgICAgICAgLy8gICAgICAgLy8gYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKVxuICAgICAgICAgIC8vICAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlcXVlc3RBbmltYXRpb25GcmFtZSlcbiAgICAgICAgICAvLyAgICAgICBib2R5LnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgLy8gICAgIH1cbiAgICAgICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gICAgIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgYm9keS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgIC8vICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBib2R5LmpvaW4oJycpOyAvLyB0ZXh0XG4gICAgICAgICAgLy8gICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRlbXBsYXRlLmNvbnRlbnQpO1xuICAgICAgICAgIC8vICAgfVxuICAgICAgICAgIC8vIH1cbiAgICAgICAgfSBlbHNlIGlmICgncHVzaCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAncHVzaCcgaW4gZnJhZ21lbnRgKTtcbiAgICAgICAgICBmcmFnbWVudC5wdXNoKGZpcnN0LnZhbHVlKTtcbiAgICAgICAgICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZnJhZ21lbnQucHVzaChlbGVtZW50KTtcbiAgICAgICAgfSBlbHNlIGlmICgnYXBwZW5kJyBpbiBmcmFnbWVudCkge1xuICAgICAgICAgIC8vICAmJiBmaXJzdC52YWx1ZS5ub2RlVHlwZSA+PSAxXG4gICAgICAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ2FwcGVuZCcgaW4gZnJhZ21lbnRgKTtcbiAgICAgICAgICBmcmFnbWVudC5hcHBlbmQoZmlyc3QudmFsdWUpO1xuICAgICAgICAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBmcmFnbWVudC5hcHBlbmQoZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gZWxzZSBpZiAoJ3RleHRDb250ZW50JyBpbiBmcmFnbWVudCkge1xuICAgICAgICAvLyAgIGxldCB0ZXh0ID0gYCR7Zmlyc3QudmFsdWV9YDtcbiAgICAgICAgLy8gICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgdGV4dCArPSBgJHtlbGVtZW50fWA7XG4gICAgICAgIC8vICAgaWYgKHRlbXBsYXRlKSB7XG4gICAgICAgIC8vICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAndGV4dCcgaW4gdGVtcGxhdGVgKTtcbiAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAvLyAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3RleHQnIGluIGZyYWdtZW50YCk7XG4gICAgICAgIC8vICAgICAvLyBUT0RPOiBGaW5kIGEgd29ya2Fyb3VuZCBmb3IgRG9jdW1lbnRGcmFnbWVudC5pbm5lckhUTUxcbiAgICAgICAgLy8gICAgIGZyYWdtZW50LmlubmVySFRNTCA9IHRleHQ7XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmcmFnbWVudDtcbiAgICB9O1xuXG4gICAgaW5pdGlhbGl6ZWQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIG1hcmt1cDtcbiAgfSkoKTtcblxuZXhwb3J0IGxldCByZW5kZXIgPSBhc3luYyAoc291cmNlLCBvcHRpb25zKSA9PiB7XG4gIGF3YWl0IGluaXRpYWxpemUoKTtcbiAgcmV0dXJuIGF3YWl0IHJlbmRlcihzb3VyY2UsIG9wdGlvbnMpO1xufTtcblxuZXhwb3J0IGxldCB0b2tlbml6ZSA9IChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgaWYgKCFpbml0aWFsaXplZClcbiAgICB0aHJvdyBFcnJvcihgTWFya3VwOiB0b2tlbml6ZSjigKYpIGNhbGxlZCBiZWZvcmUgaW5pdGlhbGl6YXRpb24uICR7TWVzc2FnZXMuSW5pdGlhbGl6ZUZpcnN0fWApO1xuICBlbHNlIGlmIChpbml0aWFsaXplZC50aGVuKVxuICAgIEVycm9yKGBNYXJrdXA6IHRva2VuaXplKOKApikgY2FsbGVkIGR1cmluZyBpbml0aWFsaXphdGlvbi4gJHtNZXNzYWdlcy5Jbml0aWFsaXplRmlyc3R9YCk7XG4gIHJldHVybiBtYXJrdXAudG9rZW5pemUoc291cmNlLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGtleUZyb20gPSBvcHRpb25zID0+IChvcHRpb25zICYmIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKSB8fCAnJztcbmNvbnN0IHNraW0gPSBpdGVyYWJsZSA9PiB7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBpdGVyYWJsZSk7XG59O1xuXG5leHBvcnQgY29uc3Qgd2FybXVwID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICBjb25zdCBrZXkgPSAob3B0aW9ucyAmJiBrZXlGcm9tKG9wdGlvbnMpKSB8fCAnJztcbiAgbGV0IGNhY2hlID0gKHdhcm11cC5jYWNoZSB8fCAod2FybXVwLmNhY2hlID0gbmV3IE1hcCgpKSkuZ2V0KGtleSk7XG4gIGNhY2hlIHx8IHdhcm11cC5jYWNoZS5zZXQoa2V5LCAoY2FjaGUgPSBuZXcgU2V0KCkpKTtcbiAgYXdhaXQgKGluaXRpYWxpemVkIHx8IGluaXRpYWxpemUoKSk7XG4gIC8vIGxldCB0b2tlbnM7XG4gIGNhY2hlLmhhcyhzb3VyY2UpIHx8IChza2ltKHRva2VuaXplKHNvdXJjZSwgb3B0aW9ucykpLCBjYWNoZS5hZGQoc291cmNlKSk7XG4gIC8vIGNhY2hlLmhhcyhzb3VyY2UpIHx8ICgodG9rZW5zID0+IHsgd2hpbGUgKCF0b2tlbnMubmV4dCgpLmRvbmUpOyB9KSh0b2tlbml6ZShzb3VyY2UsIG9wdGlvbnMpKSwgY2FjaGUuYWRkKHNvdXJjZSkpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBtYXJrdXAgPSBPYmplY3QuY3JlYXRlKHBhcnNlciwge1xuICBpbml0aWFsaXplOiB7Z2V0OiAoKSA9PiBpbml0aWFsaXplfSxcbiAgcmVuZGVyOiB7Z2V0OiAoKSA9PiByZW5kZXJ9LFxuICB0b2tlbml6ZToge2dldDogKCkgPT4gdG9rZW5pemV9LFxuICB3YXJtdXA6IHtnZXQ6ICgpID0+IHdhcm11cH0sXG4gIGRvbToge2dldDogKCkgPT4gZG9tfSxcbiAgbW9kZXM6IHtnZXQ6ICgpID0+IHBhcnNlci5tb2Rlc30sXG59KTtcblxuLy8vIENPTlNUQU5UU1xuXG5jb25zdCBNZXNzYWdlcyA9IHtcbiAgSW5pdGlhbGl6ZUZpcnN0OiBgVHJ5IGNhbGxpbmcgTWFya3VwLmluaXRpYWxpemUoKS50aGVuKOKApikgZmlyc3QuYCxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1hcmt1cDtcbiJdLCJuYW1lcyI6WyJkZWZhdWx0cyIsIk51bGwiLCJ0b2tlbml6ZSIsInN5bnRheGVzIiwibWF0Y2hlcnMiLCJyZWFkeSIsImRvY3VtZW50IiwiRWxlbWVudCIsIk5vZGUiLCJUZXh0IiwiRG9jdW1lbnRGcmFnbWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjcmVhdGVUZXh0IiwiY3JlYXRlRnJhZ21lbnQiLCJkb20uZG9jdW1lbnQiLCJyZW5kZXJlciIsImluc3RhbGwiLCJkb20ubmF0aXZlIiwibmF0aXZlIiwiZG9tLnBzZXVkbyIsInJhdyIsInNlcXVlbmNlIiwiaWRlbnRpZmllciIsImFsbCIsInBhdHRlcm5zIiwiZW50aXRpZXMiLCJtb2RlcyIsIkdyb3VwZXIiLCJjcmVhdGVHcm91cGVyIiwibW9kZXMucmVhZHkiLCJpbml0aWFsaXplZCIsInN1cHBvcnRlZCIsImRvbSIsInJlbmRlcmVycyIsInBhcnNlci5kZWZhdWx0cyIsIm1vZGVzLmluc3RhbGwiLCJkb20uaW5zdGFsbCIsInJlbmRlciIsInBhcnNlci5yZW5kZXIiLCJtYXJrdXAiLCJwYXJzZXIubW9kZXMiXSwibWFwcGluZ3MiOiI7Ozs7OztFQUFBO0FBQ0EsRUFBTyxTQUFTLE1BQU0sQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFO0VBQ3BFLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztFQUNoRCxDQUFDOztFQUVEOztFQUVBO0FBQ0EsRUFBTyxNQUFNLFFBQVEsR0FBRztFQUN4QixFQUFFLE9BQU8sRUFBRSxvREFBb0Q7RUFDL0QsRUFBRSxRQUFRLEVBQUUsa0VBQWtFO0VBQzlFLEVBQUUsTUFBTSxFQUFFLCtDQUErQztFQUN6RCxFQUFFLEdBQUcsRUFBRSwyR0FBMkc7RUFDbEg7RUFDQSxFQUFFLFNBQVMsRUFBRSxrTUFBa007RUFDL00sQ0FBQyxDQUFDOztFQUVGO0FBQ0EsRUFBTyxNQUFNLFFBQVEsR0FBRztFQUN4QjtFQUNBLEVBQUUsWUFBWSxFQUFFLGVBQWU7RUFDL0IsQ0FBQyxDQUFDOztFQUVGO0VBQ0E7QUFDQSxFQUFPLE1BQU0sUUFBUSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzs7RUFFM0U7QUFDQSxFQUFPLE1BQU0sS0FBSyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7O0VBRXBEO0VBQ0E7QUFDQSxFQUFPLE1BQU1BLFVBQVEsSUFBSSxNQUFNLENBQUMsUUFBUSxHQUFHO0VBQzNDLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxTQUFTO0VBQzdCLEVBQUUsTUFBTSxFQUFFLFNBQVM7RUFDbkIs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TSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUM7RUFDekQsS0FBSyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLElBQUksS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUM7O0VBRXRFLEVBQUUsTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDOztFQUVyRCxFQUFFLElBQUksSUFBSTtFQUNWLElBQUksTUFBTSxHQUFHLEdBQUc7RUFDaEIsSUFBSSxJQUFJLENBQUM7O0VBRVQsRUFBRSxJQUFJLFdBQVcsQ0FBQzs7RUFFbEIsRUFBRSxNQUFNO0VBQ1IsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztFQUNoRixHQUFHLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQzs7RUFFeEIsRUFBRSxNQUFNLFdBQVcsR0FBRyxjQUFjLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0VBQ2xELEVBQUUsSUFBSSxRQUFRLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQzs7RUFFMUM7RUFDQSxFQUFFLENBQUMsTUFBTTtFQUNULEtBQUssUUFBUSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLFVBQVUsS0FBSyxNQUFNLENBQUM7RUFDaEcsS0FBSyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztFQUMzRCxLQUFLLFFBQVEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxL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
