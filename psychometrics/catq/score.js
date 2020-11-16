//@ts-check

/**
 * @typedef {string|number|boolean|null|undefined} primitive
 * @typedef {Record<string, primitive>} Entries
 * @typedef {HTMLFormElement|FormData|{entries: Entries}} Source
 * @typedef {string[] | Readonly<{values: Readonly<string[]>, scoring?: Readonly<Record<string, Readonly<number[]>>>}>} Psychometrics.Options
 * @typedef {{ number: number, prompt: string, scale?: string, subscale?: string, score?: number, value?: string }} Psychometrics.Item
 * @typedef {Record<string, number>} Psychometrics.Scale
 * @typedef {Record<string, Psychometrics.Scale>} Psychometrics.Scales
 * @typedef {{items?: number[]|{length:number}, score?: number}} Psychometrics.Subscale
 * @typedef {Record<string, Psychometrics.Subscale>} Psychometrics.Subscales
 * @typedef {{options?: Psychometrics.Options, items?: Psychometrics.Item[],  score?: number, scales?: Psychometrics.Scales, subscales?: Psychometrics.Subscales}} Psychometrics
 */
export class CATQResults {
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
      if (this.form.elements['catq.psychometrics.score']) this.form.elements['catq.psychometrics.score'].value = '';
      if (this.form.elements['catq.psychometrics.results']) this.form.elements['catq.psychometrics.results'].value = '';
    }

    this.formData =
      (typeof FormData === 'function' &&
        ((this.form && new FormData(this.form)) || (source instanceof FormData && source))) ||
      null;

    if (this.formData) {
      this.formData.delete('catq.psychometrics.score');
      this.formData.delete('catq.psychometrics.results');
    }

    this.entries = Object.freeze(/** @type {Entries} */ (Object.fromEntries([...this.formData])));

    this.entries = Object.freeze(
      /** @type {Entries} */ ({
        ...((source != null &&
          typeof source === 'object' &&
          ((typeof HTMLFormElement === 'function' &&
            source instanceof HTMLFormElement &&
            Object.fromEntries([...new FormData(source)])) ||
            (typeof FormData === 'function' && source instanceof FormData && Object.fromEntries([...source])))) ||
          undefined),
      }),
    );

    this.psychometrics = new.target.psychometrics
      ? /** @type {Psychometrics} */ ({
          ...new.target.psychometrics,
          items: [...new.target.psychometrics.items],
          score: 0,
        })
      : null;

    if (this.psychometrics) {
      if (this.psychometrics.subscales) {
        this.psychometrics.subscales = {...this.psychometrics.subscales};
        for (const subscale in this.psychometrics.subscales)
          this.psychometrics.subscales[subscale] = {...this.psychometrics.subscales[subscale]};
      }

      for (let n = this.psychometrics.items.length, i = 0, k, t, s; n--; i++) {
        this.psychometrics.score += (this.psychometrics.items[i] = Object.freeze({
          ...(t = this.psychometrics.items[i]),
          score: (s =
            Number(
              t == null
                ? null
                : (k = `catq.psychometrics.items[${t.number}]`) in this.entries
                ? this.psychometrics.scales[t.scale][/** @type {string} */ (this.entries[k])]
                : this.entries[`catq.psychometrics.items[${t.number}].score`],
            ) || 0),
        })).score;
        t.subscale &&
          this.psychometrics.subscales &&
          this.psychometrics.subscales[t.subscale] &&
          (this.psychometrics.subscales[t.subscale].score = (this.psychometrics.subscales[t.subscale].score || 0) + s);
      }

      if (this.psychometrics.subscales)
        for (const subscale in this.psychometrics.subscales) Object.freeze(this.psychometrics.subscales[subscale]);

      Object.freeze(this.psychometrics);
    }

    Object.freeze(this);

    if (this.psychometrics) {
      if (this.formData) {
        this.formData.set('catq.psychometrics.score', String(this.psychometrics.score));
        this.formData.set(
          'catq.psychometrics.results',
          new Blob([JSON.stringify(this.psychometrics)], {type: 'text/json'}),
        );
      }

      if (this.form) {
        if (this.form.elements['catq.psychometrics.score'])
          this.form.elements['catq.psychometrics.score'].value = this.psychometrics.score;
        if (this.psychometrics.subscales)
          for (const subscale in this.psychometrics.subscales)
            this.form.elements[`catq.psychometrics.subscales.${subscale}.score`] &&
              (this.form.elements[`catq.psychometrics.subscales.${subscale}.score`].value = Number(
                this.psychometrics.subscales[subscale] ? this.psychometrics.subscales[subscale].score : null,
              ));
      }
    }
  }

  /** @param {Source} [source] */
  static from(source) {
    return new (this || CATQResults)(source);
  }

  /** @param {Source} source */
  static score(source) {
    const results = (this || CATQResults).from(source);
    // console.log('%O', (this || CATQResults).score, results);
    console.log(results);
    return results;
  }
}

/** @param {CATQResults['source']} source */
export const scoreForm = source => CATQResults.score(source);

