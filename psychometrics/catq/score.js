//@ts-check

/**
 * @typedef {string|number|boolean|null|undefined} primitive
 * @typedef {Record<string, primitive>} Entries
 * @typedef {HTMLFormElement|FormData|{entries: Entries}} Source
 * @typedef {string[] | Readonly<{values: Readonly<string[]>, scoring?: Readonly<Record<string, Readonly<number[]>>>}>} Psychometrics.Options
 * @typedef {{ number: number, prompt: string, scale?: string, subscale?: string, score?: number, value?: string, psychometric?: string }} Psychometrics.Item
 * @typedef {Record<string, number>} Psychometrics.Scale
 * @typedef {Record<string, Psychometrics.Scale>} Psychometrics.Scales
 * @typedef {{items?: number[]|{length:number}, score?: number}} Psychometrics.Subscale
 * @typedef {Record<string, Psychometrics.Subscale>} Psychometrics.Subscales
 * @typedef {{id?: string, psychometric?: string, options?: Psychometrics.Options, items?: Psychometrics.Item[],  score?: number, scales?: Psychometrics.Scales, subscales?: Psychometrics.Subscales, scores?: Record<string, number>}} Psychometrics
 * @typedef {Partial<Pick<typeof CATQResults, 'definitions' | 'mappings'>>} Options
 */
export class CATQResults {
  /**
   * @param {Source} [source]
   * @param {Options} [options]
   */
  constructor(source, options) {
    this.definitions = Object.freeze({
      ...new.target.definitions,
      ...(options && options.definitions),
    });

    this.mappings = Object.freeze({
      ...new.target.mappings,
      ...(options && options.mappings),
      columnIds: Object.freeze({
        ...(new.target.mappings && new.target.mappings.columnIds),
        ...(options && options.mappings && options.mappings.columndIds),
      }),
      rowIds: Object.freeze({
        ...(new.target.mappings && new.target.mappings.rowIds),
        ...(options && options.mappings && options.mappings.rowIds),
      }),
    });

    this.source = source;

    this.form =
      (source != null &&
        typeof source === 'object' &&
        typeof HTMLFormElement === 'function' &&
        source instanceof HTMLFormElement &&
        source) ||
      null;

    this.formData =
      (typeof FormData === 'function' &&
        ((this.form && new FormData(this.form)) || (source instanceof FormData && source))) ||
      null;

    if (this.form) {
      this.entries = new FormData(this.form);
      this.elements = this.form.elements;
    } else if (this.formData) {
      this.entries = this.formData;
      this.elements = undefined;
    } else {
      this.entries = new Map(Object.entries(source));
      this.elements = undefined;
    }

    new.target.update(this);

    this.scores = Object.freeze(new.target.score(this));

    Object.freeze(this);

    new.target.update(this);
  }

  // static calculate

  /** @param {Source} [source] */
  static from(source) {
    return new (this || CATQResults)(source);
  }

  /** @param {Pick<CATQResults, 'scores' | 'form' | 'entries' | 'mappings'>} instance */
  static update({scores, form, entries, mappings: {columnIds, rowIds, idSeparator = ';'} = this.mappings}) {
    const logs = [];
    if (form) {
      const {elements} = form;
      for (const rowKey in rowIds) {
        const rowId = rowIds[rowKey];
        const rowValue = entries.get(rowId);
        const rowElement = elements[rowId];
        rowElement &&
          'value' in rowElement &&
          rowElement.value !== rowValue &&
          ((rowElement.value = rowValue || ''), logs.push({rowKey, rowId, rowValue, rowElement}));
        for (const columnKey in columnIds) {
          const columnId = columnIds[columnKey];
          const entryId = `${rowId}${idSeparator}${columnId}`;
          const entryValue = entries.get(entryId);
          const columnElement = elements[entryId];

          columnElement &&
            'value' in columnElement &&
            columnElement.value !== entryValue &&
            ((columnElement.value = entryValue || ''),
            logs.push({rowKey, columnKey, rowId, columnId, entryId, entryValue, formElement: columnElement}));
        }
      }
    }
    // console.log('update', logs);
  }

  /** @param {Pick<CATQResults, 'entries' | 'definitions' | 'mappings'>} instance */
  static score({
    entries,
    definitions = this.definitions,
    mappings: {columnIds, rowIds, totalRow = 'total', totalColumn = 'score', idSeparator = ';'} = this.mappings,
  }) {
    const logs = [];
    const scores = {};
    const totals = {};

    for (const {number, scale, subscale} of definitions.items) {
      const {[number]: columns = (scores[number] = {})} = scores;
      const score = Number(definitions.scales[scale][/** @type {string} */ (entries.get(rowIds[number]))]);
      for (const columnKey in columnIds) {
        totals[columnKey] =
          (totals[columnKey] || 0) +
          ((columns[columnKey] = columnKey === totalColumn || columnKey === subscale ? score : NaN) || 0);
      }
    }

    scores[totalRow] = totals;

    for (const rowKey in rowIds) {
      const rowId = rowIds[rowKey];
      for (const columnKey in columnIds) {
        const columnId = columnIds[columnKey];
        const entryId = `${rowId}${idSeparator}${columnId}`;
        const entryValue = scores[rowKey][columnKey];
        isNaN(entryValue) ? entries.delete(entryId) : entries.set(entryId, `${entryValue}`);
        logs.push({rowKey, rowId, columnKey, columnId, entryId, entryValue});
      }
    }

    // console.log('score', logs);

    return scores;
  }
}

