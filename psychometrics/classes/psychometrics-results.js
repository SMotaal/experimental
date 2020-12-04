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
 * @typedef {Partial<Pick<typeof PsychometricsResults, 'definitions' | 'mappings'>>} Options
 */
export class PsychometricsResults {
  /**
   * @param {Source} [source]
   * @param {Options} [options]
   */
  constructor(source, options = new.target) {
    this.definitions = Object.freeze({...(options && options.definitions)});

    this.mappings = Object.freeze({
      ...(options && options.mappings),
      columnIds: Object.freeze({...(options && options.mappings && options.mappings.columnIds)}),
      rowIds: Object.freeze({...(options && options.mappings && options.mappings.rowIds)}),
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

    this.update();

    {
      // const logs = [];
      const scores = {};
      const totals = {};

      const {columnIds, rowIds, totalRow = 'total', totalColumn = 'score', idSeparator = ':'} = this.mappings;

      totals.missed = 0;
      totals.scored = 0;

      for (const {number, scale, subscale} of this.definitions.items) {
        const {[number]: columns = (scores[number] = {})} = scores;
        const score = Number(this.definitions.scales[scale][/** @type {string} */ (this.entries.get(rowIds[number]))]);
        isNaN(score) ? totals.missed++ : totals.scored++;
        for (const columnKey in columnIds) {
          totals[columnKey] =
            (totals[columnKey] || 0) +
            ((columns[columnKey] = columnKey === totalColumn || columnKey === subscale ? score : NaN) || 0);
        }
        Object.freeze(columns);
      }

      scores[totalRow] = totals;

      for (const rowKey in rowIds) {
        const rowId = rowIds[rowKey];
        for (const columnKey in columnIds) {
          const columnId = columnIds[columnKey];
          const entryId = `${rowId}${idSeparator}${columnId}`;
          const entryValue = scores[rowKey][columnKey];
          isNaN(entryValue) ? this.entries.delete(entryId) : this.entries.set(entryId, `${entryValue}`);
          // logs.push({rowKey, rowId, columnKey, columnId, entryId, entryValue});
        }
      }

      this.scores = Object.freeze(scores);
      this.totals = Object.freeze(totals);

      // console.log('score', logs);
    }

    Object.freeze(this);

    this.update();
  }

  /** @param {Source} [source] */
  static from(source) {
    return new (this || PsychometricsResults)(source);
  }

  update() {
    const {
      elements,
      entries,
      mappings: {columnIds, rowIds, idSeparator = ':'},
    } = this;

    if (!elements) return;

    // const logs = [];

    for (const rowKey in rowIds) {
      const rowId = rowIds[rowKey];
      const rowValue = entries.get(rowId);
      const rowElement = elements[rowId];

      rowElement && 'value' in rowElement && rowElement.value !== rowValue && (rowElement.value = rowValue || '');

      // logs.push({rowKey, rowId, rowValue, rowElement});

      for (const columnKey in columnIds) {
        const columnId = columnIds[columnKey];
        const entryId = `${rowId}${idSeparator}${columnId}`;
        const entryValue = entries.get(entryId);
        const columnElement = elements[entryId];

        columnElement &&
          'value' in columnElement &&
          columnElement.value !== entryValue &&
          (columnElement.value = entryValue || '');

        // logs.push({rowKey, columnKey, rowId, columnId, entryId, entryValue, columnElement});
      }
    }
    // console.log('update', logs);
  }
}