CATQResults.psychometrics = JSON.parse(
  /* json */ `{
    "description": "Camouflaging Autistic Traits Questionnaire (CAT-Q)",
    "meta": {
      "links": {
        "overview": "https://embraceasd.com/cat-q/"
      }
    },
    "options": [
      "Strongly Disagree",
      "Disagree",
      "Somewhat Disagree",
      "Neither Agree nor Disagree",
      "Somewhat Agree",
      "Agree",
      "Strongly Agree"
    ],
    "scales": {
      "standard": {
        "Strongly Disagree": 1,
        "Disagree": 2,
        "Somewhat Disagree": 3,
        "Neither Agree nor Disagree": 4,
        "Somewhat Agree": 5,
        "Agree": 6,
        "Strongly Agree": 7
      },
      "inverted": {
        "Strongly Disagree": 7,
        "Disagree": 6,
        "Somewhat Disagree": 5,
        "Neither Agree nor Disagree": 4,
        "Somewhat Agree": 3,
        "Agree": 2,
        "Strongly Agree": 1
      }
    },
    "subscales": {
      "Compensation": {"items": {"length": 9}},
      "Masking": {"items": {"length": 8}},
      "Assimilation": {"items": {"length": 8}}
    },
    "items": [
      {
        "number": 1,
        "prompt": "When I am interacting with someone, I deliberately copy their body language or facial expressions.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 2,
        "prompt": "I monitor my body language or facial expressions so that I appear relaxed.",
        "scale": "standard",
        "subscale": "Masking"
      },
      {
        "number": 3,
        "prompt": "I rarely feel the need to put on an act in order to get through a social situation.",
        "scale": "inverted",
        "subscale": "Assimilation"
      },
      {
        "number": 4,
        "prompt": "I have developed a script to follow in social situations.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 5,
        "prompt": "I will repeat phrases that I have heard others say in the exact same way that I first heard them.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 6,
        "prompt": "I adjust my body language or facial expressions so that I appear interested by the person I am interacting with.",
        "scale": "standard",
        "subscale": "Masking"
      },
      {
        "number": 7,
        "prompt": "In social situations, I feel like I’m ‘performing’ rather than being myself.",
        "scale": "standard",
        "subscale": "Assimilation"
      },
      {
        "number": 8,
        "prompt": "In my own social interactions, I use behaviours that I have learned from watching other people interacting.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 9,
        "prompt": "I always think about the impression I make on other people.",
        "scale": "standard",
        "subscale": "Masking"
      },
      {
        "number": 10,
        "prompt": "I need the support of other people in order to socialise.",
        "scale": "standard",
        "subscale": "Assimilation"
      },
      {
        "number": 11,
        "prompt": "I practice my facial expressions and body language to make sure they look natural.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 12,
        "prompt": "I don’t feel the need to make eye contact with other people if I don’t want to.",
        "scale": "inverted",
        "subscale": "Masking"
      },
      {
        "number": 13,
        "prompt": "I have to force myself to interact with people when I am in social situations.",
        "scale": "standard",
        "subscale": "Assimilation"
      },
      {
        "number": 14,
        "prompt": "I have tried to improve my understanding of social skills by watching other people.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 15,
        "prompt": "I monitor my body language or facial expressions so that I appear interested by the person I am interacting with.",
        "scale": "standard",
        "subscale": "Masking"
      },
      {
        "number": 16,
        "prompt": "When in social situations, I try to find ways to avoid interacting with others.",
        "scale": "standard",
        "subscale": "Assimilation"
      },
      {
        "number": 17,
        "prompt": "I have researched the rules of social interactions to improve my own social skills.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 18,
        "prompt": "I am always aware of the impression I make on other people.",
        "scale": "standard",
        "subscale": "Masking"
      },
      {
        "number": 19,
        "prompt": "I feel free to be myself when I am with other people.",
        "scale": "inverted",
        "subscale": "Assimilation"
      },
      {
        "number": 20,
        "prompt": "I learn how people use their bodies and faces to interact by watching television or films, or by reading fiction.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 21,
        "prompt": "I adjust my body language or facial expressions so that I appear relaxed.",
        "scale": "standard",
        "subscale": "Masking"
      },
      {
        "number": 22,
        "prompt": "When talking to other people, I feel like the conversation flows naturally.",
        "scale": "inverted",
        "subscale": "Assimilation"
      },
      {
        "number": 23,
        "prompt": "I have spent time learning social skills from television shows and films, and try to use these in my interactions.",
        "scale": "standard",
        "subscale": "Compensation"
      },
      {
        "number": 24,
        "prompt": "In social interactions, I do not pay attention to what my face or body are doing.",
        "scale": "inverted",
        "subscale": "Masking"
      },
      {
        "number": 25,
        "prompt": "In social situations, I feel like I am pretending to be ‘normal’.",
        "scale": "standard",
        "subscale": "Assimilation"
      }
    ]
  }`,
  (key, value) => Object.freeze(value),
);
