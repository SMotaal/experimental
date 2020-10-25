//@ts-check

/**
 * @typedef {string|number|boolean|null|undefined} primitive
 * @typedef {Record<string, primitive>} Entries
 * @typedef {HTMLFormElement|FormData|{entries: Entries}} Source
 * @typedef {Readonly<{values: Readonly<string[]>, scoring?: Readonly<Record<string, Readonly<number[]>>>}>} Psychometrics.Options
 * @typedef {{ number: number, prompt: string, scoring?: string, score?: number, value?: string }} Psychometrics.Item
 * @typedef {{options?: Psychometrics.Options, items?: Psychometrics.Item[],  score?: number}} Psychometrics
 */
export class TEQResults {
  /** @param {Source} [source] */
  constructor(source) {
    this.source = source;

    this.form =
      (source != null &&
        typeof source === 'object' &&
        typeof HTMLFormElement === 'function' &&
        source instanceof HTMLFormElement &&
        source) ||
      null;

    if (this.form) {
      if (this.form.elements['teq.psychometrics.score']) this.form.elements['teq.psychometrics.score'].value = '';
      if (this.form.elements['teq.psychometrics.results']) this.form.elements['teq.psychometrics.results'].value = '';
    }

    this.formData =
      (typeof FormData === 'function' &&
        ((this.form && new FormData(this.form)) || (source instanceof FormData && source))) ||
      null;

    if (this.formData) {
      this.formData.delete('teq.psychometrics.score');
      this.formData.delete('teq.psychometrics.results');
    }

    this.entries = Object.freeze(/** @type {Entries} */ (Object.fromEntries([...this.formData])));

    // this.entries = Object.freeze(
    //   /** @type {Entries} */ ({
    //     ...((source != null &&
    //       typeof source === 'object' &&
    //       ((typeof HTMLFormElement === 'function' &&
    //         source instanceof HTMLFormElement &&
    //         Object.fromEntries([...new FormData(source)])) ||
    //         (typeof FormData === 'function' && source instanceof FormData && Object.fromEntries([...source])))) ||
    //       undefined),
    //   }),
    // );
    this.psychometrics = /** @type {Psychometrics} */ ({
      ...new.target.psychometrics,
      items: [...new.target.psychometrics.items],
      score: 0,
    });

    for (
      let n = this.psychometrics.items.length, i = 0;
      n--;
      this.psychometrics.score += (this.psychometrics.items[i] = Object.freeze({
        ...this.psychometrics.items[i],
        score: Number(this.entries[`teq.psychometrics.items[${this.psychometrics.items[i].number}].score`]),
      })).score,
        i++
    );

    Object.freeze(this.psychometrics);
    Object.freeze(this);

    if (this.formData) {
      this.formData.set('teq.psychometrics.score', String(this.psychometrics.score));
      this.formData.set('teq.psychometrics.results', new Blob([JSON.stringify(this.psychometrics)], {type: 'text/json'}));
    }

    if (this.form) {
      if (this.form.elements['teq.psychometrics.score'])
        this.form.elements['teq.psychometrics.score'].value = this.psychometrics.score;
    }
  }

  /** @param {Source} [source] */
  static from(source) {
    return new (this || TEQResults)(source);
  }

  /** @param {Source} source */
  static score(source) {
    const results = (this || TEQResults).from(source);
    // console.log('%O', (this || TEQResults).score, results);
    console.log(results);
    return results;
  }
}

/** @param {TEQResults['source']} source */
export const scoreTEQ = source => TEQResults.score(source);

TEQResults.psychometrics = Object.freeze({
  options: Object.freeze({
    values: Object.freeze(['Never', 'Rarely', 'Sometimes', 'Often', 'Always']),
    scoring: Object.freeze({
      standard: Object.freeze([0, 1, 2, 3, 4]),
      inverted: Object.freeze([4, 3, 2, 1, 0]),
    }),
  }),
  items: Object.freeze([
    Object.freeze({
      number: 1,
      prompt: 'When someone else is feeling excited, I tend to get excited too.',
      scoring: 'standard',
    }),
    Object.freeze({
      number: 2,
      prompt: 'Other people’s misfortunes do not disturb me a great deal.',
      scoring: 'inverted',
    }),
    Object.freeze({
      number: 3,
      prompt: 'It upsets me to see someone being treated disrespectfully.',
      scoring: 'standard',
    }),
    Object.freeze({
      number: 4,
      prompt: 'I remain unaffected when someone close to me is happy.',
      scoring: 'inverted',
    }),
    Object.freeze({number: 5, prompt: 'I enjoy making other people feel better.', scoring: 'standard'}),
    Object.freeze({
      number: 6,
      prompt: 'I have tender, concerned feelings for people less fortunate than me.',
      scoring: 'standard',
    }),
    Object.freeze({
      number: 7,
      prompt:
        'When a friend starts to talk about hisher problems, I try to steer the conversation towards something else.',
      scoring: 'inverted',
    }),
    Object.freeze({
      number: 8,
      prompt: 'I can tell when others are sad even when they do not say anything.',
      scoring: 'standard',
    }),
    Object.freeze({
      number: 9,
      prompt: 'I find that I am “in tune” with other people’s moods.',
      scoring: 'standard',
    }),
    Object.freeze({
      number: 10,
      prompt: 'I do not feel sympathy for people who cause their own serious illnesses.',
      scoring: 'inverted',
    }),
    Object.freeze({number: 11, prompt: 'I become irritated when someone cries.', scoring: 'inverted'}),
    Object.freeze({
      number: 12,
      prompt: 'I am not really interested in how other people feel.',
      scoring: 'inverted',
    }),
    Object.freeze({
      number: 13,
      prompt: 'I get a strong urge to help when I see someone who is upset.',
      scoring: 'standard',
    }),
    Object.freeze({
      number: 14,
      prompt: 'When I see someone being treated unfairly, I do not feel very much pity for them.',
      scoring: 'inverted',
    }),
    Object.freeze({
      number: 15,
      prompt: 'I find it silly for people to cry out of happiness.',
      scoring: 'inverted',
    }),
    Object.freeze({
      number: 16,
      prompt: 'When I see someone being taken advantage of, I feel kind of protective towards himher.',
      scoring: 'standard',
    }),
  ]),
});
