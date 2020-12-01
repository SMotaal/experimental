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
 * @typedef {Partial<Pick<typeof EDAQResults, 'definitions' | 'mappings'>>} Options
 */
export class EDAQResults {
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
    return new (this || EDAQResults)(source);
  }

  /** @param {Pick<EDAQResults, 'scores' | 'form' | 'entries' | 'mappings'>} instance */
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

  /** @param {Pick<EDAQResults, 'entries' | 'definitions' | 'mappings'>} instance */
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

/** @param {EDAQResults['source']} source */
export const scoreForm = (source, mappings) => EDAQResults.from(source, {mappings});

EDAQResults.definitions = JSON.parse(
  /* json */ `{
    "id": "psychometrics:edaq",
    "psychometric": "EDAq",
    "description": "The Extreme Demand Avoidance Questionnaire (EDAq)",
    "meta": {
      "links": {
        "overview": "https://embraceasd.com/eda-q/",
        "source": "https://lizonions.files.wordpress.com/2019/09/180515_edaq-en.pdf"
      }
    },
    "options": [
      "Not True",
      "Somewhat True",
      "Mostly True",
      "Very True"
    ],
    "scales": {
      "standard": {
        "Not True": 0,
        "Somewhat True": 1,
        "Mostly True": 2,
        "Very True": 3
      },
      "inverted": {
        "Not True": 3,
        "Somewhat True": 2,
        "Mostly True": 1,
        "Very True": 0
      }
    },
    "items": [
      {
        "number": 1,
        "prompt": "I obsessively resist and avoid ordinary demands and requests",
        "scale": "standard"
      },
      {
        "number": 2,
        "prompt": "I complain about illness or physical incapacity to avoid a request or demand",
        "scale": "standard"
      },
      {
        "number": 3,
        "prompt": "I am driven by the need to be in charge",
        "scale": "standard"
      },
      {
        "number": 4,
        "prompt": "I find everyday pressures (e.g. having to go on a routine trip/visit dentist) intolerably stressful",
        "scale": "standard"
      },
      {
        "number": 5,
        "prompt": "I tell other people how they should behave, but do not feel these rules apply to me",
        "scale": "standard"
      },
      {
        "number": 6,
        "prompt": "I mimic other people’s mannerisms and styles (e.g., use phrases adopted from other people to express myself to others)",
        "scale": "standard"
      },
      {
        "number": 7,
        "prompt": "I have difficulty complying with demands and requests from others unless they are carefully presented",
        "scale": "standard"
      },
      {
        "number": 8,
        "prompt": "I take on roles or characters (from TV/real life) and ‘act them out’",
        "scale": "standard"
      },
      {
        "number": 9,
        "prompt": "I show little shame or embarrassment (e.g., I might throw a tantrum in public and not be embarrassed)",
        "scale": "standard"
      },
      {
        "number": 10,
        "prompt": "I invent fantasy worlds or games and act them out",
        "scale": "standard"
      },
      {
        "number": 11,
        "prompt": "I am good at getting around others and making them do as I want",
        "scale": "standard"
      },
      {
        "number": 12,
        "prompt": "I am unaware or indifferent to the differences between myself and figures of authority (e.g. parents, teachers, and police)",
        "scale": "standard"
      },
      {
        "number": 13,
        "prompt": "I will still sometimes have a ‘meltdown’ (e.g. scream, tantrum, hit, or kick) if I feel pressurized to do something",
        "scale": "standard"
      },
      {
        "number": 14,
        "prompt": "I like to be told I have done a good job",
        "scale": "inverted"
      },
      {
        "number": 15,
        "prompt": "I have a very rapidly changing mood (e.g., I can switch from affectionate to angry in an instant)",
        "scale": "standard"
      },
      {
        "number": 16,
        "prompt": "I know what to do or say to upset particular people",
        "scale": "standard"
      },
      {
        "number": 17,
        "prompt": "I blame or target a particular person/persons",
        "scale": "standard"
      },
      {
        "number": 18,
        "prompt": "I deny things I have done, even if I am caught “red-handed”",
        "scale": "standard"
      },
      {
        "number": 19,
        "prompt": "I can be distracted (preoccupied) ‘from within’ (i.e., absorbed in my own world)",
        "scale": "standard"
      },
      {
        "number": 20,
        "prompt": "I make an effort to maintain my reputation with other people",
        "scale": "inverted"
      },
      {
        "number": 21,
        "prompt": "I sometimes use outrageous or shocking behaviour to get out of doing something",
        "scale": "standard"
      },
      {
        "number": 22,
        "prompt": "I have periods when I have extremely emotional responses (e.g. crying/giggling, becoming furious) to what others would think small events",
        "scale": "standard"
      },
      {
        "number": 23,
        "prompt": "I ensure any social interaction is on my own terms",
        "scale": "standard"
      },
      {
        "number": 24,
        "prompt": "I prefer to interact with others in an adopted role or communicate through props or objects",
        "scale": "standard"
      },
      {
        "number": 25,
        "prompt": "I seek to quibble and change rules set by others",
        "scale": "standard"
      },
      {
        "number": 26,
        "prompt": "I can be passive and difficult to engage",
        "scale": "standard"
      }
    ]
  }`,
  (key, value) => Object.freeze(value),
);

EDAQResults.mappings = Object.freeze({
  idSeparator: ':',
  totalRow: 'total',
  totalColumn: 'score',
  columnIds: Object.freeze(
    Object.fromEntries(
      [
        'score',
        ...(EDAQResults.definitions.subscales ? Object.keys(EDAQResults.definitions.subscales) : []),
      ].map(column => [column, `${column}`]),
    ),
  ),
  rowIds: Object.freeze(
    Object.fromEntries(
      [
        'total',
        ...Array(EDAQResults.definitions.items.length)
          .fill(undefined)
          .map((v, i) => `${1 + i}`),
      ].map(row => [row, `psychometrics:edaq:${row}`]),
    ),
  ),
});