/** @param {CATQResults['source']} source */
export const scoreForm = (source, mappings) => CATQResults.from(source, {mappings});

CATQResults.definitions = JSON.parse(
  /* json */ `{
    "id": "psychometrics:catq",
    "psychometric": "CAT-Q",
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
      "compensation": { "description": "Compensation", "items": { "length": 9 } },
      "masking": { "description": "Masking", "items": { "length": 8 } },
      "assimilation": { "description": "Assimilation", "items": { "length": 8 } }
    },
    "items": [
      {
        "number": 1,
        "prompt": "When I am interacting with someone, I deliberately copy their body language or facial expressions.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 2,
        "prompt": "I monitor my body language or facial expressions so that I appear relaxed.",
        "scale": "standard",
        "subscale": "masking"
      },
      {
        "number": 3,
        "prompt": "I rarely feel the need to put on an act in order to get through a social situation.",
        "scale": "inverted",
        "subscale": "assimilation"
      },
      {
        "number": 4,
        "prompt": "I have developed a script to follow in social situations.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 5,
        "prompt": "I will repeat phrases that I have heard others say in the exact same way that I first heard them.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 6,
        "prompt": "I adjust my body language or facial expressions so that I appear interested by the person I am interacting with.",
        "scale": "standard",
        "subscale": "masking"
      },
      {
        "number": 7,
        "prompt": "In social situations, I feel like I’m ‘performing’ rather than being myself.",
        "scale": "standard",
        "subscale": "assimilation"
      },
      {
        "number": 8,
        "prompt": "In my own social interactions, I use behaviours that I have learned from watching other people interacting.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 9,
        "prompt": "I always think about the impression I make on other people.",
        "scale": "standard",
        "subscale": "masking"
      },
      {
        "number": 10,
        "prompt": "I need the support of other people in order to socialise.",
        "scale": "standard",
        "subscale": "assimilation"
      },
      {
        "number": 11,
        "prompt": "I practice my facial expressions and body language to make sure they look natural.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 12,
        "prompt": "I don’t feel the need to make eye contact with other people if I don’t want to.",
        "scale": "inverted",
        "subscale": "masking"
      },
      {
        "number": 13,
        "prompt": "I have to force myself to interact with people when I am in social situations.",
        "scale": "standard",
        "subscale": "assimilation"
      },
      {
        "number": 14,
        "prompt": "I have tried to improve my understanding of social skills by watching other people.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 15,
        "prompt": "I monitor my body language or facial expressions so that I appear interested by the person I am interacting with.",
        "scale": "standard",
        "subscale": "masking"
      },
      {
        "number": 16,
        "prompt": "When in social situations, I try to find ways to avoid interacting with others.",
        "scale": "standard",
        "subscale": "assimilation"
      },
      {
        "number": 17,
        "prompt": "I have researched the rules of social interactions to improve my own social skills.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 18,
        "prompt": "I am always aware of the impression I make on other people.",
        "scale": "standard",
        "subscale": "masking"
      },
      {
        "number": 19,
        "prompt": "I feel free to be myself when I am with other people.",
        "scale": "inverted",
        "subscale": "assimilation"
      },
      {
        "number": 20,
        "prompt": "I learn how people use their bodies and faces to interact by watching television or films, or by reading fiction.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 21,
        "prompt": "I adjust my body language or facial expressions so that I appear relaxed.",
        "scale": "standard",
        "subscale": "masking"
      },
      {
        "number": 22,
        "prompt": "When talking to other people, I feel like the conversation flows naturally.",
        "scale": "inverted",
        "subscale": "assimilation"
      },
      {
        "number": 23,
        "prompt": "I have spent time learning social skills from television shows and films, and try to use these in my interactions.",
        "scale": "standard",
        "subscale": "compensation"
      },
      {
        "number": 24,
        "prompt": "In social interactions, I do not pay attention to what my face or body are doing.",
        "scale": "inverted",
        "subscale": "masking"
      },
      {
        "number": 25,
        "prompt": "In social situations, I feel like I am pretending to be ‘normal’.",
        "scale": "standard",
        "subscale": "assimilation"
      }
    ]
  }`,
  (key, value) => Object.freeze(value),
);

CATQResults.mappings = Object.freeze({
  idSeparator: ':',
  totalRow: 'total',
  totalColumn: 'score',
  columnIds: Object.freeze(
    Object.fromEntries(
      [
        'score',
        ...(CATQResults.definitions.subscales ? Object.keys(CATQResults.definitions.subscales) : []),
      ].map(column => [column, `${column}`]),
    ),
  ),
  rowIds: Object.freeze(
    Object.fromEntries(
      [
        'total',
        ...Array(CATQResults.definitions.items.length)
          .fill(undefined)
          .map((v, i) => `${1 + i}`),
      ].map(row => [row, `psychometrics:catq:${row}`]),
    ),
  ),
});
